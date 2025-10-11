<?php

namespace App\Http\Controllers;

use App\Http\Requests\Projects\StoreProjectRequest;
use App\Http\Requests\Projects\UpdateProjectRequest;
use App\Models\Project;
use App\Models\ScheduleVariant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController
{
    public function index(): Response
    {
        $projects = Project::query()
            ->where('user_id', Auth::id())
            ->latest('start_date')
            ->get(['id', 'name', 'start_date', 'end_date']);

        return Inertia::render('projects/index', [
            'projects' => $projects,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('projects/create');
    }

    public function store(StoreProjectRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['user_id'] = $request->user()->getKey();
        $project = Project::create($data);

        return redirect()->route('projects.show', $project);
    }

    public function show(Project $project): Response
    {
        $this->authorizeProject($project);

        $variants = $project->scheduleVariants()
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get();

        $defaultVariant = $variants->firstWhere('is_default', true)?->slug
            ?? $variants->first()?->slug
            ?? null;

        return Inertia::render('projects/show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'start_date' => $project->start_date?->format('Y-m-d'),
                'end_date' => $project->end_date?->format('Y-m-d'),
                'created_at' => $project->created_at->toDateTimeString(),
                'updated_at' => $project->updated_at->toDateTimeString(),
            ],
            'scheduleVariants' => $variants->map(fn (ScheduleVariant $variant) => $this->formatScheduleVariant($variant)),
            'defaultVariant' => $defaultVariant,
        ]);
    }

    public function edit(Project $project): Response
    {
        $this->authorizeProject($project);

        return Inertia::render('projects/edit', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'start_date' => $project->start_date?->format('Y-m-d'),
                'end_date' => $project->end_date?->format('Y-m-d'),
            ],
        ]);
    }

    public function update(UpdateProjectRequest $request, Project $project): RedirectResponse
    {
        $this->authorizeProject($project);
        $project->update($request->validated());

        return redirect()->route('projects.show', $project);
    }

    public function destroy(Project $project): RedirectResponse
    {
        $this->authorizeProject($project);
        $project->delete();

        return redirect()->route('projects.index');
    }

    protected function authorizeProject(Project $project): void
    {
        if ($project->user_id !== Auth::id()) {
            abort(403);
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function formatScheduleVariant(ScheduleVariant $variant): array
    {
        $taskRoutes = $this->buildCandidateUrls(
            $variant->taskStorageCandidates(),
            route('projects.schedule-variants.tasks', [
                'project' => $variant->project_id,
                'scheduleVariant' => $variant,
            ]),
        );
        $resourceRoutes = $this->buildCandidateUrls(
            $variant->resourceStorageCandidates(),
            route('projects.schedule-variants.resources', [
                'project' => $variant->project_id,
                'scheduleVariant' => $variant,
            ]),
        );

        return [
            'id' => $variant->id,
            'name' => $variant->name,
            'slug' => $variant->slug,
            'description' => $variant->description,
            'isDefault' => $variant->is_default,
            'taskCandidates' => $taskRoutes,
            'resCandidates' => $resourceRoutes,
        ];
    }

    /**
     * @param  array<int, string>  $paths
     * @return array<int, string>
     */
    protected function buildCandidateUrls(array $paths, string $primary): array
    {
        $filtered = array_values(array_filter($paths));
        $prefixed = array_map(static fn (string $path) => '/storage/app/private/'.$path, $filtered);

        return array_values(array_unique(array_merge(
            [$primary],
            $prefixed,
            $filtered,
        )));
    }
}
