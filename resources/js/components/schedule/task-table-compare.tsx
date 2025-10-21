import { Label } from '@/components/ui/label';
import {
    formatDateLocal,
    parseDate,
    parseLocalDateTimeInput,
} from '@/lib/schedule-utils';
import type { ScheduleVariantOption, TaskRow } from '@/types/schedule';
import { Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { useEffect, useState } from 'react';
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

    // Calculate baseline shift
    const computeBaselineShiftMs = (taskRows: TaskRow[]): number => {
        const custom = parseLocalDateTimeInput(customStart);
        if (!custom) return 0;

        let earliest: Date | null = null;
        for (const r of taskRows) {
            const s = parseDate(r.Start);
            if (!s) continue;
            if (!earliest || s < earliest) earliest = s;
        }
        if (!earliest) return 0;
        return custom.getTime() - earliest.getTime();
    };

    // Apply baseline shift to tasks
    const applyBaselineShift = (
        taskRows: TaskRow[],
        baselineShiftMs: number,
    ): TaskRow[] => {
        if (!baselineShiftMs) return taskRows;

        return taskRows.map((r) => {
            const s = parseDate(r.Start);
            const e = parseDate(r.Finish);
            const rr = { ...r };
            if (s)
                rr.Start = formatDateLocal(
                    new Date(s.getTime() + baselineShiftMs),
                );
            if (e)
                rr.Finish = formatDateLocal(
                    new Date(e.getTime() + baselineShiftMs),
                );
            return rr;
        });
    };

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
            <div className={`grid gap-4 ${gridColsClass}`}>
                {compareVariants.map((slug) => {
                    const variantData = variantDataMap.get(slug);
                    const variant = variants.find((v) => v.slug === slug);

                    if (!variant) return null;

                    const displayName = variant.name || slug;
                    const isLoading = variantData?.isLoading ?? true;
                    const taskRows = variantData?.taskRows ?? [];
                    const error = variantData?.error;

                    const baselineShiftMs = computeBaselineShiftMs(taskRows);
                    const shiftedTasks = applyBaselineShift(
                        taskRows,
                        baselineShiftMs,
                    );

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
                                            Tasks: {taskRows.length}
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
                                    taskRows.length === 0 && (
                                        <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border bg-muted/30 p-8">
                                            <p className="text-muted-foreground">
                                                No tasks found for this variant.
                                            </p>
                                        </div>
                                    )}

                                {!isLoading &&
                                    !error &&
                                    taskRows.length > 0 && (
                                        <div className="h-full">
                                            <TaskTable tasks={shiftedTasks} />
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
