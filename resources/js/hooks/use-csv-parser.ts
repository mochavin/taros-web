import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import type { TaskRow, ResourceRow } from '@/types/schedule';

export function useCSVParser() {
    const [taskRows, setTaskRows] = useState<TaskRow[]>([]);
    const [resRows, setResRows] = useState<ResourceRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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
            } catch (err) {
                // ignore and continue
            }
        }
        return null;
    }, []);

    const loadVariant = useCallback(
        async (tasksCandidates: string[], resCandidates: string[]) => {
            setIsLoading(true);
            try {
                const [taskText, resText] = await Promise.all([
                    tryFetchTextCandidates(tasksCandidates),
                    tryFetchTextCandidates(resCandidates),
                ]);

                if (taskText) {
                    const taskParsed = parseCsvText<TaskRow>(taskText);
                    setTaskRows(taskParsed);
                }

                if (resText) {
                    const resParsed = parseCsvText<ResourceRow>(resText);
                    setResRows(resParsed);
                }
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
