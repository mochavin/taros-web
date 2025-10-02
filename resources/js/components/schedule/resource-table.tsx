import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ResourceRow } from '@/types/schedule';
import { parseLocalDateTimeInput, paginate, textFilterPredicate, parseDate, formatIndoDateTime } from '@/lib/schedule-utils';

interface ResourceTableProps {
    resources: ResourceRow[];
}

export function ResourceTable({ resources }: ResourceTableProps) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [filter, setFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Filter resources
    const predText = textFilterPredicate(filter);
    const fromDt = parseLocalDateTimeInput(fromDate);
    const toDt = parseLocalDateTimeInput(toDate);

    const datePred = (row: ResourceRow) => {
        const s = parseDate(row.SegmentStart);
        const e = parseDate(row.SegmentEnd);
        if (!s || !e) return false;
        if (fromDt && e < fromDt) return false;
        if (toDt && s > toDt) return false;
        return true;
    };

    const filtered = resources.filter((row) => predText(row as unknown as Record<string, unknown>) && (!fromDt && !toDt ? true : datePred(row)));

    // Paginate
    const actualPageSize = pageSize === -1 ? filtered.length || 1 : pageSize;
    const { slice, page: currentPage, pages, total } = paginate(filtered, page, actualPageSize);

    // Ensure page is valid
    useEffect(() => {
        if (currentPage !== page) setPage(currentPage);
    }, [currentPage, page]);

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="resFilter">Filter resources/tasks</Label>
                    <Input
                        id="resFilter"
                        type="text"
                        placeholder="Filter resources/tasks..."
                        value={filter}
                        onChange={(e) => {
                            setFilter(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div>
                    <Label htmlFor="resFrom">From</Label>
                    <Input
                        id="resFrom"
                        type="datetime-local"
                        value={fromDate}
                        onChange={(e) => {
                            setFromDate(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div>
                    <Label htmlFor="resTo">To</Label>
                    <Input
                        id="resTo"
                        type="datetime-local"
                        value={toDate}
                        onChange={(e) => {
                            setToDate(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div>
                    <Label htmlFor="resPageSize">Page size</Label>
                    <Select
                        value={pageSize.toString()}
                        onValueChange={(v) => {
                            setPageSize(v === 'all' ? -1 : Number(v));
                            setPage(1);
                        }}
                    >
                        <SelectTrigger id="resPageSize" className="w-[100px]">
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
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">ResourceID</TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">ResourceName</TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">TaskID</TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">TaskName</TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">SegmentStart</TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">SegmentEnd</TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900 text-right">SegmentHours</TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900 text-right">Units</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {slice.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground">
                                    No resources found
                                </TableCell>
                            </TableRow>
                        ) : (
                            slice.map((resource, idx) => {
                                const duration =
                                    resource.SegmentHours && !isNaN(Number(resource.SegmentHours))
                                        ? Number(resource.SegmentHours).toFixed(1)
                                        : '';
                                return (
                                    <TableRow key={idx}>
                                        <TableCell>{resource.ResourceID}</TableCell>
                                        <TableCell>{resource.ResourceName}</TableCell>
                                        <TableCell>{resource.TaskID}</TableCell>
                                        <TableCell>{resource.TaskName}</TableCell>
                                        <TableCell>{formatIndoDateTime(resource.SegmentStart)}</TableCell>
                                        <TableCell>{formatIndoDateTime(resource.SegmentEnd)}</TableCell>
                                        <TableCell className="text-right">{duration}</TableCell>
                                        <TableCell className="text-right">{resource.Units}</TableCell>
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
