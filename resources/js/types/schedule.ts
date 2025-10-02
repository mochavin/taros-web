// Schedule Viewer Types

export interface TaskRow {
    TaskID: string;
    TaskName: string;
    Start: string;
    Finish: string;
    DurationHours: string;
    IsElapsed: string;
    Assignments: string;
}

export interface ResourceRow {
    ResourceID: string;
    ResourceName: string;
    TaskID: string;
    TaskName: string;
    SegmentStart: string;
    SegmentEnd: string;
    SegmentHours: string;
    Units: string;
}

export interface VariantConfig {
    tasksCandidates: string[];
    resCandidates: string[];
}

export type Variants = Record<string, VariantConfig>;

export type TaskSortMode = 'id' | 'start' | 'finish' | 'duration' | 'duration_asc';

export interface PaginationResult<T> {
    slice: T[];
    page: number;
    pages: number;
    total: number;
}
