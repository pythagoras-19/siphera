export interface User {
  userId: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: number;
  createdAt: number;
  updatedAt: number;
  contacts: string[];
  publicKey?: string;
}

export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  status: User['status'];
  lastSeen: number;
}

export interface Contact {
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  status: User['status'];
  lastSeen: number;
  isOnline: boolean;
} 