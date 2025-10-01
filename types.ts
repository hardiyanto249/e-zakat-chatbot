
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
    name: string;
    args: Record<string, any>;
    id: string;
}
