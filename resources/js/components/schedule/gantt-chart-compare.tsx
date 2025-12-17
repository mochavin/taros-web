import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { GanttFilters, ScheduleVariantOption } from '@/types/schedule';
import {
    GitCompare,
    LayoutGrid,
    Rows3,
    ListTree,
    List,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { OverlayComparison } from './gantt-chart-compare/overlay-comparison';
import { useVariantEntries } from './gantt-chart-compare/use-variant-data';
import { VariantCard } from './gantt-chart-compare/variant-card';

interface GanttChartCompareProps {
    variants: ScheduleVariantOption[];
    compareVariants: string[];
    customStart: string;
    hierarchyCandidates?: string[];
}

export function GanttChartCompare({
    variants,
    compareVariants,
    customStart,
    hierarchyCandidates,
}: GanttChartCompareProps) {
    const [layoutMode, setLayoutMode] = useState<'grid' | 'stacked' | 'overlay'>(
        'grid',
    );
    const [filters, setFilters] = useState<GanttFilters>({
        filter: '',
        fromDate: '',
        toDate: '',
        sortMode: 'id',
        page: 1,
        pageSize: -1,
    });
    const [detailViewMode, setDetailViewMode] = useState<'hierarchy' | 'flat'>(
        'hierarchy',
    );
    const { entries } = useVariantEntries(variants, compareVariants);

    useEffect(() => {
        if (layoutMode === 'overlay' && compareVariants.length !== 2) {
            setLayoutMode('grid');
        }
    }, [layoutMode, compareVariants.length]);

    useEffect(() => {
        setFilters((prev) => ({ ...prev, page: 1 }));
    }, [detailViewMode]);

    const handleLayoutChange = useCallback(
        (mode: 'grid' | 'stacked' | 'overlay') => {
            setLayoutMode(mode);
            setFilters((prev) => ({ ...prev, page: 1 }));
        },
        [],
    );

    const handleFiltersChange = useCallback(
        (nextFilters: GanttFilters) => {
            setFilters(nextFilters);
        },
        [],
    );

    const gridColsClass = useMemo(() => {
        if (layoutMode !== 'grid') {
            return 'grid-cols-1';
        }

        if (entries.length === 1) {
            return 'grid-cols-1';
        }
        if (entries.length === 2) {
            return 'grid-cols-2';
        }
        if (entries.length === 3) {
            return 'grid-cols-3';
        }
        return 'grid-cols-2 xl:grid-cols-3';
    }, [entries.length, layoutMode]);

    const hasSelection = entries.length > 0;
    const overlayReady = layoutMode === 'overlay' && entries.length === 2;

    return (
        <div className="space-y-4">
            {!hasSelection && (
                <div className="rounded-lg border bg-muted/30 p-8 text-center">
                    <p className="text-muted-foreground">
                        Please select at least one variant to compare.
                    </p>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Label className="font-semibold">Layout</Label>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={layoutMode === 'grid' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleLayoutChange('grid')}
                        >
                            <LayoutGrid className="mr-2 h-4 w-4" />
                            Grid
                        </Button>
                        {/* <Button
                            variant={layoutMode === 'stacked' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleLayoutChange('stacked')}
                        >
                            <Rows3 className="mr-2 h-4 w-4" />
                            Stacked
                        </Button> */}
                        <Button
                            variant={layoutMode === 'overlay' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleLayoutChange('overlay')}
                            disabled={entries.length !== 2}
                        >
                            <GitCompare className="mr-2 h-4 w-4" />
                            Overlay
                        </Button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Label className="font-semibold">Detail View</Label>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={detailViewMode === 'hierarchy' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setDetailViewMode('hierarchy')}
                        >
                            <ListTree className="mr-2 h-4 w-4" />
                            Hierarchy
                        </Button>
                        <Button
                            variant={detailViewMode === 'flat' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setDetailViewMode('flat')}
                        >
                            <List className="mr-2 h-4 w-4" />
                            Flat
                        </Button>
                    </div>
                </div>
                <span className="ml-auto text-sm text-muted-foreground">
                    {layoutMode === 'grid'
                        ? 'Compare variants side by side. Filters stay in sync.'
                        : layoutMode === 'stacked'
                            ? 'Compare variants vertically with shared filters.'
                            : entries.length === 2
                                ? 'Stack two variants to highlight overlaps. Detail view toggle applies to all layouts.'
                                : 'Select exactly two variants to enable overlay.'}
                </span>
            </div>

            {overlayReady ? (
                <OverlayComparison
                    variantA={entries[0]}
                    variantB={entries[1]}
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    customStart={customStart}
                    viewMode={detailViewMode}
                    hierarchyCandidates={hierarchyCandidates}
                />
            ) : (
                <div className={`grid gap-4 ${gridColsClass}`}>
                    {entries.map((entry) => (
                        <VariantCard
                            key={entry.slug}
                            entry={entry}
                            customStart={customStart}
                            filters={filters}
                            onFiltersChange={handleFiltersChange}
                            viewMode={detailViewMode}
                            hierarchyCandidates={hierarchyCandidates}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
