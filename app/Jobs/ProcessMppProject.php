<?php

namespace App\Jobs;

use App\Models\Project;
use App\Models\ScheduleVariant;
use App\Services\TarosCoreClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;
use ZipArchive;

class ProcessMppProject implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 0;

    public function __construct(public int $projectId, public array $options = []) {}

    public function handle(TarosCoreClient $client): void
    {
        $project = Project::query()->findOrFail($this->projectId);
        $initialOutputsImported = false;

        try {
            $this->markProcessing($project);

            if (! $project->source_mpp_path) {
                throw new RuntimeException('Project does not have an uploaded MPP source file.');
            }

            $disk = Storage::disk('local');
            $sourcePath = $project->source_mpp_path;
            if (! $disk->exists($sourcePath)) {
                throw new RuntimeException('Uploaded MPP source file is missing from storage.');
            }

            $initialOptions = array_merge($this->options, [
                'include_non_rl' => (bool) ($this->options['include_non_rl'] ?? false) || $this->shouldRunRl(),
                'include_rl' => false,
                'algorithms' => [],
            ]);

            $response = $client->processMpp(
                $disk->path($sourcePath),
                basename($project->source_mpp_path),
                $this->projectStartDatetime($project),
                $initialOptions,
            );

            if (! $response->successful()) {
                throw new RuntimeException(
                    'taros-core initial processing failed: '.Str::limit($response->body(), 1000),
                );
            }

            $archivePath = $this->writeArchive($project, $response->body(), 'taros_processing_initial_outputs.zip');
            $extractDir = $this->extractArchive($archivePath);
            $this->importOutputs($project->fresh(), $extractDir);
            $initialOutputsImported = true;

            if ($this->shouldRunRl()) {
                $project->forceFill([
                    'processing_status' => 'processing',
                    'processing_message' => 'MPP extraction completed. RL training is still running: '.$this->algorithmLabel().'.',
                    'processing_completed_at' => null,
                ])->save();

                $rlOptions = array_merge($this->options, [
                    'include_non_rl' => false,
                    'include_rl' => true,
                ]);

                $response = $client->processMpp(
                    $disk->path($sourcePath),
                    basename($project->source_mpp_path),
                    $this->projectStartDatetime($project),
                    $rlOptions,
                );

                if (! $response->successful()) {
                    throw new RuntimeException(
                        'taros-core RL training failed: '.Str::limit($response->body(), 1000),
                    );
                }

                $archivePath = $this->writeArchive($project, $response->body(), 'taros_processing_rl_outputs.zip');
                $extractDir = $this->extractArchive($archivePath);
                $this->importOutputs($project->fresh(), $extractDir);
            }

            $project->forceFill([
                'processing_status' => 'completed',
                'processing_message' => $this->shouldRunRl()
                    ? 'MPP extraction and selected RL training completed.'
                    : 'MPP extraction completed.',
                'processing_completed_at' => now(),
            ])->save();
        } catch (Throwable $e) {
            $project->forceFill([
                'processing_status' => 'failed',
                'processing_message' => $initialOutputsImported && $this->shouldRunRl()
                    ? 'Initial MPP extraction completed, but RL training failed: '.Str::limit($e->getMessage(), 1900)
                    : Str::limit($e->getMessage(), 2000),
                'processing_completed_at' => now(),
            ])->save();

            throw $e;
        }
    }

    protected function markProcessing(Project $project): void
    {
        $project->forceFill([
            'processing_status' => 'processing',
            'processing_message' => 'MPP file is being extracted by taros-core.',
            'processing_started_at' => now(),
            'processing_completed_at' => null,
        ])->save();
    }

    protected function shouldRunRl(): bool
    {
        return (bool) ($this->options['include_rl'] ?? false)
            && ($this->options['algorithms'] ?? []) !== [];
    }

    protected function algorithmLabel(): string
    {
        $algorithms = array_map(
            fn (string $algorithm): string => strtoupper($algorithm),
            $this->options['algorithms'] ?? [],
        );

        return implode(', ', $algorithms);
    }

    protected function projectStartDatetime(Project $project): string
    {
        if ($project->start_baseline) {
            return $project->start_baseline->format('Y-m-d H:i:s');
        }

        return $project->start_date->format('Y-m-d 00:00:00');
    }

    protected function writeArchive(Project $project, string $body, string $filename): string
    {
        $disk = Storage::disk('local');
        $archiveRelativePath = sprintf('projects/%s/processing/%s', $project->id, $filename);
        $disk->put($archiveRelativePath, $body);

        return $disk->path($archiveRelativePath);
    }

    protected function extractArchive(string $archivePath): string
    {
        $extractDir = storage_path('app/private/processing/'.(string) Str::uuid());
        if (! is_dir($extractDir)) {
            mkdir($extractDir, 0775, true);
        }

        $zip = new ZipArchive();
        $opened = $zip->open($archivePath);
        if ($opened !== true) {
            throw new RuntimeException('Unable to open taros-core ZIP output.');
        }

        $zip->extractTo($extractDir);
        $zip->close();

        return $extractDir;
    }

    protected function importOutputs(Project $project, string $extractDir): void
    {
        $this->storeGeneratedHierarchy($project, $extractDir);
        $this->storeUploadedScheduleVariant($project, $extractDir);

        $variants = [
            'non_rl' => 'Non-RL Baseline',
            'reinforce' => 'RL Reinforce',
            'dqn' => 'RL DQN',
            'ppo' => 'RL PPO',
        ];

        foreach ($variants as $slug => $name) {
            $variantDir = $extractDir.DIRECTORY_SEPARATOR.$slug;
            $taskPath = $variantDir.DIRECTORY_SEPARATOR.'task_schedule.csv';
            $resourcePath = $variantDir.DIRECTORY_SEPARATOR.'resource_tracking.csv';

            if (! is_file($taskPath) || ! is_file($resourcePath)) {
                continue;
            }

            $storedTaskPath = $this->storeVariantFile($project, $slug, $taskPath, 'task_schedule.csv');
            $storedResourcePath = $this->storeVariantFile($project, $slug, $resourcePath, 'resource_tracking.csv');

            ScheduleVariant::query()->updateOrCreate(
                [
                    'project_id' => $project->id,
                    'slug' => $slug,
                ],
                [
                    'name' => $name,
                    'description' => $slug === 'non_rl'
                        ? 'Precedence-only baseline generated from the uploaded MPP.'
                        : 'RL-trained schedule generated from the uploaded MPP.',
                    'is_default' => false,
                    'is_hidden' => false,
                    'task_path' => $storedTaskPath,
                    'resource_path' => $storedResourcePath,
                ],
            );
        }
    }

    protected function storeGeneratedHierarchy(Project $project, string $extractDir): void
    {
        $source = $extractDir.DIRECTORY_SEPARATOR.'input'.DIRECTORY_SEPARATOR.'tasks_hierarchy.csv';
        if (! is_file($source)) {
            return;
        }

        $relativePath = sprintf('projects/%s/hierarchy/tasks_hierarchy.csv', $project->id);
        Storage::disk('local')->put($relativePath, file_get_contents($source));

        $project->forceFill(['hierarchy_path' => $relativePath])->save();
    }

    protected function storeUploadedScheduleVariant(Project $project, string $extractDir): void
    {
        $variantDir = $extractDir.DIRECTORY_SEPARATOR.'input';
        $taskPath = $variantDir.DIRECTORY_SEPARATOR.'task_schedule.csv';
        $resourcePath = $variantDir.DIRECTORY_SEPARATOR.'resource_tracking.csv';

        if (! is_file($taskPath) || ! is_file($resourcePath)) {
            throw new RuntimeException('taros-core output does not include the uploaded MPP schedule.');
        }

        ScheduleVariant::query()
            ->where('project_id', $project->id)
            ->update(['is_default' => false]);

        $storedTaskPath = $this->storeVariantFile($project, 'uploaded', $taskPath, 'task_schedule.csv');
        $storedResourcePath = $this->storeVariantFile($project, 'uploaded', $resourcePath, 'resource_tracking.csv');

        ScheduleVariant::query()->updateOrCreate(
            [
                'project_id' => $project->id,
                'slug' => 'uploaded',
            ],
            [
                'name' => 'Uploaded MPP Schedule',
                'description' => 'Original schedule extracted from the uploaded MPP.',
                'is_default' => true,
                'is_hidden' => false,
                'task_path' => $storedTaskPath,
                'resource_path' => $storedResourcePath,
            ],
        );
    }

    protected function storeVariantFile(Project $project, string $slug, string $source, string $filename): string
    {
        $relativePath = sprintf('projects/%s/schedule-variants/%s/%s', $project->id, $slug, $filename);
        Storage::disk('local')->put($relativePath, file_get_contents($source));

        return $relativePath;
    }
}
