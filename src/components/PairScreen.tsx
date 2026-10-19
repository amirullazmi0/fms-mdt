'use client';

import { Link2 } from 'lucide-react';
import { useState } from 'react';
import { errText } from '@/lib/api';
import { Keypad } from './Keypad';

export function PairScreen({ onPair }: { onPair: (code: string, name: string) => Promise<unknown> }) {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (code.length !== 6 || busy) return;
        setBusy(true);
        setError(null);
        try {
            await onPair(code, name.trim());
        } catch (err) {
            setError(errText(err, 'Kode pairing salah'));
            setCode('');
        } finally {
            setBusy(false);
        }
    };

    return (
        <main className="mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center gap-8 p-6 lg:flex-row lg:items-center lg:gap-14">
            <div className="max-w-sm text-center lg:text-left">
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-brand text-brand-foreground lg:mx-0">
                    <Link2 className="size-8" />
                </div>
                <h1 className="text-3xl font-bold">Pasangkan Tablet ke Unit</h1>
                <p className="mt-3 text-lg text-muted">
                    Minta <b className="text-fg">kode pairing 6 digit</b> ke supervisor / dispatcher
                    (menu <b className="text-fg">Unit → Pairing MDT</b>). Kode berlaku 10 menit dan butuh sinyal.
                </p>
                <label className="mt-6 block text-left">
                    <span className="text-sm font-semibold uppercase tracking-wide text-muted">Nama tablet (opsional)</span>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={100}
                        placeholder="mis. MDT DT-05"
                        className="mt-2 h-14 w-full rounded-xl border border-line bg-panel px-4 text-lg outline-none focus:ring-2 focus:ring-brand"
                    />
                </label>
            </div>
            <div className="w-full max-w-sm">
                <div className="mb-4 flex justify-center gap-2" aria-label="Kode pairing">
                    {Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className="grid h-16 w-12 place-items-center rounded-xl border-2 border-line bg-panel font-mono text-3xl font-bold">
                            {code[i] ?? ''}
                        </div>
                    ))}
                </div>
                {error && <p className="mb-3 rounded-xl bg-red-500/15 p-3 text-center font-medium text-red-300">{error}</p>}
                <Keypad value={code} max={6} onChange={setCode} onSubmit={submit} submitLabel={busy ? 'Memasangkan…' : 'Pasangkan'} disabled={busy} />
            </div>
        </main>
    );
}
