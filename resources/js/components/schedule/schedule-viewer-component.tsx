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
import { useCSVParser } from '@/hooks/use-csv-parser';
import {
    formatDateLocal,
    formatToDateTimeLocal,
    parseDate,
    parseLocalDateTimeInput,
} from '@/lib/schedule-utils';
import type { ScheduleVariantOption } from '@/types/schedule';
import { Loader2 } from 'lucide-react';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { GanttChart } from './gantt-chart';
import { GanttChartCompare } from './gantt-chart-compare';
import { GanttChartFlat } from './gantt-chart-flat';
import { ResourceLoadChart } from './resource-load-chart';
import { ResourceLoadChartCompare } from './resource-load-chart-compare';
import { ResourceTable } from './resource-table';
import { ResourceTableCompare } from './resource-table-compare';
import { TaskTable } from './task-table';
import { TaskTableCompare } from './task-table-compare';
// import Papa from 'papaparse';

const formatVariantLabel = (variantKey: string): string =>
    variantKey
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

interface ScheduleViewerComponentProps {
    projectId?: number;
    variants?: ScheduleVariantOption[];
    defaultVariant?: string | null;
    hierarchyCandidates?: string[];
    startBaseline?: string | null;
}

export function ScheduleViewerComponent({
    variants = [],
    defaultVariant,
    hierarchyCandidates = [],
    startBaseline,
}: ScheduleViewerComponentProps) {
    const visibleVariants = useMemo(
        () => variants.filter((variant) => !variant.isHidden),
        [variants],
    );
    const hasVariants = visibleVariants.length > 0;
    const variantMap = useMemo(() => {
        const entries = visibleVariants.map(
            (variant) => [variant.slug, variant] as const,
        );
        return new Map(entries);
    }, [visibleVariants]);

    const initialVariant = useMemo(() => {
        if (defaultVariant && variantMap.has(defaultVariant)) {
            return defaultVariant;
        }

        return visibleVariants[0]?.slug ?? '';
    }, [defaultVariant, variantMap, visibleVariants]);

    const [currentVariant, setCurrentVariant] = useState(initialVariant);
    const [customStart, setCustomStart] = useState(
        startBaseline ? formatToDateTimeLocal(new Date(startBaseline)) : '',
    );
    const [status, setStatus] = useState('');
    const [ganttViewMode, setGanttViewMode] = useState<
        'hierarchy' | 'flat' | 'compare'
    >('hierarchy');
    const [compareVariants, setCompareVariants] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('gantt');

    const {
        taskRows,
        resRows,
        isLoading,
        loadTasksFromFile,
        loadResourcesFromFile,
        loadVariant,
        clearData,
    } = useCSVParser();

    const hierarchySources = useMemo(
        () =>
            hierarchyCandidates.length > 0
                ? hierarchyCandidates
                : ['/hierarchy/tasks_hierarchy.csv'],
        [hierarchyCandidates],
    );

    // Ensure current variant tracks available options
    useEffect(() => {
        if (!hasVariants) {
            setCurrentVariant('');
            setStatus(
                'Tidak ada varian yang ditampilkan. Unggah CSV untuk melihat data secara manual.',
            );
            return;
        }

        if (currentVariant && variantMap.has(currentVariant)) {
            return;
        }

        setCurrentVariant(initialVariant);
    }, [currentVariant, hasVariants, initialVariant, variantMap]);

    useEffect(() => {
        if (!hasVariants || !defaultVariant) {
            return;
        }

        if (variantMap.has(defaultVariant)) {
            setCurrentVariant((prev) =>
                prev === defaultVariant ? prev : defaultVariant,
            );
        }
    }, [defaultVariant, hasVariants, variantMap]);

    // Load variant whenever selection changes
    useEffect(() => {
        const variant = currentVariant
            ? variantMap.get(currentVariant)
            : undefined;
        if (!variant) {
            return;
        }

        let isCancelled = false;

        (async () => {
            setStatus(
                `Loading variant ${variant.name ?? formatVariantLabel(variant.slug)}...`,
            );
            try {
                await loadVariant(
                    variant.taskCandidates,
                    variant.resCandidates,
                );
            } catch (error) {
                if (!isCancelled) {
                    setStatus('Gagal memuat data varian.');
                    console.error('Error loading variant:', error);
                }
            }
        })();

        return () => {
            isCancelled = true;
        };
    }, [currentVariant, variantMap, loadVariant]);

    // Update status when data changes
    useEffect(() => {
        if (!isLoading && (taskRows.length > 0 || resRows.length > 0)) {
            setStatus(
                `Loaded tasks: ${taskRows.length} | resource rows: ${resRows.length}`,
            );
        }
    }, [taskRows.length, resRows.length, isLoading]);

    const handleVariantChange = useCallback((variantKey: string) => {
        setCurrentVariant(variantKey);
    }, []);

    const handleTaskFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) loadTasksFromFile(file);
    };

    const handleResourceFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (file) loadResourcesFromFile(file);
    };

    const handleClear = () => {
        clearData();
        setCustomStart(
            startBaseline ? formatToDateTimeLocal(new Date(startBaseline)) : '',
        );
        setStatus('');
    };

    // const handleDrop = useCallback(
    //     async (event: React.DragEvent<HTMLDivElement>) => {
    //         event.preventDefault();
    //         event.stopPropagation();

    //         const droppedFiles = Array.from(event.dataTransfer.files || []).filter((file) =>
    //             file.name.toLowerCase().endsWith('.csv'),
    //         );

    //         if (!droppedFiles.length) {
    //             return;
    //         }

    //         for (const file of droppedFiles) {
    //             try {
    //                 const text = await file.text();
    //                 if (!text) {
    //                     continue;
    //                 }

    //                 const parsed = Papa.parse<Record<string, unknown>>(text, {
    //                     header: true,
    //                     skipEmptyLines: true,
    //                 });

    //                 classifyAndLoad((parsed.data ?? []) as Record<string, unknown>[]);
    //             } catch (error) {
    //                 console.error('Error processing dropped CSV file:', error);
    //             }
    //         }
    //     },
    //     [classifyAndLoad],
    // );

    // const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    //     e.preventDefault();
    //     e.stopPropagation();
    // };

    // Calculate baseline shift
    const computeBaselineShiftMs = useCallback(() => {
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
    }, [customStart, taskRows]);

    const baselineShiftMs = computeBaselineShiftMs();

    // Apply baseline shift to tasks and resources
    const shiftedTasks = taskRows.map((r) => {
        if (!baselineShiftMs) return r;
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

    const shiftedResources = resRows.map((r) => {
        if (!baselineShiftMs) return r;
        const s = parseDate(r.SegmentStart);
        const e = parseDate(r.SegmentEnd);
        const rr = { ...r };
        if (s)
            rr.SegmentStart = formatDateLocal(
                new Date(s.getTime() + baselineShiftMs),
            );
        if (e)
            rr.SegmentEnd = formatDateLocal(
                new Date(e.getTime() + baselineShiftMs),
            );
        return rr;
    });

    const renderContent = (content: ReactNode) => (
        <div className="relative h-[300px]">
            {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/40 backdrop-blur-sm">
                    <div className="mx-4 flex w-full max-w-md flex-col items-center gap-4 rounded-xl border bg-white p-8 shadow-2xl dark:bg-gray-800">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <div className="text-center">
                            <p className="text-xl font-semibold">
                                Loading Schedule Data
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Please wait while we load the variant data...
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Loading variant: {currentVariant}
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {!isLoading && content}
        </div>
    );

    return (
        <div className="relative min-h-[400px] space-y-4">
            {/* Upload and Controls */}
            <div className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-900">
                <div className="space-y-4">
                    {/* <div>
                        <div className="text-sm text-muted-foreground mb-2">Upload or drop these CSVs:</div>
                        <ul className="text-sm text-muted-foreground list-disc ml-6">
                            <li>task_schedule.csv (TaskID, TaskName, Start, Finish, DurationHours, IsElapsed, Assignments)</li>
                            <li>
                                resource_tracking.csv (ResourceID, ResourceName, TaskID, TaskName, SegmentStart, SegmentEnd,
                                SegmentHours, Units)
                            </li>
                        </ul>
                    </div> */}

                    <div className="flex flex-wrap items-end gap-4">
                        <div>
                            <Label htmlFor="variantSelect">Variant</Label>
                            <Select
                                value={currentVariant || undefined}
                                onValueChange={handleVariantChange}
                                disabled={!hasVariants}
                            >
                                <SelectTrigger
                                    id="variantSelect"
                                    className="w-[200px]"
                                >
                                    <SelectValue
                                        placeholder={
                                            hasVariants
                                                ? 'Pilih varian'
                                                : 'Tidak ada varian'
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {visibleVariants.map((variant) => (
                                        <SelectItem
                                            key={variant.slug}
                                            value={variant.slug}
                                        >
                                            {variant.name ||
                                                formatVariantLabel(
                                                    variant.slug,
                                                )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="fileTasks">Tasks CSV</Label>
                            <Input
                                id="fileTasks"
                                type="file"
                                accept=".csv"
                                onChange={handleTaskFileChange}
                            />
                        </div>

                        <div>
                            <Label htmlFor="fileRes">Resources CSV</Label>
                            <Input
                                id="fileRes"
                                type="file"
                                accept=".csv"
                                onChange={handleResourceFileChange}
                            />
                        </div>

                        {/* <div>
                            <Label htmlFor="customStart">Start baseline</Label>
                            <Input
                                id="customStart"
                                type="datetime-local"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                            />
                        </div> */}

                        <Button variant="outline" onClick={handleClear}>
                            Clear
                        </Button>

                        {status && (
                            <span className="text-sm text-muted-foreground">
                                {status}
                            </span>
                        )}
                        {!hasVariants && (
                            <span className="text-sm text-muted-foreground">
                                Belum ada varian jadwal yang ditampilkan.
                                Silakan unggah CSV manual atau tampilkan varian
                                dari halaman pengelolaan.
                            </span>
                        )}
                    </div>

                    {/* <div
                        className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground hover:border-primary/50 transition-colors"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        Drop CSV files here
                    </div> */}
                </div>
            </div>

            {/* View Mode Selector - Always Visible */}
            <div className="space-y-4">
                {/* Gantt View Mode Selector */}
                <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-3">
                    <Label className="font-semibold">View Mode:</Label>
                    <div className="flex gap-2">
                        {activeTab === 'gantt' && (
                            <>
                                <Button
                                    variant={
                                        ganttViewMode === 'hierarchy'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    size="sm"
                                    onClick={() =>
                                        setGanttViewMode('hierarchy')
                                    }
                                >
                                    Hierarchy View
                                </Button>
                                <Button
                                    variant={
                                        ganttViewMode === 'flat'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    size="sm"
                                    onClick={() => setGanttViewMode('flat')}
                                >
                                    Flat View (Sortable)
                                </Button>
                            </>
                        )}
                        <Button
                            variant={
                                ganttViewMode === 'compare'
                                    ? 'default'
                                    : 'outline'
                            }
                            size="sm"
                            onClick={() => setGanttViewMode('compare')}
                            disabled={visibleVariants.length < 2}
                        >
                            Compare Variants
                        </Button>
                    </div>
                    <span className="ml-auto text-sm text-muted-foreground">
                        {ganttViewMode === 'compare'
                            ? 'Compare schedules across different variants'
                            : activeTab === 'gantt'
                                ? ganttViewMode === 'hierarchy'
                                    ? 'Showing hierarchical structure with headings'
                                    : 'Showing flat list with sorting options'
                                : 'Viewing single variant data'}
                    </span>
                </div>

                {/* Variant Comparison Selector - Always Visible When Compare Mode Active */}
                {ganttViewMode === 'compare' && (
                    <div className="rounded-lg border bg-muted/50 p-4">
                        <Label className="mb-3 block font-semibold">
                            Select Variants to Compare:
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {visibleVariants.map((variant) => (
                                <Button
                                    key={variant.slug}
                                    variant={
                                        compareVariants.includes(variant.slug)
                                            ? 'default'
                                            : 'outline'
                                    }
                                    size="sm"
                                    onClick={() => {
                                        setCompareVariants((prev) =>
                                            prev.includes(variant.slug)
                                                ? prev.filter(
                                                    (v) => v !== variant.slug,
                                                )
                                                : [...prev, variant.slug],
                                        );
                                    }}
                                >
                                    {variant.name ||
                                        formatVariantLabel(variant.slug)}
                                </Button>
                            ))}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Selected: {compareVariants.length} variant
                            {compareVariants.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <Tabs
                defaultValue="gantt"
                className="w-full"
                onValueChange={(value) => setActiveTab(value)}
            >
                <TabsList>
                    <TabsTrigger value="gantt">Gantt</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="resources">
                        Resource Tracking
                    </TabsTrigger>
                    <TabsTrigger value="resload">Resource Load</TabsTrigger>
                </TabsList>

                <TabsContent value="gantt" className="mt-4">
                    {/* Render appropriate view */}
                    {ganttViewMode === 'hierarchy' ? (
                        renderContent(
                            <GanttChart
                                tasks={taskRows}
                                baselineShiftMs={baselineShiftMs}
                                hierarchyCandidates={hierarchySources}
                            />,
                        )
                    ) : ganttViewMode === 'flat' ? (
                        renderContent(
                            <GanttChartFlat
                                tasks={taskRows}
                                baselineShiftMs={baselineShiftMs}
                            />,
                        )
                    ) : (
                        <GanttChartCompare
                            variants={visibleVariants}
                            compareVariants={compareVariants}
                            customStart={customStart}
                            hierarchyCandidates={hierarchySources}
                        />
                    )}
                </TabsContent>

                <TabsContent value="tasks" className="mt-4">
                    {ganttViewMode === 'compare' ? (
                        <TaskTableCompare
                            variants={visibleVariants}
                            compareVariants={compareVariants}
                            customStart={customStart}
                        />
                    ) : (
                        renderContent(<TaskTable tasks={shiftedTasks} />)
                    )}
                </TabsContent>

                <TabsContent value="resources" className="mt-4">
                    {ganttViewMode === 'compare' ? (
                        <ResourceTableCompare
                            variants={visibleVariants}
                            compareVariants={compareVariants}
                            customStart={customStart}
                        />
                    ) : (
                        renderContent(
                            <ResourceTable resources={shiftedResources} />,
                        )
                    )}
                </TabsContent>

                <TabsContent value="resload" className="mt-4">
                    {ganttViewMode === 'compare' ? (
                        <ResourceLoadChartCompare
                            variants={visibleVariants}
                            compareVariants={compareVariants}
                            customStart={customStart}
                        />
                    ) : (
                        renderContent(
                            <ResourceLoadChart resources={shiftedResources} />,
                        )
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
