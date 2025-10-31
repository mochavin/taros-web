import { Label } from '@/components/ui/label';
import type { GanttFilters, TaskRow } from '@/types/schedule';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { GanttChart } from '../gantt-chart';
import { GanttChartFlat } from '../gantt-chart-flat';
import { computeBaselineShiftMs } from './utils';
import type { VariantEntry } from './use-variant-data';

const EMPTY_TASK_ROWS: TaskRow[] = [];

interface VariantCardProps {
    entry: VariantEntry;
    customStart: string;
    filters: GanttFilters;
    onFiltersChange: (filters: GanttFilters) => void;
    viewMode: 'hierarchy' | 'flat';
}

export function VariantCard({
    entry,
    customStart,
    filters,
    onFiltersChange,
    viewMode,
}: VariantCardProps) {
    const taskRows = entry.data?.taskRows ?? EMPTY_TASK_ROWS;
    const baselineShiftMs = useMemo(
        () => computeBaselineShiftMs(taskRows, customStart),
        [taskRows, customStart],
    );

    const isLoading = entry.data?.isLoading ?? true;
    const error = entry.data?.error;
    const displayName = entry.variant.name || entry.slug;

    if (isLoading) {
        return (
            <div className="flex flex-col space-y-2 rounded-lg border bg-card p-4 shadow-sm">
                <div className="min-h-20 flex-shrink-0 rounded-lg border bg-primary/5 p-3">
                    <div className="flex h-full items-center justify-between">
                        <h3 className="text-lg font-semibold">{displayName}</h3>
                        <Label className="text-sm">Tasks: --</Label>
                    </div>
                </div>
                <div className="relative min-h-[500px] flex-1">
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/40 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-4 rounded-xl border bg-white p-8 shadow-2xl dark:bg-gray-800">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <div className="text-center">
                                <p className="font-semibold">Loading {displayName}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Please wait...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col space-y-2 rounded-lg border bg-card p-4 shadow-sm">
                <div className="min-h-20 flex-shrink-0 rounded-lg border bg-primary/5 p-3">
                    <div className="flex h-full items-center justify-between">
                        <h3 className="text-lg font-semibold">{displayName}</h3>
                        <Label className="text-sm">Tasks: 0</Label>
                    </div>
                </div>
                <div className="flex min-h-[500px] flex-1 items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8">
                    <div className="text-center">
                        <p className="font-semibold text-destructive">Error Loading Variant</p>
                        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (taskRows.length === 0) {
        return (
            <div className="flex flex-col space-y-2 rounded-lg border bg-card p-4 shadow-sm">
                <div className="min-h-20 flex-shrink-0 rounded-lg border bg-primary/5 p-3">
                    <div className="flex h-full items-center justify-between">
                        <h3 className="text-lg font-semibold">{displayName}</h3>
                        <Label className="text-sm">Tasks: 0</Label>
                    </div>
                </div>
                <div className="flex min-h-[500px] flex-1 items-center justify-center rounded-lg border bg-muted/30 p-8">
                    <p className="text-muted-foreground">No tasks found for this variant.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-2 rounded-lg border bg-card p-4 shadow-sm">
            <div className="min-h-20 flex-shrink-0 rounded-lg border bg-primary/5 p-3">
                <div className="flex h-full items-center justify-between">
                    <h3 className="text-lg font-semibold">{displayName}</h3>
                    <Label className="text-sm">Tasks: {taskRows.length}</Label>
                </div>
            </div>
            <div className="min-h-[500px] flex-1">
                {viewMode === 'hierarchy' ? (
                    <GanttChart
                        tasks={taskRows}
                        baselineShiftMs={baselineShiftMs}
                        filters={filters}
                        onFiltersChange={onFiltersChange}
                        idPrefix={`compare-${entry.slug}`}
                    />
                ) : (
                    <GanttChartFlat
                        tasks={taskRows}
                        baselineShiftMs={baselineShiftMs}
                        filters={filters}
                        onFiltersChange={onFiltersChange}
                        idPrefix={`compare-${entry.slug}`}
                    />
                )}
            </div>
        </div>
    );
}
