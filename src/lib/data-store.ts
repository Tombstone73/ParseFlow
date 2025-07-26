
"use server";

import fs from 'fs/promises';
import path from 'path';
import type { AppData, Email, Customer, Rule, Log } from './types';

const dataFilePath = path.join(process.cwd(), 'src', 'lib', 'data.json');

async function readData(): Promise<AppData> {
  try {
    await fs.access(dataFilePath);
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    // If file is empty, initialize it
    if (!fileContent) {
        return initializeData();
    }
    const data = JSON.parse(fileContent);
    // Ensure archivedLogs exists
    if (!data.archivedLogs) {
        data.archivedLogs = [];
    }
    return data;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // If the file doesn't exist, initialize with an empty state
      return initializeData();
    }
    console.error('Error reading data file:', error);
    // Return empty state as a fallback
    return { emails: [], customers: [], rules: [], logs: [], archivedLogs: [] };
  }
}

async function initializeData(): Promise<AppData> {
    const initialData: AppData = {
        emails: [],
        customers: [],
        rules: [],
        logs: [],
        archivedLogs: [],
    };
    await writeData(initialData);
    return initialData;
}


async function writeData(data: AppData): Promise<void> {
  try {
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing data file:', error);
  }
}

export async function getEmails(): Promise<Email[]> {
  const data = await readData();
  return data.emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
}

export async function addEmail(email: Email): Promise<void> {
  const data = await readData();
  // Avoid adding duplicates
  if (!data.emails.find(e => e.id === email.id)) {
    data.emails.unshift(email); // Add to the beginning
    await writeData(data);
    await addLog('info', `Successfully processed and stored email with subject: "${email.subject}"`);
  }
}

export async function updateEmail(updatedEmail: Email): Promise<void> {
  const data = await readData();
  const index = data.emails.findIndex(e => e.id === updatedEmail.id);
  if (index !== -1) {
    data.emails[index] = updatedEmail;
    await writeData(data);
  }
}

export async function deleteEmail(emailId: string): Promise<void> {
  const data = await readData();
  data.emails = data.emails.filter(e => e.id !== emailId);
  await writeData(data);
}

export async function getCustomers(): Promise<Customer[]> {
    const data = await readData();
    return data.customers || [];
}

export async function getRules(): Promise<Rule[]> {
    const data = await readData();
    return data.rules || [];
}

export async function getLogs(): Promise<Log[]> {
    const data = await readData();
    return data.logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [];
}

export async function addLog(level: Log['level'], message: string): Promise<void> {
    const data = await readData();
    const newLog: Log = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        level,
        message,
        timestamp: new Date().toISOString(),
    };
    data.logs.unshift(newLog);
    await writeData(data);
}

export async function archiveAllLogs(): Promise<void> {
    const data = await readData();
    if (!data.archivedLogs) {
        data.archivedLogs = [];
    }
    // Move all current logs to the beginning of the archived logs array
    data.archivedLogs.unshift(...data.logs);
    data.logs = []; // Clear the current logs
    await writeData(data);
}
