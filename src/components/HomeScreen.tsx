'use client';
// Beranda MDT: selalu 1 layar penuh (100dvh × 100dvw), tidak dapat di-scroll. Isi menyesuaikan tinggi
// layar lewat grid `fr` + `min-h-0` dan ukuran huruf clamp().
import { ArrowRight, LayoutGrid, LogOut, MapPin, Navigation, Timer, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CATEGORY, CATEGORY_ORDER, TONE, UNIT_TYPE, clock, duration, num } from '@/lib/labels';
import type { DelayCategory, DelayCode, LocalStatus, MdtBootstrap, MdtOperator } from '@/lib/types';
import { useUnitPosition } from '@/lib/useUnitPosition';
import { cn } from '@/lib/utils';
import { DelayIcon } from './icons';
import { LocationView } from './LocationView';
import { SyncBadge } from './SyncBadge';

type View = 'status' | 'lokasi';

const SHIFT_TONE: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-300',
    finishing: 'bg-amber-500/15 text-amber-300',
};

function useNow(every = 1000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), every);
        return () => clearInterval(t);
    }, [every]);
    return now;
}

export function HomeScreen({
    bootstrap, operator, current, pending, lastSync, online, syncing, onStatus, onSync, onLogout,
}: {
    bootstrap: MdtBootstrap | null;
    operator: MdtOperator | null;
    current: LocalStatus | null;
    pending: number;
    lastSync: number | null;
    online: boolean;
    syncing: boolean;
    onStatus: (code: DelayCode) => void;
    onSync: () => void;
    onLogout: () => void;
}) {
    const now = useNow();
    const [view, setView] = useState<View>('status');
    const [tab, setTab] = useState<DelayCategory>(current?.category ?? 'working');
    const [confirm, setConfirm] = useState<DelayCode | null>(null);
    const [askLogout, setAskLogout] = useState(false);
    // Posisi unit dari alat GPS-nya, bukan dari tablet.
    const pos = useUnitPosition(bootstrap?.position ?? null);
    const byCategory = useMemo(() => {
        const m: Record<DelayCategory, DelayCode[]> = { working: [], standby_planned: [], standby_unplanned: [], breakdown: [] };
        (bootstrap?.delayCodes ?? []).forEach((c) => m[c.category]?.push(c));
        return m;
    }, [bootstrap]);

    const unit = bootstrap?.unit;
    const duty = bootstrap?.duty;
    const prod = bootstrap?.production;
    const tone = current ? TONE[CATEGORY[current.category].tone] : null;
    const codes = byCategory[tab];
    // Tombol dibagi rata ke tinggi yang ada: 3 kolom, baris secukupnya.
    const rows = Math.max(2, Math.ceil(codes.length / 3));

    const press = (c: DelayCode) => {
        if (c.code === current?.delayCode) return;
        // Breakdown menghentikan produksi: minta konfirmasi agar tidak tertekan tanpa sengaja.
        if (c.category === 'breakdown') setConfirm(c);
        else onStatus(c);
    };

    return (
        <main className="grid h-dvh w-dvw grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden p-3">
            {/* Unit, operator, sinkron */}
            <header className="flex min-w-0 items-center gap-3">
                <div className="mr-auto min-w-0">
                    <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted">
                        {UNIT_TYPE[unit?.unitType ?? 'DT'] ?? 'Unit'} · {operator?.name ?? '-'}
                    </p>
                    <h1 className="truncate text-[clamp(1.25rem,3.2vh,2rem)] font-bold leading-tight">{unit?.label ?? 'Unit'}</h1>
                </div>
                <div className="grid shrink-0 grid-cols-2 rounded-xl bg-panel p-1" role="tablist" aria-label="Tampilan">
                    {([['status', LayoutGrid, 'Status'], ['lokasi', MapPin, 'Lokasi']] as const).map(([v, Icon, label]) => (
                        <button
                            key={v}
                            role="tab"
                            aria-selected={view === v}
                            onClick={() => setView(v)}
                            className={cn('flex h-12 items-center gap-2 rounded-lg px-4 font-bold', view === v ? 'bg-brand text-brand-foreground' : 'text-muted')}
                        >
                            <Icon className="size-5" /> {label}
                        </button>
                    ))}
                </div>
                <SyncBadge online={online} pending={pending} lastSync={lastSync} syncing={syncing} onSync={onSync} now={now} />
                <button
                    type="button"
                    onClick={() => setAskLogout(true)}
                    className="grid size-14 shrink-0 place-items-center rounded-xl border border-line bg-panel active:scale-95"
                    aria-label="Ganti operator"
                    title="Ganti operator"
                >
                    <LogOut className="size-6" />
                </button>
            </header>

            <div className="grid min-h-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
                {/* Ringkasan kiri: status, penugasan, produksi. Dipadatkan agar muat. HP: disembunyikan. */}
                <aside className="hidden min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3 md:grid">
                    <section className={cn('rounded-2xl p-4 ring-2', tone ? `${tone.soft} ${tone.ring}` : 'bg-panel ring-line')}>
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Status sekarang</p>
                        {current ? (
                            <>
                                <p className="truncate text-[clamp(1.5rem,4vh,2.5rem)] font-black leading-tight text-fg">{current.name}</p>
                                <p className="flex items-center gap-2 font-mono text-[clamp(1.25rem,3.4vh,2.25rem)] font-bold text-fg">
                                    <Timer className="size-6" /> {duration(now - current.since)}
                                </p>
                                <p className="text-xs opacity-80">{CATEGORY[current.category].label} · mulai {clock(current.since)}</p>
                            </>
                        ) : (
                            <p className="mt-1 text-lg font-semibold text-fg">Belum ada status. Pilih di samping.</p>
                        )}
                    </section>

                    <section className="rounded-2xl bg-panel p-4">
                        {duty ? (
                            <>
                                <p className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                                    <span className="truncate">{duty.shiftName} · Fleet {duty.routeName}</span>
                                    <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 normal-case', SHIFT_TONE[duty.shiftStatus] ?? 'bg-panel-2')}>
                                        {duty.shiftStatus === 'active' ? 'Berjalan' : duty.shiftStatus === 'finishing' ? 'Shift ditutup' : `Mulai ${clock(duty.plannedStart)}`}
                                    </span>
                                </p>
                                {duty.shiftStatus === 'finishing' && (
                                    <p className="mt-1.5 rounded-lg bg-amber-500/15 px-2 py-1 text-sm font-semibold text-amber-300">
                                        Selesaikan ritase terakhir: lanjut ke dumping dan selesaikan dumping, lalu keluar dari area dumping.
                                    </p>
                                )}
                                <p className="mt-1.5 flex min-w-0 items-center gap-1.5 font-semibold">
                                    <MapPin className="size-4 shrink-0 text-emerald-400" /> <span className="truncate">{duty.loadingName}</span>
                                    <ArrowRight className="size-4 shrink-0 text-muted" />
                                    <MapPin className="size-4 shrink-0 text-orange-400" /> <span className="truncate">{duty.unloadingName}</span>
                                </p>
                            </>
                        ) : (
                            <p className="text-muted">Unit belum ada penugasan shift.</p>
                        )}
                    </section>

                    <section className="grid min-h-0 grid-cols-2 content-start gap-2 overflow-hidden rounded-2xl bg-panel p-3">
                        <p className="col-span-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                            <TrendingUp className="size-4" /> Produksi shift {prod ? `· per ${clock(prod.at)}` : ''}
                        </p>
                        <Stat label="Ritase" value={prod ? num(prod.rit) : '-'} target={duty?.targetRit} />
                        <Stat label="Tonase" value={prod ? `${num(prod.ton)} t` : '-'} target={duty?.targetTon} unit="t" />
                        <Stat label="Cycle time" value={prod?.avgCycleMs ? `${num(prod.avgCycleMs / 60000)} mnt` : '-'} />
                        <Stat label="Kecepatan unit" value={pos ? `${pos.speed} km/j` : '-'} icon={<Navigation className="size-3.5" />} />
                    </section>
                </aside>

                {/* Kanan: pilih status atau lokasi */}
                {view === 'lokasi' ? (
                    <LocationView bootstrap={bootstrap} pos={pos} online={online} now={now} />
                ) : (
                    <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
                        <div className="grid grid-cols-4 gap-2" role="tablist">
                            {CATEGORY_ORDER.map((c) => {
                                const t = TONE[CATEGORY[c].tone];
                                return (
                                    <button
                                        key={c}
                                        role="tab"
                                        aria-selected={tab === c}
                                        onClick={() => setTab(c)}
                                        className={cn(
                                            'min-h-14 rounded-xl px-2 text-center text-[clamp(0.9rem,1.9vh,1.15rem)] font-bold leading-tight transition active:scale-95',
                                            tab === c ? t.solid : `bg-panel ${t.text}`,
                                        )}
                                    >
                                        {CATEGORY[c].label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="grid min-h-0 grid-cols-3 gap-3" style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
                            {codes.map((c) => {
                                const t = TONE[CATEGORY[c.category].tone];
                                const active = c.code === current?.delayCode;
                                return (
                                    <button
                                        key={c.code}
                                        type="button"
                                        onClick={() => press(c)}
                                        aria-pressed={active}
                                        className={cn(
                                            'flex min-h-0 flex-col items-start justify-between gap-1 overflow-hidden rounded-2xl p-3 text-left transition active:scale-[0.97]',
                                            active ? `${t.solid} ring-4 ${t.ring}` : 'bg-panel hover:bg-panel-2',
                                        )}
                                    >
                                        <DelayIcon name={c.icon} className={cn('size-[clamp(1.5rem,4vh,2.5rem)] shrink-0', active ? '' : t.text)} />
                                        <span className="text-[clamp(1rem,2.4vh,1.5rem)] font-bold leading-tight">{c.name}</span>
                                    </button>
                                );
                            })}
                            {codes.length === 0 && <p className="col-span-3 text-muted">Belum ada delay code di kategori ini.</p>}
                        </div>
                    </section>
                )}
            </div>

            {confirm && (
                <Confirm
                    title={`Lapor ${confirm.name}?`}
                    body="Unit dianggap breakdown dan berhenti produksi sampai status diganti. Dispatcher & mekanik menerima informasi saat ada sinyal."
                    yes="Ya, unit breakdown"
                    danger
                    onYes={() => {
                        onStatus(confirm);
                        setConfirm(null);
                    }}
                    onNo={() => setConfirm(null)}
                />
            )}
            {askLogout && (
                <Confirm
                    title="Ganti operator?"
                    body={pending > 0 ? `${pending} status belum terkirim. Tetap aman, dikirim otomatis saat ada sinyal.` : 'Status unit tetap seperti sekarang.'}
                    yes="Keluar"
                    onYes={() => {
                        setAskLogout(false);
                        onLogout();
                    }}
                    onNo={() => setAskLogout(false)}
                />
            )}
        </main>
    );
}

function Stat({ label, value, target, unit, icon }: { label: string; value: string; target?: number | null; unit?: string; icon?: React.ReactNode }) {
    return (
        <div className="min-w-0 rounded-xl bg-panel-2 p-2.5">
            <p className="flex items-center gap-1 truncate text-xs text-muted">{icon}{label}</p>
            <p className="truncate text-[clamp(1.1rem,2.6vh,1.6rem)] font-bold leading-tight">{value}</p>
            {target ? <p className="truncate text-xs text-muted">target {num(target)}{unit ? ` ${unit}` : ''}</p> : null}
        </div>
    );
}

function Confirm({
    title, body, yes, danger, onYes, onNo,
}: {
    title: string;
    body: string;
    yes: string;
    danger?: boolean;
    onYes: () => void;
    onNo: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[2000] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={title}>
            <div className="w-full max-w-md rounded-2xl bg-panel p-6 shadow-2xl">
                <h2 className="text-2xl font-bold">{title}</h2>
                <p className="mt-2 text-lg text-muted">{body}</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                    <button type="button" onClick={onNo} className="min-h-16 rounded-xl bg-panel-2 text-xl font-bold active:scale-95">
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={onYes}
                        className={cn('min-h-16 rounded-xl text-xl font-bold active:scale-95', danger ? 'bg-red-500 text-red-950' : 'bg-brand text-brand-foreground')}
                    >
                        {yes}
                    </button>
                </div>
            </div>
        </div>
    );
}
