import { Label } from '@/components/ui/label';
import {
    formatDateLocal,
    parseDate,
    parseLocalDateTimeInput,
} from '@/lib/schedule-utils';
import type { ScheduleVariantOption, TaskRow } from '@/types/schedule';
import { Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { useEffect, useMemo, useState } from 'react';
import { CompareFilterSwitch } from './compare-filter-switch';
import { TaskTable } from './task-table';

interface TaskTableCompareProps {
    variants: ScheduleVariantOption[];
    compareVariants: string[];
    customStart: string;
}

interface VariantData {
    slug: string;
    name: string;
    taskRows: TaskRow[];
    isLoading: boolean;
    error?: string;
}

const computeBaselineShiftMs = (
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

const applyBaselineShift = (
    taskRows: TaskRow[],
    baselineShiftMs: number,
): TaskRow[] => {
    if (!baselineShiftMs) return taskRows;

    return taskRows.map((row) => {
        const start = parseDate(row.Start);
        const finish = parseDate(row.Finish);
        const shiftedRow = { ...row };

        if (start) {
            shiftedRow.Start = formatDateLocal(
                new Date(start.getTime() + baselineShiftMs),
            );
        }

        if (finish) {
            shiftedRow.Finish = formatDateLocal(
                new Date(finish.getTime() + baselineShiftMs),
            );
        }

        return shiftedRow;
    });
};

const normalizeScheduleValue = (value: string | null | undefined): string => {
    const parsed = parseDate(value);
    if (parsed) {
        return String(parsed.getTime());
    }

    return String(value ?? '').trim();
};

const buildTaskIndex = (taskRows: TaskRow[]): Map<string, TaskRow> => {
    const taskIndex = new Map<string, TaskRow>();

    for (const taskRow of taskRows) {
        const taskId = String(taskRow.TaskID ?? '').trim();
        if (!taskId || taskIndex.has(taskId)) continue;
        taskIndex.set(taskId, taskRow);
    }

    return taskIndex;
};

const hasDifferentScheduleTime = (
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

const parseCSVFromURL = async (url: string): Promise<TaskRow[]> => {
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

export function TaskTableCompare({
    variants,
    compareVariants,
    customStart,
}: TaskTableCompareProps) {
    const [variantDataMap, setVariantDataMap] = useState<
        Map<string, VariantData>
    >(new Map());
    const [showOnlyDifferentSchedule, setShowOnlyDifferentSchedule] =
        useState(false);

    // Load data for each variant
    useEffect(() => {
        const loadVariants = async () => {
            const newDataMap = new Map<string, VariantData>();

            // Initialize loading state for all variants
            for (const slug of compareVariants) {
                const variant = variants.find((v) => v.slug === slug);
                if (!variant) continue;

                newDataMap.set(slug, {
                    slug,
                    name: variant.name || slug,
                    taskRows: [],
                    isLoading: true,
                });
            }
            setVariantDataMap(new Map(newDataMap));

            // Load each variant's data
            for (const slug of compareVariants) {
                const variant = variants.find((v) => v.slug === slug);
                if (!variant) continue;

                try {
                    // Load task data from the first available candidate
                    let taskRows: TaskRow[] = [];

                    if (
                        variant.taskCandidates &&
                        variant.taskCandidates.length > 0
                    ) {
                        for (const candidate of variant.taskCandidates) {
                            try {
                                taskRows = await parseCSVFromURL(candidate);
                                if (taskRows.length > 0) {
                                    break; // Successfully loaded
                                }
                            } catch {
                                console.warn(
                                    `Failed to load from ${candidate}, trying next...`,
                                );
                            }
                        }
                    }

                    newDataMap.set(slug, {
                        slug,
                        name: variant.name || slug,
                        taskRows,
                        isLoading: false,
                    });
                } catch (err) {
                    newDataMap.set(slug, {
                        slug,
                        name: variant.name || slug,
                        taskRows: [],
                        isLoading: false,
                        error: 'Failed to load variant data',
                    });
                    console.error(`Error loading variant ${slug}:`, err);
                }

                // Update state after each variant is loaded
                setVariantDataMap(new Map(newDataMap));
            }
        };

        if (compareVariants.length > 0) {
            loadVariants();
        } else {
            setVariantDataMap(new Map());
        }
    }, [compareVariants, variants]);

    useEffect(() => {
        if (compareVariants.length !== 2) {
            setShowOnlyDifferentSchedule(false);
        }
    }, [compareVariants.length]);

    const shiftedTaskRowsMap = useMemo(() => {
        const nextMap = new Map<string, TaskRow[]>();

        for (const slug of compareVariants) {
            const taskRows = variantDataMap.get(slug)?.taskRows ?? [];
            const baselineShiftMs = computeBaselineShiftMs(
                taskRows,
                customStart,
            );

            nextMap.set(slug, applyBaselineShift(taskRows, baselineShiftMs));
        }

        return nextMap;
    }, [compareVariants, customStart, variantDataMap]);

    const differentScheduleTaskIds = useMemo(() => {
        if (compareVariants.length !== 2) {
            return new Set<string>();
        }

        const [leftSlug, rightSlug] = compareVariants;
        const leftTasks = shiftedTaskRowsMap.get(leftSlug) ?? [];
        const rightTasks = shiftedTaskRowsMap.get(rightSlug) ?? [];
        const leftTaskIndex = buildTaskIndex(leftTasks);
        const rightTaskIndex = buildTaskIndex(rightTasks);
        const differentTaskIds = new Set<string>();

        for (const [taskId, leftTask] of leftTaskIndex) {
            const rightTask = rightTaskIndex.get(taskId);

            if (hasDifferentScheduleTime(leftTask, rightTask)) {
                differentTaskIds.add(taskId);
            }
        }

        return differentTaskIds;
    }, [compareVariants, shiftedTaskRowsMap]);

    const canFilterDifferentSchedule = compareVariants.length === 2;

    if (compareVariants.length === 0) {
        return (
            <div className="rounded-lg border bg-muted/30 p-8 text-center">
                <p className="text-muted-foreground">
                    Please select at least one variant to compare.
                </p>
            </div>
        );
    }

    // Determine grid columns based on number of variants
    const gridColsClass =
        compareVariants.length === 1
            ? 'grid-cols-1'
            : compareVariants.length === 2
              ? 'grid-cols-2'
              : compareVariants.length === 3
                ? 'grid-cols-3'
                : 'grid-cols-2 xl:grid-cols-3';

    return (
        <div className="space-y-4">
            {canFilterDifferentSchedule && (
                <CompareFilterSwitch
                    checked={showOnlyDifferentSchedule}
                    onCheckedChange={setShowOnlyDifferentSchedule}
                    differenceCount={differentScheduleTaskIds.size}
                />
            )}

            <div className={`grid gap-4 ${gridColsClass}`}>
                {compareVariants.map((slug) => {
                    const variantData = variantDataMap.get(slug);
                    const variant = variants.find((v) => v.slug === slug);

                    if (!variant) return null;

                    const displayName = variant.name || slug;
                    const isLoading = variantData?.isLoading ?? true;
                    const error = variantData?.error;
                    const shiftedTasks = shiftedTaskRowsMap.get(slug) ?? [];
                    const filteredTasks =
                        showOnlyDifferentSchedule && canFilterDifferentSchedule
                            ? shiftedTasks.filter((task) =>
                                  differentScheduleTaskIds.has(
                                      String(task.TaskID ?? '').trim(),
                                  ),
                              )
                            : shiftedTasks;

                    return (
                        <div
                            key={slug}
                            className="flex flex-col space-y-2 rounded-lg border bg-card p-4 shadow-sm"
                        >
                            {/* Variant Header */}
                            <div className="min-h-20 flex-shrink-0 rounded-lg border bg-primary/5 p-3">
                                <div className="flex h-full items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold">
                                            {displayName}
                                        </h3>
                                    </div>
                                    <div className="text-right">
                                        <Label className="text-sm">
                                            Tasks:{' '}
                                            {showOnlyDifferentSchedule &&
                                            canFilterDifferentSchedule
                                                ? `${filteredTasks.length} of ${shiftedTasks.length}`
                                                : shiftedTasks.length}
                                        </Label>
                                    </div>
                                </div>
                            </div>

                            {/* Task Table Content */}
                            <div className="relative min-h-[300px] flex-1">
                                {isLoading && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/40 backdrop-blur-sm">
                                        <div className="flex flex-col items-center gap-4 rounded-xl border bg-white p-8 shadow-2xl dark:bg-gray-800">
                                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                            <div className="text-center">
                                                <p className="font-semibold">
                                                    Loading {displayName}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Please wait...
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isLoading && error && (
                                    <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8">
                                        <div className="text-center">
                                            <p className="font-semibold text-destructive">
                                                Error Loading Variant
                                            </p>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {error}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {!isLoading &&
                                    !error &&
                                    filteredTasks.length === 0 && (
                                        <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border bg-muted/30 p-8">
                                            <p className="text-muted-foreground">
                                                {showOnlyDifferentSchedule &&
                                                canFilterDifferentSchedule
                                                    ? 'No tasks with different schedule time found for this variant.'
                                                    : 'No tasks found for this variant.'}
                                            </p>
                                        </div>
                                    )}

                                {!isLoading &&
                                    !error &&
                                    filteredTasks.length > 0 && (
                                        <div className="h-full">
                                            <TaskTable tasks={filteredTasks} />
                                        </div>
                                    )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
