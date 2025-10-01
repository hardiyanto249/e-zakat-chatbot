
import type { Zakat, ZakatType, FunctionCall } from '../types';

let zakatRecords: Zakat[] = [
    { 
        id: 1, 
        volunteerCode: 'R001', 
        muzakkiName: 'Ahmad Subagja', 
        zakatType: 'Fitrah', 
        amount: 45000, 
        proofOfTransfer: 'bukti-ahmad.png', 
        createdAt: new Date('2024-04-08T10:00:00Z').toISOString() 
    },
    { 
        id: 2, 
        volunteerCode: 'R002', 
        muzakkiName: 'Siti Aminah', 
        zakatType: 'Mal', 
        amount: 2500000, 
        proofOfTransfer: 'tf-siti.jpg', 
        createdAt: new Date('2024-04-09T14:30:00Z').toISOString()
    },
];

let nextId = 3;

// --- CRUD Functions for Zakat ---

const getZakatRecords = (): Zakat[] => {
    console.log("DATABASE: Mengambil semua data zakat.");
    return zakatRecords;
};

const addZakatRecord = (args: { volunteerCode: string; muzakkiName: string; zakatType: ZakatType; amount: number; proofOfTransfer: string }): Zakat => {
    const { volunteerCode, muzakkiName, zakatType, amount, proofOfTransfer } = args;
    console.log(`DATABASE: Menambahkan zakat dari ${muzakkiName}.`);
    
    if (!volunteerCode || !muzakkiName || !zakatType || amount == null || !proofOfTransfer) {
        throw new Error("Semua field (kode relawan, nama muzakki, jenis zakat, jumlah, bukti transfer) harus diisi.");
    }

    const newRecord: Zakat = {
        id: nextId++,
        volunteerCode,
        muzakkiName,
        zakatType,
        amount,
        proofOfTransfer,
        createdAt: new Date().toISOString(),
    };
    zakatRecords.push(newRecord);
    return newRecord;
};

const updateZakatRecord = (args: { id: number; volunteerCode?: string; muzakkiName?: string; zakatType?: ZakatType; amount?: number; proofOfTransfer?: string }): Zakat => {
    const { id, ...updates } = args;
    console.log(`DATABASE: Memperbarui laporan zakat dengan ID ${id}.`);
    
    const recordIndex = zakatRecords.findIndex(r => r.id === id);
    if (recordIndex === -1) {
        throw new Error(`Laporan zakat dengan ID ${id} tidak ditemukan.`);
    }

    // Merge updates into the existing record
    zakatRecords[recordIndex] = { ...zakatRecords[recordIndex], ...updates };
    
    return zakatRecords[recordIndex];
};

const deleteZakatRecord = ({ id }: { id: number }): string => {
    console.log(`DATABASE: Menghapus laporan zakat dengan ID ${id}.`);
    const initialLength = zakatRecords.length;
    zakatRecords = zakatRecords.filter(r => r.id !== id);
    if (zakatRecords.length === initialLength) {
        throw new Error(`Laporan zakat dengan ID ${id} tidak ditemukan.`);
    }
    return `Berhasil menghapus laporan zakat dengan ID ${id}.`;
};


// --- Function Call Executor ---

const availableFunctions: { [key: string]: Function } = {
    get_all_zakat: getZakatRecords,
    add_zakat: addZakatRecord,
    update_zakat: updateZakatRecord,
    delete_zakat: deleteZakatRecord,
};

export const executeFunctionCall = async (functionCall: FunctionCall): Promise<any> => {
    const functionToCall = availableFunctions[functionCall.name];

    if (!functionToCall) {
        return `Maaf, saya tidak tahu cara melakukan tindakan: ${functionCall.name}.`;
    }

    try {
        const result = functionToCall(functionCall.args);
        return result;
    } catch (error) {
        if (error instanceof Error) {
            return `Operasi database gagal: ${error.message}`;
        }
        return 'Terjadi kesalahan yang tidak diketahui selama operasi database.';
    }
};
