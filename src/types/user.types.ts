export interface User {
  id: string;
  nickname: string;
  role: "standard" | "vip" | "admin";
  gender: "male" | "female";
  age: number;
  country: string;
  avatar?: string;
  createdAt: string;
  status: "active" | "banned" | "kicked";
  lastSeen?: number;
  online?: boolean;
  vipExpiresAt?: string;
}

export interface UserPresence {
  online: boolean;
  lastSeen: number;
  role: string;
}
