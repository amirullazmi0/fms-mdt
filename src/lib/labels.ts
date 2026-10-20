import type { DelayCategory, UnitStatus } from './types';

// Istilah tambang yang dipakai di layar MDT.

export const CATEGORY: Record<DelayCategory, { label: string; hint: string; tone: Tone }> = {
    working: { label: 'Operasi', hint: 'Unit kerja efektif', tone: 'working' },
    standby_planned: { label: 'Standby Terencana', hint: 'P2H, Ishoma, Sholat, Ganti Shift', tone: 'planned' },
    standby_unplanned: { label: 'Standby Tidak Terencana', hint: 'Antre, Tunggu Loader, Refueling, Cuaca', tone: 'unplanned' },
    breakdown: { label: 'Breakdown', hint: 'Unit rusak, panggil mekanik', tone: 'breakdown' },
};

export const CATEGORY_ORDER: DelayCategory[] = ['working', 'standby_planned', 'standby_unplanned', 'breakdown'];

export const STATUS_LABEL: Record<UnitStatus, string> = {
    working: 'Working',
    standby: 'Standby',
    breakdown: 'Breakdown (BD)',
};

export type Tone = 'working' | 'planned' | 'unplanned' | 'breakdown';

// Kelas warna per kategori (gelap, kontras tinggi untuk di kabin).
export const TONE: Record<Tone, { solid: string; soft: string; ring: string; text: string; border: string }> = {
    working: { solid: 'bg-emerald-500 text-emerald-950', soft: 'bg-emerald-500/15 text-emerald-300', ring: 'ring-emerald-400', text: 'text-emerald-400', border: 'border-emerald-400' },
    planned: { solid: 'bg-sky-500 text-sky-950', soft: 'bg-sky-500/15 text-sky-300', ring: 'ring-sky-400', text: 'text-sky-400', border: 'border-sky-400' },
    unplanned: { solid: 'bg-amber-400 text-amber-950', soft: 'bg-amber-400/15 text-amber-200', ring: 'ring-amber-300', text: 'text-amber-300', border: 'border-amber-300' },
    breakdown: { solid: 'bg-red-500 text-red-950', soft: 'bg-red-500/15 text-red-300', ring: 'ring-red-400', text: 'text-red-400', border: 'border-red-400' },
};

export const UNIT_TYPE: Record<string, string> = {
    DT: 'Dump Truck',
    EX: 'Excavator',
    LV: 'Light Vehicle',
    SUPPORT: 'Alat Support',
};

export function duration(ms: number): string {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function clock(ms: number): string {
    return new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function ago(ms: number, now = Date.now()): string {
    const m = Math.round((now - ms) / 60000);
    if (m < 1) return 'barusan';
    if (m < 60) return `${m} mnt lalu`;
    const h = Math.floor(m / 60);
    return `${h} jam ${m % 60} mnt lalu`;
}

export function num(v: number, digits = 0): string {
    return v.toLocaleString('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
