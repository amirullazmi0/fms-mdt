// IndexedDB kecil buat MDT: "kv" (data bootstrap, sesi, cache login) dan "outbox" (status yang
// belum terkirim). Di kabin sering nggak ada sinyal, jadi semua status masuk outbox dulu.

const DB_NAME = 'fms-mdt';
const VERSION = 1;

let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
    if (opening) return opening;
    opening = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
            if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
            opening = null;
            reject(req.error);
        };
    });
    return opening;
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return open().then(
        (db) =>
            new Promise<T>((resolve, reject) => {
                const tx = db.transaction(store, mode);
                const req = fn(tx.objectStore(store));
                tx.oncomplete = () => resolve(req.result);
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            }),
    );
}

export const kv = {
    get: <T>(key: string) => run<T | undefined>('kv', 'readonly', (s) => s.get(key)),
    set: (key: string, value: unknown) => run('kv', 'readwrite', (s) => s.put(value, key)),
    del: (key: string) => run('kv', 'readwrite', (s) => s.delete(key)),
};

/** Satu perubahan status yang ditekan operator, menunggu dikirim ke server. */
export interface OutboxItem {
    id: string; // uuid, juga id di server: kiriman ulang nggak dobel
    driverId: string | null;
    delayCode: string;
    clientAt: number; // jam tablet saat ditekan
    note?: string | null;
}

export const outbox = {
    add: (item: OutboxItem) => run('outbox', 'readwrite', (s) => s.put(item)),
    all: () => run<OutboxItem[]>('outbox', 'readonly', (s) => s.getAll()).then((l) => l.sort((a, b) => a.clientAt - b.clientAt)),
    count: () => run<number>('outbox', 'readonly', (s) => s.count()),
    remove: async (ids: string[]) => {
        const db = await open();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction('outbox', 'readwrite');
            const s = tx.objectStore('outbox');
            ids.forEach((id) => s.delete(id));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },
};
