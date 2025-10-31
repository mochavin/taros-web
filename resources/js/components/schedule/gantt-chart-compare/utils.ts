import {
    formatDateLocal,
    parseDate,
    parseLocalDateTimeInput,
} from '@/lib/schedule-utils';
import type { TaskRow } from '@/types/schedule';
import Papa from 'papaparse';

export const computeBaselineShiftMs = (
    taskRows: TaskRow[],
    customStart: string,
): number => {
    const custom = parseLocalDateTimeInput(customStart);
    if (!custom) return 0;

    let earliest: Date | null = null;
    for (const row of taskRows) {
        const start = parseDate(row.Start);
        if (!start) continue;
        if (!earliest || start < earliest) {
            earliest = start;
        }
    }

    if (!earliest) return 0;
    return custom.getTime() - earliest.getTime();
};

export const applyBaselineShift = (
    taskRows: TaskRow[],
    baselineShiftMs: number,
): TaskRow[] => {
    if (!baselineShiftMs) return taskRows;

    return taskRows.map((row) => {
        const start = parseDate(row.Start);
        const finish = parseDate(row.Finish);
        const adjusted = { ...row };

        if (start) {
            adjusted.Start = formatDateLocal(
                new Date(start.getTime() + baselineShiftMs),
            );
        }

        if (finish) {
            adjusted.Finish = formatDateLocal(
                new Date(finish.getTime() + baselineShiftMs),
            );
        }

        return adjusted;
    });
};

export const parseCSVFromURL = async (url: string): Promise<TaskRow[]> => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();

        return new Promise((resolve, reject) => {
            Papa.parse<TaskRow>(text, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: false,
                complete: (results) => {
                    if (results.errors.length > 0) {
                        console.warn('CSV parsing warnings:', results.errors);
                    }
                    resolve(results.data);
                },
                error: (err: Error) => {
                    reject(err);
                },
            });
        });
    } catch (error) {
        console.error('Error fetching CSV:', error);
        throw error;
    }
};
