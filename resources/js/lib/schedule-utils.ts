// Utility functions for schedule viewer

import type {
    PaginationResult,
    ResourceRow,
    ResourceTableFilters,
    TaskRow,
    TaskSortMode,
} from '@/types/schedule';

export function parseDate(s: string | null | undefined): Date | null {
    if (!s) return null;
    const t = String(s).trim().replace('T', ' ');
    const m = t.match(
        /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/,
    );
    if (!m) return new Date(t);
    const [, year, month, day, hour, minute, second] = m;
    return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second || '0'),
    );
}

export function parseLocalDateTimeInput(
    val: string | null | undefined,
): Date | null {
    if (!val) return null;
    const m = val.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!m) return null;
    const [, year, month, day, hour, minute] = m;
    return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        0,
    );
}

export function parseLocalDateInput(
    val: string | null | undefined,
): Date | null {
    if (!val) return null;
    const m = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const [, year, month, day] = m;
    return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
}

export function formatDateLocal(dt: Date | null): string {
    if (!dt) return '';
    const pad = (n: number) => (n < 10 ? '0' : '') + n;
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

export function formatToDateTimeLocal(dt: Date | null): string {
    if (!dt) return '';
    const pad = (n: number) => (n < 10 ? '0' : '') + n;
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function formatIndoDateTime(dtStr: string | null | undefined): string {
    if (!dtStr) return '';
    const dt = new Date(dtStr);
    if (isNaN(dt.getTime())) return dtStr;
    const datePart = dt.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const timePart = dt.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    return `${datePart} ${timePart}`;
}

export function ymd(dt: Date): string {
    const pad = (n: number) => (n < 10 ? '0' : '') + n;
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function addDays(dt: Date, n: number): Date {
    const d = new Date(dt.getTime());
    d.setDate(d.getDate() + n);
    return d;
}

export function paginate<T>(
    arr: T[],
    page: number,
    size: number,
): PaginationResult<T> {
    const total = arr.length;
    const pages = Math.max(1, Math.ceil(total / size));
    const p = Math.min(Math.max(1, page), pages);
    const start = (p - 1) * size;
    const end = start + size;
    return { slice: arr.slice(start, end), page: p, pages, total };
}

export function textFilterPredicate(q: string | null | undefined) {
    if (!q) return () => true;
    const s = q.toLowerCase();
    return (row: Record<string, unknown>) =>
        Object.values(row).join(' ').toLowerCase().includes(s);
}

export function filterResourceRows(
    rows: ResourceRow[],
    filters: Pick<ResourceTableFilters, 'filter' | 'fromDate' | 'toDate'>,
) {
    const predText = textFilterPredicate(filters.filter);
    const fromDay = parseLocalDateInput(filters.fromDate);
    const toDay = parseLocalDateInput(filters.toDate);
    const fromDt = fromDay
        ? new Date(
            fromDay.getFullYear(),
            fromDay.getMonth(),
            fromDay.getDate(),
            0,
            0,
            0,
            0,
        )
        : null;
    const toDt = toDay
        ? new Date(
            toDay.getFullYear(),
            toDay.getMonth(),
            toDay.getDate(),
            23,
            59,
            59,
            999,
        )
        : null;

    return rows.filter((row) => {
        const matchesText = predText(row as unknown as Record<string, unknown>);
        if (!matchesText) return false;
        if (!fromDt && !toDt) return true;

        const start = parseDate(row.SegmentStart);
        const end = parseDate(row.SegmentEnd);
        if (!start || !end) return false;
        if (fromDt && end < fromDt) return false;
        if (toDt && start > toDt) return false;
        return true;
    });
}

export function dateRangeFilterPredicate(
    fromDt: Date | null,
    toDt: Date | null,
) {
    return (row: { Start: string; Finish: string }) => {
        const s = parseDate(row.Start);
        const e = parseDate(row.Finish);
        if (!s || !e) return false;
        if (fromDt && e < fromDt) return false;
        if (toDt && s > toDt) return false;
        return true;
    };
}

export function sortTaskRows(rows: TaskRow[], mode: TaskSortMode): TaskRow[] {
    const arr = rows.slice();

    function getTaskIdNum(row: TaskRow): number {
        const v = row.TaskID;
        const n = Number(v);
        return isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
    }

    function getDurationHours(row: TaskRow): number {
        const v = Number(row.DurationHours);
        if (isFinite(v)) return v;
        const s = parseDate(row.Start);
        const e = parseDate(row.Finish);
        if (!s || !e) return -Infinity;
        return (e.getTime() - s.getTime()) / 36e5;
    }

    if (mode === 'start') {
        arr.sort((a, b) => {
            const sa = parseDate(a.Start);
            const sb = parseDate(b.Start);
            if (!sa && !sb) return 0;
            if (!sa) return 1;
            if (!sb) return -1;
            const d = sa.getTime() - sb.getTime();
            if (d !== 0) return d;
            return getTaskIdNum(a) - getTaskIdNum(b);
        });
    } else if (mode === 'finish') {
        arr.sort((a, b) => {
            const fa = parseDate(a.Finish);
            const fb = parseDate(b.Finish);
            if (!fa && !fb) return 0;
            if (!fa) return 1;
            if (!fb) return -1;
            const d = fa.getTime() - fb.getTime();
            if (d !== 0) return d;
            const sa = parseDate(a.Start);
            const sb = parseDate(b.Start);
            if (sa && sb) {
                const d2 = sa.getTime() - sb.getTime();
                if (d2 !== 0) return d2;
            }
            return getTaskIdNum(a) - getTaskIdNum(b);
        });
    } else if (mode === 'duration') {
        arr.sort((a, b) => {
            const da = getDurationHours(a);
            const db = getDurationHours(b);
            const diff = db - da;
            if (diff !== 0) return diff;
            const sa = parseDate(a.Start);
            const sb = parseDate(b.Start);
            if (sa && sb) {
                const d2 = sa.getTime() - sb.getTime();
                if (d2 !== 0) return d2;
            }
            return getTaskIdNum(a) - getTaskIdNum(b);
        });
    } else if (mode === 'duration_asc') {
        arr.sort((a, b) => {
            const da = getDurationHours(a);
            const db = getDurationHours(b);
            const diff = da - db;
            if (diff !== 0) return diff;
            const sa = parseDate(a.Start);
            const sb = parseDate(b.Start);
            if (sa && sb) {
                const d2 = sa.getTime() - sb.getTime();
                if (d2 !== 0) return d2;
            }
            return getTaskIdNum(a) - getTaskIdNum(b);
        });
    } else {
        arr.sort((a, b) => {
            const c = getTaskIdNum(a) - getTaskIdNum(b);
            if (c !== 0) return c;
            const sa = parseDate(a.Start);
            const sb = parseDate(b.Start);
            if (!sa && !sb) return 0;
            if (!sa) return 1;
            if (!sb) return -1;
            return sa.getTime() - sb.getTime();
        });
    }

    return arr;
}

export function niceMax(v: number): number {
    if (!isFinite(v) || v <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const base = v / pow;
    const nice = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
    return nice * pow;
}

export function makeColor(i: number, total: number): string {
    const hue = ((i * 360) / Math.max(1, total)) % 360;
    const sat = 60;
    const light = 55 - (Math.floor(i / 12) % 2) * 10;
    return `hsl(${Math.floor(hue)}, ${sat}%, ${light}%)`;
}

export function isElapsedTask(value: string | null | undefined): boolean {
    return (value ?? '').toString().trim().toUpperCase().startsWith('Y');
}
