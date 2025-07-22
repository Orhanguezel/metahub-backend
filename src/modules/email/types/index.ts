

// ✅ EmailMessage Interface
export interface IEmailMessage {
  from: string;
  tenant: string;
  subject: string; // Tek dil!
  body: string;    // Tek dil!
  date: Date;
  isRead: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
