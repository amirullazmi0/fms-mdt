import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata: Metadata = {
    title: 'MDT',
    description: 'Mobile Data Terminal unit: lapor status operasi, standby, breakdown',
    icons: { icon: '/icon.svg' },
    appleWebApp: { capable: true, title: 'MDT', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#0b0d10',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="id">
            <body>
                {children}
                <Toaster theme="dark" position="top-center" richColors toastOptions={{ style: { fontSize: 18 } }} />
            </body>
        </html>
    );
}
