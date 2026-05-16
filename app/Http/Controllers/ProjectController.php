<?php

namespace App\Http\Controllers;

use App\Http\Requests\Projects\StoreProjectRequest;
use App\Http\Requests\Projects\UpdateProjectRequest;
use App\Http\Requests\Projects\UpdateProjectVisibilityRequest;
use App\Jobs\ProcessMppProject;
use App\Models\Project;
use App\Models\ScheduleVariant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function index(): Response
    {
        $projects = Project::query()
            ->where('user_id', Auth::id())
            ->orderBy('is_hidden')
            ->latest('start_date')
            ->get(['id', 'name', 'start_date', 'end_date', 'start_baseline', 'is_hidden']);

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
        /** @var UploadedFile|null $hierarchyFile */
        $hierarchyFile = $request->file('hierarchy_file');

        unset($data['hierarchy_file']);

        $data['user_id'] = $request->user()->getKey();

        $project = Project::create($data);

        if ($hierarchyFile instanceof UploadedFile) {
            if ($this->isMppFile($hierarchyFile)) {
                $path = $this->storeSourceMppFile($project, $hierarchyFile);
                $project->forceFill([
                    'source_mpp_path' => $path,
                    'processing_status' => 'queued',
                    'processing_message' => 'MPP upload queued for extraction and training.',
                    'processing_started_at' => null,
                    'processing_completed_at' => null,
                ])->save();

                ProcessMppProject::dispatch($project->getKey());
            } else {
                $path = $this->storeHierarchyFile($project, $hierarchyFile);
                $project->forceFill([
                    'hierarchy_path' => $path,
                    'processing_status' => 'manual',
                    'processing_message' => null,
                ])->save();
            }
        }

        return redirect()->route('projects.show', $project);
    }

    public function show(Project $project): Response
    {
        $this->authorizeProject($project);

        $variants = $project->scheduleVariants()
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get();

        $visibleVariants = $variants->where('is_hidden', false)->values();

        $defaultVariant = $visibleVariants->firstWhere('is_default', true)?->slug
            ?? $visibleVariants->first()?->slug
            ?? null;

        return Inertia::render('projects/show', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'start_date' => $project->start_date?->format('Y-m-d'),
                'end_date' => $project->end_date?->format('Y-m-d'),
                'start_baseline' => $project->start_baseline?->toDateTimeString(),
                'processing_status' => $project->processing_status,
                'processing_message' => $project->processing_message,
                'processing_started_at' => $project->processing_started_at?->toDateTimeString(),
                'processing_completed_at' => $project->processing_completed_at?->toDateTimeString(),
                'created_at' => $project->created_at->toDateTimeString(),
                'updated_at' => $project->updated_at->toDateTimeString(),
            ],
            'scheduleVariants' => $visibleVariants
                ->map(fn (ScheduleVariant $variant) => $this->formatScheduleVariant($variant)),
            'defaultVariant' => $defaultVariant,
            'hierarchyCandidates' => $this->buildCandidateUrls(
                [$project->hierarchy_path],
                route('projects.hierarchy', $project),
            ),
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
                'start_baseline' => $project->start_baseline?->format('Y-m-d\TH:i'),
            ],
        ]);
    }

    public function update(UpdateProjectRequest $request, Project $project): RedirectResponse
    {
        $this->authorizeProject($project);

        $data = $request->validated();
        /** @var UploadedFile|null $hierarchyFile */
        $hierarchyFile = $request->file('hierarchy_file');

        unset($data['hierarchy_file']);

        $project->fill($data);

        if ($hierarchyFile instanceof UploadedFile) {
            if ($this->isMppFile($hierarchyFile)) {
                if ($project->source_mpp_path) {
                    $this->deleteSourceMppFile($project->source_mpp_path);
                }

                $project->source_mpp_path = $this->storeSourceMppFile($project, $hierarchyFile);
                $project->processing_status = 'queued';
                $project->processing_message = 'MPP upload queued for extraction and training.';
                $project->processing_started_at = null;
                $project->processing_completed_at = null;
            } else {
                if ($project->hierarchy_path) {
                    $this->deleteHierarchyFile($project->hierarchy_path);
                }

                $project->hierarchy_path = $this->storeHierarchyFile($project, $hierarchyFile);
                $project->processing_status = 'manual';
                $project->processing_message = null;
                $project->processing_started_at = null;
                $project->processing_completed_at = null;
            }
        }

        $project->save();

        if ($hierarchyFile instanceof UploadedFile && $this->isMppFile($hierarchyFile)) {
            ProcessMppProject::dispatch($project->getKey());
        }

        return redirect()->route('projects.show', $project);
    }

    public function destroy(Project $project): RedirectResponse
    {
        $this->authorizeProject($project);
        if ($project->hierarchy_path) {
            $this->deleteHierarchyFile($project->hierarchy_path);
        }
        if ($project->source_mpp_path) {
            $this->deleteSourceMppFile($project->source_mpp_path);
        }

        $this->deleteHierarchyDirectory($project);
        $this->deleteSourceDirectory($project);
        $project->delete();

        return redirect()->route('projects.index');
    }

    public function updateVisibility(
        UpdateProjectVisibilityRequest $request,
        Project $project,
    ): RedirectResponse {
        $this->authorizeProject($project);

        $project->forceFill([
            'is_hidden' => (bool) $request->validated('is_hidden'),
        ])->save();

        return redirect()->back();
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
            'isHidden' => $variant->is_hidden,
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

    protected function storeHierarchyFile(Project $project, UploadedFile $file): string
    {
        $relativeDirectory = $this->hierarchyDirectory($project);
        $disk = Storage::disk('local');
        $disk->makeDirectory('private/'.$relativeDirectory);
        $disk->putFileAs('private/'.$relativeDirectory, $file, 'tasks_hierarchy.csv');

        return $relativeDirectory.'/tasks_hierarchy.csv';
    }

    protected function storeSourceMppFile(Project $project, UploadedFile $file): string
    {
        $relativeDirectory = $this->sourceDirectory($project);
        $disk = Storage::disk('local');
        $disk->makeDirectory('private/'.$relativeDirectory);
        $disk->putFileAs('private/'.$relativeDirectory, $file, 'source.mpp');

        return $relativeDirectory.'/source.mpp';
    }

    protected function isMppFile(UploadedFile $file): bool
    {
        return strtolower($file->getClientOriginalExtension()) === 'mpp';
    }

    protected function hierarchyDirectory(Project $project): string
    {
        return sprintf('projects/%s/hierarchy', $project->getKey());
    }

    protected function sourceDirectory(Project $project): string
    {
        return sprintf('projects/%s/source', $project->getKey());
    }

    protected function deleteHierarchyFile(string $path): void
    {
        Storage::disk('local')->delete('private/'.$path);
    }

    protected function deleteSourceMppFile(string $path): void
    {
        Storage::disk('local')->delete('private/'.$path);
    }

    protected function deleteHierarchyDirectory(Project $project): void
    {
        Storage::disk('local')->deleteDirectory('private/'.$this->hierarchyDirectory($project));
    }

    protected function deleteSourceDirectory(Project $project): void
    {
        Storage::disk('local')->deleteDirectory('private/'.$this->sourceDirectory($project));
    }
}
