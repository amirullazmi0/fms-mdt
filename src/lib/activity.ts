// Lagi ngapain unit & di mana, dari posisi terhadap front loading / dumping rute (plus zona antre /
// spot) dan arah hadap. Logika sama dengan fms-supervisor src/lib/activity.ts.
import type { MdtPosition, MdtSite, SiteZone } from './types';

export type ActivityKind = 'loading' | 'dumping' | 'queue' | 'site' | 'hauling' | 'return' | 'stopped' | 'nodata';

export interface Activity {
    kind: ActivityKind;
    label: string;
    detail: string | null;
}

const STILL_KMH = 3;
const APPROACH_M = 300;

type LatLng = { lat: number; lng: number };

export function distanceM(a: LatLng, b: LatLng): number {
    const r = Math.PI / 180;
    const x = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(x));
}

export function bearing(a: LatLng, b: LatLng): number {
    const r = Math.PI / 180;
    const y = Math.sin((b.lng - a.lng) * r) * Math.cos(b.lat * r);
    const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lng - a.lng) * r);
    return ((Math.atan2(y, x) / r) + 360) % 360;
}

const angleDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

export const km = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} km`);

const inZone = (p: LatLng, zones: SiteZone[], kind: SiteZone['kind']) => zones.some((z) => z.kind === kind && distanceM(p, z) <= z.radius);

function atSite(p: LatLng, speed: number, s: MdtSite, work: 'loading' | 'dumping'): Activity | null {
    const d = distanceM(p, s);
    const hasQueue = s.zones.some((z) => z.kind === 'queue');
    const hasSpot = s.zones.some((z) => z.kind === 'spot');
    const verb = work === 'loading' ? 'Loading' : 'Dumping';
    if (inZone(p, s.zones, 'spot')) return { kind: work, label: `${verb} di ${s.name}`, detail: null };
    if (inZone(p, s.zones, 'queue')) return { kind: 'queue', label: `Antre di ${s.name}`, detail: null };
    if (d <= s.radius) {
        if (hasSpot || speed >= STILL_KMH) return { kind: 'site', label: `Manuver di ${s.name}`, detail: null };
        return { kind: work, label: `${verb} / antre di ${s.name}`, detail: null };
    }
    if (!hasQueue && speed < STILL_KMH && d <= s.radius + APPROACH_M) return { kind: 'queue', label: `Antre di ${s.name}`, detail: `${km(d)} dari titik` };
    return null;
}

export function activityOf(p: MdtPosition | null, from: MdtSite | undefined, to: MdtSite | undefined): Activity {
    if (!p) return { kind: 'nodata', label: 'Posisi belum ada', detail: 'Nyalakan GPS tablet' };
    if (!from || !to) return { kind: p.speed >= STILL_KMH ? 'hauling' : 'stopped', label: p.speed >= STILL_KMH ? 'Jalan' : 'Diam', detail: 'Belum ada penugasan rute' };
    const site = atSite(p, p.speed, from, 'loading') ?? atSite(p, p.speed, to, 'dumping');
    if (site) return site;
    const toU = distanceM(p, to);
    const toL = distanceM(p, from);
    if (p.speed < STILL_KMH) {
        const near = toU < toL ? to : from;
        return { kind: 'stopped', label: 'Berhenti di jalan', detail: `${km(Math.min(toU, toL))} dari ${near.name}` };
    }
    const heading = p.angle ?? bearing(p, to);
    const goingToU = angleDiff(heading, bearing(p, to)) <= angleDiff(heading, bearing(p, from));
    return goingToU
        ? { kind: 'hauling', label: `Hauling → ${to.name}`, detail: `${km(toU)} lagi` }
        : { kind: 'return', label: `Return → ${from.name}`, detail: `${km(toL)} lagi` };
}

/** Posisi unit di antara front loading (0) dan dumping (1). */
export function progressOf(p: MdtPosition | null, from: MdtSite | undefined, to: MdtSite | undefined): number | null {
    if (!p || !from || !to) return null;
    const a = distanceM(p, from);
    const b = distanceM(p, to);
    return a + b > 0 ? Math.min(1, Math.max(0, a / (a + b))) : 0;
}
