'use client';

import { useEffect, useState } from 'react';
import { get } from './api';
import { kv } from './db';
import type { MdtPosition } from './types';

const KEY = 'position.last';
const EVERY = 10_000;

// Posisi unit = posisi alat GPS (tracker Teltonika) di unit, diambil dari server tiap 10 detik
// selama ada sinyal. Tanpa sinyal: posisi terakhir yang tersimpan (ditandai waktu datanya).
export function useUnitPosition(initial: MdtPosition | null): MdtPosition | null {
    const [pos, setPos] = useState<MdtPosition | null>(initial);

    useEffect(() => {
        let alive = true;
        kv.get<MdtPosition>(KEY).then((p) => alive && p && setPos((cur) => (!cur || p.time > cur.time ? p : cur))).catch(() => {});
        const load = async () => {
            try {
                const p = await get<MdtPosition | null>('/mdt/position');
                if (!alive || !p) return;
                setPos(p);
                await kv.set(KEY, p);
            } catch {
                // nggak ada sinyal: tetap pakai posisi terakhir
            }
        };
        void load();
        const t = setInterval(() => void load(), EVERY);
        return () => {
            alive = false;
            clearInterval(t);
        };
    }, []);

    // Data bootstrap yang lebih baru (habis sync) juga dipakai: ambil yang paling baru.
    if (initial && (!pos || initial.time > pos.time)) return initial;
    return pos;
}
