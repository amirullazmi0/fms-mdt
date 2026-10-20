'use client';

import { Link2 } from 'lucide-react';
import { useState } from 'react';
import { errText } from '@/lib/api';
import { Keypad } from './Keypad';

// 1 layar penuh: penjelasan di kiri, kode + keypad di kanan (HP: bertumpuk, keypad ikut sisa tinggi).
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
        <main className="mx-auto grid h-dvh w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden p-4 md:grid-cols-2 md:grid-rows-1 md:items-center md:gap-10">
            <div>
                <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-brand text-brand-foreground">
                    <Link2 className="size-7" />
                </div>
                <h1 className="text-[clamp(1.5rem,3.6vh,2.25rem)] font-bold leading-tight">Pasangkan Tablet ke Unit</h1>
                <p className="mt-2 text-muted">
                    Minta <b className="text-fg">kode pairing 6 digit</b> ke supervisor / dispatcher (menu <b className="text-fg">Armada → unit → Tablet MDT</b>).
                    Kode berlaku 10 menit dan butuh sinyal.
                </p>
                <label className="mt-4 block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">Nama tablet (opsional)</span>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={100}
                        placeholder="mis. MDT DT-05"
                        className="mt-1 h-12 w-full rounded-xl border border-line bg-panel px-4 text-lg outline-none focus:ring-2 focus:ring-brand"
                    />
                </label>
            </div>
            <div className="flex h-full min-h-0 flex-col gap-3 md:max-h-[34rem]">
                <div className="flex justify-center gap-2" aria-label="Kode pairing">
                    {Array.from({ length: 6 }, (_, i) => (
                        <div key={i} className="grid h-[clamp(3rem,7vh,4rem)] w-12 place-items-center rounded-xl border-2 border-line bg-panel font-mono text-3xl font-bold">
                            {code[i] ?? ''}
                        </div>
                    ))}
                </div>
                {error && <p className="rounded-xl bg-red-500/15 p-2 text-center font-medium text-red-300">{error}</p>}
                <Keypad className="flex-1" value={code} max={6} onChange={setCode} onSubmit={submit} submitLabel={busy ? 'Memasangkan…' : 'Pasangkan'} disabled={busy} />
            </div>
        </main>
    );
}
