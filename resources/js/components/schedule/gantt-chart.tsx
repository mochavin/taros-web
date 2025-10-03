import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { TaskRow, TaskSortMode } from '@/types/schedule';
import {
    parseDate,
    parseLocalDateTimeInput,
    paginate,
    textFilterPredicate,
    dateRangeFilterPredicate,
    sortTaskRows,
    formatIndoDateTime,
} from '@/lib/schedule-utils';

interface GanttChartProps {
    tasks: TaskRow[];
    baselineShiftMs: number;
}

export function GanttChart({ tasks, baselineShiftMs }: GanttChartProps) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(-1);
    const [filter, setFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [sortMode, setSortMode] = useState<TaskSortMode>('id');
    const [tooltip, setTooltip] = useState<{
        visible: boolean;
        x: number;
        y: number;
        content: React.ReactNode;
    }>({ visible: false, x: 0, y: 0, content: null });

    const tooltipRef = useRef<HTMLDivElement>(null);

    // Apply baseline shift to tasks
    const shiftedTasks = tasks.map((r) => {
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
            rr.Finish = shifted.toISOString().replace('T', ' ').slice(0, 19);
        }
        return rr;
    });

    // Filter tasks
    const predText = textFilterPredicate(filter);
    const fromDt = parseLocalDateTimeInput(fromDate);
    const toDt = parseLocalDateTimeInput(toDate);
    const predDate = dateRangeFilterPredicate(fromDt, toDt);
    const filtered = shiftedTasks.filter((row) => predText(row as unknown as Record<string, unknown>) && (!fromDt && !toDt ? true : predDate(row)));

    // Sort tasks
    const ordered = sortTaskRows(filtered, sortMode);

    // Paginate
    const actualPageSize = pageSize === -1 ? ordered.length || 1 : pageSize;
    const { slice, page: currentPage, pages, total } = paginate(ordered, page, actualPageSize);

    // Ensure page is valid
    useEffect(() => {
        if (currentPage !== page) setPage(currentPage);
    }, [currentPage, page]);

    // Calculate date range for gantt
    let minStart: Date | null = null;
    let maxFinish: Date | null = null;
    for (const r of filtered) {
        const s = parseDate(r.Start);
        const e = parseDate(r.Finish);
        if (!s || !e) continue;
        if (!minStart || s < minStart) minStart = s;
        if (!maxFinish || e > maxFinish) maxFinish = e;
    }

    let totalH = 1;
    if (minStart && maxFinish) {
        totalH = (maxFinish.getTime() - minStart.getTime()) / 36e5;
        if (!isFinite(totalH) || totalH <= 0) totalH = 1;
    }

    const maxWidthPx = 1200;
    const pxPerHour = maxWidthPx / totalH;

    // Generate scale ticks
    const step = Math.max(1, Math.floor(totalH / 10));
    const ticks: Array<{ left: number; label: string }> = [];
    if (minStart) {
        for (let h = 0; h <= totalH; h += step) {
            const left = Math.round(h * pxPerHour);
            const dt = new Date(minStart.getTime() + h * 36e5);
            const lbl = dt.toISOString().replace('T', ' ').slice(0, 16);
            ticks.push({ left, label: lbl });
        }
    }

    const calculateTooltipPosition = (mouseX: number, mouseY: number) => {
        const pad = 12;
        const tooltipWidth = 420; // Approximate max-width of tooltip
        const tooltipHeight = 200; // Approximate height of tooltip
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let x = mouseX + pad;
        let y = mouseY + pad;

        // Check if tooltip would overflow right edge
        if (x + tooltipWidth > viewportWidth) {
            x = mouseX - tooltipWidth - pad;
        }

        // Check if tooltip would overflow bottom edge
        if (y + tooltipHeight > viewportHeight) {
            y = mouseY - tooltipHeight - pad;
        }

        // Ensure tooltip doesn't go off left edge
        if (x < 4) {
            x = 4;
        }

        // Ensure tooltip doesn't go off top edge
        if (y < 4) {
            y = 4;
        }

        return { x, y };
    };

    const handleMouseEnter = (e: React.MouseEvent, task: TaskRow) => {
        const duration = task.DurationHours && !isNaN(Number(task.DurationHours))
            ? Number(task.DurationHours).toFixed(1)
            : '';

        const content = (
            <div className="bg-gray-900 text-white text-xs p-2 rounded-md shadow-lg max-w-md">
                <table className="w-full">
                    <tbody>
                        <tr>
                            <td className="text-gray-400 pr-2">TaskID</td>
                            <td>{task.TaskID}</td>
                        </tr>
                        <tr>
                            <td className="text-gray-400 pr-2">Task Name</td>
                            <td>{task.TaskName}</td>
                        </tr>
                        <tr>
                            <td className="text-gray-400 pr-2">Start</td>
                            <td>{formatIndoDateTime(task.Start)}</td>
                        </tr>
                        <tr>
                            <td className="text-gray-400 pr-2">Finish</td>
                            <td>{formatIndoDateTime(task.Finish)}</td>
                        </tr>
                        <tr>
                            <td className="text-gray-400 pr-2">Duration Hours</td>
                            <td>{duration}</td>
                        </tr>
                        <tr>
                            <td className="text-gray-400 pr-2">Is Elapsed</td>
                            <td>{task.IsElapsed}</td>
                        </tr>
                        <tr>
                            <td className="text-gray-400 pr-2">Assignments</td>
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
                <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="taskFilter">Filter tasks</Label>
                    <Input
                        id="taskFilter"
                        type="text"
                        placeholder="Filter tasks by text..."
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div>
                    <Label htmlFor="taskFrom">From</Label>
                    <Input
                        id="taskFrom"
                        type="datetime-local"
                        value={fromDate}
                        onChange={(e) => {
                            setFromDate(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div>
                    <Label htmlFor="taskTo">To</Label>
                    <Input
                        id="taskTo"
                        type="datetime-local"
                        value={toDate}
                        onChange={(e) => {
                            setToDate(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div>
                    <Label htmlFor="taskPageSize">Page size</Label>
                    <Select
                        value={pageSize.toString()}
                        onValueChange={(v) => {
                            setPageSize(v === 'all' ? -1 : Number(v));
                            setPage(1);
                        }}
                    >
                        <SelectTrigger id="taskPageSize" className="w-[100px]">
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
                    <Label htmlFor="taskSort">Sort</Label>
                    <Select value={sortMode} onValueChange={(v) => setSortMode(v as TaskSortMode)}>
                        <SelectTrigger id="taskSort" className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="id">Task ID</SelectItem>
                            <SelectItem value="start">Start time</SelectItem>
                            <SelectItem value="finish">Finish time</SelectItem>
                            <SelectItem value="duration">Duration (longest first)</SelectItem>
                            <SelectItem value="duration_asc">Duration (shortest first)</SelectItem>
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
                    <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(page - 1)}>
                        Prev
                    </Button>
                    <Button variant="outline" size="sm" disabled={currentPage >= pages} onClick={() => setPage(page + 1)}>
                        Next
                    </Button>
                </div>
            </div>

            {/* Gantt Chart */}
            {!minStart || !maxFinish ? (
                <div className="border rounded-lg p-8 text-center text-muted-foreground">No valid dates in data</div>
            ) : (
                <div className="border rounded-lg p-4 bg-white dark:bg-gray-950 overflow-x-auto">
                    <div className="text-xs text-muted-foreground mb-2">
                        {/* Tasks: {total} | Page {currentPage}/{pages} |  */}
                        Span {totalH.toFixed(1)} h
                    </div>

                    {/* Scale */}
                    <div className="relative h-6 ml-[200px] mb-2">
                        {ticks.map((tick, i) => (
                            <div
                                key={i}
                                className="absolute h-full border-l border-gray-200 dark:border-gray-800"
                                style={{ left: `${tick.left}px` }}
                            >
                                <span className="absolute top-1 left-0.5 text-[10px] text-gray-500">{tick.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Gantt bars */}
                    <div className="relative ml-[200px] min-w-[800px]">
                        {slice.map((task, idx) => {
                            const s = parseDate(task.Start);
                            const e = parseDate(task.Finish);
                            if (!s || !e || !minStart) return null;

                            const left = Math.max(0, Math.round(((s.getTime() - minStart.getTime()) / 36e5) * pxPerHour));
                            const width = Math.max(2, Math.round(((e.getTime() - s.getTime()) / 36e5) * pxPerHour));
                            const isElapsed = (task.IsElapsed || '').toString().toUpperCase().startsWith('Y');

                            return (
                                <div key={idx} className="relative h-7 border-b border-dashed border-gray-200 dark:border-gray-800">
                                    <span
                                        className="absolute w-[190px] -left-[200px] top-1.5 whitespace-nowrap overflow-hidden text-ellipsis text-sm"
                                        title={task.TaskID}
                                    >
                                        {task.TaskName}
                                    </span>
                                    <div
                                        className={`absolute h-4 top-1.5 rounded cursor-pointer transition-opacity hover:opacity-80 ${
                                            isElapsed ? 'bg-red-500' : 'bg-blue-500'
                                        }`}
                                        style={{ left: `${left}px`, width: `${width}px` }}
                                        onMouseEnter={(e) => handleMouseEnter(e, task)}
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
                    className="fixed z-50 pointer-events-none"
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
