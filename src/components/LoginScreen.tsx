'use client';

import { HardHat } from 'lucide-react';
import { useState } from 'react';
import { UNIT_TYPE } from '@/lib/labels';
import type { MdtBootstrap } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Keypad } from './Keypad';
import { SyncBadge } from './SyncBadge';

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
    const operators = [...(bootstrap?.operators ?? [])].sort((a, b) => Number(b.id === duty?.driverId) - Number(a.id === duty?.driverId));

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
        <main className="mx-auto flex min-h-full max-w-5xl flex-col gap-6 p-6">
            <header className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted">
                        {UNIT_TYPE[bootstrap?.unit.unitType ?? 'DT'] ?? 'Unit'}
                    </p>
                    <h1 className="text-3xl font-bold">{bootstrap?.unit.label ?? 'Unit'}</h1>
                </div>
                <SyncBadge online={online} pending={pending} lastSync={lastSync} />
            </header>

            <div className="grid flex-1 gap-8 lg:grid-cols-2">
                <section>
                    <h2 className="flex items-center gap-2 text-2xl font-bold">
                        <HardHat className="size-7 text-brand" /> Login Operator
                    </h2>
                    {duty ? (
                        <p className="mt-2 text-lg text-muted">
                            {duty.shiftName} · {duty.routeName}. Operator terjadwal: <b className="text-fg">{duty.driverName}</b>
                        </p>
                    ) : (
                        <p className="mt-2 text-lg text-muted">Unit belum ada penugasan shift.</p>
                    )}
                    <label className="mt-6 block">
                        <span className="text-sm font-semibold uppercase tracking-wide text-muted">NIK</span>
                        <input
                            value={employeeNo}
                            onChange={(e) => setEmployeeNo(e.target.value)}
                            maxLength={30}
                            autoComplete="off"
                            placeholder="Nomor induk karyawan"
                            className="mt-2 h-16 w-full rounded-xl border border-line bg-panel px-4 text-2xl font-semibold outline-none focus:ring-2 focus:ring-brand"
                        />
                    </label>
                    {operators.length > 0 && (
                        <div className="mt-4 flex max-h-56 flex-wrap gap-2 overflow-y-auto">
                            {operators.map((o) => (
                                <button
                                    key={o.id}
                                    type="button"
                                    onClick={() => setEmployeeNo(o.employeeNo ?? '')}
                                    disabled={!o.employeeNo}
                                    className={cn(
                                        'min-h-14 rounded-xl border px-4 text-left transition active:scale-95',
                                        o.employeeNo && o.employeeNo === employeeNo ? 'border-brand bg-brand/15' : 'border-line bg-panel',
                                    )}
                                >
                                    <span className="block font-semibold">{o.name}</span>
                                    <span className="block text-sm text-muted">{o.employeeNo ?? 'tanpa NIK'}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                <section className="w-full max-w-sm justify-self-center">
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">PIN</p>
                    <div className="mb-4 flex h-16 items-center justify-center gap-3 rounded-xl border-2 border-line bg-panel">
                        {pin ? pin.split('').map((_, i) => <span key={i} className="size-4 rounded-full bg-fg" />) : <span className="text-muted">4–8 angka</span>}
                    </div>
                    {error && <p className="mb-3 rounded-xl bg-red-500/15 p-3 text-center font-medium text-red-300">{error}</p>}
                    <Keypad value={pin} max={8} onChange={setPin} onSubmit={submit} submitLabel={busy ? 'Masuk…' : 'Masuk'} disabled={busy} />
                </section>
            </div>
        </main>
    );
}
