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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    filterResourceRows,
    formatIndoDateTime,
    paginate,
} from '@/lib/schedule-utils';
import type { ResourceRow, ResourceTableFilters } from '@/types/schedule';
import { useEffect, useState } from 'react';

interface ResourceTableProps {
    resources: ResourceRow[];
    filters?: ResourceTableFilters;
    onFiltersChange?: (filters: ResourceTableFilters) => void;
    showFilters?: boolean;
}

const DEFAULT_FILTERS: ResourceTableFilters = {
    filter: '',
    fromDate: '',
    toDate: '',
    pageSize: 50,
};

export function ResourceTable({
    resources,
    filters,
    onFiltersChange,
    showFilters = true,
}: ResourceTableProps) {
    const [page, setPage] = useState(1);
    const [internalFilters, setInternalFilters] =
        useState<ResourceTableFilters>(DEFAULT_FILTERS);

    const activeFilters = filters ?? internalFilters;
    const updateFilters = (patch: Partial<ResourceTableFilters>) => {
        const nextFilters = { ...activeFilters, ...patch };

        if (filters && onFiltersChange) {
            onFiltersChange(nextFilters);
            return;
        }

        setInternalFilters(nextFilters);
    };

    const filtered = filterResourceRows(resources, activeFilters);

    // Paginate
    const actualPageSize =
        activeFilters.pageSize === -1
            ? filtered.length || 1
            : activeFilters.pageSize;
    const {
        slice,
        page: currentPage,
        pages,
        total,
    } = paginate(filtered, page, actualPageSize);

    // Ensure page is valid
    useEffect(() => {
        if (currentPage !== page) setPage(currentPage);
    }, [currentPage, page]);

    useEffect(() => {
        setPage(1);
    }, [
        activeFilters.filter,
        activeFilters.fromDate,
        activeFilters.pageSize,
        activeFilters.toDate,
    ]);

    return (
        <div className="space-y-4">
            {showFilters && (
                <div className="flex flex-wrap items-end gap-4">
                    <div className="min-w-[200px] flex-1">
                        <Label htmlFor="resFilter">
                            Filter resources/tasks
                        </Label>
                        <Input
                            id="resFilter"
                            type="text"
                            placeholder="Filter resources/tasks..."
                            value={activeFilters.filter}
                            onChange={(e) => {
                                updateFilters({ filter: e.target.value });
                                setPage(1);
                            }}
                        />
                    </div>
                    <div>
                        <Label htmlFor="resFrom">From</Label>
                        <Input
                            id="resFrom"
                            type="date"
                            value={activeFilters.fromDate}
                            onChange={(e) => {
                                updateFilters({ fromDate: e.target.value });
                                setPage(1);
                            }}
                        />
                    </div>
                    <div>
                        <Label htmlFor="resTo">To</Label>
                        <Input
                            id="resTo"
                            type="date"
                            value={activeFilters.toDate}
                            onChange={(e) => {
                                updateFilters({ toDate: e.target.value });
                                setPage(1);
                            }}
                        />
                    </div>
                    <div>
                        <Label htmlFor="resPageSize">Page size</Label>
                        <Select
                            value={
                                activeFilters.pageSize === -1
                                    ? 'all'
                                    : activeFilters.pageSize.toString()
                            }
                            onValueChange={(v) => {
                                updateFilters({
                                    pageSize: v === 'all' ? -1 : Number(v),
                                });
                                setPage(1);
                            }}
                        >
                            <SelectTrigger
                                id="resPageSize"
                                className="w-[100px]"
                            >
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
            )}

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
                        onClick={() => setPage(page - 1)}
                    >
                        Prev
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= pages}
                        onClick={() => setPage(page + 1)}
                    >
                        Next
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="max-h-[65vh] overflow-auto rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                                ResourceID
                            </TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                                ResourceName
                            </TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                                TaskID
                            </TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                                TaskName
                            </TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                                SegmentStart
                            </TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                                SegmentEnd
                            </TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 text-right dark:bg-gray-900">
                                SegmentHours
                            </TableHead>
                            <TableHead className="sticky top-0 bg-gray-50 text-right dark:bg-gray-900">
                                Units
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {slice.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="text-center text-muted-foreground"
                                >
                                    No resources found
                                </TableCell>
                            </TableRow>
                        ) : (
                            slice.map((resource, idx) => {
                                const duration =
                                    resource.SegmentHours &&
                                    !isNaN(Number(resource.SegmentHours))
                                        ? Number(resource.SegmentHours).toFixed(
                                              1,
                                          )
                                        : '';
                                return (
                                    <TableRow key={idx}>
                                        <TableCell>
                                            {resource.ResourceID}
                                        </TableCell>
                                        <TableCell>
                                            {resource.ResourceName}
                                        </TableCell>
                                        <TableCell>{resource.TaskID}</TableCell>
                                        <TableCell>
                                            {resource.TaskName}
                                        </TableCell>
                                        <TableCell>
                                            {formatIndoDateTime(
                                                resource.SegmentStart,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatIndoDateTime(
                                                resource.SegmentEnd,
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {duration}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {resource.Units}
                                        </TableCell>
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
