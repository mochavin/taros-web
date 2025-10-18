# Gantt Chart - Dual View Mode

## Overview

The Gantt Chart now supports **two viewing modes** to accommodate different use cases:

1. **Hierarchy View** - Shows complete hierarchical structure with summary/heading rows
2. **Flat View** - Shows sortable flat list of tasks only (classic view)

## View Modes

### 1. Hierarchy View (Default)

**Purpose:** Display complete project structure with hierarchical organization

**Features:**
- ✅ Shows summary/heading rows (bold, no gantt bars)
- ✅ Shows task rows with gantt bars
- ✅ Maintains hierarchical order from CSV
- ✅ Indentation based on outline level (12px per level)
- ✅ Enhanced tooltips with hierarchy information
- ❌ Sorting disabled (preserves structure)

**Best For:**
- Understanding project structure
- Viewing work breakdown structure (WBS)
- Presenting to stakeholders
- Navigating complex projects

**Data Sources:**
- `/public/hierarchy/tasks_hierarchy.csv` - Hierarchy structure
- `/public/hierarchy/task_schedule.csv` - Task schedule data

**Visual Example:**
```
📁 TA AM4 rev110624 (Summary, Level 0)
  📁 TURN AROUND PABRIK 4 2024 (Summary, Level 1)
    📁 AREA : AMMONIA (Summary, Level 2)
      📁 SHUT DOWN DAN PENGAMANAN (Summary, Level 3)
        📊 01 Shut Down Dan Pengamanan (Task with gantt bar)
      📁 SUB_AREA : REFORMING (Summary, Level 3)
        📊 Task 1 (Task with gantt bar)
        📊 Task 2 (Task with gantt bar)
```

### 2. Flat View (Sortable)

**Purpose:** Traditional gantt chart for task analysis and sorting

**Features:**
- ✅ Shows only tasks with schedule data
- ✅ Full sorting capability (by ID, start, finish, duration)
- ✅ No hierarchy structure
- ✅ Simpler, cleaner view
- ✅ All tasks at same indent level

**Best For:**
- Task scheduling analysis
- Finding longest/shortest tasks
- Date-based sorting
- Quick filtering and searching
- Resource allocation review

**Data Sources:**
- `/public/hierarchy/task_schedule.csv` only

**Visual Example:**
```
📊 Task A (2024-06-19 → 2024-06-20)
📊 Task B (2024-06-19 → 2024-06-21)
📊 Task C (2024-06-20 → 2024-06-22)
📊 Task D (2024-06-21 → 2024-06-23)
```

## Switching Between Views

### In the UI

1. Navigate to the **Gantt** tab
2. Look for the **View Mode** selector at the top
3. Click either:
   - **Hierarchy View** button
   - **Flat View (Sortable)** button

The view mode is preserved during your session.

### Programmatic Control

```typescript
// In schedule-viewer-component.tsx
const [ganttViewMode, setGanttViewMode] = useState<'hierarchy' | 'flat'>('hierarchy');

// Switch to flat view
setGanttViewMode('flat');

// Switch to hierarchy view
setGanttViewMode('hierarchy');
```

## Component Architecture

### File Structure

```
components/schedule/
├── gantt-chart.tsx           # Hierarchy view component
├── gantt-chart-flat.tsx      # Flat view component (sortable)
└── schedule-viewer-component.tsx  # Parent with view selector
```

### Component Props

Both components share the same interface:

```typescript
interface GanttChartProps {
    tasks: TaskRow[];
    baselineShiftMs: number;
}
```

### Rendering Logic

```typescript
{ganttViewMode === 'hierarchy' 
    ? <GanttChart tasks={shiftedTasks} baselineShiftMs={baselineShiftMs} />
    : <GanttChartFlat tasks={shiftedTasks} baselineShiftMs={baselineShiftMs} />
}
```

## Feature Comparison

| Feature | Hierarchy View | Flat View |
|---------|---------------|-----------|
| Summary/Heading Rows | ✅ Yes | ❌ No |
| Indentation | ✅ Yes (by level) | ❌ No |
| Gantt Bars | ✅ Tasks only | ✅ All tasks |
| Sorting | ❌ Fixed order | ✅ 5 sort modes |
| Filtering | ✅ Text & Date | ✅ Text & Date |
| Pagination | ✅ Yes | ✅ Yes |
| Tooltips | ✅ Enhanced | ✅ Standard |
| Hierarchy Data | ✅ Required | ❌ Not used |
| Label Width | 250px | 200px |
| Best Use Case | Structure view | Task analysis |

## Sorting Options (Flat View Only)

The Flat View supports 5 sorting modes:

1. **Task ID** - Sort by TaskID (ascending)
2. **Start time** - Sort by start date (earliest first)
3. **Finish time** - Sort by finish date (earliest first)
4. **Duration (longest first)** - Sort by duration (descending)
5. **Duration (shortest first)** - Sort by duration (ascending)

## Filtering

Both views support the same filtering options:

### Text Filter
- Searches in TaskID and TaskName
- Case-insensitive
- Real-time filtering

### Date Range Filter
- **From** - Start date/time
- **To** - End date/time
- Filters tasks within the specified range
- Works on task schedule dates only

### Page Size
- 25, 50, 100, 200 rows per page
- "All" option to show all rows

## Tooltips

### Hierarchy View Tooltip

**For Summary Rows:**
- TaskID
- Task Name
- Type (Summary/Heading)
- Outline Level

**For Task Rows:**
- TaskID
- Task Name
- Start Date
- Finish Date
- Duration (hours)
- Is Elapsed
- Assignments
- Outline Level
- Is Summary
- Parent ID

### Flat View Tooltip

**For All Tasks:**
- TaskID
- Task Name
- Start Date
- Finish Date
- Duration (hours)
- Is Elapsed
- Assignments

## Color Coding

Both views use the same color scheme:

- 🔴 **Red bars** - Elapsed tasks (IsElapsed = Y)
- 🔵 **Blue bars** - Current/future tasks (IsElapsed = N)
- ⚫ **Bold text** - Summary rows (hierarchy view only)

## Performance Considerations

### Hierarchy View
- Uses `useMemo` for expensive computations
- Merges hierarchy and task data once
- Efficient lookup tables (O(1) access)
- Best for: < 1000 displayed rows

### Flat View
- Simpler data structure (no merging)
- Fast sorting with native JS sort
- Direct task rendering
- Best for: < 5000 tasks

## Use Case Examples

### Example 1: Project Planning
**Use:** Hierarchy View
**Why:** Need to see complete project structure and work breakdown

### Example 2: Resource Optimization
**Use:** Flat View → Sort by Duration (longest first)
**Why:** Identify tasks that need the most resources

### Example 3: Schedule Compression
**Use:** Flat View → Sort by Start time
**Why:** Find tasks that can be parallelized

### Example 4: Stakeholder Presentation
**Use:** Hierarchy View
**Why:** Show organized structure with summaries

### Example 5: Critical Path Analysis
**Use:** Flat View → Sort by Finish time
**Why:** Identify bottlenecks and dependencies

## Troubleshooting

### Issue: Hierarchy View shows no summaries
**Solution:** Ensure `/public/hierarchy/tasks_hierarchy.csv` exists and contains rows with `IsSummary=True`

### Issue: Flat View has no sorting
**Solution:** This is expected - sorting is only available in Flat View. Switch from Hierarchy View.

### Issue: Tasks missing in Hierarchy View
**Solution:** Check that TaskIDs in `task_schedule.csv` match those in `tasks_hierarchy.csv`

### Issue: View mode doesn't persist
**Solution:** View mode is session-based. It resets on page reload. This is by design.

### Issue: Wrong hierarchy order
**Solution:** The order comes from `tasks_hierarchy.csv` row order. Re-order the CSV file if needed.

## Future Enhancements

### Planned Features
1. **Persistent view mode** - Remember user's preference
2. **Collapsible hierarchy** - Expand/collapse in Hierarchy View
3. **Export** - Export current view as image/PDF
4. **Custom sorting in Hierarchy** - Sort within hierarchy levels
5. **Hybrid view** - Hierarchy with sorting within levels
6. **Search highlight** - Highlight search results in chart
7. **Zoom controls** - Zoom in/out on timeline
8. **Mini-map** - Overview of full chart with current view indicator

### Potential Improvements
- Split-screen view (both views simultaneously)
- Comparison mode (compare two variants side-by-side)
- Timeline markers for milestones
- Dependencies/links between tasks
- Drag-and-drop rescheduling (Flat View)
- Keyboard shortcuts for view switching

## API Reference

### GanttChart (Hierarchy View)

```typescript
import { GanttChart } from '@/components/schedule/gantt-chart';

<GanttChart 
    tasks={taskRows} 
    baselineShiftMs={0} 
/>
```

### GanttChartFlat (Flat View)

```typescript
import { GanttChartFlat } from '@/components/schedule/gantt-chart-flat';

<GanttChartFlat 
    tasks={taskRows} 
    baselineShiftMs={0} 
/>
```

### ScheduleViewerComponent

```typescript
import { ScheduleViewerComponent } from '@/components/schedule/schedule-viewer-component';

<ScheduleViewerComponent 
    projectId={1}
    variants={variantOptions}
    defaultVariant="baseline"
/>
```

## Related Documentation

- [GANTT_HIERARCHY_IMPROVEMENTS.md](./GANTT_HIERARCHY_IMPROVEMENTS.md) - Detailed hierarchy implementation
- [schedule-utils.ts](./resources/js/lib/schedule-utils.ts) - Utility functions
- [schedule.ts](./resources/js/types/schedule.ts) - Type definitions

---

**Last Updated:** 2024  
**Version:** 2.0 (Dual View Support)  
**Maintainer:** Project Team