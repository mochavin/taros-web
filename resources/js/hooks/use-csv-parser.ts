import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import type { TaskRow, ResourceRow } from '@/types/schedule';

interface VariantCache {
    taskRows: TaskRow[];
    resRows: ResourceRow[];
}

export function useCSVParser() {
    const [taskRows, setTaskRows] = useState<TaskRow[]>([]);
    const [resRows, setResRows] = useState<ResourceRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Cache for storing variant data by a unique key
    const variantCacheRef = useRef<Map<string, VariantCache>>(new Map());

    const parseCsvFile = useCallback(<T,>(file: File): Promise<T[]> => {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (res) => resolve((res.data || []) as T[]),
                error: (err) => reject(err),
            });
        });
    }, []);

    const parseCsvText = useCallback(<T,>(text: string): T[] => {
        const result = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
        });
        return (result.data || []) as T[];
    }, []);

    const classifyAndLoad = useCallback((rows: Record<string, unknown>[]) => {
        const keys = rows.length ? Object.keys(rows[0]) : [];
        const isTask = ['TaskID', 'TaskName', 'Start', 'Finish'].every((k) => keys.includes(k));
        const isRes = ['ResourceID', 'ResourceName', 'TaskID', 'TaskName', 'SegmentStart', 'SegmentEnd'].every((k) =>
            keys.includes(k),
        );

        if (isTask) setTaskRows(rows as unknown as TaskRow[]);
        if (isRes) setResRows(rows as unknown as ResourceRow[]);
    }, []);

    const loadTasksFromFile = useCallback(
        async (file: File) => {
            setIsLoading(true);
            try {
                const rows = await parseCsvFile<TaskRow>(file);
                setTaskRows(rows);
            } catch (error) {
                console.error('Error parsing tasks CSV:', error);
            } finally {
                setIsLoading(false);
            }
        },
        [parseCsvFile],
    );

    const loadResourcesFromFile = useCallback(
        async (file: File) => {
            setIsLoading(true);
            try {
                const rows = await parseCsvFile<ResourceRow>(file);
                setResRows(rows);
            } catch (error) {
                console.error('Error parsing resources CSV:', error);
            } finally {
                setIsLoading(false);
            }
        },
        [parseCsvFile],
    );

    const tryFetchTextCandidates = useCallback(async (candidates: string[]): Promise<string | null> => {
        for (const p of candidates) {
            try {
                const url = p.startsWith('/') ? p : p;
                const resp = await fetch(url, { cache: 'no-store' });
                if (!resp.ok) continue;
                const text = await resp.text();
                if (text && text.trim().length) return text;
            } catch {
                // ignore and continue
            }
        }
        return null;
    }, []);

    const loadVariant = useCallback(
        async (tasksCandidates: string[], resCandidates: string[]) => {
            // Create a cache key from the candidates
            const cacheKey = JSON.stringify({ tasks: tasksCandidates, res: resCandidates });
            
            // Check if we have cached data for this variant
            const cached = variantCacheRef.current.get(cacheKey);
            if (cached) {
                // Use cached data immediately
                setTaskRows(cached.taskRows);
                setResRows(cached.resRows);
                return;
            }

            setIsLoading(true);
            try {
                const [taskText, resText] = await Promise.all([
                    tryFetchTextCandidates(tasksCandidates),
                    tryFetchTextCandidates(resCandidates),
                ]);

                let taskParsed: TaskRow[] = [];
                let resParsed: ResourceRow[] = [];

                if (taskText) {
                    taskParsed = parseCsvText<TaskRow>(taskText);
                    setTaskRows(taskParsed);
                }

                if (resText) {
                    resParsed = parseCsvText<ResourceRow>(resText);
                    setResRows(resParsed);
                }

                // Cache the parsed data
                variantCacheRef.current.set(cacheKey, {
                    taskRows: taskParsed,
                    resRows: resParsed,
                });
            } catch (error) {
                console.error('Error loading variant:', error);
            } finally {
                setIsLoading(false);
            }
        },
        [tryFetchTextCandidates, parseCsvText],
    );

    const clearData = useCallback(() => {
        setTaskRows([]);
        setResRows([]);
    }, []);

    return {
        taskRows,
        resRows,
        isLoading,
        loadTasksFromFile,
        loadResourcesFromFile,
        classifyAndLoad,
        loadVariant,
        clearData,
        setTaskRows,
        setResRows,
    };
}
