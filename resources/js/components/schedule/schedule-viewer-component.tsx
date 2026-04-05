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
import type {
    ResourceLoadChartControls,
    ResourceTableFilters,
    ScheduleVariantOption,
} from '@/types/schedule';
import { Loader2, Settings2 } from 'lucide-react';
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
import { UploadScheduleDialog } from './upload-schedule-dialog';
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
    const [resourceCompareFilters, setResourceCompareFilters] =
        useState<ResourceTableFilters>({
            filter: '',
            fromDate: '',
            toDate: '',
            pageSize: 50,
        });
    const [resourceLoadCompareControls, setResourceLoadCompareControls] =
        useState<ResourceLoadChartControls>({
            resourceFilter: '',
            fromDate: '',
            toDate: '',
            topN: '10',
            timeGrouping: 'day',
            viewMode: 'stacked',
        });

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
        <div className="relative min-h-[400px] space-y-6">
            {/* Main Control Bar */}
            <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-6">
                        {/* Variant Selection */}
                        <div className="flex flex-col gap-1.5">
                            <Label
                                htmlFor="variantSelect"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                Variant
                            </Label>
                            <Select
                                value={currentVariant || undefined}
                                onValueChange={handleVariantChange}
                                disabled={!hasVariants}
                            >
                                <SelectTrigger
                                    id="variantSelect"
                                    className="h-9 w-[220px]"
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

                        {/* View Mode Selector */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                View Mode
                            </Label>
                            <div className="flex h-9 items-center gap-1 rounded-md border bg-muted/50 p-1">
                                {activeTab === 'gantt' && (
                                    <>
                                        <Button
                                            variant={
                                                ganttViewMode === 'hierarchy'
                                                    ? 'default'
                                                    : 'ghost'
                                            }
                                            size="sm"
                                            className="h-7 px-3 text-xs"
                                            onClick={() =>
                                                setGanttViewMode('hierarchy')
                                            }
                                        >
                                            Hierarchy
                                        </Button>
                                        <Button
                                            variant={
                                                ganttViewMode === 'flat'
                                                    ? 'default'
                                                    : 'ghost'
                                            }
                                            size="sm"
                                            className="h-7 px-3 text-xs"
                                            onClick={() =>
                                                setGanttViewMode('flat')
                                            }
                                        >
                                            Flat
                                        </Button>
                                    </>
                                )}
                                <Button
                                    variant={
                                        ganttViewMode === 'compare'
                                            ? 'default'
                                            : 'ghost'
                                    }
                                    size="sm"
                                    className="h-7 px-3 text-xs"
                                    onClick={() => setGanttViewMode('compare')}
                                    disabled={visibleVariants.length < 2}
                                >
                                    Compare
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end">
                        {/* Upload Button & Dialog */}
                        <UploadScheduleDialog
                            onTaskFileChange={handleTaskFileChange}
                            onResourceFileChange={handleResourceFileChange}
                        />

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClear}
                            className="h-9"
                        >
                            Clear
                        </Button>
                    </div>
                </div>

                {status && (
                    <div className="flex items-center gap-2 px-1">
                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                        <span className="text-xs font-medium text-muted-foreground">
                            {status}
                        </span>
                    </div>
                )}
            </div>

            {/* Variant Comparison Selector - Only when Compare Mode Active */}
            {ganttViewMode === 'compare' && (
                <div className="rounded-xl border bg-muted/30 p-4 duration-300 animate-in fade-in slide-in-from-top-2">
                    <div className="mb-3 flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                            <Settings2 className="h-4 w-4" />
                            Select Variants to Compare
                        </Label>
                        <span className="text-xs text-muted-foreground">
                            {compareVariants.length} selected
                        </span>
                    </div>
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
                                className="h-8 text-xs"
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
                </div>
            )}

            {ganttViewMode === 'compare' && activeTab === 'resources' && (
                <div className="rounded-xl border bg-muted/30 p-4 duration-300 animate-in fade-in slide-in-from-top-2">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <Label className="text-sm font-semibold">
                                Shared Resource Compare Filters
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Satu filter untuk semua variant pada tab
                                resource tracking.
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                                setResourceCompareFilters({
                                    filter: '',
                                    fromDate: '',
                                    toDate: '',
                                    pageSize: 50,
                                })
                            }
                        >
                            Reset
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="min-w-[220px] flex-1">
                            <Label
                                htmlFor="compareResourceFilter"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                Filter resources/tasks
                            </Label>
                            <Input
                                id="compareResourceFilter"
                                type="text"
                                placeholder="Filter resources/tasks..."
                                value={resourceCompareFilters.filter}
                                onChange={(e) =>
                                    setResourceCompareFilters((prev) => ({
                                        ...prev,
                                        filter: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div>
                            <Label
                                htmlFor="compareResourceFrom"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                From
                            </Label>
                            <Input
                                id="compareResourceFrom"
                                type="date"
                                value={resourceCompareFilters.fromDate}
                                onChange={(e) =>
                                    setResourceCompareFilters((prev) => ({
                                        ...prev,
                                        fromDate: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div>
                            <Label
                                htmlFor="compareResourceTo"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                To
                            </Label>
                            <Input
                                id="compareResourceTo"
                                type="date"
                                value={resourceCompareFilters.toDate}
                                onChange={(e) =>
                                    setResourceCompareFilters((prev) => ({
                                        ...prev,
                                        toDate: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div>
                            <Label
                                htmlFor="compareResourcePageSize"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                Page size
                            </Label>
                            <Select
                                value={
                                    resourceCompareFilters.pageSize === -1
                                        ? 'all'
                                        : resourceCompareFilters.pageSize.toString()
                                }
                                onValueChange={(value) =>
                                    setResourceCompareFilters((prev) => ({
                                        ...prev,
                                        pageSize:
                                            value === 'all'
                                                ? -1
                                                : Number(value),
                                    }))
                                }
                            >
                                <SelectTrigger
                                    id="compareResourcePageSize"
                                    className="w-[110px]"
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
                </div>
            )}

            {ganttViewMode === 'compare' && activeTab === 'resload' && (
                <div className="rounded-xl border bg-muted/30 p-4 duration-300 animate-in fade-in slide-in-from-top-2">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <Label className="text-sm font-semibold">
                                Shared Resource Load Filters
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Satu kontrol untuk semua variant pada tab
                                resource load.
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                                setResourceLoadCompareControls({
                                    resourceFilter: '',
                                    fromDate: '',
                                    toDate: '',
                                    topN: '10',
                                    timeGrouping: 'day',
                                    viewMode: 'stacked',
                                })
                            }
                        >
                            Reset
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="min-w-[220px] flex-1">
                            <Label
                                htmlFor="compareResourceLoadFilter"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                Filter resources/tasks
                            </Label>
                            <Input
                                id="compareResourceLoadFilter"
                                type="text"
                                placeholder="Filter resources/tasks..."
                                value={
                                    resourceLoadCompareControls.resourceFilter
                                }
                                onChange={(e) =>
                                    setResourceLoadCompareControls((prev) => ({
                                        ...prev,
                                        resourceFilter: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div>
                            <Label
                                htmlFor="compareResourceLoadFrom"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                From
                            </Label>
                            <Input
                                id="compareResourceLoadFrom"
                                type="date"
                                value={resourceLoadCompareControls.fromDate}
                                onChange={(e) =>
                                    setResourceLoadCompareControls((prev) => ({
                                        ...prev,
                                        fromDate: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div>
                            <Label
                                htmlFor="compareResourceLoadTo"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                To
                            </Label>
                            <Input
                                id="compareResourceLoadTo"
                                type="date"
                                value={resourceLoadCompareControls.toDate}
                                onChange={(e) =>
                                    setResourceLoadCompareControls((prev) => ({
                                        ...prev,
                                        toDate: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div>
                            <Label
                                htmlFor="compareResourceLoadGrouping"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                Grouping
                            </Label>
                            <Select
                                value={resourceLoadCompareControls.timeGrouping}
                                onValueChange={(value) =>
                                    setResourceLoadCompareControls((prev) => ({
                                        ...prev,
                                        timeGrouping:
                                            value as ResourceLoadChartControls['timeGrouping'],
                                    }))
                                }
                            >
                                <SelectTrigger
                                    id="compareResourceLoadGrouping"
                                    className="w-[150px]"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="day">Per Day</SelectItem>
                                    <SelectItem value="hour">
                                        Per Hour
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {resourceLoadCompareControls.viewMode === 'stacked' && (
                            <div>
                                <Label
                                    htmlFor="compareResourceLoadTopN"
                                    className="text-xs font-medium text-muted-foreground"
                                >
                                    Top resources
                                </Label>
                                <Select
                                    value={resourceLoadCompareControls.topN}
                                    onValueChange={(value) =>
                                        setResourceLoadCompareControls(
                                            (prev) => ({
                                                ...prev,
                                                topN: value,
                                            }),
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="compareResourceLoadTopN"
                                        className="w-[120px]"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="all">All</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div>
                            <Label
                                htmlFor="compareResourceLoadView"
                                className="text-xs font-medium text-muted-foreground"
                            >
                                View
                            </Label>
                            <Select
                                value={resourceLoadCompareControls.viewMode}
                                onValueChange={(value) =>
                                    setResourceLoadCompareControls((prev) => ({
                                        ...prev,
                                        viewMode:
                                            value as ResourceLoadChartControls['viewMode'],
                                    }))
                                }
                            >
                                <SelectTrigger
                                    id="compareResourceLoadView"
                                    className="w-[150px]"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="stacked">
                                        Stacked
                                    </SelectItem>
                                    <SelectItem value="single">
                                        Single Resource
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <Tabs
                value={activeTab}
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
                            filters={resourceCompareFilters}
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
                            controls={resourceLoadCompareControls}
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
