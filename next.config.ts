import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    turbopack: {
        rules: {
            '*.css': {
                loaders: ['@tailwindcss/turbopack'],
                as: '*.css',
            },
        },
    },
    // Service worker harus selalu diambil baru (bukan dari cache HTTP), biar update app sampai ke tablet.
    async headers() {
        return [
            {
                source: '/sw.js',
                headers: [
                    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
                    { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
                ],
            },
        ];
    },
};

export default nextConfig;
