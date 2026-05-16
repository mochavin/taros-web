<?php

use App\Jobs\ProcessMppProject;
use App\Models\Project;
use App\Models\ScheduleVariant;
use App\Models\User;
use App\Services\TarosCoreClient;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

it('redirects guests', function () {
    $this->get(route('projects.index'))->assertRedirect();
});

it('lists projects for authenticated user', function () {
    $user = User::factory()->create();
    $projects = Project::factory()->count(2)->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->get(route('projects.index'))
        ->assertOk()
        ->assertSee($projects->first()->name);
});

it('updates project visibility through dedicated endpoint', function (): void {
    $user = User::factory()->create();
    $project = Project::factory()->create([
        'user_id' => $user->id,
        'is_hidden' => false,
    ]);

    $response = $this->actingAs($user)->patch(route('projects.visibility', $project), [
        'is_hidden' => true,
    ]);

    $response->assertRedirect();
    expect($project->fresh()->is_hidden)->toBeTrue();

    $response = $this->actingAs($user)->patch(route('projects.visibility', $project), [
        'is_hidden' => false,
    ]);

    $response->assertRedirect();
    expect($project->fresh()->is_hidden)->toBeFalse();
});

it('creates a project', function () {
    $user = User::factory()->create();

    Storage::fake('local');

    $hierarchy = UploadedFile::fake()->create('tasks_hierarchy.csv', 5, 'text/csv');

    $this->actingAs($user)
        ->post(route('projects.store'), [
            'name' => 'New Project',
            'start_date' => now()->format('Y-m-d'),
            'end_date' => now()->addDay()->format('Y-m-d'),
            'start_baseline' => now()->format('Y-m-d\TH:i'),
            'hierarchy_file' => $hierarchy,
        ])
        ->assertRedirect();

    $project = Project::where('name', 'New Project')
        ->where('user_id', $user->id)
        ->first();

    expect($project)->not->toBeNull();
    expect($project?->start_baseline)->not->toBeNull();
    expect($project?->hierarchy_path)->toBe(
        sprintf('projects/%s/hierarchy/tasks_hierarchy.csv', $project?->id),
    );
    expect(Storage::disk('local')->exists('private/'.$project?->hierarchy_path))->toBeTrue();
});

it('queues mpp processing when creating a project from an mpp file', function () {
    $user = User::factory()->create();

    Storage::fake('local');
    Queue::fake();

    $mpp = UploadedFile::fake()->create('uploaded-plan.mpp', 5, 'application/vnd.ms-project');

    $this->actingAs($user)
        ->post(route('projects.store'), [
            'name' => 'MPP Project',
            'start_date' => now()->format('Y-m-d'),
            'hierarchy_file' => $mpp,
        ])
        ->assertRedirect();

    $project = Project::where('name', 'MPP Project')->firstOrFail();

    expect($project->processing_status)->toBe('queued');
    expect($project->source_mpp_path)->toBe(sprintf('projects/%s/source/source.mpp', $project->id));
    expect(Storage::disk('local')->exists('private/'.$project->source_mpp_path))->toBeTrue();

    Queue::assertPushed(ProcessMppProject::class);
});

it('imports taros-core outputs into project files and schedule variants', function () {
    $user = User::factory()->create();
    Storage::fake('local');

    $project = Project::factory()->create([
        'user_id' => $user->id,
        'source_mpp_path' => 'projects/1/source/source.mpp',
        'processing_status' => 'queued',
    ]);
    $project->forceFill(['source_mpp_path' => sprintf('projects/%s/source/source.mpp', $project->id)])->save();
    Storage::disk('local')->put('private/'.$project->source_mpp_path, 'mpp bytes');

    $zipPath = tempnam(sys_get_temp_dir(), 'taros-core-zip');
    $zip = new ZipArchive();
    $zip->open($zipPath, ZipArchive::OVERWRITE);
    $zip->addFromString('input/tasks_hierarchy.csv', "TaskID,TaskName\n1,Start\n");
    $zip->addFromString('non_rl/task_schedule.csv', "TaskID,TaskName,Start,Finish,DurationHours,IsElapsed,Assignments\n1,Start,2026-01-01 07:00:00,2026-01-01 08:00:00,1.000,N,\n");
    $zip->addFromString('non_rl/resource_tracking.csv', "ResourceID,ResourceName,TaskID,TaskName,SegmentStart,SegmentEnd,SegmentHours,Units\n");
    $zip->addFromString('reinforce/task_schedule.csv', "TaskID,TaskName,Start,Finish,DurationHours,IsElapsed,Assignments\n1,Start,2026-01-01 07:00:00,2026-01-01 08:00:00,1.000,N,\n");
    $zip->addFromString('reinforce/resource_tracking.csv', "ResourceID,ResourceName,TaskID,TaskName,SegmentStart,SegmentEnd,SegmentHours,Units\n");
    $zip->close();

    Http::fake([
        'taros-core:5000/process' => Http::response(file_get_contents($zipPath), 200, [
            'Content-Type' => 'application/zip',
        ]),
        'http://taros-core:5000/process' => Http::response(file_get_contents($zipPath), 200, [
            'Content-Type' => 'application/zip',
        ]),
    ]);

    (new ProcessMppProject($project->id))->handle(app(TarosCoreClient::class));

    $project->refresh();
    expect($project->processing_status)->toBe('completed');
    expect($project->hierarchy_path)->toBe(sprintf('projects/%s/hierarchy/tasks_hierarchy.csv', $project->id));
    expect(Storage::disk('local')->exists('private/'.$project->hierarchy_path))->toBeTrue();

    $nonRl = ScheduleVariant::where('project_id', $project->id)->where('slug', 'non_rl')->first();
    $reinforce = ScheduleVariant::where('project_id', $project->id)->where('slug', 'reinforce')->first();

    expect($nonRl)->not->toBeNull();
    expect($nonRl?->is_default)->toBeTrue();
    expect($reinforce)->not->toBeNull();
    expect($reinforce?->is_default)->toBeFalse();
    expect(Storage::disk('local')->exists('private/'.$reinforce?->task_path))->toBeTrue();
});

it('updates a project', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->put(route('projects.update', $project), [
            'name' => 'Updated Name',
            'start_date' => $project->start_date->format('Y-m-d'),
            'end_date' => $project->end_date?->format('Y-m-d'),
            'start_baseline' => '2025-12-30T10:00',
        ])
        ->assertRedirect();

    expect($project->refresh()->name)->toBe('Updated Name');
    expect($project->start_baseline?->format('Y-m-d H:i'))->toBe('2025-12-30 10:00');
});

it('replaces hierarchy file when updating a project', function () {
    $user = User::factory()->create();
    Storage::fake('local');

    $project = Project::factory()->create(['user_id' => $user->id]);
    $oldPath = sprintf('projects/%s/hierarchy/old_hierarchy.csv', $project->id);

    $project->forceFill(['hierarchy_path' => $oldPath])->save();
    Storage::disk('local')->put('private/'.$oldPath, 'old hierarchy');

    $newHierarchy = UploadedFile::fake()->create('new_tasks_hierarchy.csv', 8, 'text/csv');

    $this->actingAs($user)
        ->put(route('projects.update', $project), [
            'name' => 'Updated With Hierarchy',
            'start_date' => $project->start_date->format('Y-m-d'),
            'end_date' => $project->end_date?->format('Y-m-d'),
            'hierarchy_file' => $newHierarchy,
        ])
        ->assertRedirect();

    $project->refresh();

    $expectedPath = sprintf('projects/%s/hierarchy/tasks_hierarchy.csv', $project->id);

    expect($project->hierarchy_path)->toBe($expectedPath);
    expect(Storage::disk('local')->exists('private/'.$oldPath))->toBeFalse();
    expect(Storage::disk('local')->exists('private/'.$expectedPath))->toBeTrue();
});

it('deletes a project', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->delete(route('projects.destroy', $project))
        ->assertRedirect(route('projects.index'));

    expect(Project::find($project->id))->toBeNull();
});
