'use client';
// Alur MDT: pasangkan tablet ke unit → login operator (NIK + PIN) → beranda status.
// Semua data dibaca dari IndexedDB terlebih dahulu, jadi tetap berjalan di pit / tongkang tanpa sinyal.
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useMdt } from '@/lib/useMdt';
import { HomeScreen } from './HomeScreen';
import { LoginScreen } from './LoginScreen';
import { PairScreen } from './PairScreen';

export default function MdtApp() {
    const m = useMdt();

    // Service worker: simpan app di tablet agar tetap dapat dibuka tanpa sinyal (hanya build produksi).
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }, []);

    if (m.phase === 'loading') {
        return (
            <main className="grid h-dvh w-dvw place-items-center overflow-hidden">
                <Loader2 className="size-12 animate-spin text-muted" aria-label="Memuat" />
            </main>
        );
    }
    if (m.phase === 'pair') {
        return (
            <PairScreen
                onPair={async (code, name) => {
                    const r = await m.pair(code, name);
                    toast.success(`Tablet terpasang ke ${r.unit.label}`);
                }}
            />
        );
    }
    if (m.phase === 'login') {
        return <LoginScreen bootstrap={m.bootstrap} online={m.online} pending={m.pending} lastSync={m.lastSync} onLogin={m.login} />;
    }
    return (
        <HomeScreen
            bootstrap={m.bootstrap}
            operator={m.operator}
            current={m.current}
            pending={m.pending}
            lastSync={m.lastSync}
            online={m.online}
            syncing={m.syncing}
            onStatus={(c) => {
                void m.setStatus(c);
                toast(`Status: ${c.name}`, { description: m.online ? 'Dikirim ke dispatcher' : 'Disimpan di tablet, dikirim saat ada sinyal' });
            }}
            onSync={() => void m.sync()}
            onLogout={() => void m.logout()}
        />
    );
}
