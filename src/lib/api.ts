import axios, { AxiosError } from 'axios';
import { kv } from './db';
import type { ApiEnvelope } from './types';

// Token tablet (didapat waktu pairing) dikirim sebagai Bearer. Bukan token user: tablet
// nempel ke satu unit, operator cuma ganti-gantian login di atasnya.
export const TOKEN_KEY = 'tablet.token';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    timeout: 15000,
});

api.interceptors.request.use(async (config) => {
    const token = await kv.get<string>(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export async function get<T>(url: string): Promise<T> {
    const res = await api.get<ApiEnvelope<T>>(url);
    return res.data.data;
}

export async function post<T>(url: string, body: unknown): Promise<T> {
    const res = await api.post<ApiEnvelope<T>>(url, body);
    return res.data.data;
}

/** Nggak ada sinyal / server nggak kejangkau (bukan ditolak server). */
export function isOffline(err: unknown): boolean {
    const e = err as AxiosError;
    return !!e?.isAxiosError && !e.response;
}

/** Tablet dicabut supervisor atau unit dihapus: harus pairing ulang. */
export function isUnpaired(err: unknown): boolean {
    return (err as AxiosError)?.response?.status === 401;
}

export function errText(err: unknown, fallback = 'Gagal, coba lagi'): string {
    const e = err as AxiosError<{ message?: string; error?: unknown }>;
    if (isOffline(err)) return 'Di luar jangkauan sinyal';
    const data = e?.response?.data;
    if (data?.error && typeof data.error === 'object') {
        const parts = Object.values(data.error as Record<string, string>).filter(Boolean);
        if (parts.length) return parts.join(', ');
    }
    return data?.message || (err as Error)?.message || fallback;
}
