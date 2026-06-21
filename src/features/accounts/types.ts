export interface IAccount {
  id: string;
  name: string;
  initialAmount: number;
  notes: string;
  // Current balance derived server-side (initial_amount + transactions).
  balance: number;
  createdAt: string;
}
