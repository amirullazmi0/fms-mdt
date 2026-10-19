import {
    Circle, CircleDot, ClipboardCheck, CloudRain, Cog, Construction, Download, Droplet, Fuel, Hourglass, ListOrdered, Moon,
    Radio, Repeat, Shield, Truck, Undo2, Upload, Utensils, Wrench, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Nama ikon di master delay code (kolom icon) → komponen lucide.
const ICONS: Record<string, LucideIcon> = {
    truck: Truck,
    download: Download,
    upload: Upload,
    undo: Undo2,
    'clipboard-check': ClipboardCheck,
    utensils: Utensils,
    moon: Moon,
    repeat: Repeat,
    shield: Shield,
    'list-ordered': ListOrdered,
    hourglass: Hourglass,
    fuel: Fuel,
    'cloud-rain': CloudRain,
    construction: Construction,
    radio: Radio,
    cog: Cog,
    'circle-dot': CircleDot,
    droplet: Droplet,
    zap: Zap,
    wrench: Wrench,
};

export function DelayIcon({ name, className }: { name: string | null; className?: string }) {
    const Icon = (name && ICONS[name]) || Circle;
    return <Icon className={className} strokeWidth={2.2} aria-hidden />;
}
