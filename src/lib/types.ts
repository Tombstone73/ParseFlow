export interface Attachment {
  name: string;
  type: 'pdf' | 'ai' | 'zip' | 'jpg' | 'png' | 'unknown';
  size: number; // in KB
}

export type EmailCategory = 'order' | 'estimate' | 'none';

export interface Email {
  id: string;
  from: {
    name: string;
    email: string;
  };
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
  isArchived: boolean;
  isBlacklisted: boolean;
  isWhitelisted?: boolean;
  attachments: Attachment[];
  customerId?: string;
  category: EmailCategory;
  extractedData?: any;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
}

export interface Log {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

export interface Rule {
  id: string;
  value: string; // email address or domain
  type: 'whitelist' | 'blacklist';
}

export interface AppData {
  emails: Email[];
  customers: Customer[];
  rules: Rule[];
  logs: Log[];
  archivedLogs?: Log[];
}
