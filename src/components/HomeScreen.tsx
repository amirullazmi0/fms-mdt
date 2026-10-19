'use client';

import { ArrowRight, LogOut, MapPin, Timer, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CATEGORY, CATEGORY_ORDER, TONE, UNIT_TYPE, clock, duration, num } from '@/lib/labels';
import type { DelayCategory, DelayCode, LocalStatus, MdtBootstrap, MdtOperator } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DelayIcon } from './icons';
import { SyncBadge } from './SyncBadge';

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
    const [tab, setTab] = useState<DelayCategory>(current?.category ?? 'working');
    const [confirm, setConfirm] = useState<DelayCode | null>(null);
    const [askLogout, setAskLogout] = useState(false);
    const byCategory = useMemo(() => {
        const m: Record<DelayCategory, DelayCode[]> = { working: [], standby_planned: [], standby_unplanned: [], breakdown: [] };
        (bootstrap?.delayCodes ?? []).forEach((c) => m[c.category]?.push(c));
        return m;
    }, [bootstrap]);

    const unit = bootstrap?.unit;
    const duty = bootstrap?.duty;
    const prod = bootstrap?.production;
    const tone = current ? TONE[CATEGORY[current.category].tone] : null;

    const press = (c: DelayCode) => {
        if (c.code === current?.delayCode) return;
        // Breakdown berhenti produksi: minta konfirmasi biar nggak kepencet.
        if (c.category === 'breakdown') setConfirm(c);
        else onStatus(c);
    };

    return (
        <main className="flex min-h-full flex-col gap-4 p-4 lg:p-5">
            {/* Unit, operator, penugasan */}
            <header className="flex flex-wrap items-center gap-3">
                <div className="mr-auto min-w-0">
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted">
                        {UNIT_TYPE[unit?.unitType ?? 'DT'] ?? 'Unit'} · {operator?.name ?? '-'}
                    </p>
                    <h1 className="truncate text-3xl font-bold">{unit?.label ?? 'Unit'}</h1>
                </div>
                <SyncBadge online={online} pending={pending} lastSync={lastSync} syncing={syncing} onSync={onSync} now={now} />
                <button
                    type="button"
                    onClick={() => setAskLogout(true)}
                    className="flex min-h-14 items-center gap-2 rounded-xl border border-line bg-panel px-4 font-semibold active:scale-95"
                >
                    <LogOut className="size-6" /> Ganti Operator
                </button>
            </header>

            <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
                <aside className="flex flex-col gap-4">
                    {/* Status sekarang */}
                    <section className={cn('rounded-2xl p-5 ring-2', tone ? `${tone.soft} ${tone.ring}` : 'bg-panel ring-line')}>
                        <p className="text-sm font-semibold uppercase tracking-wide opacity-80">Status sekarang</p>
                        {current ? (
                            <>
                                <p className="mt-1 text-sm font-semibold uppercase">{CATEGORY[current.category].label}</p>
                                <p className="text-4xl font-black leading-tight text-fg">{current.name}</p>
                                <p className="mt-3 flex items-center gap-2 font-mono text-4xl font-bold text-fg">
                                    <Timer className="size-8" /> {duration(now - current.since)}
                                </p>
                                <p className="mt-1 text-sm opacity-80">Mulai {clock(current.since)}</p>
                            </>
                        ) : (
                            <p className="mt-2 text-xl font-semibold text-fg">Belum ada status. Pilih status di samping.</p>
                        )}
                    </section>

                    {/* Penugasan */}
                    <section className="rounded-2xl bg-panel p-5">
                        <p className="text-sm font-semibold uppercase tracking-wide text-muted">Penugasan</p>
                        {duty ? (
                            <>
                                <p className="mt-1 text-xl font-bold">
                                    {duty.shiftName}
                                    <span className={cn('ml-2 rounded-md px-2 py-0.5 text-sm', duty.shiftStatus === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-panel-2 text-muted')}>
                                        {duty.shiftStatus === 'active' ? 'Berjalan' : `Mulai ${clock(duty.plannedStart)}`}
                                    </span>
                                </p>
                                <p className="mt-1 text-muted">Fleet {duty.routeName}</p>
                                <p className="mt-3 flex flex-wrap items-center gap-2 text-lg font-semibold">
                                    <MapPin className="size-5 text-emerald-400" /> {duty.loadingName}
                                    <ArrowRight className="size-5 text-muted" />
                                    <MapPin className="size-5 text-orange-400" /> {duty.unloadingName}
                                </p>
                            </>
                        ) : (
                            <p className="mt-1 text-lg">Unit belum ada penugasan shift.</p>
                        )}
                    </section>

                    {/* Produksi shift */}
                    <section className="rounded-2xl bg-panel p-5">
                        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
                            <TrendingUp className="size-4" /> Produksi shift
                        </p>
                        {prod ? (
                            <div className="mt-2 grid grid-cols-2 gap-3">
                                <Stat label="Ritase" value={num(prod.rit)} target={duty?.targetRit} />
                                <Stat label="Tonase" value={`${num(prod.ton, 0)} t`} target={duty?.targetTon} unit="t" />
                                <Stat label="Cycle time" value={prod.avgCycleMs ? `${num(prod.avgCycleMs / 60000, 0)} mnt` : '-'} />
                                <Stat label="Truck factor" value={`${num(unit?.payloadTon ?? 0, 0)} t`} />
                                <p className="col-span-2 text-sm text-muted">Data per {clock(prod.at)} · bertambah saat data GPS masuk</p>
                            </div>
                        ) : (
                            <p className="mt-1 text-muted">Muncul setelah shift berjalan dan ada sinyal.</p>
                        )}
                    </section>
                </aside>

                {/* Pilih status */}
                <section className="flex min-w-0 flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4" role="tablist">
                        {CATEGORY_ORDER.map((c) => {
                            const t = TONE[CATEGORY[c].tone];
                            return (
                                <button
                                    key={c}
                                    role="tab"
                                    aria-selected={tab === c}
                                    onClick={() => setTab(c)}
                                    className={cn(
                                        'min-h-16 rounded-xl px-3 text-left text-lg font-bold transition active:scale-95',
                                        tab === c ? t.solid : `bg-panel ${t.text}`,
                                    )}
                                >
                                    {CATEGORY[c].label}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-muted">{CATEGORY[tab].hint}</p>
                    <div className="grid flex-1 auto-rows-[minmax(6.5rem,auto)] grid-cols-2 content-start gap-3 md:grid-cols-3">
                        {byCategory[tab].map((c) => {
                            const t = TONE[CATEGORY[c.category].tone];
                            const active = c.code === current?.delayCode;
                            return (
                                <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => press(c)}
                                    aria-pressed={active}
                                    className={cn(
                                        'flex flex-col items-start justify-between gap-2 rounded-2xl p-4 text-left transition active:scale-[0.97]',
                                        active ? `${t.solid} ring-4 ${t.ring}` : 'bg-panel hover:bg-panel-2',
                                    )}
                                >
                                    <DelayIcon name={c.icon} className={cn('size-9', active ? '' : t.text)} />
                                    <span className="text-xl font-bold leading-tight">{c.name}</span>
                                </button>
                            );
                        })}
                        {byCategory[tab].length === 0 && <p className="col-span-full text-muted">Belum ada delay code di kategori ini.</p>}
                    </div>
                </section>
            </div>

            {confirm && (
                <Confirm
                    title={`Lapor ${confirm.name}?`}
                    body="Unit dianggap breakdown dan berhenti produksi sampai status diganti. Dispatcher & mekanik dapat info saat ada sinyal."
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

function Stat({ label, value, target, unit }: { label: string; value: string; target?: number | null; unit?: string }) {
    return (
        <div className="rounded-xl bg-panel-2 p-3">
            <p className="text-sm text-muted">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {target ? <p className="text-sm text-muted">Target {num(target, 0)}{unit ? ` ${unit}` : ''}</p> : null}
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={title}>
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
