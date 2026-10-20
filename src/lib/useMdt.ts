'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TOKEN_KEY, errText, get, isOffline, isUnpaired, post } from './api';
import { kv, outbox } from './db';
import { offlineLogin, rememberLogin } from './pin';
import type { DelayCode, LocalStatus, MdtBootstrap, MdtOperator, MdtPairResponse, MdtStatusBatchResult } from './types';
import { uuid } from './utils';

const BOOTSTRAP_KEY = 'bootstrap';
const SESSION_KEY = 'session';
const STATUS_KEY = 'status.current';
const LAST_SYNC_KEY = 'sync.last';
const SYNC_EVERY = 30_000;

export type Phase = 'loading' | 'pair' | 'login' | 'home';

export interface MdtState {
    phase: Phase;
    bootstrap: MdtBootstrap | null;
    operator: MdtOperator | null;
    current: LocalStatus | null;
    pending: number; // status belum terkirim
    lastSync: number | null;
    online: boolean; // server kejangkau pada percobaan terakhir
    syncing: boolean;
}

export function useMdt() {
    const [s, setS] = useState<MdtState>({
        phase: 'loading', bootstrap: null, operator: null, current: null, pending: 0, lastSync: null, online: true, syncing: false,
    });
    const busy = useRef(false);
    const patch = useCallback((p: Partial<MdtState>) => setS((x) => ({ ...x, ...p })), []);

    const unpair = useCallback(async () => {
        await kv.del(TOKEN_KEY);
        await kv.del(BOOTSTRAP_KEY);
        await kv.del(SESSION_KEY);
        patch({ phase: 'pair', bootstrap: null, operator: null });
    }, [patch]);

    /** Kirim outbox, lalu ambil data terbaru. Aman dipanggil kapan saja (tidak berjalan ganda). */
    const sync = useCallback(async () => {
        if (busy.current || !(await kv.get<string>(TOKEN_KEY))) return;
        busy.current = true;
        patch({ syncing: true });
        try {
            const items = await outbox.all();
            if (items.length) {
                const res = await post<MdtStatusBatchResult>('/mdt/status', { sentAt: Date.now(), items });
                await outbox.remove([...res.accepted, ...res.rejected]);
            }
            const b = await get<MdtBootstrap>('/mdt/bootstrap');
            await kv.set(BOOTSTRAP_KEY, b);
            const now = Date.now();
            await kv.set(LAST_SYNC_KEY, now);
            const pending = await outbox.count();
            // Tidak ada status lokal yang menunggu: ikuti status di server (mis. diubah supervisor).
            if (pending === 0 && b.current?.delayCode) {
                const code = b.delayCodes.find((c) => c.code === b.current!.delayCode);
                if (code) {
                    const cur: LocalStatus = { delayCode: code.code, name: code.name, category: code.category, since: b.current.startAt };
                    await kv.set(STATUS_KEY, cur);
                    patch({ current: cur });
                }
            }
            patch({ bootstrap: b, pending, lastSync: now, online: true });
        } catch (err) {
            if (isUnpaired(err)) await unpair();
            patch({ online: !isOffline(err), pending: await outbox.count() });
        } finally {
            busy.current = false;
            patch({ syncing: false });
        }
    }, [patch, unpair]);

    // Mulai: baca semua dari IndexedDB terlebih dahulu (berjalan tanpa sinyal), lalu coba sync.
    useEffect(() => {
        let alive = true;
        (async () => {
            const [token, b, session, current, lastSync, pending] = await Promise.all([
                kv.get<string>(TOKEN_KEY), kv.get<MdtBootstrap>(BOOTSTRAP_KEY), kv.get<MdtOperator>(SESSION_KEY),
                kv.get<LocalStatus>(STATUS_KEY), kv.get<number>(LAST_SYNC_KEY), outbox.count(),
            ]);
            if (!alive) return;
            const phase: Phase = !token ? 'pair' : session ? 'home' : 'login';
            patch({ phase, bootstrap: b ?? null, operator: session ?? null, current: current ?? null, lastSync: lastSync ?? null, pending });
            if (token) void sync();
        })();
        return () => {
            alive = false;
        };
    }, [patch, sync]);

    useEffect(() => {
        const t = setInterval(() => void sync(), SYNC_EVERY);
        const onOnline = () => void sync();
        const onVisible = () => document.visibilityState === 'visible' && void sync();
        window.addEventListener('online', onOnline);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(t);
            window.removeEventListener('online', onOnline);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [sync]);

    const pair = useCallback(async (code: string, name: string) => {
        const r = await post<MdtPairResponse>('/mdt/pair', { code, name: name || null });
        await kv.set(TOKEN_KEY, r.token);
        patch({ phase: 'login' });
        await sync();
        return r;
    }, [patch, sync]);

    /** Login NIK + PIN: online bila memungkinkan, bila tidak ada sinyal memakai cache login tablet ini. */
    const login = useCallback(async (employeeNo: string, pin: string): Promise<string | null> => {
        let op: MdtOperator | null = null;
        try {
            op = await post<MdtOperator>('/mdt/login', { employeeNo, pin });
            await rememberLogin(op, employeeNo, pin);
        } catch (err) {
            if (!isOffline(err)) return errText(err, 'NIK atau PIN salah');
            const cached = await offlineLogin(employeeNo, pin);
            if (cached === 'unknown') return 'Di luar jangkauan sinyal. Login pertama di tablet ini harus ada sinyal.';
            if (!cached) return 'NIK atau PIN salah';
            op = cached;
        }
        await kv.set(SESSION_KEY, op);
        patch({ phase: 'home', operator: op, online: true });
        return null;
    }, [patch]);

    const logout = useCallback(async () => {
        await kv.del(SESSION_KEY);
        patch({ phase: 'login', operator: null });
        void sync();
    }, [patch, sync]);

    /** Operator menekan status. Langsung berlaku di layar, dikirim saat ada sinyal. */
    const setStatus = useCallback(async (code: DelayCode, note?: string) => {
        const now = Date.now();
        await outbox.add({ id: uuid(), driverId: s.operator?.id ?? null, delayCode: code.code, clientAt: now, note: note ?? null });
        const cur: LocalStatus = { delayCode: code.code, name: code.name, category: code.category, since: now };
        await kv.set(STATUS_KEY, cur);
        patch({ current: cur, pending: await outbox.count() });
        void sync();
    }, [patch, s.operator, sync]);

    return { ...s, sync, pair, login, logout, setStatus, unpair };
}
