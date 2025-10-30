import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    dateRangeFilterPredicate,
    formatDateLocal,
    formatIndoDateTime,
    parseDate,
    parseLocalDateTimeInput,
    paginate,
    textFilterPredicate,
} from '@/lib/schedule-utils';
import type { GanttFilters, ScheduleVariantOption, TaskRow } from '@/types/schedule';
import { GitCompare, LayoutGrid, Loader2, Rows3 } from 'lucide-react';
import Papa from 'papaparse';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { GanttChart, GanttControls } from './gantt-chart';

interface GanttChartCompareProps {
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

interface VariantEntry {
    slug: string;
    variant: ScheduleVariantOption;
    data?: VariantData;
}

interface TooltipState {
    visible: boolean;
    x: number;
    y: number;
    content: ReactNode;
}

const computeBaselineShiftMs = (
    taskRows: TaskRow[],
    customStart: string,
): number => {
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
            rr.Start = formatDateLocal(new Date(s.getTime() + baselineShiftMs));
        if (e)
            rr.Finish = formatDateLocal(
                new Date(e.getTime() + baselineShiftMs),
            );
        return rr;
    });
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

export function GanttChartCompare({
    variants,
    compareVariants,
    customStart,
}: GanttChartCompareProps) {
    const [variantDataMap, setVariantDataMap] = useState<
        Map<string, VariantData>
    >(new Map());
    const [layoutMode, setLayoutMode] = useState<
        'grid' | 'stacked' | 'overlay'
    >('grid');

    const [filters, setFilters] = useState<GanttFilters>({
        filter: '',
        fromDate: '',
        toDate: '',
        sortMode: 'id',
        page: 1,
        pageSize: -1,
    });

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
        if (layoutMode === 'overlay' && compareVariants.length !== 2) {
            setLayoutMode('grid');
        }
    }, [layoutMode, compareVariants.length]);

    // Determine grid columns based on number of variants and layout mode
    const gridColsClass = useMemo(() => {
        if (layoutMode === 'stacked') {
            return 'grid-cols-1';
        }
        if (layoutMode === 'overlay') {
            return 'grid-cols-1';
        }
        if (compareVariants.length === 1) {
            return 'grid-cols-1';
        }
        if (compareVariants.length === 2) {
            return 'grid-cols-2';
        }
        if (compareVariants.length === 3) {
            return 'grid-cols-3';
        }
        return 'grid-cols-2 xl:grid-cols-3';
    }, [layoutMode, compareVariants.length]);

    const handleLayoutChange = useCallback(
        (mode: 'grid' | 'stacked' | 'overlay') => {
            setLayoutMode(mode);
            setFilters((prev) => ({ ...prev, page: 1 }));
        },
        [],
    );

    const entries = useMemo<VariantEntry[]>(() => {
        const result: VariantEntry[] = [];
        for (const slug of compareVariants) {
            const variant = variants.find((v) => v.slug === slug);
            if (!variant) {
                continue;
            }
            const data = variantDataMap.get(slug);
            result.push({ slug, variant, data });
        }
        return result;
    }, [compareVariants, variants, variantDataMap]);

    const hasSelection = entries.length > 0;
    const overlayReady = layoutMode === 'overlay' && entries.length === 2;

    return (
        <div className="space-y-4">
            {!hasSelection && (
                <div className="rounded-lg border bg-muted/30 p-8 text-center">
                    <p className="text-muted-foreground">
                        Please select at least one variant to compare.
                    </p>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/50 p-3">
                <Label className="font-semibold">Layout</Label>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant={layoutMode === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleLayoutChange('grid')}
                    >
                        <LayoutGrid className="mr-2 h-4 w-4" />
                        Grid
                    </Button>
                    <Button
                        variant={
                            layoutMode === 'stacked' ? 'default' : 'outline'
                        }
                        size="sm"
                        onClick={() => handleLayoutChange('stacked')}
                    >
                        <Rows3 className="mr-2 h-4 w-4" />
                        Stacked
                    </Button>
                    <Button
                        variant={
                            layoutMode === 'overlay' ? 'default' : 'outline'
                        }
                        size="sm"
                        onClick={() => handleLayoutChange('overlay')}
                        disabled={entries.length !== 2}
                    >
                        <GitCompare className="mr-2 h-4 w-4" />
                        Overlay
                    </Button>
                </div>
                <span className="ml-auto text-sm text-muted-foreground">
                    {layoutMode === 'grid'
                        ? 'Compare variants side by side. Filters stay in sync.'
                        : layoutMode === 'stacked'
                          ? 'Compare variants vertically with shared filters.'
                          : entries.length === 2
                              ? 'Stack two variants to highlight overlaps.'
                              : 'Select exactly two variants to enable overlay.'}
                </span>
            </div>

            {overlayReady ? (
                <OverlayComparison
                    variantA={entries[0]}
                    variantB={entries[1]}
                    filters={filters}
                    onFiltersChange={setFilters}
                    customStart={customStart}
                />
            ) : (
                <div className={`grid gap-4 ${gridColsClass}`}>
                    {entries.map(({ slug, variant, data }, index) => {
                        const displayName = variant.name || slug;
                        const isLoading = data?.isLoading ?? true;
                        const taskRows = data?.taskRows ?? [];
                        const error = data?.error;

                        const baselineShiftMs = computeBaselineShiftMs(
                            taskRows,
                            customStart,
                        );

                        return (
                            <div
                                key={slug}
                                className="flex flex-col space-y-2 rounded-lg border bg-card p-4 shadow-sm"
                            >
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

                                <div className="relative min-h-[500px] flex-1">
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
                                        <div className="flex h-full min-h-[500px] items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8">
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
                                            <div className="flex h-full min-h-[500px] items-center justify-center rounded-lg border bg-muted/30 p-8">
                                                <p className="text-muted-foreground">
                                                    No tasks found for this variant.
                                                </p>
                                            </div>
                                        )}

                                    {!isLoading &&
                                        !error &&
                                        taskRows.length > 0 && (
                                            <div className="h-full">
                                                <GanttChart
                                                    tasks={taskRows}
                                                    baselineShiftMs={
                                                        baselineShiftMs
                                                    }
                                                    filters={filters}
                                                    onFiltersChange={setFilters}
                                                    showControls={index === 0}
                                                    idPrefix={`compare-${slug}`}
                                                />
                                            </div>
                                        )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

interface OverlayComparisonProps {
    variantA: VariantEntry;
    variantB: VariantEntry;
    filters: GanttFilters;
    onFiltersChange: (filters: GanttFilters) => void;
    customStart: string;
}

interface OverlayRow {
    taskId: string;
    taskName: string;
    variantATask?: TaskRow;
    variantBTask?: TaskRow;
}

function OverlayComparison({
    variantA,
    variantB,
    filters,
    onFiltersChange,
    customStart,
}: OverlayComparisonProps) {
    const dataA = variantA.data;
    const dataB = variantB.data;

    const tasksA = dataA?.taskRows ?? [];
    const tasksB = dataB?.taskRows ?? [];

    const [tooltip, setTooltip] = useState<TooltipState>({
        visible: false,
        x: 0,
        y: 0,
        content: null,
    });
    const tooltipRef = useRef<HTMLDivElement>(null);

    const baselineShiftA = useMemo(
        () => computeBaselineShiftMs(tasksA, customStart),
        [tasksA, customStart],
    );
    const baselineShiftB = useMemo(
        () => computeBaselineShiftMs(tasksB, customStart),
        [tasksB, customStart],
    );

    const shiftedTasksA = useMemo(
        () => applyBaselineShift(tasksA, baselineShiftA),
        [tasksA, baselineShiftA],
    );
    const shiftedTasksB = useMemo(
        () => applyBaselineShift(tasksB, baselineShiftB),
        [tasksB, baselineShiftB],
    );

    const calculateTooltipPosition = useCallback((mouseX: number, mouseY: number) => {
        const pad = 12;
        const tooltipWidth = 420;
        const tooltipHeight = 200;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let x = mouseX + pad;
        let y = mouseY + pad;

        if (x + tooltipWidth > viewportWidth) {
            x = mouseX - tooltipWidth - pad;
        }

        if (y + tooltipHeight > viewportHeight) {
            y = mouseY - tooltipHeight - pad;
        }

        if (x < 4) {
            x = 4;
        }

        if (y < 4) {
            y = 4;
        }

        return { x, y };
    }, []);

    const buildTooltipContent = useCallback((task: TaskRow, variantLabel: string) => {
        const duration = task.DurationHours && !Number.isNaN(Number(task.DurationHours))
            ? Number(task.DurationHours).toFixed(1)
            : (() => {
                  const start = parseDate(task.Start);
                  const finish = parseDate(task.Finish);
                  if (!start || !finish) {
                      return '';
                  }
                  return ((finish.getTime() - start.getTime()) / 36e5).toFixed(1);
              })();

        const isElapsed = (task.IsElapsed ?? '').toString().toUpperCase().startsWith('Y');

        return (
            <div className="max-w-md rounded-md bg-gray-900 p-2 text-xs text-white shadow-lg">
                <table className="w-full">
                    <tbody>
                        <tr>
                            <td className="pr-2 text-gray-400">Variant</td>
                            <td>{variantLabel}</td>
                        </tr>
                        <tr>
                            <td className="pr-2 text-gray-400">TaskID</td>
                            <td>{task.TaskID}</td>
                        </tr>
                        <tr>
                            <td className="pr-2 text-gray-400">Task Name</td>
                            <td>{task.TaskName}</td>
                        </tr>
                        <tr>
                            <td className="pr-2 text-gray-400">Start</td>
                            <td>{formatIndoDateTime(task.Start)}</td>
                        </tr>
                        <tr>
                            <td className="pr-2 text-gray-400">Finish</td>
                            <td>{formatIndoDateTime(task.Finish)}</td>
                        </tr>
                        <tr>
                            <td className="pr-2 text-gray-400">Duration Hours</td>
                            <td>{duration}</td>
                        </tr>
                        <tr>
                            <td className="pr-2 text-gray-400">Is Elapsed</td>
                            <td>{isElapsed ? 'Yes' : 'No'}</td>
                        </tr>
                        <tr>
                            <td className="pr-2 text-gray-400">Assignments</td>
                            <td>{task.Assignments}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }, []);

    const handleBarMouseEnter = useCallback(
        (event: ReactMouseEvent<HTMLDivElement>, task: TaskRow | undefined, variantLabel: string) => {
            if (!task) {
                return;
            }
            const pos = calculateTooltipPosition(event.clientX, event.clientY);
            setTooltip({
                visible: true,
                x: pos.x,
                y: pos.y,
                content: buildTooltipContent(task, variantLabel),
            });
        },
        [buildTooltipContent, calculateTooltipPosition],
    );

    const handleBarMouseMove = useCallback(
        (event: ReactMouseEvent<HTMLDivElement>) => {
            if (!tooltip.visible) {
                return;
            }
            const pos = calculateTooltipPosition(event.clientX, event.clientY);
            setTooltip((prev: TooltipState) => ({ ...prev, x: pos.x, y: pos.y }));
        },
        [calculateTooltipPosition, tooltip.visible],
    );

    const handleBarMouseLeave = useCallback(() => {
        setTooltip({ visible: false, x: 0, y: 0, content: null });
    }, []);

    const overlayRows = useMemo<OverlayRow[]>(() => {
        const mapA = new Map<string, TaskRow>();
        const mapB = new Map<string, TaskRow>();

        for (const task of shiftedTasksA) {
            mapA.set(String(task.TaskID), task);
        }

        for (const task of shiftedTasksB) {
            mapB.set(String(task.TaskID), task);
        }

        const ids = new Set<string>([...mapA.keys(), ...mapB.keys()]);
        const rows: OverlayRow[] = [];
        ids.forEach((id) => {
            const taskA = mapA.get(id);
            const taskB = mapB.get(id);
            rows.push({
                taskId: id,
                taskName: taskA?.TaskName ?? taskB?.TaskName ?? id,
                variantATask: taskA,
                variantBTask: taskB,
            });
        });

        return rows;
    }, [shiftedTasksA, shiftedTasksB]);

    const predText = useMemo(
        () => textFilterPredicate(filters.filter),
        [filters.filter],
    );
    const fromDt = useMemo(
        () => parseLocalDateTimeInput(filters.fromDate),
        [filters.fromDate],
    );
    const toDt = useMemo(
        () => parseLocalDateTimeInput(filters.toDate),
        [filters.toDate],
    );
    const predDate = useMemo(
        () => dateRangeFilterPredicate(fromDt, toDt),
        [fromDt, toDt],
    );

    const filteredRows = useMemo(() => {
        return overlayRows.filter((row) => {
            if (filters.filter) {
                const match = predText({
                    TaskID: row.taskId,
                    TaskName: row.taskName,
                } as unknown as Record<string, unknown>);
                if (!match) {
                    return false;
                }
            }

            if (fromDt || toDt) {
                const passes = [row.variantATask, row.variantBTask].some(
                    (task) => task && predDate(task),
                );
                if (!passes) {
                    return false;
                }
            }

            return true;
        });
    }, [overlayRows, filters.filter, predText, fromDt, toDt, predDate]);

    const getTaskIdNum = useCallback((id: string): number => {
        const n = Number(id);
        return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
    }, []);

    const parseTaskDate = useCallback((task: TaskRow | undefined, field: 'Start' | 'Finish') => {
        if (!task) return null;
        return parseDate(task[field]);
    }, []);

    const getRowStart = useCallback(
        (row: OverlayRow): Date | null => {
            const starts = [
                parseTaskDate(row.variantATask, 'Start'),
                parseTaskDate(row.variantBTask, 'Start'),
            ].filter((dt): dt is Date => Boolean(dt));
            if (starts.length === 0) return null;
            return new Date(Math.min(...starts.map((dt) => dt.getTime())));
        },
        [parseTaskDate],
    );

    const getRowFinish = useCallback(
        (row: OverlayRow): Date | null => {
            const finishes = [
                parseTaskDate(row.variantATask, 'Finish'),
                parseTaskDate(row.variantBTask, 'Finish'),
            ].filter((dt): dt is Date => Boolean(dt));
            if (finishes.length === 0) return null;
            return new Date(Math.min(...finishes.map((dt) => dt.getTime())));
        },
        [parseTaskDate],
    );

    const getTaskDuration = useCallback((task?: TaskRow): number | null => {
        if (!task) return null;
        const numeric = Number(task.DurationHours);
        if (Number.isFinite(numeric)) {
            return numeric;
        }
        const start = parseDate(task.Start);
        const finish = parseDate(task.Finish);
        if (!start || !finish) {
            return null;
        }
        return (finish.getTime() - start.getTime()) / 36e5;
    }, []);

    const sortedRows = useMemo(() => {
        const rows = filteredRows.slice();
        rows.sort((a, b) => {
            switch (filters.sortMode) {
                case 'start': {
                    const aStart = getRowStart(a);
                    const bStart = getRowStart(b);
                    if (aStart && bStart) {
                        const diff = aStart.getTime() - bStart.getTime();
                        if (diff !== 0) return diff;
                    } else if (aStart) {
                        return -1;
                    } else if (bStart) {
                        return 1;
                    }
                    break;
                }
                case 'finish': {
                    const aFinish = getRowFinish(a);
                    const bFinish = getRowFinish(b);
                    if (aFinish && bFinish) {
                        const diff = aFinish.getTime() - bFinish.getTime();
                        if (diff !== 0) return diff;
                    } else if (aFinish) {
                        return -1;
                    } else if (bFinish) {
                        return 1;
                    }
                    break;
                }
                case 'duration': {
                    const aDur = Math.max(
                        getTaskDuration(a.variantATask) ?? -Infinity,
                        getTaskDuration(a.variantBTask) ?? -Infinity,
                    );
                    const bDur = Math.max(
                        getTaskDuration(b.variantATask) ?? -Infinity,
                        getTaskDuration(b.variantBTask) ?? -Infinity,
                    );
                    if (aDur !== bDur) {
                        return bDur - aDur;
                    }
                    break;
                }
                case 'duration_asc': {
                    const aDur = Math.min(
                        getTaskDuration(a.variantATask) ?? Infinity,
                        getTaskDuration(a.variantBTask) ?? Infinity,
                    );
                    const bDur = Math.min(
                        getTaskDuration(b.variantATask) ?? Infinity,
                        getTaskDuration(b.variantBTask) ?? Infinity,
                    );
                    if (aDur !== bDur) {
                        return aDur - bDur;
                    }
                    break;
                }
                default:
                    break;
            }

            return getTaskIdNum(a.taskId) - getTaskIdNum(b.taskId);
        });
        return rows;
    }, [filteredRows, filters.sortMode, getRowStart, getRowFinish, getTaskDuration, getTaskIdNum]);

    const actualPageSize =
        filters.pageSize === -1
            ? sortedRows.length || 1
            : filters.pageSize;

    const { slice: pageRows, page: currentPage, pages, total } = useMemo(
        () => paginate(sortedRows, filters.page, actualPageSize),
        [sortedRows, filters.page, actualPageSize],
    );

    const updateFilters = useCallback(
        (patch: Partial<GanttFilters>) => {
            onFiltersChange({ ...filters, ...patch });
        },
        [filters, onFiltersChange],
    );

    useEffect(() => {
        if (currentPage !== filters.page) {
            updateFilters({ page: currentPage });
        }
    }, [currentPage, filters.page, updateFilters]);

    const { minStart, maxFinish, totalHours } = useMemo(() => {
        let minStart: Date | null = null;
        let maxFinish: Date | null = null;

        for (const row of filteredRows) {
            for (const task of [row.variantATask, row.variantBTask]) {
                if (!task) continue;
                const start = parseDate(task.Start);
                const finish = parseDate(task.Finish);
                if (!start || !finish) continue;
                if (!minStart || start < minStart) {
                    minStart = start;
                }
                if (!maxFinish || finish > maxFinish) {
                    maxFinish = finish;
                }
            }
        }

        let hours = 1;
        if (minStart && maxFinish) {
            hours = (maxFinish.getTime() - minStart.getTime()) / 36e5;
            if (!isFinite(hours) || hours <= 0) {
                hours = 1;
            }
        }

        return { minStart, maxFinish, totalHours: hours };
    }, [filteredRows]);

    const maxWidthPx = 1200;
    const pxPerHour = maxWidthPx / totalHours;

    const ticks = useMemo(() => {
        const step = Math.max(1, Math.floor(totalHours / 10));
        const list: Array<{ left: number; label: string }> = [];
        if (minStart) {
            for (let h = 0; h <= totalHours; h += step) {
                const left = Math.round(h * pxPerHour);
                const dt = new Date(minStart.getTime() + h * 36e5);
                const label = dt.toISOString().replace('T', ' ').slice(0, 16);
                list.push({ left, label });
            }
        }
        return list;
    }, [minStart, totalHours, pxPerHour]);

    const overlapCount = useMemo(() => {
        let count = 0;
        for (const row of filteredRows) {
            const startA = parseDate(row.variantATask?.Start ?? null);
            const finishA = parseDate(row.variantATask?.Finish ?? null);
            const startB = parseDate(row.variantBTask?.Start ?? null);
            const finishB = parseDate(row.variantBTask?.Finish ?? null);
            if (!startA || !finishA || !startB || !finishB) {
                continue;
            }
            const overlapStart = Math.max(startA.getTime(), startB.getTime());
            const overlapEnd = Math.min(finishA.getTime(), finishB.getTime());
            if (overlapStart < overlapEnd) {
                count += 1;
            }
        }
        return count;
    }, [filteredRows]);

    const isLoading =
        (dataA === undefined || dataA.isLoading) ||
        (dataB === undefined || dataB.isLoading);

    const errorMessages = useMemo(() => {
        const errors: string[] = [];
        if (dataA?.error) errors.push(`${variantA.variant.name ?? variantA.variant.slug}: ${dataA.error}`);
        if (dataB?.error) errors.push(`${variantB.variant.name ?? variantB.variant.slug}: ${dataB.error}`);
        return errors;
    }, [dataA?.error, dataB?.error, variantA.variant.name, variantA.variant.slug, variantB.variant.name, variantB.variant.slug]);

    const hasAnyTasks = tasksA.length > 0 || tasksB.length > 0;

    const variantALabel = variantA.variant.name || variantA.variant.slug;
    const variantBLabel = variantB.variant.name || variantB.variant.slug;

    return (
        <div className="flex flex-col space-y-4 rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold">
                        {variantALabel} vs {variantBLabel}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Overlay compares timelines with shared filters. Overlaps detected: {overlapCount}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded bg-blue-500" />
                        {variantALabel}
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded bg-emerald-500" />
                        {variantBLabel}
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded bg-red-500" />
                        Elapsed
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded bg-amber-400/70" />
                        Overlap
                    </span>
                </div>
            </div>

            <GanttControls
                filters={filters}
                onFiltersChange={updateFilters}
                total={total}
                currentPage={currentPage}
                pages={pages}
                idPrefix={`overlay-${variantA.slug}-${variantB.slug}`}
            />

            <div className="relative min-h-[520px]">
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/40 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-4 rounded-xl border bg-white p-8 shadow-2xl dark:bg-gray-800">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <div className="text-center">
                                <p className="font-semibold">
                                    Loading overlay comparison
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Preparing gantt data...
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {!isLoading && errorMessages.length > 0 && (
                    <div className="flex h-full min-h-[500px] items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8">
                        <div className="space-y-2 text-center">
                            <p className="font-semibold text-destructive">
                                Unable to load all variants
                            </p>
                            {errorMessages.map((msg, idx) => (
                                <p
                                    key={idx}
                                    className="text-sm text-muted-foreground"
                                >
                                    {msg}
                                </p>
                            ))}
                        </div>
                    </div>
                )}

                {!isLoading && errorMessages.length === 0 && !hasAnyTasks && (
                    <div className="flex h-full min-h-[500px] items-center justify-center rounded-lg border bg-muted/30 p-8">
                        <p className="text-muted-foreground">
                            No tasks available for either variant.
                        </p>
                    </div>
                )}

                {!isLoading && errorMessages.length === 0 && hasAnyTasks && (!minStart || !maxFinish) && (
                    <div className="flex h-full min-h-[500px] items-center justify-center rounded-lg border bg-muted/30 p-8">
                        <p className="text-muted-foreground">
                            No valid date ranges found in the filtered data.
                        </p>
                    </div>
                )}

                {!isLoading &&
                    errorMessages.length === 0 &&
                    hasAnyTasks &&
                    minStart &&
                    maxFinish && (
                        <div className="overflow-x-auto rounded-lg border bg-white p-4 dark:bg-gray-950">
                            <div className="text-xs text-muted-foreground">
                                Span {totalHours.toFixed(1)} h
                            </div>

                            <div className="relative mb-4 ml-[250px] h-6">
                                {ticks.map((tick, idx) => (
                                    <div
                                        key={idx}
                                        className="absolute h-full border-l border-gray-200 dark:border-gray-800"
                                        style={{ left: `${tick.left}px` }}
                                    >
                                        <span className="absolute top-1 left-0.5 text-[10px] text-gray-500">
                                            {tick.label}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="relative ml-[250px] min-w-[800px]">
                                {pageRows.map((row) => {
                                    const startA = parseDate(
                                        row.variantATask?.Start ?? null,
                                    );
                                    const finishA = parseDate(
                                        row.variantATask?.Finish ?? null,
                                    );
                                    const startB = parseDate(
                                        row.variantBTask?.Start ?? null,
                                    );
                                    const finishB = parseDate(
                                        row.variantBTask?.Finish ?? null,
                                    );

                                    let overlapStart: Date | null = null;
                                    let overlapEnd: Date | null = null;
                                    if (
                                        startA &&
                                        finishA &&
                                        startB &&
                                        finishB
                                    ) {
                                        const os = Math.max(
                                            startA.getTime(),
                                            startB.getTime(),
                                        );
                                        const oe = Math.min(
                                            finishA.getTime(),
                                            finishB.getTime(),
                                        );
                                        if (os < oe) {
                                            overlapStart = new Date(os);
                                            overlapEnd = new Date(oe);
                                        }
                                    }

                                    const makeBar = (
                                        start: Date | null,
                                        finish: Date | null,
                                        task: TaskRow | undefined,
                                        baseColor: string,
                                        topPx: number,
                                        variantLabel: string,
                                    ) => {
                                        if (!start || !finish || !task) {
                                            return null;
                                        }
                                        const left = Math.max(
                                            0,
                                            Math.round(
                                                ((start.getTime() -
                                                    minStart!.getTime()) /
                                                    36e5) *
                                                    pxPerHour,
                                            ),
                                        );
                                        const width = Math.max(
                                            2,
                                            Math.round(
                                                ((finish.getTime() -
                                                    start.getTime()) /
                                                    36e5) *
                                                    pxPerHour,
                                            ),
                                        );
                                        const isElapsed = (task.IsElapsed ?? '')
                                            .toString()
                                            .toUpperCase()
                                            .startsWith('Y');
                                        const colorClass = isElapsed
                                            ? 'bg-red-500'
                                            : baseColor;
                                        return (
                                            <div
                                                className={`absolute z-10 h-4 cursor-pointer rounded border border-black/20 shadow-sm transition-opacity hover:opacity-85 ${colorClass}`}
                                                style={{
                                                    left: `${left}px`,
                                                    top: `${topPx}px`,
                                                    width: `${width}px`,
                                                }}
                                                onMouseEnter={(event) =>
                                                    handleBarMouseEnter(
                                                        event,
                                                        task,
                                                        variantLabel,
                                                    )
                                                }
                                                onMouseMove={handleBarMouseMove}
                                                onMouseLeave={handleBarMouseLeave}
                                            />
                                        );
                                    };

                                    const makeOverlap = (
                                        start: Date | null,
                                        finish: Date | null,
                                    ) => {
                                        if (!start || !finish) return null;
                                        const left = Math.max(
                                            0,
                                            Math.round(
                                                ((start.getTime() -
                                                    minStart!.getTime()) /
                                                    36e5) *
                                                    pxPerHour,
                                            ),
                                        );
                                        const width = Math.max(
                                            2,
                                            Math.round(
                                                ((finish.getTime() -
                                                    start.getTime()) /
                                                    36e5) *
                                                    pxPerHour,
                                            ),
                                        );
                                        return (
                                            <div
                                                className="absolute z-0 h-3 rounded bg-amber-400/60"
                                                style={{
                                                    left: `${left}px`,
                                                    top: '30px',
                                                    width: `${width}px`,
                                                }}
                                            />
                                        );
                                    };

                                    return (
                                        <div
                                            key={`${row.taskId}`}
                                            className="relative h-12 border-b border-dashed border-gray-200 dark:border-gray-800"
                                        >
                                            <span
                                                className="absolute -left-[250px] top-3 w-[240px] overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200"
                                                title={`${row.taskId}: ${row.taskName}`}
                                            >
                                                {row.taskName}
                                            </span>

                                            {/* {makeOverlap(overlapStart, overlapEnd)} */}

                                            {makeBar(
                                                startA,
                                                finishA,
                                                row.variantATask,
                                                'bg-blue-500',
                                                8,
                                                variantALabel,
                                            )}

                                            {makeBar(
                                                startB,
                                                finishB,
                                                row.variantBTask,
                                                'bg-emerald-500',
                                                24,
                                                variantBLabel,
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
            </div>

            {tooltip.visible && (
                <div
                    ref={tooltipRef}
                    className="pointer-events-none fixed z-50"
                    style={{
                        left: `${tooltip.x}px`,
                        top: `${tooltip.y}px`,
                    }}
                >
                    {tooltip.content}
                </div>
            )}
        </div>
    );
}
