import { kv } from './db';
import type { MdtOperator } from './types';

// Login offline: setelah operator sekali login online di tablet ini, PIN-nya disimpan sebagai
// hash PBKDF2 (bukan PIN asli, bukan hash dari server). Di pit tanpa sinyal operator tetap bisa
// login memakai NIK + PIN yang sama. Operator yang belum pernah login di tablet ini harus online terlebih dahulu.

const KEY = 'login.cache';
const ITERATIONS = 150_000;

interface Cached {
    operator: MdtOperator;
    employeeNo: string;
    salt: string;
    hash: string;
}

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string) => new Uint8Array(s.match(/../g)!.map((h) => parseInt(h, 16)));
const norm = (employeeNo: string) => employeeNo.trim().toLowerCase();

async function derive(pin: string, salt: Uint8Array): Promise<string> {
    const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITERATIONS }, key, 256);
    return hex(bits);
}

/** Simpan login yang barusan berhasil online. */
export async function rememberLogin(operator: MdtOperator, employeeNo: string, pin: string): Promise<void> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const entry: Cached = { operator, employeeNo: norm(employeeNo), salt: hex(salt.buffer), hash: await derive(pin, salt) };
    const list = ((await kv.get<Cached[]>(KEY)) ?? []).filter((c) => c.employeeNo !== entry.employeeNo);
    await kv.set(KEY, [...list, entry].slice(-50));
}

/** Cek NIK + PIN tanpa server. null = belum pernah login di tablet ini, atau PIN salah. */
export async function offlineLogin(employeeNo: string, pin: string): Promise<MdtOperator | null | 'unknown'> {
    const list = (await kv.get<Cached[]>(KEY)) ?? [];
    const c = list.find((x) => x.employeeNo === norm(employeeNo));
    if (!c) return 'unknown';
    return (await derive(pin, unhex(c.salt))) === c.hash ? c.operator : null;
}

export async function forgetLogins(): Promise<void> {
    await kv.del(KEY);
}
