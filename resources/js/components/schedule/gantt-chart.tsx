import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    dateRangeFilterPredicate,
    formatIndoDateTime,
    paginate,
    parseDate,
    parseLocalDateTimeInput,
    sortTaskRows,
    textFilterPredicate,
} from '@/lib/schedule-utils';
import type { GanttFilters, TaskRow, TaskSortMode } from '@/types/schedule';
import Papa from 'papaparse';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { expandVisibleTaskIdsWithAncestors } from './gantt-chart-compare/utils';

interface GanttChartProps {
    tasks: TaskRow[];
    baselineShiftMs: number;
    filters?: GanttFilters;
    onFiltersChange?: (filters: GanttFilters) => void;
    showControls?: boolean;
    idPrefix?: string;
    autoClampPage?: boolean;
    hierarchyCandidates?: string[];
    visibleTaskIds?: Set<string>;
    emptyStateMessage?: string;
}

interface GanttControlsProps {
    filters: GanttFilters;
    onFiltersChange: (patch: Partial<GanttFilters>) => void;
    total: number;
    currentPage: number;
    pages: number;
    idPrefix?: string;
}

export function GanttControls({
    filters,
    onFiltersChange,
    total,
    currentPage,
    pages,
    idPrefix,
}: GanttControlsProps) {
    const idBase = idPrefix ? `${idPrefix}-` : '';

    return (
        <>
            <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[200px] flex-1">
                    <Label htmlFor={`${idBase}taskFilter`}>Filter tasks</Label>
                    <Input
                        id={`${idBase}taskFilter`}
                        type="text"
                        placeholder="Filter tasks by text..."
                        value={filters.filter}
                        onChange={(e) =>
                            onFiltersChange({
                                filter: e.target.value,
                                page: 1,
                            })
                        }
                    />
                </div>
                <div>
                    <Label htmlFor={`${idBase}taskFrom`}>From</Label>
                    <Input
                        id={`${idBase}taskFrom`}
                        type="datetime-local"
                        value={filters.fromDate}
                        onChange={(e) =>
                            onFiltersChange({
                                fromDate: e.target.value,
                                page: 1,
                            })
                        }
                    />
                </div>
                <div>
                    <Label htmlFor={`${idBase}taskTo`}>To</Label>
                    <Input
                        id={`${idBase}taskTo`}
                        type="datetime-local"
                        value={filters.toDate}
                        onChange={(e) =>
                            onFiltersChange({
                                toDate: e.target.value,
                                page: 1,
                            })
                        }
                    />
                </div>
                <div>
                    <Label htmlFor={`${idBase}taskPageSize`}>Page size</Label>
                    <Select
                        value={filters.pageSize.toString()}
                        onValueChange={(v) =>
                            onFiltersChange({
                                pageSize: v === '-1' ? -1 : Number(v),
                                page: 1,
                            })
                        }
                    >
                        <SelectTrigger
                            id={`${idBase}taskPageSize`}
                            className="w-[100px]"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="200">200</SelectItem>
                            <SelectItem value="-1">All</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor={`${idBase}taskSort`}>Sort</Label>
                    <Select
                        value={filters.sortMode}
                        onValueChange={(v) =>
                            onFiltersChange({
                                sortMode: v as TaskSortMode,
                                page: 1,
                            })
                        }
                    >
                        <SelectTrigger
                            id={`${idBase}taskSort`}
                            className="w-[180px]"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="id">Task ID</SelectItem>
                            <SelectItem value="start">Start time</SelectItem>
                            <SelectItem value="finish">Finish time</SelectItem>
                            <SelectItem value="duration">
                                Duration (longest first)
                            </SelectItem>
                            <SelectItem value="duration_asc">
                                Duration (shortest first)
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Rows: {total} | Page {currentPage}/{pages}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() =>
                            onFiltersChange({
                                page: Math.max(1, filters.page - 1),
                            })
                        }
                    >
                        Prev
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= pages}
                        onClick={() =>
                            onFiltersChange({
                                page: Math.min(pages, filters.page + 1),
                            })
                        }
                    >
                        Next
                    </Button>
                </div>
            </div>
        </>
    );
}

interface HierarchyRow {
    TaskID: string;
    TaskName: string;
    OutlineLevel?: string | number;
    ParentID?: string;
    ChildrenIDs?: string;
    IsSummary?: string | boolean;
}

interface DisplayRow {
    taskId: string;
    taskName: string;
    outlineLevel: number;
    isSummary: boolean;
    taskData?: TaskRow; // undefined for summary rows without schedule data
}

export function GanttChart({
    tasks,
    baselineShiftMs,
    filters,
    onFiltersChange,
    showControls = true,
    idPrefix,
    autoClampPage = true,
    hierarchyCandidates,
    visibleTaskIds,
    emptyStateMessage = 'No valid dates in data',
}: GanttChartProps) {
    const controlled = filters !== undefined && onFiltersChange !== undefined;
    const [internalFilters, setInternalFilters] = useState<GanttFilters>({
        filter: '',
        fromDate: '',
        toDate: '',
        sortMode: 'id',
        page: 1,
        pageSize: -1,
    });

    const activeFilters = controlled ? filters! : internalFilters;

    const updateFilters = useCallback(
        (patch: Partial<GanttFilters>) => {
            if (controlled) {
                onFiltersChange?.({ ...filters!, ...patch });
            } else {
                setInternalFilters((prev) => ({ ...prev, ...patch }));
            }
        },
        [controlled, filters, onFiltersChange],
    );

    const [tooltip, setTooltip] = useState<{
        visible: boolean;
        x: number;
        y: number;
        content: React.ReactNode;
    }>({ visible: false, x: 0, y: 0, content: null });

    const [hierarchyById, setHierarchyById] = useState<
        Record<string, HierarchyRow>
    >({});
    const [hierarchyList, setHierarchyList] = useState<HierarchyRow[]>([]);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const hierarchySources = useMemo(
        () =>
            hierarchyCandidates && hierarchyCandidates.length > 0
                ? hierarchyCandidates
                : ['/hierarchy/tasks_hierarchy.csv'],
        [hierarchyCandidates],
    );

    // Load hierarchy CSV when sources change
    useEffect(() => {
        let cancelled = false;

        const loadHierarchy = async () => {
            for (const source of hierarchySources) {
                try {
                    const resp = await fetch(source, { cache: 'no-store' });
                    if (!resp.ok) {
                        continue;
                    }

                    const text = await resp.text();
                    if (!text || cancelled) {
                        continue;
                    }

                    const parsed = Papa.parse<HierarchyRow>(text, {
                        header: true,
                        skipEmptyLines: true,
                    });
                    const data = (parsed.data || []) as HierarchyRow[];
                    const map: Record<string, HierarchyRow> = {};
                    const list: HierarchyRow[] = [];
                    for (const r of data) {
                        if (!r) continue;
                        const idStr = String(r.TaskID ?? '').trim();
                        if (!idStr) continue;
                        map[idStr] = r;
                        list.push(r);
                    }

                    if (!cancelled) {
                        setHierarchyById(map);
                        setHierarchyList(list);
                    }

                    return;
                } catch (err) {
                    // ignore failures to keep chart usable
                    console.warn('Failed to load hierarchy CSV', err);
                }
            }

            if (!cancelled) {
                setHierarchyById({});
                setHierarchyList([]);
            }
        };

        loadHierarchy();

        return () => {
            cancelled = true;
        };
    }, [hierarchySources]);

    // Apply baseline shift to tasks
    const shiftedTasks = useMemo(() => {
        return tasks.map((r) => {
            if (!baselineShiftMs) return r;
            const s = parseDate(r.Start);
            const e = parseDate(r.Finish);
            const rr = { ...r };
            if (s) {
                const shifted = new Date(s.getTime() + baselineShiftMs);
                rr.Start = shifted.toISOString().replace('T', ' ').slice(0, 19);
            }
            if (e) {
                const shifted = new Date(e.getTime() + baselineShiftMs);
                rr.Finish = shifted
                    .toISOString()
                    .replace('T', ' ')
                    .slice(0, 19);
            }
            return rr;
        });
    }, [tasks, baselineShiftMs]);

    // Build task lookup by TaskID for quick access
    const tasksById = useMemo(() => {
        const map: Record<string, TaskRow> = {};
        for (const task of shiftedTasks) {
            map[String(task.TaskID)] = task;
        }
        return map;
    }, [shiftedTasks]);

    const visibleHierarchyTaskIds = useMemo(() => {
        if (!visibleTaskIds || visibleTaskIds.size === 0) {
            return null;
        }

        return expandVisibleTaskIdsWithAncestors(visibleTaskIds, hierarchyById);
    }, [visibleTaskIds, hierarchyById]);

    // Build display rows combining hierarchy and task data
    const allDisplayRows = useMemo(() => {
        const rows: DisplayRow[] = [];
        const seen = new Set<string>();

        // If no hierarchy loaded, fallback to showing tasks only
        if (hierarchyList.length === 0) {
            for (const task of shiftedTasks) {
                const taskId = String(task.TaskID);
                if (
                    visibleTaskIds &&
                    visibleTaskIds.size > 0 &&
                    !visibleTaskIds.has(taskId.trim())
                ) {
                    continue;
                }

                rows.push({
                    taskId,
                    taskName: task.TaskName,
                    outlineLevel: 0,
                    isSummary: false,
                    taskData: task,
                });
            }
            return rows;
        }

        // Build display rows from hierarchy, enriching with task data when available
        for (const hier of hierarchyList) {
            const taskId = String(hier.TaskID);
            if (
                visibleHierarchyTaskIds &&
                !visibleHierarchyTaskIds.has(taskId.trim())
            ) {
                continue;
            }
            const outlineLevel = Number(hier.OutlineLevel ?? 0);
            const isSummary =
                String(hier.IsSummary).toLowerCase() === 'true' ||
                hier.IsSummary === true;
            const taskData = tasksById[taskId];

            rows.push({
                taskId,
                taskName: hier.TaskName,
                outlineLevel,
                isSummary,
                taskData,
            });
            seen.add(taskId.trim());
        }

        for (const task of shiftedTasks) {
            const taskId = String(task.TaskID).trim();
            if (!taskId || seen.has(taskId)) {
                continue;
            }
            if (
                visibleHierarchyTaskIds &&
                !visibleHierarchyTaskIds.has(taskId)
            ) {
                continue;
            }

            rows.push({
                taskId,
                taskName: task.TaskName,
                outlineLevel: 0,
                isSummary: false,
                taskData: task,
            });
        }

        return rows;
    }, [
        hierarchyList,
        shiftedTasks,
        tasksById,
        visibleTaskIds,
        visibleHierarchyTaskIds,
    ]);

    // Filter display rows
    const predText = textFilterPredicate(activeFilters.filter);
    const fromDt = parseLocalDateTimeInput(activeFilters.fromDate);
    const toDt = parseLocalDateTimeInput(activeFilters.toDate);
    const predDate = dateRangeFilterPredicate(fromDt, toDt);

    const filtered = useMemo(() => {
        return allDisplayRows.filter((row) => {
            // Text filter on task name or ID
            if (activeFilters.filter) {
                const matchText = predText({
                    TaskID: row.taskId,
                    TaskName: row.taskName,
                } as unknown as Record<string, unknown>);
                if (!matchText) return false;
            }

            // Date filter only applies to rows with task data
            if ((fromDt || toDt) && row.taskData) {
                if (!predDate(row.taskData)) return false;
            }

            return true;
        });
    }, [
        allDisplayRows,
        activeFilters.filter,
        fromDt,
        toDt,
        predText,
        predDate,
    ]);

    // Sort display rows - when hierarchy is present, maintain hierarchy order
    // When no hierarchy, sort by task data
    const ordered = useMemo(() => {
        if (hierarchyList.length > 0) {
            // Hierarchy order is preserved from the CSV file
            return filtered;
        }

        // Fallback to sorting tasks when no hierarchy
        const tasksToSort = filtered
            .filter((r) => r.taskData)
            .map((r) => r.taskData!);
        const sorted = sortTaskRows(tasksToSort, activeFilters.sortMode);
        return sorted.map((task) => ({
            taskId: String(task.TaskID),
            taskName: task.TaskName,
            outlineLevel: 0,
            isSummary: false,
            taskData: task,
        }));
    }, [filtered, activeFilters.sortMode, hierarchyList.length]);

    // Paginate
    const actualPageSize =
        activeFilters.pageSize === -1
            ? ordered.length || 1
            : activeFilters.pageSize;
    const {
        slice,
        page: currentPage,
        pages,
        total,
    } = paginate(ordered, activeFilters.page, actualPageSize);

    // Ensure page is valid
    useEffect(() => {
        if (!autoClampPage) {
            return;
        }
        if (currentPage !== activeFilters.page) {
            updateFilters({ page: currentPage });
        }
    }, [autoClampPage, currentPage, activeFilters.page, updateFilters]);

    // Calculate date range for gantt (only from rows with task data)
    const { minStart, maxFinish, totalH } = useMemo(() => {
        let minStart: Date | null = null;
        let maxFinish: Date | null = null;

        for (const r of filtered) {
            if (!r.taskData) continue;
            const s = parseDate(r.taskData.Start);
            const e = parseDate(r.taskData.Finish);
            if (!s || !e) continue;
            if (!minStart || s < minStart) minStart = s;
            if (!maxFinish || e > maxFinish) maxFinish = e;
        }

        let totalH = 1;
        if (minStart && maxFinish) {
            totalH = (maxFinish.getTime() - minStart.getTime()) / 36e5;
            if (!isFinite(totalH) || totalH <= 0) totalH = 1;
        }

        return { minStart, maxFinish, totalH };
    }, [filtered]);

    const maxWidthPx = 1200;
    const pxPerHour = maxWidthPx / totalH;

    // Generate scale ticks
    const ticks = useMemo(() => {
        const step = Math.max(1, Math.floor(totalH / 10));
        const tickList: Array<{ left: number; label: string }> = [];
        if (minStart) {
            for (let h = 0; h <= totalH; h += step) {
                const left = Math.round(h * pxPerHour);
                const dt = new Date(minStart.getTime() + h * 36e5);
                const lbl = dt.toISOString().replace('T', ' ').slice(0, 16);
                tickList.push({ left, label: lbl });
            }
        }
        return tickList;
    }, [minStart, totalH, pxPerHour]);

    const calculateTooltipPosition = (mouseX: number, mouseY: number) => {
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
    };

    const handleMouseEnter = (e: React.MouseEvent, row: DisplayRow) => {
        const task = row.taskData;
        if (!task) {
            // Summary row without task data
            const content = (
                <div className="max-w-md rounded-md bg-gray-900 p-2 text-xs text-white shadow-lg">
                    <table className="w-full">
                        <tbody>
                            <tr>
                                <td className="pr-2 text-gray-400">TaskID</td>
                                <td>{row.taskId}</td>
                            </tr>
                            <tr>
                                <td className="pr-2 text-gray-400">
                                    Task Name
                                </td>
                                <td>{row.taskName}</td>
                            </tr>
                            <tr>
                                <td className="pr-2 text-gray-400">Type</td>
                                <td>
                                    {row.isSummary ? 'Summary/Heading' : 'Task'}
                                </td>
                            </tr>
                            <tr>
                                <td className="pr-2 text-gray-400">
                                    Outline Level
                                </td>
                                <td>{row.outlineLevel}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            );
            const pos = calculateTooltipPosition(e.clientX, e.clientY);
            setTooltip({ visible: true, x: pos.x, y: pos.y, content });
            return;
        }

        const duration =
            task.DurationHours && !isNaN(Number(task.DurationHours))
                ? Number(task.DurationHours).toFixed(1)
                : '';

        const hierarchy = hierarchyById[String(task.TaskID)];
        const parentId = hierarchy ? hierarchy.ParentID : undefined;

        const content = (
            <div className="max-w-md rounded-md bg-gray-900 p-2 text-xs text-white shadow-lg">
                <table className="w-full">
                    <tbody>
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
                            <td className="pr-2 text-gray-400">
                                Duration Hours
                            </td>
                            <td>{duration}</td>
                        </tr>
                        <tr>
                            <td className="pr-2 text-gray-400">Is Elapsed</td>
                            <td>{task.IsElapsed}</td>
                        </tr>
                        <tr>
                            <td className="pr-2 text-gray-400">Assignments</td>
                            <td>{task.Assignments}</td>
                        </tr>
                        {hierarchy && (
                            <>
                                <tr>
                                    <td className="pr-2 text-gray-400">
                                        Outline Level
                                    </td>
                                    <td>{row.outlineLevel}</td>
                                </tr>
                                <tr>
                                    <td className="pr-2 text-gray-400">
                                        Is Summary
                                    </td>
                                    <td>{String(row.isSummary)}</td>
                                </tr>
                                {parentId && (
                                    <tr>
                                        <td className="pr-2 text-gray-400">
                                            ParentID
                                        </td>
                                        <td>{parentId}</td>
                                    </tr>
                                )}
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        );

        const pos = calculateTooltipPosition(e.clientX, e.clientY);
        setTooltip({ visible: true, x: pos.x, y: pos.y, content });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (tooltip.visible) {
            const pos = calculateTooltipPosition(e.clientX, e.clientY);
            setTooltip((prev) => ({ ...prev, x: pos.x, y: pos.y }));
        }
    };

    const handleMouseLeave = () => {
        setTooltip({ visible: false, x: 0, y: 0, content: null });
    };

    return (
        <div className="space-y-4">
            {showControls && (
                <GanttControls
                    filters={activeFilters}
                    onFiltersChange={updateFilters}
                    total={total}
                    currentPage={currentPage}
                    pages={pages}
                    idPrefix={idPrefix}
                />
            )}

            {/* Gantt Chart */}
            {!minStart || !maxFinish ? (
                <div className="rounded-lg border p-8 text-center text-muted-foreground">
                    {emptyStateMessage}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border bg-white p-4 dark:bg-gray-950">
                    <div className="mb-2 text-xs text-muted-foreground">
                        Span {totalH.toFixed(1)} h
                    </div>

                    {/* Scale */}
                    <div className="relative mb-2 ml-[250px] h-6">
                        {ticks.map((tick, i) => (
                            <div
                                key={i}
                                className="absolute h-full border-l border-gray-200 dark:border-gray-800"
                                style={{ left: `${tick.left}px` }}
                            >
                                <span className="absolute top-1 left-0.5 text-[10px] text-gray-500">
                                    {tick.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Gantt bars */}
                    <div className="relative ml-[250px] min-w-[800px]">
                        {slice.map((row, idx) => {
                            const task = row.taskData;

                            // Compute padding left based on outline level (cap to avoid overflow)
                            const padLeft = Math.min(
                                Math.max(0, row.outlineLevel) * 12,
                                200,
                            );

                            // Summary/heading row without task data - show label only
                            if (!task) {
                                return (
                                    <div
                                        key={idx}
                                        className="relative h-7 border-b border-dashed border-gray-200 dark:border-gray-800"
                                    >
                                        <span
                                            className="absolute top-1.5 -left-[250px] w-[240px] overflow-hidden text-sm font-bold text-ellipsis whitespace-nowrap text-gray-700 dark:text-gray-300"
                                            title={`${row.taskId}: ${row.taskName}`}
                                            style={{
                                                paddingLeft: `${padLeft}px`,
                                                display: 'inline-block',
                                            }}
                                            onMouseEnter={(e) =>
                                                handleMouseEnter(e, row)
                                            }
                                            onMouseMove={handleMouseMove}
                                            onMouseLeave={handleMouseLeave}
                                        >
                                            {row.taskName}
                                        </span>
                                    </div>
                                );
                            }

                            // Task row with gantt bar
                            const s = parseDate(task.Start);
                            const e = parseDate(task.Finish);
                            if (!s || !e || !minStart) {
                                // Task without valid dates - show label only
                                return (
                                    <div
                                        key={idx}
                                        className="relative h-7 border-b border-dashed border-gray-200 dark:border-gray-800"
                                    >
                                        <span
                                            className="absolute top-1.5 -left-[250px] w-[240px] overflow-hidden text-sm text-ellipsis whitespace-nowrap text-gray-600 dark:text-gray-400"
                                            title={`${row.taskId}: ${row.taskName}`}
                                            style={{
                                                paddingLeft: `${padLeft}px`,
                                                display: 'inline-block',
                                            }}
                                        >
                                            {row.taskName}
                                        </span>
                                    </div>
                                );
                            }

                            const left = Math.max(
                                0,
                                Math.round(
                                    ((s.getTime() - minStart.getTime()) /
                                        36e5) *
                                        pxPerHour,
                                ),
                            );
                            const width = Math.max(
                                2,
                                Math.round(
                                    ((e.getTime() - s.getTime()) / 36e5) *
                                        pxPerHour,
                                ),
                            );
                            const isElapsed = (task.IsElapsed || '')
                                .toString()
                                .toUpperCase()
                                .startsWith('Y');

                            return (
                                <div
                                    key={idx}
                                    className="relative h-7 border-b border-dashed border-gray-200 dark:border-gray-800"
                                >
                                    <span
                                        className={`absolute top-1.5 -left-[250px] w-[240px] overflow-hidden text-sm text-ellipsis whitespace-nowrap ${
                                            row.isSummary
                                                ? 'font-semibold text-gray-800 dark:text-gray-200'
                                                : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                        title={`${row.taskId}: ${row.taskName}`}
                                        style={{
                                            paddingLeft: `${padLeft}px`,
                                            display: 'inline-block',
                                        }}
                                    >
                                        {row.taskName}
                                    </span>
                                    <div
                                        className={`absolute top-1.5 h-4 cursor-pointer rounded transition-opacity hover:opacity-80 ${
                                            isElapsed
                                                ? 'bg-red-500'
                                                : 'bg-blue-500'
                                        }`}
                                        style={{
                                            left: `${left}px`,
                                            width: `${width}px`,
                                        }}
                                        onMouseEnter={(e) =>
                                            handleMouseEnter(e, row)
                                        }
                                        onMouseMove={handleMouseMove}
                                        onMouseLeave={handleMouseLeave}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tooltip */}
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
