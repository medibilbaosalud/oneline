import { idbGet, idbSet } from './localVault';

const SYNC_QUEUE_KEY = 'oneline.v1.sync_queue';

type PendingRequest = {
    id: string; // unique ID for the request
    url: string;
    method: string;
    body: any;
    timestamp: number;
};

export async function addToSyncQueue(url: string, body: any) {
    const queue = (await idbGet<PendingRequest[]>(SYNC_QUEUE_KEY)) || [];
    const newItem: PendingRequest = {
        id: crypto.randomUUID(),
        url,
        method: 'POST',
        body,
        timestamp: Date.now(),
    };

    // Remove any existing pending request for the same URL (upsert logic for "today" or specific day)
    // This prevents stacking multiple saves for the same day
    const filtered = queue.filter(item => item.url !== url);

    filtered.push(newItem);
    await idbSet(SYNC_QUEUE_KEY, filtered);
}

export async function processSyncQueue(): Promise<number> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;

    const queue = (await idbGet<PendingRequest[]>(SYNC_QUEUE_KEY)) || [];
    if (queue.length === 0) return 0;

    const remaining: PendingRequest[] = [];
    let processedCount = 0;

    for (const item of queue) {
        try {
            const res = await fetch(item.url, {
                method: item.method,
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(item.body),
            });

            if (!res.ok && res.status !== 409) {
                // If it failed with something other than conflict, keep it
                // 409 might mean it was already saved? Or we should overwrite?
                // For now, if 5xx or network error, we keep it. 
                // If 4xx (client error), maybe we should drop it to avoid infinite loop?
                // Let's retry on 5xx or network error (fetch throws).
                if (res.status >= 500) {
                    remaining.push(item);
                } else {
                    // 4xx error, likely auth or validation. Drop it or it will block forever.
                    console.error('Dropping failed sync item', res.status, item);
                }
            } else {
                processedCount++;
            }
        } catch (e) {
            // Network error, keep in queue
            remaining.push(item);
        }
    }

    await idbSet(SYNC_QUEUE_KEY, remaining);
    return processedCount;
}

export async function getSyncQueueSize(): Promise<number> {
    const queue = (await idbGet<PendingRequest[]>(SYNC_QUEUE_KEY)) || [];
    return queue.length;
}
