'use client';

import { CloudOff, CloudUpload, RefreshCw, Wifi } from 'lucide-react';
import { ago, clock } from '@/lib/labels';
import { cn } from '@/lib/utils';

// Indikator sinkron: berapa status belum terkirim, kapan terakhir sync, ada sinyal atau nggak.
export function SyncBadge({
    online, pending, lastSync, syncing, onSync, now,
}: {
    online: boolean;
    pending: number;
    lastSync: number | null;
    syncing?: boolean;
    onSync?: () => void;
    now?: number;
}) {
    const Icon = syncing ? RefreshCw : !online ? CloudOff : pending > 0 ? CloudUpload : Wifi;
    return (
        <button
            type="button"
            onClick={onSync}
            disabled={!onSync || syncing}
            className={cn(
                'flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left',
                !online ? 'border-amber-400/40 bg-amber-400/10' : pending > 0 ? 'border-sky-400/40 bg-sky-400/10' : 'border-line bg-panel',
            )}
            title="Sinkron sekarang"
        >
            <Icon className={cn('size-6 shrink-0', syncing && 'animate-spin', !online ? 'text-amber-300' : pending ? 'text-sky-300' : 'text-emerald-400')} />
            <span className="hidden leading-tight lg:block">
                <span className="block font-semibold">
                    {!online ? 'Di luar jangkauan sinyal' : pending > 0 ? `Belum terkirim: ${pending}` : 'Tersinkron'}
                </span>
                <span className="block text-sm text-muted">
                    {lastSync ? `Sync terakhir ${clock(lastSync)} (${ago(lastSync, now)})` : 'Belum pernah sync'}
                    {!online && pending > 0 ? ` · ${pending} status menunggu` : ''}
                </span>
            </span>
        </button>
    );
}
