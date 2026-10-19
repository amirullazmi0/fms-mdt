import type { MetadataRoute } from 'next';

// PWA: bisa di-install di tablet Android, buka fullscreen landscape seperti aplikasi.
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'FMS MDT - Status Unit',
        short_name: 'MDT',
        description: 'Mobile Data Terminal: operator lapor status unit (operasi, standby, breakdown). Jalan tanpa sinyal.',
        start_url: '/',
        scope: '/',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#0b0d10',
        theme_color: '#0b0d10',
        lang: 'id',
        icons: [
            { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
    };
}
