import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ResourceRow } from '@/types/schedule';
import { parseDate, parseLocalDateInput, ymd, niceMax, makeColor } from '@/lib/schedule-utils';

interface ResourceLoadChartProps {
    resources: ResourceRow[];
}

type TimeGrouping = 'day' | 'hour';

interface Aggregation {
    labels: string[];
    resources: string[];
    matrix: number[][];
    totalsByRes: number[];
    totalsByBucket: number[];
}

export function ResourceLoadChart({ resources }: ResourceLoadChartProps) {
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [topN, setTopN] = useState('10');
    const [timeGrouping, setTimeGrouping] = useState<TimeGrouping>('day');
    const [viewMode, setViewMode] = useState<'stacked' | 'single'>('stacked');
    const [currentResIdx, setCurrentResIdx] = useState(0);
    const [tooltip, setTooltip] = useState<{
        visible: boolean;
        x: number;
        y: number;
        content: React.ReactNode;
    }>({ visible: false, x: 0, y: 0, content: null });

    const tooltipRef = useRef<HTMLDivElement>(null);

    // Aggregate daily resource hours
    const aggregation = useMemo((): Aggregation => {
        if (!resources.length) {
            return { labels: [], resources: [], matrix: [], totalsByRes: [], totalsByBucket: [] };
        }

        // Calculate date range from resources if not set
        let minDt: Date | null = null;
        let maxDt: Date | null = null;
        for (const r of resources) {
            const s = parseDate(r.SegmentStart);
            const e = parseDate(r.SegmentEnd);
            if (!s || !e) continue;
            if (!minDt || s < minDt) minDt = s;
            if (!maxDt || e > maxDt) maxDt = e;
        }

        if (!minDt || !maxDt) {
            return { labels: [], resources: [], matrix: [], totalsByRes: [], totalsByBucket: [] };
        }

        const fromDay = parseLocalDateInput(fromDate) || minDt;
        const toDay = parseLocalDateInput(toDate) || maxDt;

        if (fromDay > toDay) {
            return { labels: [], resources: [], matrix: [], totalsByRes: [], totalsByBucket: [] };
        }

        const dayStart = new Date(fromDay.getFullYear(), fromDay.getMonth(), fromDay.getDate());
        const dayEnd = new Date(toDay.getFullYear(), toDay.getMonth(), toDay.getDate(), 23, 59, 59, 999);

        const bucketSizeMs = timeGrouping === 'day' ? 86_400_000 : 3_600_000;
        const alignToBucketStart = (date: Date): Date => {
            return timeGrouping === 'day'
                ? new Date(date.getFullYear(), date.getMonth(), date.getDate())
                : new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
        };

        const formatLabel = (date: Date): string => {
            if (timeGrouping === 'day') {
                return ymd(date);
            }
            const hours = String(date.getHours()).padStart(2, '0');
            return `${ymd(date)} ${hours}:00`;
        };

        const buckets: Array<{ label: string; start: Date; end: Date }> = [];
        const bucketIndex = new Map<number, number>();
        for (let d = new Date(dayStart); d <= dayEnd; d = new Date(d.getTime() + bucketSizeMs)) {
            const start = new Date(d);
            const end = new Date(d.getTime() + bucketSizeMs);
            bucketIndex.set(start.getTime(), buckets.length);
            buckets.push({ label: formatLabel(start), start, end });
        }

        if (!buckets.length) {
            return { labels: [], resources: [], matrix: [], totalsByRes: [], totalsByBucket: [] };
        }

        // Map resources to index
        const resIndex = new Map<string, number>();
        const resourceNames: string[] = [];

        function getResIdx(name: string): number {
            const key = (name || '').toString();
            if (!resIndex.has(key)) {
                resIndex.set(key, resourceNames.length);
                resourceNames.push(key);
            }
            return resIndex.get(key)!;
        }

        // Matrix day x resource
        const matrix: number[][] = buckets.map(() => []);

        for (const r of resources) {
            const s0 = parseDate(r.SegmentStart);
            const e0 = parseDate(r.SegmentEnd);
            if (!s0 || !e0) continue;

            // Clip to range
            const s = s0 < dayStart ? dayStart : s0;
            const e = e0 > dayEnd ? dayEnd : e0;
            const durMs = e0.getTime() - s0.getTime();
            if (e <= s || durMs <= 0) continue;

            let totalH = Number(r.SegmentHours);
            if (!isFinite(totalH)) totalH = (e0.getTime() - s0.getTime()) / 36e5;

            const idx = getResIdx(r.ResourceName || r.ResourceID || 'Unknown');
            let cur = alignToBucketStart(s);

            while (cur < e) {
                const next = new Date(cur.getTime() + bucketSizeMs);
                const sliceStart = s > cur ? s : cur;
                const sliceEnd = e < next ? e : next;
                const sliceMs = sliceEnd.getTime() - sliceStart.getTime();

                if (sliceMs > 0) {
                    const portion = sliceMs / durMs;
                    const bucketIdx = bucketIndex.get(cur.getTime());
                    if (bucketIdx !== undefined) {
                        matrix[bucketIdx][idx] = (matrix[bucketIdx][idx] || 0) + totalH * portion;
                    }
                }
                cur = next;
            }
        }

        const totalsByRes = resourceNames.map((_, i) => matrix.reduce((acc, row) => acc + (row[i] || 0), 0));
        const totalsByBucket = matrix.map((row) => row.reduce((acc, val) => acc + (val || 0), 0));

        return {
            labels: buckets.map((bucket) => bucket.label),
            resources: resourceNames,
            matrix,
            totalsByRes,
            totalsByBucket,
        };
    }, [resources, fromDate, toDate, timeGrouping]);

    // Set default dates on mount
    useEffect(() => {
        if (!fromDate && !toDate && resources.length > 0) {
            let minDt: Date | null = null;
            let maxDt: Date | null = null;
            for (const r of resources) {
                const s = parseDate(r.SegmentStart);
                const e = parseDate(r.SegmentEnd);
                if (!s || !e) continue;
                if (!minDt || s < minDt) minDt = s;
                if (!maxDt || e > maxDt) maxDt = e;
            }
            if (minDt && maxDt) {
                setFromDate(ymd(minDt));
                setToDate(ymd(maxDt));
            }
        }
    }, [resources, fromDate, toDate]);

    // Get resource order by totals descending
    const resOrder = useMemo(() => {
        return aggregation.resources
            .map((_, i) => i)
            .sort((a, b) => aggregation.totalsByRes[b] - aggregation.totalsByRes[a]);
    }, [aggregation]);

    // Ensure current resource index is valid
    useEffect(() => {
        if (currentResIdx >= resOrder.length) {
            setCurrentResIdx(0);
        }
    }, [resOrder.length, currentResIdx]);

    const calculateTooltipPosition = (mouseX: number, mouseY: number) => {
        const pad = 12;
        const tooltipWidth = 320;
        const tooltipHeight = 150;
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

        if (x < 4) x = 4;
        if (y < 4) y = 4;

        return { x, y };
    };

    const handleBarMouseEnter = (
        e: React.MouseEvent<SVGRectElement>,
        tooltipData: { label: string; resource?: string; hours: number; total?: number },
    ) => {
        const content = (
            <div className="bg-gray-900 text-white text-xs p-2 rounded-md shadow-lg">
                <table className="w-full">
                    <tbody>
                        <tr>
                            <td className="text-gray-400 pr-2">Period</td>
                            <td>{tooltipData.label}</td>
                        </tr>
                        {tooltipData.resource && (
                            <tr>
                                <td className="text-gray-400 pr-2">Resource</td>
                                <td>{tooltipData.resource}</td>
                            </tr>
                        )}
                        <tr>
                            <td className="text-gray-400 pr-2">Hours</td>
                            <td>{tooltipData.hours.toFixed(2)} h</td>
                        </tr>
                        {tooltipData.total !== undefined && (
                            <tr>
                                <td className="text-gray-400 pr-2">Period Total</td>
                                <td>{tooltipData.total.toFixed(2)} h</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );

        const pos = calculateTooltipPosition(e.clientX, e.clientY);
        setTooltip({ visible: true, x: pos.x, y: pos.y, content });
    };

    const handleBarMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
        if (tooltip.visible) {
            const pos = calculateTooltipPosition(e.clientX, e.clientY);
            setTooltip((prev) => ({ ...prev, x: pos.x, y: pos.y }));
        }
    };

    const handleBarMouseLeave = () => {
        setTooltip({ visible: false, x: 0, y: 0, content: null });
    };

    const handleExportCSV = () => {
        if (!aggregation.labels.length) return;

        const actualTopN = topN === 'all' ? aggregation.resources.length : Math.max(1, parseInt(topN, 10) || 10);
        const idxs = resOrder.slice(0, actualTopN);
        const resourceNames = idxs.map((i) => aggregation.resources[i]);
        const matrix = aggregation.matrix.map((row) => idxs.map((i) => Number((row[i] || 0).toFixed(2))));

        const header = ['Period', ...resourceNames];
        const lines = [header.join(',')];
        for (let d = 0; d < aggregation.labels.length; d++) {
            lines.push([aggregation.labels[d], ...matrix[d].map((v) => v.toFixed(2))].join(','));
        }

        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resource_load_daily.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Render chart based on view mode
    const renderChart = () => {
        if (!aggregation.labels.length) {
            return (
                <div className="border rounded-lg p-8 text-center text-muted-foreground">
                    No resource data in range
                </div>
            );
        }

        if (viewMode === 'single') {
            // Single resource view
            const resIdx = resOrder.length ? resOrder[Math.max(0, currentResIdx)] : 0;
            const resName = aggregation.resources[resIdx] ?? 'Unknown';
            const series = aggregation.matrix.map((row) => Number((row[resIdx] || 0).toFixed(2)));
            const maxDay = Math.max(...series, 0);
            const yMax = niceMax(maxDay);

            const pad = { left: 60, right: 12, top: 10, bottom: 28 };
            const barW = 20;
            const step = timeGrouping === 'hour' ? 18 : 26;
            const w = pad.left + pad.right + Math.max(aggregation.labels.length * step, 300);
            const h = 340;
            const ch = h - pad.top - pad.bottom;
            const scaleY = (v: number) => (ch * v) / yMax;

            return (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentResIdx((prev) => (prev - 1 + resOrder.length) % resOrder.length)}
                            >
                                Prev
                            </Button>
                            <Select
                                value={resIdx.toString()}
                                onValueChange={(v) => {
                                    const ri = Number(v);
                                    const pos = resOrder.indexOf(ri);
                                    if (pos >= 0) setCurrentResIdx(pos);
                                }}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {resOrder.map((ri) => (
                                        <SelectItem key={ri} value={ri.toString()}>
                                            {aggregation.resources[ri]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentResIdx((prev) => (prev + 1) % resOrder.length)}
                            >
                                Next
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                {resName} (total {aggregation.totalsByRes[resIdx]?.toFixed(1) || '0.0'} h)
                            </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Time slots: {aggregation.labels.length} | Max {timeGrouping === 'day' ? 'daily' : 'hourly'} hours: {maxDay.toFixed(1)}
                        </div>
                    </div>

                    <div className="border rounded-lg bg-white dark:bg-gray-950 overflow-x-auto p-4">
                        <svg width={w} height={h} xmlns="http://www.w3.org/2000/svg">
                            {/* Grid and axes */}
                            {Array.from({ length: 6 }).map((_, i) => {
                                const val = (yMax * i) / 5;
                                const y = pad.top + ch - scaleY(val);
                                return (
                                    <g key={i}>
                                        <line
                                            className="stroke-gray-200 dark:stroke-gray-800"
                                            x1={pad.left}
                                            y1={y}
                                            x2={w - pad.right}
                                            y2={y}
                                        />
                                        <text
                                            x={pad.left - 6}
                                            y={y + 4}
                                            fontSize="10"
                                            textAnchor="end"
                                            className="fill-gray-500"
                                        >
                                            {val.toFixed(0)}
                                        </text>
                                    </g>
                                );
                            })}
                            <line
                                className="stroke-gray-400"
                                x1={pad.left}
                                y1={pad.top + ch}
                                x2={w - pad.right}
                                y2={pad.top + ch}
                            />
                            <line className="stroke-gray-400" x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + ch} />

                            {/* Bars */}
                            {aggregation.labels.map((label, d) => {
                                const x = pad.left + d * step + Math.max(0, (step - barW) / 2);
                                const val = series[d] || 0;
                                if (val <= 0) return null;
                                const y = pad.top + ch - Math.max(1, scaleY(val));
                                const bh = Math.max(1, scaleY(val));
                                return (
                                    <rect
                                        key={d}
                                        x={x}
                                        y={y}
                                        width={barW}
                                        height={bh}
                                        fill={makeColor(0, 1)}
                                        className="hover:opacity-80 cursor-pointer transition-opacity"
                                        onMouseEnter={(e) => handleBarMouseEnter(e, { label, resource: resName, hours: val })}
                                        onMouseMove={handleBarMouseMove}
                                        onMouseLeave={handleBarMouseLeave}
                                    />
                                );
                            })}

                            {/* X-axis labels */}
                            {aggregation.labels.map((label, d) => {
                                if (d % Math.max(1, Math.ceil(aggregation.labels.length / 12)) !== 0) return null;
                                const x = pad.left + d * step + barW / 2;
                                const [datePart, timePart] = label.split(' ');
                                const axisLabel =
                                    timeGrouping === 'day'
                                        ? datePart.slice(5)
                                        : `${datePart.slice(5)} ${timePart ?? ''}`.trim();
                                return (
                                    <text
                                        key={d}
                                        x={x}
                                        y={pad.top + ch + 14}
                                        fontSize="10"
                                        textAnchor="middle"
                                        className="fill-gray-500"
                                    >
                                        {axisLabel}
                                    </text>
                                );
                            })}
                        </svg>
                    </div>
                </div>
            );
        } else {
            // Stacked view
            const actualTopN = topN === 'all' ? aggregation.resources.length : Math.max(1, parseInt(topN, 10) || 10);
            const idxs = resOrder.slice(0, actualTopN);
            const resourceNames = idxs.map((i) => aggregation.resources[i]);
            const matrix = aggregation.matrix.map((row) => idxs.map((i) => Number((row[i] || 0).toFixed(2))));
            const visibleTotals = matrix.map((row) => row.reduce((a, b) => a + b, 0));
            const maxDay = Math.max(...visibleTotals, 0);
            const yMax = niceMax(maxDay);

            const pad = { left: 60, right: 12, top: 10, bottom: 28 };
            const barW = 20;
            const step = timeGrouping === 'hour' ? 18 : 26;
            const w = pad.left + pad.right + Math.max(aggregation.labels.length * step, 300);
            const h = 340;
            const ch = h - pad.top - pad.bottom;
            const scaleY = (v: number) => (ch * v) / yMax;

            return (
                <div className="space-y-4">
                    {/* Legend */}
                    <div className="flex flex-wrap gap-3">
                        {resourceNames.map((r, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded border border-gray-400"
                                    style={{ background: makeColor(i, resourceNames.length) }}
                                />
                                <span className="text-sm">{r}</span>
                            </div>
                        ))}
                    </div>

                    <div className="text-sm text-muted-foreground">
                        Time slots: {aggregation.labels.length} | Resources: {resourceNames.length}/{aggregation.resources.length} | Max
                        {timeGrouping === 'day' ? ' daily' : ' hourly'} hours: {maxDay.toFixed(1)}
                    </div>

                    <div className="border rounded-lg bg-white dark:bg-gray-950 overflow-x-auto p-4">
                        <svg width={w} height={h} xmlns="http://www.w3.org/2000/svg">
                            {/* Grid and axes */}
                            {Array.from({ length: 6 }).map((_, i) => {
                                const val = (yMax * i) / 5;
                                const y = pad.top + ch - scaleY(val);
                                return (
                                    <g key={i}>
                                        <line
                                            className="stroke-gray-200 dark:stroke-gray-800"
                                            x1={pad.left}
                                            y1={y}
                                            x2={w - pad.right}
                                            y2={y}
                                        />
                                        <text
                                            x={pad.left - 6}
                                            y={y + 4}
                                            fontSize="10"
                                            textAnchor="end"
                                            className="fill-gray-500"
                                        >
                                            {val.toFixed(0)}
                                        </text>
                                    </g>
                                );
                            })}
                            <line
                                className="stroke-gray-400"
                                x1={pad.left}
                                y1={pad.top + ch}
                                x2={w - pad.right}
                                y2={pad.top + ch}
                            />
                            <line className="stroke-gray-400" x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + ch} />

                            {/* Stacked bars */}
                            {aggregation.labels.map((label, d) => {
                                const x = pad.left + d * step + Math.max(0, (step - barW) / 2);
                                let acc = 0;
                                return (
                                    <g key={d}>
                                        {resourceNames.map((resName, r) => {
                                            const val = matrix[d][r] || 0;
                                            if (val <= 0) return null;
                                            const y = pad.top + ch - scaleY(acc + val);
                                            const bh = Math.max(1, scaleY(val));
                                            const rect = (
                                                <rect
                                                    key={r}
                                                    x={x}
                                                    y={y}
                                                    width={barW}
                                                    height={bh}
                                                    fill={makeColor(r, resourceNames.length)}
                                                    className="hover:opacity-80 cursor-pointer transition-opacity"
                                                    onMouseEnter={(e) => handleBarMouseEnter(e, {
                                                        label,
                                                        resource: resName,
                                                        hours: val,
                                                        total: visibleTotals[d],
                                                    })}
                                                    onMouseMove={handleBarMouseMove}
                                                    onMouseLeave={handleBarMouseLeave}
                                                />
                                            );
                                            acc += val;
                                            return rect;
                                        })}
                                    </g>
                                );
                            })}

                            {/* X-axis labels */}
                            {aggregation.labels.map((label, d) => {
                                if (d % Math.max(1, Math.ceil(aggregation.labels.length / 12)) !== 0) return null;
                                const x = pad.left + d * step + barW / 2;
                                const [datePart, timePart] = label.split(' ');
                                const axisLabel =
                                    timeGrouping === 'day'
                                        ? datePart.slice(5)
                                        : `${datePart.slice(5)} ${timePart ?? ''}`.trim();
                                return (
                                    <text
                                        key={d}
                                        x={x}
                                        y={pad.top + ch + 14}
                                        fontSize="10"
                                        textAnchor="middle"
                                        className="fill-gray-500"
                                    >
                                        {axisLabel}
                                    </text>
                                );
                            })}
                        </svg>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4">
                <div>
                    <Label htmlFor="rlFrom">From</Label>
                    <Input id="rlFrom" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="rlTo">To</Label>
                    <Input id="rlTo" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="rlGrouping">Grouping</Label>
                    <Select value={timeGrouping} onValueChange={(v) => setTimeGrouping(v as TimeGrouping)}>
                        <SelectTrigger id="rlGrouping" className="w-[160px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="day">Per Day</SelectItem>
                            <SelectItem value="hour">Per Hour</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {viewMode === 'stacked' && (
                    <div>
                        <Label htmlFor="rlTopN">Top resources</Label>
                        <Select value={topN} onValueChange={setTopN}>
                            <SelectTrigger id="rlTopN" className="w-[120px]">
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
                    <Label htmlFor="rlView">View</Label>
                    <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'stacked' | 'single')}>
                        <SelectTrigger id="rlView" className="w-[140px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="stacked">Stacked</SelectItem>
                            <SelectItem value="single">Single Resource</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="outline" onClick={handleExportCSV}>
                    Export CSV
                </Button>
            </div>

            {/* Chart */}
            {renderChart()}

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
