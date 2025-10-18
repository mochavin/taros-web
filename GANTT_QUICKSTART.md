# Gantt Chart - Quick Start Guide

## 🚀 Getting Started (5 minutes)

### 1. Navigate to Schedule View

```typescript
// In your browser
http://your-app.com/schedule
```

### 2. Select View Mode

Look for the **View Mode** selector in the Gantt tab:

```
┌─────────────────────────────────────────────────┐
│ View Mode: [Hierarchy View] [Flat View]        │
└─────────────────────────────────────────────────┘
```

- **Hierarchy View** → See project structure with headings
- **Flat View** → See sortable task list

### 3. Done! Start exploring

## 📦 Component Usage

### Basic Usage

```tsx
import { GanttChart } from '@/components/schedule/gantt-chart';
import { GanttChartFlat } from '@/components/schedule/gantt-chart-flat';

// Hierarchy View
<GanttChart 
    tasks={taskRows} 
    baselineShiftMs={0} 
/>

// Flat View  
<GanttChartFlat 
    tasks={taskRows} 
    baselineShiftMs={0} 
/>
```

### With View Selector

```tsx
import { useState } from 'react';
import { GanttChart } from '@/components/schedule/gantt-chart';
import { GanttChartFlat } from '@/components/schedule/gantt-chart-flat';
import { Button } from '@/components/ui/button';

function MyScheduleView({ tasks }) {
    const [viewMode, setViewMode] = useState<'hierarchy' | 'flat'>('hierarchy');
    
    return (
        <div>
            <div className="flex gap-2 mb-4">
                <Button 
                    variant={viewMode === 'hierarchy' ? 'default' : 'outline'}
                    onClick={() => setViewMode('hierarchy')}
                >
                    Hierarchy
                </Button>
                <Button 
                    variant={viewMode === 'flat' ? 'default' : 'outline'}
                    onClick={() => setViewMode('flat')}
                >
                    Flat
                </Button>
            </div>
            
            {viewMode === 'hierarchy' ? (
                <GanttChart tasks={tasks} baselineShiftMs={0} />
            ) : (
                <GanttChartFlat tasks={tasks} baselineShiftMs={0} />
            )}
        </div>
    );
}
```

## 📝 Data Format

### Task Schedule CSV

```csv
TaskID,TaskName,Start,Finish,DurationHours,IsElapsed,Assignments
4,01 Shut Down,2024-06-19 00:00:00,2024-06-21 00:00:00,48.000,Y,Operasi(4.0)
10,02 Open Cover,2024-06-19 09:00:00,2024-06-19 10:00:00,1.000,N,Team A(2.0)
```

### Hierarchy CSV (for Hierarchy View)

```csv
TaskID,TaskName,ParentID,ChildrenIDs,OutlineLevel,IsSummary
0,Project Root,,,0,True
1,Phase 1,,,1,True
4,Task 1,,,2,False
10,Task 2,,,2,False
```

## 🎯 Common Tasks

### 1. Find Longest Tasks

```
1. Switch to Flat View
2. Select Sort: "Duration (longest first)"
3. Look at top results
```

### 2. View Project Structure

```
1. Switch to Hierarchy View
2. Use text filter to find sections
3. Summary rows shown in bold
```

### 3. Filter by Date Range

```
1. Either view mode
2. Set "From" and "To" dates
3. Only tasks in range shown
```

### 4. Search for Specific Task

```
1. Either view mode
2. Type in "Filter tasks" field
3. Matches TaskID or TaskName
```

## 💡 Quick Tips

### Hierarchy View
- ✅ Bold text = Summary/Heading (no gantt bar)
- ✅ Indented = Child tasks
- ✅ Red bars = Elapsed tasks
- ✅ Blue bars = Ongoing/future tasks

### Flat View
- ✅ All tasks at same level
- ✅ Use sort dropdown for analysis
- ✅ Faster for large datasets
- ✅ Better for task comparison

## 🔧 Customization

### Change Default View

```tsx
// In schedule-viewer-component.tsx
const [ganttViewMode, setGanttViewMode] = useState<'hierarchy' | 'flat'>(
    'hierarchy' // Change to 'flat' for default flat view
);
```

### Adjust Timeline Width

```tsx
// In gantt-chart.tsx or gantt-chart-flat.tsx
const maxWidthPx = 1200; // Change this value
```

### Change Label Width

```tsx
// In gantt-chart.tsx
<div className="relative ml-[250px] min-w-[800px]">
// Change 250px to your desired width

// In gantt-chart-flat.tsx  
<div className="relative ml-[200px] min-w-[800px]">
// Change 200px to your desired width
```

### Adjust Indentation

```tsx
// In gantt-chart.tsx
const padLeft = Math.min(
    Math.max(0, row.outlineLevel) * 12, // Change 12 to adjust indent size
    200, // Max indent in px
);
```

## 🐛 Troubleshooting

### No hierarchy showing?

**Check:**
1. `/public/hierarchy/tasks_hierarchy.csv` exists
2. File has `IsSummary=True` rows
3. You're in **Hierarchy View** (not Flat View)

**Fix:**
```bash
# Verify file exists
ls public/hierarchy/tasks_hierarchy.csv

# Check first few lines
head -n 5 public/hierarchy/tasks_hierarchy.csv
```

### Sort not working?

**Check:**
1. You're in **Flat View** (sorting disabled in Hierarchy View)

**Fix:**
Click "Flat View (Sortable)" button

### Tasks missing?

**Check:**
1. Text filter is empty
2. Date range is not too restrictive
3. Pagination - try "All" in page size

**Fix:**
```
1. Clear all filters
2. Set page size to "All"
3. Reload page
```

### Performance slow?

**Check:**
1. How many tasks? (check status bar)
2. Page size set to "All" with 1000+ tasks?

**Fix:**
```
1. Use pagination (set to 100 or 200)
2. Filter data to reduce rows
3. Consider Flat View (faster than Hierarchy)
```

## 📚 Learn More

- **Full Docs:** [GANTT_DUAL_VIEWS.md](./GANTT_DUAL_VIEWS.md)
- **Hierarchy Details:** [GANTT_HIERARCHY_IMPROVEMENTS.md](./GANTT_HIERARCHY_IMPROVEMENTS.md)
- **Implementation:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Visual Guide:** [GANTT_COMPARISON.md](./GANTT_COMPARISON.md)

## 🎓 5-Minute Tutorial

### Step 1: Load Your Data (1 min)
```tsx
import { useCSVParser } from '@/hooks/use-csv-parser';

const { taskRows, loadVariant } = useCSVParser();

useEffect(() => {
    loadVariant(
        ['/hierarchy/task_schedule.csv'],
        ['/hierarchy/resource_schedule.csv']
    );
}, []);
```

### Step 2: Add Gantt Chart (1 min)
```tsx
import { GanttChart } from '@/components/schedule/gantt-chart';

<GanttChart tasks={taskRows} baselineShiftMs={0} />
```

### Step 3: Add View Selector (1 min)
```tsx
const [mode, setMode] = useState<'hierarchy' | 'flat'>('hierarchy');

<Button onClick={() => setMode('hierarchy')}>Hierarchy</Button>
<Button onClick={() => setMode('flat')}>Flat</Button>

{mode === 'hierarchy' ? <GanttChart .../> : <GanttChartFlat .../>}
```

### Step 4: Style It (1 min)
```tsx
<div className="rounded-lg border bg-white p-4">
    {/* Your gantt chart here */}
</div>
```

### Step 5: Test It (1 min)
```
1. Open browser
2. Switch between views
3. Try filtering
4. Try sorting (in Flat View)
5. Done! 🎉
```

## 🚀 Production Checklist

Before deploying:

- [ ] Test with real data (100+ tasks)
- [ ] Test both view modes
- [ ] Test filtering & pagination
- [ ] Test on different browsers
- [ ] Test on tablet/mobile
- [ ] Verify hierarchy file exists in production
- [ ] Check loading states work
- [ ] Verify error handling
- [ ] Test with empty data
- [ ] Performance test with 1000+ tasks

## 📞 Need Help?

1. Check the docs (links above)
2. Review code comments in components
3. Check browser console for errors
4. Verify CSV file format
5. Test with sample data first

## 🎉 You're Ready!

You now know:
- ✅ How to use both view modes
- ✅ When to use each view
- ✅ How to integrate components
- ✅ How to customize
- ✅ How to troubleshoot

Happy coding! 🚀

---

**Quick Reference Card**

```
Hierarchy View:
- Shows structure with headings
- Bold = Summary
- Indented = Hierarchy
- No sorting
- File: gantt-chart.tsx

Flat View:
- Shows tasks only
- All same level
- 5 sort modes
- Faster performance
- File: gantt-chart-flat.tsx

Switch Views:
- Click buttons in View Mode selector
- Or programmatically via state

Data Files:
- tasks_hierarchy.csv (hierarchy)
- task_schedule.csv (schedule data)
```

**Version:** 2.0  
**Last Updated:** 2024  
**Status:** Ready to use! ✅