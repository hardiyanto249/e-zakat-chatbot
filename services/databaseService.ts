import type { Zakat, ZakatType, FunctionCall, User } from '../types';

// --- In-Memory Database for Users ---
let users: User[] = [
    {
        volunteerCode: 'ADM-111-AAA',
        password: 'admin123',
        name: 'Administrator',
        lazName: 'Pusat',
        description: 'Akun administrator utama.',
        role: 'admin',
    },
    {
        volunteerCode: 'R001',
        password: 'password123',
        name: 'Ahmad Subagja',
        lazName: 'LAZ Cabang Jakarta',
        description: 'Relawan aktif.',
        role: 'user',
    },
    {
        volunteerCode: 'R002',
        password: 'password123',
        name: 'Siti Aminah',
        lazName: 'LAZ Cabang Bandung',
        description: 'Relawan senior.',
        role: 'user',
    }
];

// --- In-Memory Database for Zakat ---
let zakatRecords: Zakat[] = [
    { 
        id: 1, 
        volunteerCode: 'R001', 
        muzakkiName: 'Budi Santoso', 
        zakatType: 'Fitrah', 
        amount: 45000, 
        proofOfTransfer: 'bukti-budi.png', 
        createdAt: new Date('2024-04-08T10:00:00Z').toISOString() 
    },
    { 
        id: 2, 
        volunteerCode: 'R002', 
        muzakkiName: 'Rina Wati', 
        zakatType: 'Mal', 
        amount: 2500000, 
        proofOfTransfer: 'tf-rina.jpg', 
        createdAt: new Date('2024-04-09T14:30:00Z').toISOString()
    },
     { 
        id: 3, 
        volunteerCode: 'R001', 
        muzakkiName: 'Joko Widodo', 
        zakatType: 'Infak', 
        amount: 500000, 
        proofOfTransfer: 'infak-joko.pdf', 
        createdAt: new Date('2024-04-10T11:20:00Z').toISOString()
    },
];

let nextId = 4;

// --- Authentication and User Management ---
export const authenticateUser = (volunteerCode: string, password_in: string): User | null => {
    const user = users.find(u => u.volunteerCode === volunteerCode && u.password === password_in);
    if (user) {
        // Return a copy without the password for security
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    return null;
};

const addUser = (args: Omit<User, 'role'>, currentUser: User | null): User => {
    if (currentUser?.role !== 'admin') {
        throw new Error('Hanya admin yang dapat menambah user baru.');
    }
    if (users.some(u => u.volunteerCode === args.volunteerCode)) {
        throw new Error(`User dengan kode relawan '${args.volunteerCode}' sudah ada.`);
    }
    const newUser: User = { ...args, role: 'user' };
    users.push(newUser);
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
}

const getAllUsers = (args: {}, currentUser: User | null): Omit<User, 'password'>[] => {
    if (currentUser?.role !== 'admin') {
        throw new Error('Hanya admin yang dapat melihat daftar relawan.');
    }
    // Return a list of users without their passwords
    return users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    });
};

// --- Role-Aware CRUD Functions for Zakat ---

const getZakatRecords = (args: {}, currentUser: User | null): Zakat[] => {
    if (!currentUser) throw new Error("Akses ditolak.");
    
    if (currentUser.role === 'admin') {
        return zakatRecords;
    }
    return zakatRecords.filter(r => r.volunteerCode === currentUser.volunteerCode);
};

const addZakatRecord = (args: { volunteerCode?: string; muzakkiName: string; zakatType: ZakatType; amount: number; proofOfTransfer: string }, currentUser: User | null): Zakat => {
    if (!currentUser) throw new Error("Akses ditolak.");
    
    const { muzakkiName, zakatType, amount, proofOfTransfer } = args;
    let volunteerCode = args.volunteerCode;

    if (currentUser.role === 'user') {
        volunteerCode = currentUser.volunteerCode;
    } else if (currentUser.role === 'admin' && !volunteerCode) {
        throw new Error("Admin harus menyertakan 'volunteerCode' saat menambah data.");
    }
    
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

const updateZakatRecord = (args: { id: number; volunteerCode?: string; muzakkiName?: string; zakatType?: ZakatType; amount?: number; proofOfTransfer?: string }, currentUser: User | null): Zakat => {
    if (!currentUser) throw new Error("Akses ditolak.");
    const { id, ...updates } = args;
    
    const recordIndex = zakatRecords.findIndex(r => r.id === id);
    if (recordIndex === -1) throw new Error(`Laporan zakat dengan ID ${id} tidak ditemukan.`);

    const recordToUpdate = zakatRecords[recordIndex];
    if (currentUser.role === 'user' && recordToUpdate.volunteerCode !== currentUser.volunteerCode) {
        throw new Error(`Anda tidak memiliki izin untuk mengubah data ini.`);
    }

    zakatRecords[recordIndex] = { ...recordToUpdate, ...updates };
    return zakatRecords[recordIndex];
};

const deleteZakatRecord = ({ id }: { id: number }, currentUser: User | null): string => {
    if (!currentUser) throw new Error("Akses ditolak.");
    
    const recordIndex = zakatRecords.findIndex(r => r.id === id);
    if (recordIndex === -1) throw new Error(`Laporan zakat dengan ID ${id} tidak ditemukan.`);

    const recordToDelete = zakatRecords[recordIndex];
    if (currentUser.role === 'user' && recordToDelete.volunteerCode !== currentUser.volunteerCode) {
        throw new Error(`Anda tidak memiliki izin untuk menghapus data ini.`);
    }

    zakatRecords.splice(recordIndex, 1);
    return `Berhasil menghapus laporan zakat dengan ID ${id}.`;
};


// --- Function Call Executor ---

const availableFunctions: { [key: string]: Function } = {
    get_all_zakat: getZakatRecords,
    add_zakat: addZakatRecord,
    update_zakat: updateZakatRecord,
    delete_zakat: deleteZakatRecord,
    add_user: addUser,
    get_all_users: getAllUsers,
};

export const executeFunctionCall = async (functionCall: FunctionCall, currentUser: User | null): Promise<any> => {
    // FIX: Add guards for optional properties on FunctionCall type
    if (!functionCall.name) {
        return `Maaf, nama fungsi tidak ditemukan dalam permintaan.`;
    }
    const functionToCall = availableFunctions[functionCall.name];

    if (!functionToCall) {
        return `Maaf, saya tidak tahu cara melakukan tindakan: ${functionCall.name}.`;
    }

    try {
        // FIX: Use nullish coalescing to provide default value for optional args
        const result = functionToCall(functionCall.args ?? {}, currentUser);
        return result;
    } catch (error) {
        if (error instanceof Error) {
            return `Operasi database gagal: ${error.message}`;
        }
        return 'Terjadi kesalahan yang tidak diketahui selama operasi database.';
    }
};