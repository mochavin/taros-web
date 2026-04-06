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
    isElapsedTask,
    paginate,
    parseDate,
    parseLocalDateTimeInput,
    sortTaskRows,
    textFilterPredicate,
} from '@/lib/schedule-utils';
import type { GanttFilters, TaskRow, TaskSortMode } from '@/types/schedule';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';

interface GanttChartFlatProps {
    tasks: TaskRow[];
    baselineShiftMs: number;
    filters?: GanttFilters;
    onFiltersChange?: (filters: GanttFilters) => void;
    idPrefix?: string;
    autoClampPage?: boolean;
    emptyStateMessage?: string;
}

export function GanttChartFlat({
    tasks,
    baselineShiftMs,
    filters,
    onFiltersChange,
    idPrefix,
    autoClampPage = true,
    emptyStateMessage = 'No valid dates in data',
}: GanttChartFlatProps) {
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

    const idBase = idPrefix ? `${idPrefix}-` : '';
    const [tooltip, setTooltip] = useState<{
        visible: boolean;
        x: number;
        y: number;
        content: ReactNode;
    }>({ visible: false, x: 0, y: 0, content: null });

    const tooltipRef = useRef<HTMLDivElement>(null);

    const shiftedTasks = useMemo(() => {
        return tasks.map((task) => {
            if (!baselineShiftMs) {
                return task;
            }
            const start = parseDate(task.Start);
            const finish = parseDate(task.Finish);
            const clone = { ...task };
            if (start) {
                const shifted = new Date(start.getTime() + baselineShiftMs);
                clone.Start = shifted
                    .toISOString()
                    .replace('T', ' ')
                    .slice(0, 19);
            }
            if (finish) {
                const shifted = new Date(finish.getTime() + baselineShiftMs);
                clone.Finish = shifted
                    .toISOString()
                    .replace('T', ' ')
                    .slice(0, 19);
            }
            return clone;
        });
    }, [tasks, baselineShiftMs]);

    const predText = useMemo(
        () => textFilterPredicate(activeFilters.filter),
        [activeFilters.filter],
    );
    const fromDt = useMemo(
        () => parseLocalDateTimeInput(activeFilters.fromDate),
        [activeFilters.fromDate],
    );
    const toDt = useMemo(
        () => parseLocalDateTimeInput(activeFilters.toDate),
        [activeFilters.toDate],
    );
    const predDate = useMemo(
        () => dateRangeFilterPredicate(fromDt, toDt),
        [fromDt, toDt],
    );

    const filtered = useMemo(() => {
        return shiftedTasks.filter((row) => {
            const matchesText = predText(
                row as unknown as Record<string, unknown>,
            );
            if (!matchesText) {
                return false;
            }
            if (!fromDt && !toDt) {
                return true;
            }
            return predDate(row);
        });
    }, [shiftedTasks, predText, fromDt, toDt, predDate]);

    const ordered = useMemo(
        () => sortTaskRows(filtered, activeFilters.sortMode),
        [filtered, activeFilters.sortMode],
    );

    const actualPageSize =
        activeFilters.pageSize === -1
            ? ordered.length || 1
            : activeFilters.pageSize;

    const {
        slice,
        page: currentPage,
        pages,
        total,
    } = useMemo(() => {
        return paginate(ordered, activeFilters.page, actualPageSize);
    }, [ordered, activeFilters.page, actualPageSize]);

    useEffect(() => {
        if (!autoClampPage) {
            return;
        }
        if (currentPage !== activeFilters.page) {
            updateFilters({ page: currentPage });
        }
    }, [autoClampPage, currentPage, activeFilters.page, updateFilters]);

    const { minStart, maxFinish, totalH } = useMemo(() => {
        let minStart: Date | null = null;
        let maxFinish: Date | null = null;

        for (const row of filtered) {
            const start = parseDate(row.Start);
            const finish = parseDate(row.Finish);
            if (!start || !finish) {
                continue;
            }
            if (!minStart || start < minStart) {
                minStart = start;
            }
            if (!maxFinish || finish > maxFinish) {
                maxFinish = finish;
            }
        }

        let totalHours = 1;
        if (minStart && maxFinish) {
            totalHours = (maxFinish.getTime() - minStart.getTime()) / 36e5;
            if (!Number.isFinite(totalHours) || totalHours <= 0) {
                totalHours = 1;
            }
        }

        return { minStart, maxFinish, totalH: totalHours };
    }, [filtered]);

    const maxWidthPx = 1200;
    const pxPerHour = maxWidthPx / totalH;

    const ticks = useMemo(() => {
        const step = Math.max(1, Math.floor(totalH / 10));
        const list: Array<{ left: number; label: string }> = [];
        if (minStart) {
            for (let h = 0; h <= totalH; h += step) {
                const left = Math.round(h * pxPerHour);
                const dt = new Date(minStart.getTime() + h * 36e5);
                const label = dt.toISOString().replace('T', ' ').slice(0, 16);
                list.push({ left, label });
            }
        }
        return list;
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

    const handleMouseEnter = (e: React.MouseEvent, task: TaskRow) => {
        const duration =
            task.DurationHours && !Number.isNaN(Number(task.DurationHours))
                ? Number(task.DurationHours).toFixed(1)
                : '';
        const isElapsed = isElapsedTask(task.IsElapsed);

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
                            <td className={isElapsed ? 'font-semibold text-red-400' : undefined}>
                                {task.TaskName}
                            </td>
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
                            <td className={isElapsed ? 'font-semibold text-red-400' : undefined}>
                                {isElapsed ? 'Yes (elapsed task)' : task.IsElapsed}
                            </td>
                        </tr>
                        <tr>
                            <td className="pr-2 text-gray-400">Assignments</td>
                            <td>{task.Assignments}</td>
                        </tr>
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
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[200px] flex-1">
                    <Label htmlFor={`${idBase}taskFilterFlat`}>
                        Filter tasks
                    </Label>
                    <Input
                        id={`${idBase}taskFilterFlat`}
                        type="text"
                        placeholder="Filter tasks by text..."
                        value={activeFilters.filter}
                        onChange={(e) =>
                            updateFilters({
                                filter: e.target.value,
                                page: 1,
                            })
                        }
                    />
                </div>
                <div>
                    <Label htmlFor={`${idBase}taskFromFlat`}>From</Label>
                    <Input
                        id={`${idBase}taskFromFlat`}
                        type="datetime-local"
                        value={activeFilters.fromDate}
                        onChange={(e) =>
                            updateFilters({
                                fromDate: e.target.value,
                                page: 1,
                            })
                        }
                    />
                </div>
                <div>
                    <Label htmlFor={`${idBase}taskToFlat`}>To</Label>
                    <Input
                        id={`${idBase}taskToFlat`}
                        type="datetime-local"
                        value={activeFilters.toDate}
                        onChange={(e) =>
                            updateFilters({
                                toDate: e.target.value,
                                page: 1,
                            })
                        }
                    />
                </div>
                <div>
                    <Label htmlFor={`${idBase}taskPageSizeFlat`}>
                        Page size
                    </Label>
                    <Select
                        value={activeFilters.pageSize.toString()}
                        onValueChange={(v) =>
                            updateFilters({
                                pageSize: v === '-1' ? -1 : Number(v),
                                page: 1,
                            })
                        }
                    >
                        <SelectTrigger
                            id={`${idBase}taskPageSizeFlat`}
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
                    <Label htmlFor={`${idBase}taskSortFlat`}>Sort</Label>
                    <Select
                        value={activeFilters.sortMode}
                        onValueChange={(v) =>
                            updateFilters({
                                sortMode: v as TaskSortMode,
                                page: 1,
                            })
                        }
                    >
                        <SelectTrigger
                            id={`${idBase}taskSortFlat`}
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

            {/* Pagination controls */}
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
                            updateFilters({
                                page: Math.max(1, activeFilters.page - 1),
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
                            updateFilters({
                                page: Math.min(pages, activeFilters.page + 1),
                            })
                        }
                    >
                        Next
                    </Button>
                </div>
            </div>

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
                    <div className="relative mb-2 ml-[200px] h-6">
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
                    <div className="relative ml-[200px] min-w-[800px]">
                        {slice.map((task, idx) => {
                            const s = parseDate(task.Start);
                            const e = parseDate(task.Finish);
                            if (!s || !e || !minStart) return null;

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
                            const isElapsed = isElapsedTask(task.IsElapsed);
                            const taskTitle = isElapsed
                                ? `${task.TaskID}: ${task.TaskName} (Elapsed task)`
                                : `${task.TaskID}: ${task.TaskName}`;

                            return (
                                <div
                                    key={idx}
                                    className="relative h-7 border-b border-dashed border-gray-200 dark:border-gray-800"
                                >
                                    <span
                                        className={`absolute top-1.5 -left-[200px] w-[190px] overflow-hidden text-sm text-ellipsis whitespace-nowrap ${
                                            isElapsed
                                                ? 'text-red-600 dark:text-red-400'
                                                : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                        title={taskTitle}
                                    >
                                        {task.TaskName}
                                    </span>
                                    <div
                                        className="absolute top-1.5 h-4 cursor-pointer rounded bg-blue-500 transition-opacity hover:opacity-80"
                                        style={{
                                            left: `${left}px`,
                                            width: `${width}px`,
                                        }}
                                        onMouseEnter={(e) =>
                                            handleMouseEnter(e, task)
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
