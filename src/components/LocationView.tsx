'use client';
// Lokasi unit di MDT, dari alat GPS (tracker) di unit tersebut, bukan dari tablet. Skema
// front loading ●──🚚──● dumping selalu tampil; peta muncul bila ada sinyal (tile yang pernah dibuka
// disimpan service worker). Tanpa sinyal: posisi terakhir yang diterima, ditandai jam datanya.
import { LocateFixed, MapPin, Navigation, Route, Satellite, Truck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { activityOf, distanceM, km, progressOf } from '@/lib/activity';
import { clock } from '@/lib/labels';
import type { MdtBootstrap, MdtPosition, MdtSite } from '@/lib/types';
import { cn } from '@/lib/utils';

// Data posisi lebih lama dari ini = kemungkinan unit di blank spot (alat simpan data, kirim nanti).
const STALE_MS = 2 * 60_000;

const TONE: Record<string, string> = {
    loading: 'bg-emerald-500/20 text-emerald-300',
    dumping: 'bg-emerald-500/20 text-emerald-300',
    hauling: 'bg-sky-500/20 text-sky-300',
    return: 'bg-sky-500/20 text-sky-300',
    queue: 'bg-amber-400/20 text-amber-200',
    stopped: 'bg-amber-400/20 text-amber-200',
    site: 'bg-panel-2 text-fg',
    nodata: 'bg-panel-2 text-muted',
};

export function LocationView({
    bootstrap, pos, online, now,
}: {
    bootstrap: MdtBootstrap | null;
    pos: MdtPosition | null;
    online: boolean;
    now: number;
}) {
    const duty = bootstrap?.duty;
    const from = duty?.loading;
    const to = duty?.unloading;
    const stale = !pos || now - pos.time > STALE_MS;
    const act = activityOf(pos, from, to);
    const p = progressOf(pos, from, to);

    return (
        <div className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3">
            {/* Aktivitas sekarang */}
            <div className={cn('flex items-center gap-3 rounded-2xl p-4', TONE[act.kind])}>
                <Navigation className="size-8 shrink-0" />
                <div className="min-w-0">
                    <p className="truncate text-[clamp(1.25rem,2.6vh,2rem)] font-black leading-tight text-fg">{act.label}</p>
                    <p className="truncate text-sm">
                        {[act.detail, pos ? `${pos.speed} km/jam` : null].filter(Boolean).join(' · ')}
                    </p>
                </div>
            </div>

            {/* Skema rute: front loading → dumping */}
            {from && to ? (
                <div className="rounded-2xl bg-panel px-5 py-4">
                    <div className="relative mx-3 h-10">
                        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[repeating-linear-gradient(90deg,var(--muted)_0_6px,transparent_6px_12px)] opacity-60" />
                        <span className="absolute left-0 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/25" />
                        <span className="absolute right-0 top-1/2 size-4 -translate-y-1/2 translate-x-1/2 rounded-full bg-orange-400 ring-4 ring-orange-400/25" />
                        {p != null && (
                            <span className="absolute top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl bg-brand text-brand-foreground shadow-lg" style={{ left: `${p * 100}%` }}>
                                <Truck className="size-6" />
                            </span>
                        )}
                    </div>
                    <div className="mt-2 flex justify-between gap-4 text-sm">
                        <span className="min-w-0">
                            <b className="block truncate text-base">{from.name}</b>
                            <span className="text-muted">Front loading · r {from.radius} m{pos ? ` · ${where(pos, from)}` : ''}</span>
                        </span>
                        <span className="min-w-0 text-right">
                            <b className="block truncate text-base">{to.name}</b>
                            <span className="text-muted">Dumping · r {to.radius} m{pos ? ` · ${where(pos, to)}` : ''}</span>
                        </span>
                    </div>
                </div>
            ) : (
                <p className="rounded-2xl bg-panel p-4 text-muted">Unit belum ada penugasan rute, jadi posisi front & dumping belum diketahui.</p>
            )}

            {/* Peta: front loading & dumping + radiusnya, zona antre / spot, dan unit. Tanpa sinyal
                tile bisa kosong, tetapi titik, radius & unit tetap terlihat. */}
            <div className="relative min-h-0 overflow-hidden rounded-2xl bg-panel">
                {pos || (from && to) ? (
                    <MiniMap pos={pos} from={from} to={to} />
                ) : (
                    <div className="grid h-full place-items-center p-4 text-center text-muted">
                        <span>
                            <MapPin className="mx-auto mb-2 size-10" />
                            Menunggu posisi dari alat GPS unit…
                        </span>
                    </div>
                )}
                {!online && (
                    <span className="absolute right-2 top-2 z-[1000] rounded-lg bg-bg/85 px-2 py-1 text-xs text-amber-200">Tanpa sinyal: peta dasar mungkin kosong</span>
                )}
                <div className="absolute bottom-2 left-2 right-2 z-[1000] flex flex-wrap items-center gap-2 rounded-xl bg-bg/85 px-3 py-2 text-sm backdrop-blur">
                    <Satellite className={cn('size-4', stale ? 'text-amber-300' : 'text-emerald-400')} />
                    <span className="font-mono">{pos ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : '—'}</span>
                    <span className={stale ? 'text-amber-200' : 'text-muted'}>
                        {!pos ? 'Alat GPS unit belum kirim posisi' : stale ? `Posisi terakhir ${clock(pos.time)} (unit di blank spot / belum sync)` : `Alat GPS unit · ${clock(pos.time)}`}
                    </span>
                </div>
            </div>
        </div>
    );
}

// "di dalam radius" / "150 m dari tepi radius" / "2,4 km".
function where(p: MdtPosition, s: MdtSite): string {
    const d = distanceM(p, s);
    if (d <= s.radius) return 'di dalam radius';
    return d - s.radius < 1000 ? `${km(d - s.radius)} dari tepi` : km(d);
}

const LOADING = '#34d399';
const DUMPING = '#fb923c';
const ZONE = { queue: '#fbbf24', spot: '#38bdf8' } as const;

// Penanda titik: huruf L / D di bulatan warna, plus label nama + radius yang selalu tampil.
function sitePin(color: string, letter: string): string {
    return `<div style="width:30px;height:30px;border-radius:50%;background:${color};border:3px solid #0b0d10;color:#0b0d10;font:800 15px/24px system-ui;text-align:center;box-shadow:0 2px 6px rgb(0 0 0/.5)">${letter}</div>`;
}

function unitPin(angle: number | null): string {
    const arrow = angle == null ? '' : `<div style="position:absolute;left:50%;top:-11px;margin-left:-7px;border:7px solid transparent;border-bottom:11px solid #ffc928;transform-origin:7px 29px;transform:rotate(${angle}deg)"></div>`;
    return `<div style="position:relative;width:34px;height:34px">${arrow}<div style="width:34px;height:34px;border-radius:50%;background:#ffc928;border:3px solid #0b0d10;box-shadow:0 0 0 5px rgb(255 201 40/.35);display:grid;place-items:center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0b0d10" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></div></div>`;
}

// Peta Leaflet: front loading (hijau, L) & dumping (oranye, D) dengan lingkaran radius yang jelas,
// zona antre / spot (putus-putus), dan unit (panah = arah hadap). Leaflet di-load di browser saja.
function MiniMap({ pos, from, to }: { pos: MdtPosition | null; from?: MdtSite; to?: MdtSite }) {
    const el = useRef<HTMLDivElement>(null);
    const map = useRef<import('leaflet').Map | null>(null);
    const unit = useRef<import('leaflet').Marker | null>(null);
    const L = useRef<typeof import('leaflet') | null>(null);
    const [follow, setFollow] = useState(false);

    // Seluruh rute (dua titik + radius) dan unit masuk layar.
    const fitAll = () => {
        const m = map.current;
        const leaflet = L.current;
        if (!m || !leaflet) return;
        const pts: [number, number][] = [];
        for (const s of [from, to]) {
            if (!s) continue;
            const b = leaflet.latLng(s.lat, s.lng).toBounds(s.radius * 2.4);
            pts.push([b.getNorth(), b.getWest()], [b.getSouth(), b.getEast()]);
        }
        if (pos) pts.push([pos.lat, pos.lng]);
        if (pts.length) m.fitBounds(pts, { padding: [40, 40], maxZoom: 17 });
    };

    useEffect(() => {
        let alive = true;
        (async () => {
            const leaflet = await import('leaflet');
            if (!alive || !el.current) return;
            L.current = leaflet;
            const start = pos ?? from ?? to!;
            const m = leaflet.map(el.current, { zoomControl: false, attributionControl: false }).setView([start.lat, start.lng], 15);
            leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
            m.on('dragstart', () => setFollow(false));

            const site = (s: MdtSite, color: string, letter: string, role: string) => {
                // Radius titik: garis tebal + isi, supaya batas "masuk titik" jelas.
                leaflet.circle([s.lat, s.lng], { radius: s.radius, color, weight: 3, fillColor: color, fillOpacity: 0.18 }).addTo(m);
                leaflet.circle([s.lat, s.lng], { radius: s.radius, color: '#0b0d10', weight: 1, fill: false, dashArray: '2 6' }).addTo(m);
                leaflet
                    .marker([s.lat, s.lng], { icon: leaflet.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15], html: sitePin(color, letter) }), zIndexOffset: 500 })
                    .bindTooltip(`<b>${role}</b> · ${s.name}<br/>radius ${s.radius} m`, { permanent: true, direction: 'top', offset: [0, -16], className: 'mdt-tip' })
                    .addTo(m);
                for (const z of s.zones) {
                    const c = ZONE[z.kind];
                    leaflet
                        .circle([z.lat, z.lng], { radius: z.radius, color: c, weight: 2, dashArray: '6 6', fillColor: c, fillOpacity: 0.12 })
                        .bindTooltip(`${z.kind === 'queue' ? 'Zona antre' : 'Zona spot'} · r ${z.radius} m`, { permanent: true, direction: 'center', className: 'mdt-tip mdt-tip-sm' })
                        .addTo(m);
                }
            };
            if (from) site(from, LOADING, 'L', 'Front loading');
            if (to) site(to, DUMPING, 'D', 'Dumping');
            if (pos) {
                unit.current = leaflet
                    .marker([pos.lat, pos.lng], { icon: leaflet.divIcon({ className: '', iconSize: [34, 34], iconAnchor: [17, 17], html: unitPin(pos.angle) }), zIndexOffset: 1000 })
                    .addTo(m);
            }
            map.current = m;
            fitAll();
        })();
        return () => {
            alive = false;
            map.current?.remove();
            map.current = null;
            unit.current = null;
        };
        // peta dibuat ulang hanya bila rutenya berganti; posisi unit digeser di effect bawah
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [from?.id, to?.id, from?.radius, to?.radius]);

    useEffect(() => {
        const m = map.current;
        const leaflet = L.current;
        if (!m || !leaflet || !pos) return;
        const icon = leaflet.divIcon({ className: '', iconSize: [34, 34], iconAnchor: [17, 17], html: unitPin(pos.angle) });
        if (unit.current) unit.current.setLatLng([pos.lat, pos.lng]).setIcon(icon);
        else unit.current = leaflet.marker([pos.lat, pos.lng], { icon, zIndexOffset: 1000 }).addTo(m);
        if (follow) m.panTo([pos.lat, pos.lng], { animate: true });
    }, [pos?.lat, pos?.lng, pos?.angle, follow, pos]);

    const btn = 'flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold shadow-lg active:scale-95';
    return (
        <>
            <div ref={el} className="h-full w-full bg-[#1b1f26]" aria-label="Peta lokasi unit" />
            {/* Legenda */}
            <div className="absolute left-2 top-2 z-[1000] flex flex-col gap-1 rounded-xl bg-bg/85 px-3 py-2 text-xs backdrop-blur">
                {from && <span className="flex items-center gap-2"><i className="size-3 rounded-full" style={{ background: LOADING }} /> L · Front loading · r {from.radius} m</span>}
                {to && <span className="flex items-center gap-2"><i className="size-3 rounded-full" style={{ background: DUMPING }} /> D · Dumping · r {to.radius} m</span>}
                {[from, to].some((s) => s?.zones.length) && (
                    <span className="flex items-center gap-2 text-muted"><i className="size-3 rounded-full border-2 border-dashed" style={{ borderColor: ZONE.queue }} /> antre <i className="size-3 rounded-full border-2 border-dashed" style={{ borderColor: ZONE.spot }} /> spot</span>
                )}
            </div>
            {/* Kontrol */}
            <div className="absolute bottom-16 right-2 z-[1000] flex flex-col gap-2">
                <button type="button" onClick={() => { setFollow(false); fitAll(); }} className={cn(btn, 'bg-panel text-fg')}>
                    <Route className="size-4" /> Rute
                </button>
                {pos && (
                    <button type="button" onClick={() => { setFollow(true); map.current?.setView([pos.lat, pos.lng], 17); }} className={cn(btn, follow ? 'bg-brand text-brand-foreground' : 'bg-panel text-fg')}>
                        <LocateFixed className="size-4" /> Ikuti unit
                    </button>
                )}
            </div>
        </>
    );
}
