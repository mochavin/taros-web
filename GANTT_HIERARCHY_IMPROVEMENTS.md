# Gantt Chart Hierarchy Improvements

## Overview

The Gantt Chart component has been enhanced to fully support hierarchical task structures with headings and summary rows. This document explains the changes made and how the new features work.

## Key Changes

### 1. Data Source Update

**Changed from:** `/hierarchy/tasks_headings.csv`  
**Changed to:** `/hierarchy/tasks_hierarchy.csv`

The `tasks_hierarchy.csv` file is the canonical source that contains complete hierarchy information including:
- `TaskID` - Unique identifier for each task/heading
- `TaskName` - Display name
- `ParentID` - Parent task ID (for hierarchy relationships)
- `ChildrenIDs` - Comma-separated list of child task IDs
- `OutlineLevel` - Hierarchical depth (0 = root, higher = deeper)
- `IsSummary` - Boolean flag indicating if this is a summary/heading row

### 2. New Display Row Structure

Introduced a `DisplayRow` interface that combines hierarchy metadata with optional task schedule data:

```typescript
interface DisplayRow {
    taskId: string;
    taskName: string;
    outlineLevel: number;
    isSummary: boolean;
    taskData?: TaskRow; // undefined for summary rows without schedule data
}
```

This allows the component to display:
- **Summary/Heading rows** - From hierarchy without dates (no Gantt bars)
- **Task rows** - From task_schedule.csv with dates (with Gantt bars)

### 3. Hierarchy-Aware Rendering

The component now:

1. **Loads complete hierarchy** from `tasks_hierarchy.csv`
2. **Merges with task schedule data** from `task_schedule.csv`
3. **Maintains hierarchical order** from the CSV file
4. **Displays three types of rows:**
   - Summary/heading rows (bold, no Gantt bar)
   - Tasks with dates (Gantt bar colored by elapsed status)
   - Tasks without valid dates (label only)

### 4. Visual Hierarchy

**Indentation:** Each outline level adds 12px of left padding (max 200px)

**Styling:**
- Summary rows: Bold font, darker text color
- Regular tasks: Normal font weight
- All rows show hover tooltips with details

**Width adjustments:**
- Increased label column from 200px to 250px to accommodate longer names
- Better text overflow handling with ellipsis

### 5. Enhanced Tooltip

Tooltips now display different information based on row type:

**For summary rows without task data:**
- TaskID
- Task Name
- Type (Summary/Heading)
- Outline Level

**For tasks with schedule data:**
- TaskID
- Task Name
- Start/Finish dates
- Duration
- Is Elapsed
- Assignments
- Outline Level
- Is Summary flag
- Parent ID (if exists)

### 6. Filtering & Pagination

**Text filtering:** Works on both TaskID and TaskName
**Date filtering:** Only applies to rows with actual task data
**Pagination:** Works across the combined hierarchy + task list
**Hierarchy preservation:** When hierarchy is loaded, the original order is maintained (sorting is disabled to preserve structure)

## File Structure

### Hierarchy Files (in `/public/hierarchy/`)

1. **tasks_hierarchy.csv** (PRIMARY) - Complete hierarchy with all tasks and headings
2. **task_schedule.csv** - Task schedule data with dates and durations
3. **tasks_headings.csv** - Subset of summary tasks (legacy)
4. **tasks_summary.csv** - Another view of summary tasks

### Component Files

- **gantt-chart.tsx** - Main Gantt chart component with hierarchy support
- **schedule-viewer-component.tsx** - Parent component that loads data

## Usage

The Gantt chart automatically:

1. Fetches `tasks_hierarchy.csv` on mount
2. Receives task schedule data via props
3. Merges the datasets
4. Renders the combined hierarchical view

No additional configuration is needed. The component gracefully handles cases where:
- Hierarchy file is not available (falls back to flat task list)
- Tasks have no hierarchy metadata (displays with level 0)
- Tasks have no valid dates (shows label without Gantt bar)

## Performance Optimizations

- **useMemo hooks** for expensive computations:
  - Task shifting with baseline offset
  - Building task lookup by ID
  - Combining hierarchy with task data
  - Filtering and date range calculations
  - Tick generation for timeline scale

- **Efficient lookups** using object maps indexed by TaskID

## Example Hierarchy

```
0 - TA AM4 rev110624 (Level 0, Summary)
  1 - TURN AROUND PABRIK 4 2024 (Level 1, Summary)
    2 - AREA : AMMONIA (Level 2, Summary)
      3 - SHUT DOWN DAN PENGAMANAN (Level 3, Summary)
        4 - 01 Shut Down Dan Pengamanan (Level 4, Task with dates)
      5 - SUB_AREA : REFORMING (Level 3, Summary)
        6 - CLASS : FURNACE (Level 4, Summary)
          7 - D1-H-201-K4 [Primary Reformer CELL A-B] (Level 5, Summary)
            8 - [Sisi Tube Catalyst] ... (Level 6, Summary)
              9 - CIRCUM_MEASUREMENT TUBE CATALYST 100 % (Level 7, Summary)
                10 - 01 Buka Man Hole di Ruang Bakar (Level 8, Task with dates)
                11 - 02 Lepas Fire Brick di Man Hole (Level 8, Task with dates)
                ...
```

## Browser Compatibility

The component uses modern React hooks and memoization but should work in all browsers that support:
- ES6+ JavaScript
- CSS Grid and Flexbox
- React 18+

## Future Enhancements

Potential improvements for future versions:

1. **Collapsible hierarchy** - Click to expand/collapse summary rows
2. **Export to image** - Save Gantt chart as PNG/SVG
3. **Dependency arrows** - Show task dependencies on the chart
4. **Drag & drop** - Adjust task dates by dragging bars
5. **Resource allocation view** - Show resource loading within hierarchy
6. **Critical path highlighting** - Highlight critical tasks in red
7. **Milestone markers** - Special indicators for milestone tasks
8. **Baseline comparison** - Overlay baseline vs. actual schedules

## Troubleshooting

### Issue: Hierarchy not showing
**Solution:** Ensure `/public/hierarchy/tasks_hierarchy.csv` exists and is accessible

### Issue: Tasks not indented
**Solution:** Check that TaskID values in `task_schedule.csv` match those in `tasks_hierarchy.csv`

### Issue: Wrong hierarchy order
**Solution:** The order follows the CSV file. Re-order rows in `tasks_hierarchy.csv` if needed

### Issue: Summary rows missing
**Solution:** Ensure `IsSummary` column is set to `True` for heading rows in hierarchy CSV

## Related Components

- **TaskTable** - Tabular view of tasks with hierarchy
- **ResourceTable** - Resource allocation view
- **ResourceLoadChart** - Resource loading over time

---

**Last Updated:** 2024
**Component Version:** 2.0 (with full hierarchy support)