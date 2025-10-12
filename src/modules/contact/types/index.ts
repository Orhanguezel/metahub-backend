// src/modules/contact/types/index.ts

export interface IContactMessage {
  name: string;
  tenant: string; // Multi-tenancy
  email: string;
  subject: string;   // Kullanıcı girdisi - tek dil
  message: string;   // Kullanıcı girdisi - tek dil
  isRead: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
