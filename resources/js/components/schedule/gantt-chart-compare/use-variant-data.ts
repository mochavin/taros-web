import { useEffect, useMemo, useState } from 'react';
import type { ScheduleVariantOption, TaskRow } from '@/types/schedule';
import { parseCSVFromURL } from './utils';

export interface VariantData {
    slug: string;
    name: string;
    taskRows: TaskRow[];
    isLoading: boolean;
    error?: string;
}

export interface VariantEntry {
    slug: string;
    variant: ScheduleVariantOption;
    data?: VariantData;
}

export const useVariantEntries = (
    variants: ScheduleVariantOption[],
    compareVariants: string[],
) => {
    const [variantDataMap, setVariantDataMap] = useState<
        Map<string, VariantData>
    >(new Map());

    useEffect(() => {
        const loadVariants = async () => {
            const newDataMap = new Map<string, VariantData>();

            for (const slug of compareVariants) {
                const variant = variants.find((item) => item.slug === slug);
                if (!variant) continue;

                newDataMap.set(slug, {
                    slug,
                    name: variant.name || slug,
                    taskRows: [],
                    isLoading: true,
                });
            }

            setVariantDataMap(new Map(newDataMap));

            for (const slug of compareVariants) {
                const variant = variants.find((item) => item.slug === slug);
                if (!variant) continue;

                try {
                    let taskRows: TaskRow[] = [];

                    if (variant.taskCandidates && variant.taskCandidates.length > 0) {
                        for (const candidate of variant.taskCandidates) {
                            try {
                                taskRows = await parseCSVFromURL(candidate);
                                if (taskRows.length > 0) {
                                    break;
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
                        taskRows,
                        isLoading: false,
                    });
                } catch (error) {
                    newDataMap.set(slug, {
                        slug,
                        name: variant.name || slug,
                        taskRows: [],
                        isLoading: false,
                        error: 'Failed to load variant data',
                    });
                    console.error(`Error loading variant ${slug}:`, error);
                }

                setVariantDataMap(new Map(newDataMap));
            }
        };

        if (compareVariants.length > 0) {
            loadVariants();
        } else {
            setVariantDataMap(new Map());
        }
    }, [compareVariants, variants]);

    const entries = useMemo<VariantEntry[]>(() => {
        const list: VariantEntry[] = [];
        for (const slug of compareVariants) {
            const variant = variants.find((item) => item.slug === slug);
            if (!variant) continue;
            const data = variantDataMap.get(slug);
            list.push({ slug, variant, data });
        }
        return list;
    }, [compareVariants, variants, variantDataMap]);

    return { entries };
};
