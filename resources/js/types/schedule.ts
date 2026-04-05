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

export interface ScheduleVariantOption {
    id: number;
    slug: string;
    name: string;
    description?: string | null;
    isDefault: boolean;
    isHidden: boolean;
    taskCandidates: string[];
    resCandidates: string[];
}

export type TaskSortMode =
    | 'id'
    | 'start'
    | 'finish'
    | 'duration'
    | 'duration_asc';

export interface GanttFilters {
    filter: string;
    fromDate: string;
    toDate: string;
    sortMode: TaskSortMode;
    page: number;
    pageSize: number;
}

export interface ResourceTableFilters {
    filter: string;
    fromDate: string;
    toDate: string;
    pageSize: number;
}

export type ResourceLoadTimeGrouping = 'day' | 'hour';

export type ResourceLoadViewMode = 'stacked' | 'single';

export interface ResourceLoadChartControls {
    resourceFilter: string;
    fromDate: string;
    toDate: string;
    topN: string;
    timeGrouping: ResourceLoadTimeGrouping;
    viewMode: ResourceLoadViewMode;
}

export interface PaginationResult<T> {
    slice: T[];
    page: number;
    pages: number;
    total: number;
}
