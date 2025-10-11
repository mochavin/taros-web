import type { ScheduleVariantOption } from './schedule';

export type { ScheduleVariantOption };

export const serializePaths = (paths: string[] | null | undefined): string => (paths ?? []).join('\n');

export const parsePathsInput = (value: string): string[] => {
    const raw = value ?? '';

    return raw
        .split(/\r?\n|\r|,/)
        .map((line) => line.trim())
        .filter((line, index, self) => line.length > 0 && self.indexOf(line) === index);
};