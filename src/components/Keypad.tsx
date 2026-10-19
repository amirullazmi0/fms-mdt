'use client';

import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tombol angka besar: dipencet pakai sarung tangan, di kabin yang goyang.
export function Keypad({
    value, max, onChange, onSubmit, submitLabel, disabled,
}: {
    value: string;
    max: number;
    onChange: (v: string) => void;
    onSubmit: () => void;
    submitLabel: string;
    disabled?: boolean;
}) {
    const press = (d: string) => value.length < max && onChange(value + d);
    const key = 'h-[4.5rem] rounded-2xl bg-panel-2 text-3xl font-bold active:scale-95 active:bg-line transition disabled:opacity-40';
    return (
        <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button key={d} type="button" className={key} onClick={() => press(d)} disabled={disabled}>
                    {d}
                </button>
            ))}
            <button type="button" className={cn(key, 'text-lg text-muted')} onClick={() => onChange('')} disabled={disabled}>
                Hapus
            </button>
            <button type="button" className={key} onClick={() => press('0')} disabled={disabled}>
                0
            </button>
            <button type="button" className={cn(key, 'grid place-items-center')} onClick={() => onChange(value.slice(0, -1))} disabled={disabled} aria-label="Hapus satu angka">
                <Delete className="size-8" />
            </button>
            <button
                type="button"
                onClick={onSubmit}
                disabled={disabled || value.length === 0}
                className="col-span-3 h-[4.5rem] rounded-2xl bg-brand text-2xl font-bold text-brand-foreground transition active:scale-[0.98] disabled:opacity-40"
            >
                {submitLabel}
            </button>
        </div>
    );
}
