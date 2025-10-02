import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TaskRow, TaskSortMode } from '@/types/schedule';
import {
    parseLocalDateTimeInput,
    paginate,
    textFilterPredicate,
    dateRangeFilterPredicate,
    sortTaskRows,
    formatIndoDateTime,
} from '@/lib/schedule-utils';

interface TaskTableProps {
    tasks: TaskRow[];
}

export function TaskTable({ tasks }: TaskTableProps) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [filter, setFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [sortMode, setSortMode] = useState<TaskSortMode>('id');

    // Filter tasks
    const predText = textFilterPredicate(filter);
    const fromDt = parseLocalDateTimeInput(fromDate);
    const toDt = parseLocalDateTimeInput(toDate);
    const predDate = dateRangeFilterPredicate(fromDt, toDt);
    const filtered = tasks.filter((row) => predText(row as unknown as Record<string, unknown>) && (!fromDt && !toDt ? true : predDate(row)));

    // Sort tasks
    const ordered = sortTaskRows(filtered, sortMode);

    // Paginate
    const actualPageSize = pageSize === -1 ? ordered.length || 1 : pageSize;
    const { slice, page: currentPage, pages, total } = paginate(ordered, page, actualPageSize);

    // Ensure page is valid
    useEffect(() => {
        if (currentPage !== page) setPage(currentPage);
    }, [currentPage, page]);

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="taskFilter2">Filter tasks</Label>
                    <Input
                        id="taskFilter2"
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
                    <Label htmlFor="taskFrom2">From</Label>
                    <Input
                        id="taskFrom2"
                        type="datetime-local"
                        value={fromDate}
                        onChange={(e) => {
                            setFromDate(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div>
                    <Label htmlFor="taskTo2">To</Label>
                    <Input
                        id="taskTo2"
                        type="datetime-local"
                        value={toDate}
                        onChange={(e) => {
                            setToDate(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div>
                    <Label htmlFor="taskPageSize2">Page size</Label>
                    <Select
                        value={pageSize.toString()}
                        onValueChange={(v) => {
                            setPageSize(v === 'all' ? -1 : Number(v));
                            setPage(1);
                        }}
                    >
                        <SelectTrigger id="taskPageSize2" className="w-[100px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="200">200</SelectItem>
                            <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="taskSort2">Sort</Label>
                    <Select value={sortMode} onValueChange={(v) => setSortMode(v as TaskSortMode)}>
                        <SelectTrigger id="taskSort2" className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="id">Task ID</SelectItem>
                            <SelectItem value="start">Start time</SelectItem>
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

            {/* Table */}
            <div className="border rounded-lg overflow-auto max-h-[65vh]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">TaskID</TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">TaskName</TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">Start</TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">Finish</TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900 text-right">DurationHours</TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">IsElapsed</TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">Assignments</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {slice.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground">
                                    No tasks found
                                </TableCell>
                            </TableRow>
                        ) : (
                            slice.map((task, idx) => {
                                const duration =
                                    task.DurationHours && !isNaN(Number(task.DurationHours))
                                        ? Number(task.DurationHours).toFixed(1)
                                        : '';
                                return (
                                    <TableRow key={idx}>
                                        <TableCell>{task.TaskID}</TableCell>
                                        <TableCell>{task.TaskName}</TableCell>
                                        <TableCell>{formatIndoDateTime(task.Start)}</TableCell>
                                        <TableCell>{formatIndoDateTime(task.Finish)}</TableCell>
                                        <TableCell className="text-right">{duration}</TableCell>
                                        <TableCell>{task.IsElapsed}</TableCell>
                                        <TableCell>{task.Assignments}</TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
