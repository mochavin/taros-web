import { useState, useEffect, useCallback, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCSVParser } from '@/hooks/use-csv-parser';
import { GanttChart } from './gantt-chart';
import { TaskTable } from './task-table';
import { ResourceTable } from './resource-table';
import { ResourceLoadChart } from './resource-load-chart';
import { parseDate, parseLocalDateTimeInput, formatDateLocal } from '@/lib/schedule-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Loader2 } from 'lucide-react';
import { VARIANTS, DEFAULT_VARIANT } from '@/types/variants';

const formatVariantLabel = (variantKey: string): string =>
    variantKey
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

interface ScheduleViewerComponentProps {
    projectId?: number;
}

export function ScheduleViewerComponent({ projectId }: ScheduleViewerComponentProps) {
    const [currentVariant, setCurrentVariant] = useState(DEFAULT_VARIANT);
    const [customStart, setCustomStart] = useState('');
    const [status, setStatus] = useState('');

    const { taskRows, resRows, isLoading, loadTasksFromFile, loadResourcesFromFile, loadVariant, clearData, classifyAndLoad } =
        useCSVParser();

    // Load default variant on mount
    useEffect(() => {
        const variant = VARIANTS[DEFAULT_VARIANT];
        if (variant) {
            setStatus(`Loading variant ${DEFAULT_VARIANT}...`);
            loadVariant(variant.tasksCandidates, variant.resCandidates).then(() => {
                setStatus(`Variant ${DEFAULT_VARIANT} loaded. tasks: ${taskRows.length} | resources: ${resRows.length}`);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update status when data changes
    useEffect(() => {
        if (!isLoading && (taskRows.length > 0 || resRows.length > 0)) {
            setStatus(`Loaded tasks: ${taskRows.length} | resource rows: ${resRows.length}`);
        }
    }, [taskRows.length, resRows.length, isLoading]);

    const handleVariantChange = useCallback(
        async (variantKey: string) => {
            setCurrentVariant(variantKey);
            const variant = VARIANTS[variantKey];
            if (variant) {
                setStatus(`Loading variant ${variantKey}...`);
                await loadVariant(variant.tasksCandidates, variant.resCandidates);
            }
        },
        [loadVariant],
    );

    const handleTaskFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) loadTasksFromFile(file);
    };

    const handleResourceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) loadResourcesFromFile(file);
    };

    const handleClear = () => {
        clearData();
        setCustomStart('');
        setStatus('');
    };

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();

            const files = Array.from(e.dataTransfer.files || []).filter((f) => f.name.toLowerCase().endsWith('.csv'));
            if (!files.length) return;

            files.forEach((file) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const text = ev.target?.result as string;
                    if (text) {
                        // Parse and classify
                        const Papa = require('papaparse');
                        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
                        classifyAndLoad(result.data || []);
                    }
                };
                reader.readAsText(file);
            });
        },
        [classifyAndLoad],
    );

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

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
        if (s) rr.Start = formatDateLocal(new Date(s.getTime() + baselineShiftMs));
        if (e) rr.Finish = formatDateLocal(new Date(e.getTime() + baselineShiftMs));
        return rr;
    });

    const shiftedResources = resRows.map((r) => {
        if (!baselineShiftMs) return r;
        const s = parseDate(r.SegmentStart);
        const e = parseDate(r.SegmentEnd);
        const rr = { ...r };
        if (s) rr.SegmentStart = formatDateLocal(new Date(s.getTime() + baselineShiftMs));
        if (e) rr.SegmentEnd = formatDateLocal(new Date(e.getTime() + baselineShiftMs));
        return rr;
    });

    const renderContent = (content: ReactNode) => (
        <div className="relative h-[300px]">
            {isLoading && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                    <div className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border max-w-md w-full mx-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <div className="text-center">
                            <p className="text-xl font-semibold">Loading Schedule Data</p>
                            <p className="text-sm text-muted-foreground mt-2">Please wait while we load the variant data...</p>
                            <p className="text-xs text-muted-foreground mt-1">Loading variant: {currentVariant}</p>
                        </div>
                    </div>
                </div>
            )}
            {!isLoading && content}
        </div>
    );

    return (
        <div className="space-y-4 relative min-h-[400px]">
            {/* Upload and Controls */}
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
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
                            <Select value={currentVariant} onValueChange={handleVariantChange}>
                                <SelectTrigger id="variantSelect" className="w-[200px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(VARIANTS).map((key) => (
                                        <SelectItem key={key} value={key}>
                                            {formatVariantLabel(key)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="fileTasks">Tasks CSV</Label>
                            <Input id="fileTasks" type="file" accept=".csv" onChange={handleTaskFileChange} />
                        </div>

                        <div>
                            <Label htmlFor="fileRes">Resources CSV</Label>
                            <Input id="fileRes" type="file" accept=".csv" onChange={handleResourceFileChange} />
                        </div>

                        <div>
                            <Label htmlFor="customStart">Start baseline</Label>
                            <Input id="customStart" type="datetime-local" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                        </div>

                        <Button variant="outline" onClick={handleClear}>
                            Clear
                        </Button>

                        {status && <span className="text-sm text-muted-foreground">{status}</span>}
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

            {/* Tabs */}
            <Tabs defaultValue="gantt" className="w-full">
                <TabsList>
                    <TabsTrigger value="gantt">Gantt</TabsTrigger>
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="resources">Resource Tracking</TabsTrigger>
                    <TabsTrigger value="resload">Resource Load</TabsTrigger>
                </TabsList>

                <TabsContent value="gantt" className="mt-4">
                    {renderContent(<GanttChart tasks={shiftedTasks} baselineShiftMs={baselineShiftMs} />)}
                </TabsContent>

                <TabsContent value="tasks" className="mt-4">
                    {renderContent(<TaskTable tasks={shiftedTasks} />)}
                </TabsContent>

                <TabsContent value="resources" className="mt-4">
                    {renderContent(<ResourceTable resources={shiftedResources} />)}
                </TabsContent>

                <TabsContent value="resload" className="mt-4">
                    {renderContent(<ResourceLoadChart resources={shiftedResources} />)}
                </TabsContent>
            </Tabs>
        </div>
    );
}
