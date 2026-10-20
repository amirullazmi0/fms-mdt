'use client';

import { HardHat } from 'lucide-react';
import { useState } from 'react';
import { UNIT_TYPE } from '@/lib/labels';
import type { MdtBootstrap } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Keypad } from './Keypad';
import { SyncBadge } from './SyncBadge';

// Operator yang tampil sebagai pilihan cepat (sisanya cukup ketik NIK). Dibatasi supaya muat 1 layar.
const MAX_CHIPS = 6;

export function LoginScreen({
    bootstrap, online, pending, lastSync, onLogin,
}: {
    bootstrap: MdtBootstrap | null;
    online: boolean;
    pending: number;
    lastSync: number | null;
    onLogin: (employeeNo: string, pin: string) => Promise<string | null>;
}) {
    const [employeeNo, setEmployeeNo] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const duty = bootstrap?.duty;
    // Operator yang dijadwalkan di unit ini muncul paling depan.
    const operators = [...(bootstrap?.operators ?? [])]
        .sort((a, b) => Number(b.id === duty?.driverId) - Number(a.id === duty?.driverId))
        .slice(0, MAX_CHIPS);

    const submit = async () => {
        if (!employeeNo.trim() || pin.length < 4 || busy) return;
        setBusy(true);
        setError(null);
        const err = await onLogin(employeeNo.trim(), pin);
        setBusy(false);
        if (err) {
            setError(err);
            setPin('');
        }
    };

    return (
        <main className="mx-auto grid h-dvh w-full max-w-6xl grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden p-4">
            <header className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{UNIT_TYPE[bootstrap?.unit.unitType ?? 'DT'] ?? 'Unit'}</p>
                    <h1 className="truncate text-[clamp(1.5rem,3.6vh,2.25rem)] font-bold leading-tight">{bootstrap?.unit.label ?? 'Unit'}</h1>
                </div>
                <SyncBadge online={online} pending={pending} lastSync={lastSync} />
            </header>

            <div className="grid min-h-0 gap-4 md:grid-cols-2 md:gap-8">
                <section className="flex min-h-0 flex-col overflow-hidden">
                    <h2 className="flex items-center gap-2 text-xl font-bold">
                        <HardHat className="size-6 text-brand" /> Login Operator
                    </h2>
                    <p className="mt-1 truncate text-muted">
                        {duty ? <>{duty.shiftName} · {duty.routeName} · terjadwal: <b className="text-fg">{duty.driverName}</b></> : 'Unit belum ada penugasan shift.'}
                    </p>
                    <label className="mt-3 block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted">NIK</span>
                        <input
                            value={employeeNo}
                            onChange={(e) => setEmployeeNo(e.target.value)}
                            maxLength={30}
                            autoComplete="off"
                            placeholder="Nomor induk karyawan"
                            className="mt-1 h-14 w-full rounded-xl border border-line bg-panel px-4 text-2xl font-semibold outline-none focus:ring-2 focus:ring-brand"
                        />
                    </label>
                    {operators.length > 0 && (
                        <div className="mt-3 grid min-h-0 grid-cols-2 content-start gap-2 overflow-hidden">
                            {operators.map((o) => (
                                <button
                                    key={o.id}
                                    type="button"
                                    onClick={() => setEmployeeNo(o.employeeNo ?? '')}
                                    disabled={!o.employeeNo}
                                    className={cn(
                                        'min-h-14 min-w-0 rounded-xl border px-3 text-left transition active:scale-95',
                                        o.employeeNo && o.employeeNo === employeeNo ? 'border-brand bg-brand/15' : 'border-line bg-panel',
                                    )}
                                >
                                    <span className="block truncate font-semibold">{o.name}</span>
                                    <span className="block truncate text-sm text-muted">{o.employeeNo ?? 'tanpa NIK'}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                <section className="flex min-h-0 flex-col gap-3">
                    <div className="flex h-14 shrink-0 items-center justify-center gap-3 rounded-xl border-2 border-line bg-panel">
                        {pin ? pin.split('').map((_, i) => <span key={i} className="size-4 rounded-full bg-fg" />) : <span className="text-muted">PIN 4–8 angka</span>}
                    </div>
                    {error && <p className="shrink-0 rounded-xl bg-red-500/15 p-2 text-center font-medium text-red-300">{error}</p>}
                    <Keypad className="flex-1" value={pin} max={8} onChange={setPin} onSubmit={submit} submitLabel={busy ? 'Masuk…' : 'Masuk'} disabled={busy} />
                </section>
            </div>
        </main>
    );
}
