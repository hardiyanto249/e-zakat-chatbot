
export interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  isComponent: boolean;
}

export type ZakatType = 'Fitrah' | 'Fidyah' | 'Mal' | 'Infak' | 'Wakaf' | 'Kemanusiaan';

export interface Zakat {
  id: number;
  volunteerCode: string;
  muzakkiName: string;
  zakatType: ZakatType;
  amount: number;
  proofOfTransfer: string; // Will store as a filename/path string
  createdAt: string;
}

export interface FunctionCall {
    // FIX: Make properties optional to match @google/genai's FunctionCall type.
    name?: string;
    args?: Record<string, any>;
    id?: string;
}

export type Role = 'admin' | 'user';

export interface User {
    volunteerCode: string;
    password?: string; // Should be handled securely, plain text for this simulation
    name: string;
    lazName: string;
    description: string;
    role: Role;
}
