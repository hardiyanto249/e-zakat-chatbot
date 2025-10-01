
import React, { useState, useEffect, useCallback } from 'react';
import { ChatInterface } from './components/ChatInterface';
import type { Message, Zakat, ZakatType, FunctionCall } from './types';
import { getResponse } from './services/geminiService';
import { executeFunctionCall } from './services/databaseService';

// --- Conversation State Management ---
interface ConversationContext {
  active_intent: 'ADD_ZAKAT' | 'CONFIRM_DELETE' | 'CONFIRM_ADD' | null;
  collected_data: Partial<Omit<Zakat, 'id' | 'createdAt'>>;
  next_question_key: keyof Omit<Zakat, 'id' | 'createdAt'> | null;
  pending_function_call: FunctionCall | null; // For delete confirmation
}

const initialConversationContext: ConversationContext = {
  active_intent: null,
  collected_data: {},
  next_question_key: null,
  pending_function_call: null,
};

const ZAKAT_FIELD_QUESTIONS: Record<keyof Omit<Zakat, 'id' | 'createdAt'>, string> = {
    muzakkiName: 'Baik, siapa nama muzakki (pemberi zakat)?',
    volunteerCode: 'Silakan masukkan kode relawan.',
    zakatType: `Apa jenis zakatnya? (Pilihan: Fitrah, Fidyah, Mal, Infak, Wakaf, Kemanusiaan)`,
    amount: 'Berapa jumlah totalnya (dalam Rupiah)? Cukup ketik angkanya.',
    proofOfTransfer: 'Terakhir, apa nama file untuk bukti transfer? (contoh: bukti.jpg)'
};

const ZAKAT_FIELD_ORDER: (keyof typeof ZAKAT_FIELD_QUESTIONS)[] = [
    'muzakkiName',
    'volunteerCode',
    'zakatType',
    'amount',
    'proofOfTransfer'
];

const ZAKAT_TYPES: ZakatType[] = ['Fitrah', 'Fidyah', 'Mal', 'Infak', 'Wakaf', 'Kemanusiaan'];


const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationContext, setConversationContext] = useState<ConversationContext>(initialConversationContext);

  // --- Utility Functions ---
  const addBotMessage = (text: string, isComponent: boolean = false) => {
    setMessages(prev => [...prev, {
      id: (Date.now() + Math.random()).toString(),
      sender: 'bot',
      text,
      isComponent
    }]);
  };

  const finalizeZakatCollection = async (collectedData: Partial<Omit<Zakat, 'id' | 'createdAt'>>) => {
      addBotMessage("Data sudah dikonfirmasi. Saya sedang memproses...", false);
      try {
          const result = await executeFunctionCall({ name: 'add_zakat', args: collectedData, id: '' });
          if (typeof result === 'string' && result.startsWith('Operasi database gagal')) {
              addBotMessage(result);
          } else {
              addBotMessage(JSON.stringify(result, null, 2), true);
              addBotMessage('Terima kasih telah berpartisipasi dalam pengumpulan zakat. Jazakumullah Khairan Katsiran.');
          }
      } catch (e) {
          const errorMessage = e instanceof Error ? e.message : 'Terjadi kesalahan saat finalisasi.';
          addBotMessage(`Error: ${errorMessage}`);
          setError(errorMessage);
      } finally {
          setConversationContext(initialConversationContext);
          setIsLoading(false);
      }
  };


  const askNextQuestion = useCallback((currentData: Partial<Omit<Zakat, 'id' | 'createdAt'>>) => {
    const nextField = ZAKAT_FIELD_ORDER.find(key => currentData[key] === undefined);

    if (nextField) {
      addBotMessage(ZAKAT_FIELD_QUESTIONS[nextField]);
      setConversationContext(prev => ({ ...prev, next_question_key: nextField }));
      setIsLoading(false);
    } else {
      // All data collected, ask for confirmation before finalizing
      const summary = `Berikut adalah ringkasan data yang akan disimpan:
- Nama Muzakki: ${currentData.muzakkiName}
- Kode Relawan: ${currentData.volunteerCode}
- Jenis Zakat: ${currentData.zakatType}
- Jumlah: Rp ${Number(currentData.amount).toLocaleString('id-ID')}
- Bukti Transfer: ${currentData.proofOfTransfer}

Apakah data sudah benar dan ingin dilanjutkan? (ya/tidak)`;

      addBotMessage(summary);
      // Change intent to CONFIRM_ADD to handle the yes/no response
      setConversationContext(prev => ({ ...prev, active_intent: 'CONFIRM_ADD', next_question_key: null }));
      setIsLoading(false);
    }
  }, []);

  const startZakatCollection = useCallback((initialData: Partial<Omit<Zakat, 'id' | 'createdAt'>> = {}) => {
    addBotMessage("Tentu, saya akan bantu mencatat laporan zakat baru.");
    setConversationContext({
      active_intent: 'ADD_ZAKAT',
      collected_data: initialData,
      next_question_key: null, // This being null will trigger the useEffect
      pending_function_call: null,
    });
  }, []);

  // Effect to start the conversation flow when active_intent is set to ADD_ZAKAT
  useEffect(() => {
    if (conversationContext.active_intent === 'ADD_ZAKAT' && conversationContext.next_question_key === null) {
        // This checks if we just started the process. The first question will be asked here.
        askNextQuestion(conversationContext.collected_data);
    }
  }, [conversationContext, askNextQuestion]);


  const handleCollectingState = useCallback(async (text: string) => {
    const key = conversationContext.next_question_key;
    if (!key) { // Should not happen if flow is correct, but as a safeguard
        setIsLoading(false);
        return;
    }

    let processedValue: string | number | ZakatType = text;
    let isValid = true;

    // Validation
    if (key === 'amount') {
      const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
      if (isNaN(num)) {
        addBotMessage("Maaf, jumlah harus dalam bentuk angka. Silakan coba lagi.");
        isValid = false;
      } else {
        processedValue = num;
      }
    } else if (key === 'zakatType') {
        const capitalized = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        if (!ZAKAT_TYPES.some(t => t.toLowerCase() === capitalized.toLowerCase())) {
             addBotMessage(`Maaf, jenis zakat tidak valid. Pilihan: ${ZAKAT_TYPES.join(', ')}. Silakan coba lagi.`);
             isValid = false;
        } else {
            processedValue = capitalized as ZakatType;
        }
    }

    if (isValid) {
      const updatedData = { ...conversationContext.collected_data, [key]: processedValue };
      setConversationContext(prev => ({...prev, collected_data: updatedData}));
      askNextQuestion(updatedData);
    } else {
      setIsLoading(false); // Let the user try again
    }
  }, [conversationContext, askNextQuestion]);
  
  const handleConfirmAddState = useCallback(async (text: string) => {
    if (text.toLowerCase().trim() === 'ya') {
        await finalizeZakatCollection(conversationContext.collected_data);
    } else {
        addBotMessage("Baik, penambahan laporan dibatalkan.");
        setConversationContext(initialConversationContext);
        setIsLoading(false);
    }
  }, [conversationContext.collected_data]);

  const handleConfirmDeleteState = useCallback(async (text: string) => {
      const { pending_function_call } = conversationContext;
      if (!pending_function_call) {
           addBotMessage("Terjadi kesalahan internal: tidak ada operasi hapus yang tertunda.");
           setConversationContext(initialConversationContext);
           setIsLoading(false);
           return;
      }

      if (text.toLowerCase().trim() === 'ya') {
          addBotMessage("Baik, sedang memproses penghapusan...");
          try {
              const result = await executeFunctionCall(pending_function_call);
              addBotMessage(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
          } catch (e) {
               const errorMessage = e instanceof Error ? e.message : 'Gagal menghapus data.';
               addBotMessage(`Error: ${errorMessage}`);
               setError(errorMessage);
          }
      } else {
          addBotMessage("Baik, operasi penghapusan dibatalkan.");
      }
      
      setConversationContext(initialConversationContext);
      setIsLoading(false);
      
  }, [conversationContext]);

  const handleIdleState = useCallback(async (text: string) => {
    // Client-side intent detection for adding zakat to ensure consistent UX
    const lowercasedText = text.toLowerCase().trim();
    if (/\b(tambah|buat|catat|add)\b/.test(lowercasedText) && /\b(laporan|zakat)\b/.test(lowercasedText)) {
        startZakatCollection();
        return; // Bypass Gemini and start collection immediately
    }

    try {
      const geminiResponse = await getResponse(text);
      
      if (geminiResponse.functionCalls && geminiResponse.functionCalls.length > 0) {
        const functionCall = geminiResponse.functionCalls[0];

        if (functionCall.name === 'add_zakat') {
            startZakatCollection(functionCall.args);
            return; 
        } else if (functionCall.name === 'delete_zakat') {
            addBotMessage(`Apakah Anda yakin ingin menghapus laporan zakat dengan ID ${functionCall.args.id}? (ya/tidak)`);
            setConversationContext({
                active_intent: 'CONFIRM_DELETE',
                collected_data: {},
                next_question_key: null,
                pending_function_call: functionCall,
            });
            setIsLoading(false);
            return;
        }
        
        // For other functions, execute immediately
        const result = await executeFunctionCall(functionCall);
        let botMessageText: string;
        let isComponent = false;

        if (typeof result === 'string') {
          botMessageText = result;
        } else if (Array.isArray(result) && result.length === 0) {
          botMessageText = "Tidak ada data zakat yang ditemukan.";
        } else {
          botMessageText = JSON.stringify(result, null, 2);
          isComponent = true;
        }
        addBotMessage(botMessageText, isComponent);

      } else {
        addBotMessage(geminiResponse.text || "Maaf, saya tidak dapat memproses permintaan tersebut.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak diketahui.';
      setError(errorMessage);
      addBotMessage(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [startZakatCollection]);


  const handleSendMessage = useCallback(async (text: string) => {
    if (isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: text, isComponent: false };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // --- State Routing ---
    switch (conversationContext.active_intent) {
        case 'ADD_ZAKAT':
            handleCollectingState(text);
            break;
        case 'CONFIRM_ADD':
            handleConfirmAddState(text);
            break;
        case 'CONFIRM_DELETE':
            handleConfirmDeleteState(text);
            break;
        default:
            handleIdleState(text);
            break;
    }
  }, [isLoading, conversationContext, handleCollectingState, handleIdleState, handleConfirmDeleteState, handleConfirmAddState]);


  useEffect(() => {
    setMessages([
      {
        id: '1',
        sender: 'bot',
        text: "Assalamualaikum! Saya Bot Laporan Zakat. Saya bisa membantu Anda mencatat dan mengelola data zakat. Anda juga bisa bertanya kepada saya seputar Fikih Zakat.\n\nContoh perintah:\n- 'Tampilkan semua laporan zakat'\n- 'Tambah laporan zakat'\n- 'Siapa saja yang berhak menerima zakat?'",
        isComponent: false
      }
    ]);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 shadow-md">
        <h1 className="text-2xl font-bold text-center text-cyan-400">AI Pelaporan Zakat</h1>
        <p className="text-center text-sm text-gray-400">Antarmuka Bahasa Alami untuk Database Zakat</p>
      </header>
      <ChatInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
      {error && <div className="p-4 bg-red-800 text-center text-white">{error}</div>}
    </div>
  );
};

export default App;
