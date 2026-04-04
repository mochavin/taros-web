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

export const getShiftedTaskRows = (
    taskRows: TaskRow[],
    customStart: string,
): TaskRow[] => {
    const baselineShiftMs = computeBaselineShiftMs(taskRows, customStart);
    return applyBaselineShift(taskRows, baselineShiftMs);
};

export const normalizeScheduleValue = (
    value: string | null | undefined,
): string => {
    const parsed = parseDate(value);
    if (parsed) {
        return String(parsed.getTime());
    }

    return String(value ?? '').trim();
};

export const buildTaskIndex = (taskRows: TaskRow[]): Map<string, TaskRow> => {
    const taskIndex = new Map<string, TaskRow>();

    for (const taskRow of taskRows) {
        const taskId = String(taskRow.TaskID ?? '').trim();
        if (!taskId || taskIndex.has(taskId)) {
            continue;
        }

        taskIndex.set(taskId, taskRow);
    }

    return taskIndex;
};

export const hasDifferentScheduleTime = (
    leftTask: TaskRow | undefined,
    rightTask: TaskRow | undefined,
): boolean => {
    if (!leftTask || !rightTask) {
        return false;
    }

    return (
        normalizeScheduleValue(leftTask.Start) !==
            normalizeScheduleValue(rightTask.Start) ||
        normalizeScheduleValue(leftTask.Finish) !==
            normalizeScheduleValue(rightTask.Finish)
    );
};

export const getDifferentScheduleTaskIds = (
    leftTaskRows: TaskRow[],
    rightTaskRows: TaskRow[],
    customStart: string,
): Set<string> => {
    const leftTaskIndex = buildTaskIndex(
        getShiftedTaskRows(leftTaskRows, customStart),
    );
    const rightTaskIndex = buildTaskIndex(
        getShiftedTaskRows(rightTaskRows, customStart),
    );
    const differentTaskIds = new Set<string>();

    for (const [taskId, leftTask] of leftTaskIndex) {
        const rightTask = rightTaskIndex.get(taskId);

        if (hasDifferentScheduleTime(leftTask, rightTask)) {
            differentTaskIds.add(taskId);
        }
    }

    return differentTaskIds;
};

export const filterTaskRowsByIds = (
    taskRows: TaskRow[],
    taskIds: Set<string>,
): TaskRow[] => {
    if (taskIds.size === 0) {
        return [];
    }

    return taskRows.filter((taskRow) =>
        taskIds.has(String(taskRow.TaskID ?? '').trim()),
    );
};

export const expandVisibleTaskIdsWithAncestors = <
    THierarchyRow extends { ParentID?: string | number },
>(
    visibleTaskIds: Set<string>,
    hierarchyById: Record<string, THierarchyRow>,
): Set<string> => {
    const expandedIds = new Set<string>(visibleTaskIds);

    for (const taskId of visibleTaskIds) {
        let currentId = taskId;

        while (currentId) {
            const parentId = String(
                hierarchyById[currentId]?.ParentID ?? '',
            ).trim();

            if (!parentId || expandedIds.has(parentId)) {
                break;
            }

            expandedIds.add(parentId);
            currentId = parentId;
        }
    }

    return expandedIds;
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
