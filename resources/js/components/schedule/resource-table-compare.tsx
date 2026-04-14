import { Label } from '@/components/ui/label';
import {
    filterResourceRows,
    formatDateLocal,
    parseDate,
    parseLocalDateTimeInput,
} from '@/lib/schedule-utils';
import type {
    ResourceRow,
    ResourceTableFilters,
    ScheduleVariantOption,
} from '@/types/schedule';
import { Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { useEffect, useState } from 'react';
import { ResourceTable } from './resource-table';

interface ResourceTableCompareProps {
    variants: ScheduleVariantOption[];
    compareVariants: string[];
    customStart: string;
    filters: ResourceTableFilters;
}

interface VariantData {
    slug: string;
    name: string;
    resourceRows: ResourceRow[];
    isLoading: boolean;
    error?: string;
}

const parseCSVFromURL = async (url: string): Promise<ResourceRow[]> => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();

        return new Promise((resolve, reject) => {
            Papa.parse<ResourceRow>(text, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: false,
                complete: (results) => {
                    if (results.errors.length > 0) {
                        console.warn('CSV parsing warnings:', results.errors);
                    }
                    resolve(results.data);
                },
                error: (err: Error) => {
                    reject(err);
                },
            });
        });
    } catch (error) {
        console.error('Error fetching CSV:', error);
        throw error;
    }
};

export function ResourceTableCompare({
    variants,
    compareVariants,
    customStart,
    filters,
}: ResourceTableCompareProps) {
    const [variantDataMap, setVariantDataMap] = useState<
        Map<string, VariantData>
    >(new Map());

    // Load data for each variant
    useEffect(() => {
        const loadVariants = async () => {
            const newDataMap = new Map<string, VariantData>();

            // Initialize loading state for all variants
            for (const slug of compareVariants) {
                const variant = variants.find((v) => v.slug === slug);
                if (!variant) continue;

                newDataMap.set(slug, {
                    slug,
                    name: variant.name || slug,
                    resourceRows: [],
                    isLoading: true,
                });
            }
            setVariantDataMap(new Map(newDataMap));

            // Load each variant's data
            for (const slug of compareVariants) {
                const variant = variants.find((v) => v.slug === slug);
                if (!variant) continue;

                try {
                    // Load resource data from the first available candidate
                    let resourceRows: ResourceRow[] = [];

                    if (
                        variant.resCandidates &&
                        variant.resCandidates.length > 0
                    ) {
                        for (const candidate of variant.resCandidates) {
                            try {
                                resourceRows = await parseCSVFromURL(candidate);
                                if (resourceRows.length > 0) {
                                    break; // Successfully loaded
                                }
                            } catch {
                                console.warn(
                                    `Failed to load from ${candidate}, trying next...`,
                                );
                            }
                        }
                    }

                    newDataMap.set(slug, {
                        slug,
                        name: variant.name || slug,
                        resourceRows,
                        isLoading: false,
                    });
                } catch (err) {
                    newDataMap.set(slug, {
                        slug,
                        name: variant.name || slug,
                        resourceRows: [],
                        isLoading: false,
                        error: 'Failed to load variant data',
                    });
                    console.error(`Error loading variant ${slug}:`, err);
                }

                // Update state after each variant is loaded
                setVariantDataMap(new Map(newDataMap));
            }
        };

        if (compareVariants.length > 0) {
            loadVariants();
        } else {
            setVariantDataMap(new Map());
        }
    }, [compareVariants, variants]);

    // Calculate baseline shift in whole days (preserves time-of-day)
    const computeBaselineShiftMs = (resourceRows: ResourceRow[]): number => {
        const custom = parseLocalDateTimeInput(customStart);
        if (!custom) return 0;

        let earliest: Date | null = null;
        for (const r of resourceRows) {
            const s = parseDate(r.SegmentStart);
            if (!s) continue;
            if (!earliest || s < earliest) earliest = s;
        }
        if (!earliest) return 0;

        const customDay = new Date(custom.getFullYear(), custom.getMonth(), custom.getDate());
        const earliestDay = new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate());
        const msPerDay = 86_400_000;
        const shiftDays = Math.round((customDay.getTime() - earliestDay.getTime()) / msPerDay);
        return shiftDays * msPerDay;
    };

    // Apply baseline shift to resources
    const applyBaselineShift = (
        resourceRows: ResourceRow[],
        baselineShiftMs: number,
    ): ResourceRow[] => {
        if (!baselineShiftMs) return resourceRows;

        return resourceRows.map((r) => {
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
    };

    if (compareVariants.length === 0) {
        return (
            <div className="rounded-lg border bg-muted/30 p-8 text-center">
                <p className="text-muted-foreground">
                    Please select at least one variant to compare.
                </p>
            </div>
        );
    }

    // Determine grid columns based on number of variants
    const gridColsClass =
        compareVariants.length === 1
            ? 'grid-cols-1'
            : compareVariants.length === 2
              ? 'grid-cols-2'
              : compareVariants.length === 3
                ? 'grid-cols-3'
                : 'grid-cols-2 xl:grid-cols-3';

    return (
        <div className="space-y-4">
            <div className={`grid gap-4 ${gridColsClass}`}>
                {compareVariants.map((slug) => {
                    const variantData = variantDataMap.get(slug);
                    const variant = variants.find((v) => v.slug === slug);

                    if (!variant) return null;

                    const displayName = variant.name || slug;
                    const isLoading = variantData?.isLoading ?? true;
                    const resourceRows = variantData?.resourceRows ?? [];
                    const error = variantData?.error;

                    const baselineShiftMs =
                        computeBaselineShiftMs(resourceRows);
                    const shiftedResources = applyBaselineShift(
                        resourceRows,
                        baselineShiftMs,
                    );
                    const filteredResources = filterResourceRows(
                        shiftedResources,
                        filters,
                    );

                    return (
                        <div
                            key={slug}
                            className="flex flex-col space-y-2 rounded-lg border bg-card p-4 shadow-sm"
                        >
                            {/* Variant Header */}
                            <div className="min-h-20 flex-shrink-0 rounded-lg border bg-primary/5 p-3">
                                <div className="flex h-full items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold">
                                            {displayName}
                                        </h3>
                                    </div>
                                    <div className="text-right">
                                        <Label className="text-sm">
                                            Resources:{' '}
                                            {filteredResources.length} of{' '}
                                            {shiftedResources.length}
                                        </Label>
                                    </div>
                                </div>
                            </div>

                            {/* Resource Table Content */}
                            <div className="relative min-h-[300px] flex-1">
                                {isLoading && (
                                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/40 backdrop-blur-sm">
                                        <div className="flex flex-col items-center gap-4 rounded-xl border bg-white p-8 shadow-2xl dark:bg-gray-800">
                                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                            <div className="text-center">
                                                <p className="font-semibold">
                                                    Loading {displayName}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Please wait...
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isLoading && error && (
                                    <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8">
                                        <div className="text-center">
                                            <p className="font-semibold text-destructive">
                                                Error Loading Variant
                                            </p>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {error}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {!isLoading &&
                                    !error &&
                                    filteredResources.length === 0 && (
                                        <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border bg-muted/30 p-8">
                                            <p className="text-muted-foreground">
                                                No resources found for this
                                                filter.
                                            </p>
                                        </div>
                                    )}

                                {!isLoading &&
                                    !error &&
                                    filteredResources.length > 0 && (
                                        <div className="h-full">
                                            <ResourceTable
                                                resources={shiftedResources}
                                                filters={filters}
                                                showFilters={false}
                                            />
                                        </div>
                                    )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
