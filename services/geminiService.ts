import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from '@google/genai';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const zakatTypes = 'Fitrah, Fidyah, Mal, Infak, Wakaf, Kemanusiaan';

const tools: FunctionDeclaration[] = [
    {
        name: 'get_all_zakat',
        description: 'Mendapatkan daftar semua laporan zakat dari database.',
        parameters: { type: Type.OBJECT, properties: {} }
    },
    {
        name: 'add_zakat',
        description: 'Menambahkan laporan zakat baru ke database.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                volunteerCode: { type: Type.STRING, description: 'Kode unik untuk relawan yang mencatat.' },
                muzakkiName: { type: Type.STRING, description: 'Nama lengkap pemberi zakat (muzakki).' },
                zakatType: { type: Type.STRING, description: `Jenis zakat yang dibayarkan. Pilihan: ${zakatTypes}.` },
                amount: { type: Type.NUMBER, description: 'Jumlah total donasi dalam Rupiah (Rp).' },
                proofOfTransfer: { type: Type.STRING, description: 'Nama file atau path dari bukti transfer yang diunggah.' },
            },
            required: ['volunteerCode', 'muzakkiName', 'zakatType', 'amount', 'proofOfTransfer'],
        },
    },
    {
        name: 'update_zakat',
        description: 'Memperbarui laporan zakat yang ada di database berdasarkan ID-nya.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.NUMBER, description: 'ID dari laporan zakat yang akan diperbarui.' },
                volunteerCode: { type: Type.STRING, description: 'Kode relawan yang baru.' },
                muzakkiName: { type: Type.STRING, description: 'Nama muzakki yang baru.' },
                zakatType: { type: Type.STRING, description: `Jenis zakat yang baru. Pilihan: ${zakatTypes}.` },
                amount: { type: Type.NUMBER, description: 'Jumlah donasi yang baru.' },
                proofOfTransfer: { type: Type.STRING, description: 'Nama file bukti transfer yang baru.' },
            },
            required: ['id'],
        },
    },
    {
        name: 'delete_zakat',
        description: 'Menghapus laporan zakat dari database berdasarkan ID-nya.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.NUMBER, description: 'ID dari laporan zakat yang akan dihapus.' },
            },
            required: ['id'],
        },
    },
];

const systemInstruction = `Anda adalah asisten AI yang berfokus pada pelaporan dan pengetahuan tentang Zakat.
Tugas utama Anda adalah membantu pengguna mengelola data laporan zakat menggunakan fungsi yang tersedia (get, add, update, delete).

Selain itu, jika pengguna bertanya tentang konsep atau hukum Zakat, jawablah berdasarkan pengetahuan umum Fikih Zakat, merujuk pada pandangan 4 mazhab (Hanafi, Maliki, Syafi'i, Hanbali). Berikan penekanan khusus pada pandangan mazhab Syafi'i karena merupakan mayoritas di Indonesia.

Aturan penting untuk menjawab pertanyaan pengetahuan:
1. Jika jawaban ditemukan dalam basis pengetahuan Anda, jawablah pertanyaan tersebut dengan jelas. Jika memungkinkan, sebutkan pandangan mazhab yang berbeda. Di akhir jawaban, SELALU tambahkan kalimat berikut: "Untuk lebih memastikan, silakan bertanya kembali kepada para ustadz yg lebih paham disekitar anda".
2. Jika pertanyaan berada di luar cakupan pengetahuan Anda tentang Fikih Zakat, jawablah dengan sopan bahwa Anda belum mengetahui jawabannya, contohnya: "Mohon maaf, saya belum memiliki informasi spesifik mengenai hal tersebut dalam basis pengetahuan saya tentang Fikih Zakat."
3. Jangan menjawab pertanyaan di luar topik Zakat.`;

export const getResponse = async (prompt: string): Promise<GenerateContentResponse> => {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                tools: [{ functionDeclarations: tools }],
            },
        });
        return response;
    } catch (error) {
        console.error('Error fetching from Gemini API:', error);
        throw new Error('Gagal mendapatkan respon dari model AI.');
    }
};