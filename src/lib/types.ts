// Bentuk data dari backend (/api/mdt/*). Waktu = epoch ms.

export type DelayCategory = 'working' | 'standby_planned' | 'standby_unplanned' | 'breakdown';
export type UnitStatus = 'working' | 'standby' | 'breakdown';

export interface DelayCode {
    code: string;
    name: string;
    category: DelayCategory;
    status: UnitStatus;
    icon: string | null;
    sort: number;
    active: boolean;
}

export interface MdtUnit {
    imei: string;
    label: string;
    vehicle: string | null;
    unitType: string;
    payloadTon: number;
}

export interface MdtOperator {
    id: string;
    name: string;
    employeeNo: string | null;
}

export interface MdtDuty {
    assignmentId: string;
    shiftId: string;
    shiftName: string;
    shiftStatus: 'planned' | 'active';
    plannedStart: number;
    plannedEnd: number;
    startedAt: number | null;
    routeId: string;
    routeName: string;
    loadingName: string;
    unloadingName: string;
    driverId: string;
    driverName: string;
    targetRit: number | null;
    targetTon: number | null;
    loading: MdtSite; // front loading rute
    unloading: MdtSite; // dumping rute
}

export interface SiteZone {
    id?: string;
    kind: 'queue' | 'spot';
    lat: number;
    lng: number;
    radius: number;
}

export interface MdtSite {
    id: string;
    name: string;
    lat: number;
    lng: number;
    radius: number;
    zones: SiteZone[];
}

/** Posisi unit (truk) dari alat GPS / tracker di unit itu. time = waktu GPS. */
export interface MdtPosition {
    lat: number;
    lng: number;
    angle: number | null; // arah hadap (derajat), null = nggak tahu
    speed: number; // km/jam
    time: number;
}

export interface MdtProduction {
    rit: number;
    ton: number;
    avgCycleMs: number;
    at: number;
}

export interface UnitStatusLog {
    id: string;
    delayCode: string | null;
    delayName: string | null;
    status: UnitStatus;
    startAt: number;
    source: string;
}

export interface MdtBootstrap {
    serverTime: number;
    unit: MdtUnit;
    duty: MdtDuty | null;
    production: MdtProduction | null;
    delayCodes: DelayCode[];
    operators: MdtOperator[];
    current: UnitStatusLog | null;
    position: MdtPosition | null; // posisi terakhir dari tracker unit (saat sync)
}

export interface MdtPairResponse {
    token: string;
    imei: string;
    unit: MdtUnit;
}

export interface MdtStatusBatchResult {
    accepted: string[];
    rejected: string[];
    offsetMs: number;
}

/** Status yang sedang berlaku di tablet (bisa belum terkirim). */
export interface LocalStatus {
    delayCode: string;
    name: string;
    category: DelayCategory;
    since: number;
}

export interface ApiEnvelope<T> {
    success: boolean;
    message: string;
    data: T;
}
