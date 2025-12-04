import { idbGet, idbSet } from './localVault';

const LOCAL_ENTRIES_KEY = 'oneline.v1.local_entries';

type LocalEntry = {
    id: string;
    date: string; // YYYY-MM-DD
    content_cipher: string;
    iv: string;
    updatedAt: number;
};

export async function saveLocalEntry(date: string, content_cipher: string, iv: string, id?: string) {
    const entries = (await idbGet<LocalEntry[]>(LOCAL_ENTRIES_KEY)) || [];
    const entryId = id || crypto.randomUUID();

    const newEntry: LocalEntry = {
        id: entryId,
        date,
        content_cipher,
        iv,
        updatedAt: Date.now(),
    };

    // Remove existing entry for this date
    const filtered = entries.filter(e => e.date !== date);
    filtered.push(newEntry);

    await idbSet(LOCAL_ENTRIES_KEY, filtered);
    return entryId;
}

export async function getLocalEntry(date: string): Promise<LocalEntry | null> {
    const entries = (await idbGet<LocalEntry[]>(LOCAL_ENTRIES_KEY)) || [];
    return entries.find(e => e.date === date) || null;
}

export async function getAllLocalEntries(): Promise<LocalEntry[]> {
    return (await idbGet<LocalEntry[]>(LOCAL_ENTRIES_KEY)) || [];
}
