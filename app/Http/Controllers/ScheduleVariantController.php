<?php

namespace App\Http\Controllers;

use App\Http\Requests\ScheduleVariants\StoreScheduleVariantRequest;
use App\Http\Requests\ScheduleVariants\UpdateScheduleVariantRequest;
use App\Http\Requests\ScheduleVariants\UpdateScheduleVariantVisibilityRequest;
use App\Models\Project;
use App\Models\ScheduleVariant;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ScheduleVariantController extends Controller
{
    public function index(Project $project): Response
    {
        $variants = $project->scheduleVariants()
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get()
            ->map(fn (ScheduleVariant $variant) => $this->formatVariantForListing($variant));

        return Inertia::render('schedule-variants/index', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
            ],
            'variants' => $variants,
        ]);
    }

    public function create(Project $project): Response
    {
        return Inertia::render('schedule-variants/create', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
            ],
        ]);
    }

    public function store(StoreScheduleVariantRequest $request, Project $project): RedirectResponse
    {
        $payload = $this->transformPayload($request->validated());
        $payload['project_id'] = $project->getKey();

        $payload = $this->handleFileUploads($request, $project, $payload);

        $variant = ScheduleVariant::create($payload);

        $this->ensureSingleDefault($variant);

        return redirect()->route('projects.schedule-variants.index', $project);
    }

    public function edit(Project $project, ScheduleVariant $scheduleVariant): Response
    {
        $this->assertOwnership($project, $scheduleVariant);

        return Inertia::render('schedule-variants/edit', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
            ],
            'variant' => [
                'id' => $scheduleVariant->id,
                'name' => $scheduleVariant->name,
                'slug' => $scheduleVariant->slug,
                'description' => $scheduleVariant->description,
                'is_default' => $scheduleVariant->is_default,
                'is_hidden' => $scheduleVariant->is_hidden,
                'task_path' => $scheduleVariant->task_path,
                'resource_path' => $scheduleVariant->resource_path,
            ],
        ]);
    }

    public function update(UpdateScheduleVariantRequest $request, Project $project, ScheduleVariant $scheduleVariant): RedirectResponse
    {
        $this->assertOwnership($project, $scheduleVariant);

        $payload = $this->transformPayload($request->validated());

        $payload = $this->handleFileUploads($request, $project, $payload, $scheduleVariant);

        $scheduleVariant->update($payload);

        $this->ensureSingleDefault($scheduleVariant->fresh());

        return redirect()->route('projects.schedule-variants.index', $project);
    }

    public function destroy(Project $project, ScheduleVariant $scheduleVariant): RedirectResponse
    {
        $this->assertOwnership($project, $scheduleVariant);

        $isDefault = $scheduleVariant->is_default;

        $this->deleteStoredFiles($scheduleVariant);

        $scheduleVariant->delete();

        if ($isDefault) {
            $this->assignFallbackDefault($project);
        }

        return redirect()->route('projects.schedule-variants.index', $project);
    }

    public function updateVisibility(
        UpdateScheduleVariantVisibilityRequest $request,
        Project $project,
        ScheduleVariant $scheduleVariant,
    ): RedirectResponse {
        $this->assertOwnership($project, $scheduleVariant);

        $validated = $request->validated();
        $isHidden = (bool) ($validated['is_hidden'] ?? false);

        if ($scheduleVariant->is_default && $isHidden) {
            return redirect()->back()->withErrors([
                'is_hidden' => 'Varian default tidak dapat disembunyikan.',
            ]);
        }

        $scheduleVariant->forceFill([
            'is_hidden' => $isHidden,
        ])->save();

        return redirect()->back();
    }

    public function taskScheduleCsv(Project $project, ScheduleVariant $scheduleVariant): StreamedResponse
    {
        $this->assertOwnership($project, $scheduleVariant);
        abort_if(! $scheduleVariant->task_path, 404);

        $path = 'private/'.$scheduleVariant->task_path;
        abort_if(! Storage::disk('local')->exists($path), 404);

        $projectBaseline = $project->start_baseline;
        $shift = $this->calculateBaselineShift($scheduleVariant, $projectBaseline);

        return response()->streamDownload(function () use ($path, $shift) {
            $handle = fopen(Storage::disk('local')->path($path), 'r');
            $output = fopen('php://output', 'w');

            if ($handle !== false) {
                $header = fgetcsv($handle);
                if ($header !== false) {
                    fputcsv($output, $header);

                    $startIndex = array_search('Start', $header);
                    $finishIndex = array_search('Finish', $header);

                    while (($data = fgetcsv($handle)) !== false) {
                        if ($shift !== 0) {
                            if ($startIndex !== false && isset($data[$startIndex])) {
                                $data[$startIndex] = $this->shiftDate($data[$startIndex], $shift);
                            }
                            if ($finishIndex !== false && isset($data[$finishIndex])) {
                                $data[$finishIndex] = $this->shiftDate($data[$finishIndex], $shift);
                            }
                        }
                        fputcsv($output, $data);
                    }
                }
                fclose($handle);
            }
            fclose($output);
        }, sprintf('task_schedule_%s.csv', $scheduleVariant->name), ['Content-Type' => 'text/csv']);
    }

    public function resourceTrackingCsv(Project $project, ScheduleVariant $scheduleVariant): StreamedResponse
    {
        $this->assertOwnership($project, $scheduleVariant);
        abort_if(! $scheduleVariant->resource_path, 404);

        $path = 'private/'.$scheduleVariant->resource_path;
        abort_if(! Storage::disk('local')->exists($path), 404);

        $projectBaseline = $project->start_baseline;
        $shift = $this->calculateBaselineShift($scheduleVariant, $projectBaseline);

        return response()->streamDownload(function () use ($path, $shift) {
            $handle = fopen(Storage::disk('local')->path($path), 'r');
            $output = fopen('php://output', 'w');

            if ($handle !== false) {
                $header = fgetcsv($handle);
                if ($header !== false) {
                    fputcsv($output, $header);

                    $startIndex = array_search('SegmentStart', $header);
                    $finishIndex = array_search('SegmentEnd', $header);

                    while (($data = fgetcsv($handle)) !== false) {
                        if ($shift !== 0) {
                            if ($startIndex !== false && isset($data[$startIndex])) {
                                $data[$startIndex] = $this->shiftDate($data[$startIndex], $shift);
                            }
                            if ($finishIndex !== false && isset($data[$finishIndex])) {
                                $data[$finishIndex] = $this->shiftDate($data[$finishIndex], $shift);
                            }
                        }
                        fputcsv($output, $data);
                    }
                }
                fclose($handle);
            }
            fclose($output);
        }, sprintf('resource_tracking_%s.csv', $scheduleVariant->name), ['Content-Type' => 'text/csv']);
    }

    protected function calculateBaselineShift(ScheduleVariant $variant, ?Carbon $projectBaseline): int
    {
        if (! $projectBaseline || ! $variant->task_path) {
            return 0;
        }

        $path = 'private/'.$variant->task_path;
        if (! Storage::disk('local')->exists($path)) {
            return 0;
        }

        $earliest = null;
        $handle = fopen(Storage::disk('local')->path($path), 'r');
        if ($handle !== false) {
            $header = fgetcsv($handle);
            if ($header !== false) {
                $startIndex = array_search('Start', $header);

                if ($startIndex !== false) {
                    while (($data = fgetcsv($handle)) !== false) {
                        if (isset($data[$startIndex]) && trim($data[$startIndex]) !== '') {
                            try {
                                $date = Carbon::parse($data[$startIndex]);
                                if ($earliest === null || $date->lt($earliest)) {
                                    $earliest = $date;
                                }
                            } catch (\Exception $e) {
                                // Skip invalid dates
                            }
                        }
                    }
                }
            }
            fclose($handle);
        }

        if (! $earliest) {
            return 0;
        }

        return $projectBaseline->timestamp - $earliest->timestamp;
    }

    protected function shiftDate(string $dateStr, int $shiftSeconds): string
    {
        if (trim($dateStr) === '') {
            return $dateStr;
        }

        try {
            $date = Carbon::parse($dateStr);

            return $date->addSeconds($shiftSeconds)->format('Y-m-d H:i:s');
        } catch (\Exception $e) {
            return $dateStr;
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function transformPayload(array $data): array
    {
        $data['slug'] = Str::slug($data['slug'], '_');
        $data['is_default'] = (bool) ($data['is_default'] ?? false);
        $data['is_hidden'] = (bool) ($data['is_hidden'] ?? false);
        $data['description'] = isset($data['description']) && trim((string) $data['description']) !== ''
            ? trim((string) $data['description'])
            : null;

        if ($data['is_default']) {
            $data['is_hidden'] = false;
        }

        return [
            'name' => $data['name'],
            'slug' => $data['slug'],
            'description' => $data['description'],
            'is_default' => $data['is_default'],
            'is_hidden' => $data['is_hidden'],
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    protected function handleFileUploads(
        Request $request,
        Project $project,
        array $payload,
        ?ScheduleVariant $existing = null,
    ): array {
        $slug = $payload['slug'];
        $taskFile = $request->file('task_file');
        $resourceFile = $request->file('resource_file');

        if ($taskFile instanceof UploadedFile) {
            if ($existing?->task_path) {
                $this->deleteStoredFile($existing->task_path);
            }

            $payload['task_path'] = $this->storeUploadedFile($project, $slug, $taskFile, 'task_schedule.csv');
        } elseif ($existing?->task_path) {
            $payload['task_path'] = $existing->slug !== $slug
                ? $this->moveStoredFile($existing->task_path, $project, $slug, 'task_schedule.csv')
                : $existing->task_path;
        }

        if ($resourceFile instanceof UploadedFile) {
            if ($existing?->resource_path) {
                $this->deleteStoredFile($existing->resource_path);
            }

            $payload['resource_path'] = $this->storeUploadedFile($project, $slug, $resourceFile, 'resource_tracking.csv');
        } elseif ($existing?->resource_path) {
            $payload['resource_path'] = $existing->slug !== $slug
                ? $this->moveStoredFile($existing->resource_path, $project, $slug, 'resource_tracking.csv')
                : $existing->resource_path;
        }

        if (! isset($payload['task_path']) || $payload['task_path'] === '') {
            throw ValidationException::withMessages([
                'task_file' => 'File task schedule diperlukan.',
            ]);
        }

        if (! isset($payload['resource_path']) || $payload['resource_path'] === '') {
            throw ValidationException::withMessages([
                'resource_file' => 'File resource tracking diperlukan.',
            ]);
        }

        return $payload;
    }

    protected function storeUploadedFile(Project $project, string $slug, UploadedFile $file, string $filename): string
    {
        $relativeDirectory = $this->buildStorageDirectory($project, $slug);
        $disk = Storage::disk('local');
        $disk->makeDirectory('private/'.$relativeDirectory);
        $disk->putFileAs('private/'.$relativeDirectory, $file, $filename);

        return $relativeDirectory.'/'.$filename;
    }

    protected function moveStoredFile(string $currentPath, Project $project, string $slug, string $filename): string
    {
        $newPath = $this->buildStorageDirectory($project, $slug).'/'.$filename;

        if ($currentPath === $newPath) {
            return $currentPath;
        }

        $disk = Storage::disk('local');

        if ($disk->exists('private/'.$currentPath)) {
            $disk->makeDirectory(dirname('private/'.$newPath));
            $disk->move('private/'.$currentPath, 'private/'.$newPath);
        }

        return $newPath;
    }

    protected function deleteStoredFiles(ScheduleVariant $variant): void
    {
        $disk = Storage::disk('local');

        if ($variant->task_path) {
            $disk->delete('private/'.$variant->task_path);
        }

        if ($variant->resource_path) {
            $disk->delete('private/'.$variant->resource_path);
        }

        if ($directory = $this->resolveVariantDirectory($variant)) {
            $disk->deleteDirectory('private/'.$directory);
        }
    }

    protected function deleteStoredFile(string $path): void
    {
        Storage::disk('local')->delete('private/'.$path);
    }

    protected function resolveVariantDirectory(ScheduleVariant $variant): ?string
    {
        $project = $variant->project ?? $variant->project()->first();

        if (! $project) {
            return null;
        }

        return $this->buildStorageDirectory($project, $variant->slug);
    }

    protected function buildStorageDirectory(Project $project, string $slug): string
    {
        return sprintf('projects/%s/schedule-variants/%s', $project->getKey(), $slug);
    }

    protected function ensureSingleDefault(ScheduleVariant $variant): void
    {
        if ($variant->is_default) {
            ScheduleVariant::query()
                ->where('project_id', $variant->project_id)
                ->whereKeyNot($variant->getKey())
                ->update(['is_default' => false]);

            return;
        }

        if (! ScheduleVariant::query()
            ->where('project_id', $variant->project_id)
            ->where('is_default', true)
            ->exists()) {
            $project = $variant->project ?? Project::query()->find($variant->project_id);

            if ($project) {
                $this->assignFallbackDefault($project);
            }
        }
    }

    protected function assignFallbackDefault(Project $project): void
    {
        $fallback = $project->scheduleVariants()->first();

        if ($fallback instanceof ScheduleVariant && ! $fallback->is_default) {
            $fallback->forceFill(['is_default' => true])->save();
        }
    }

    protected function assertOwnership(Project $project, ScheduleVariant $variant): void
    {
        if ($variant->project_id !== $project->getKey()) {
            abort(404);
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function formatVariantForListing(ScheduleVariant $variant): array
    {
        return [
            'id' => $variant->id,
            'name' => $variant->name,
            'slug' => $variant->slug,
            'description' => $variant->description,
            'isDefault' => $variant->is_default,
            'isHidden' => $variant->is_hidden,
            'taskPath' => $variant->task_path,
            'resourcePath' => $variant->resource_path,
            'taskCandidateCount' => $variant->task_path ? 1 : 0,
            'resourceCandidateCount' => $variant->resource_path ? 1 : 0,
        ];
    }
}
