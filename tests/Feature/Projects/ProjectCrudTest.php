<?php

use App\Models\Project;
use App\Models\User;
use Illuminate\Http\UploadedFile;
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

it('creates a project', function () {
    $user = User::factory()->create();

    Storage::fake('local');

    $hierarchy = UploadedFile::fake()->create('tasks_hierarchy.csv', 5, 'text/csv');

    $this->actingAs($user)
        ->post(route('projects.store'), [
            'name' => 'New Project',
            'start_date' => now()->format('Y-m-d'),
            'end_date' => now()->addDay()->format('Y-m-d'),
            'hierarchy_file' => $hierarchy,
        ])
        ->assertRedirect();

    $project = Project::where('name', 'New Project')
        ->where('user_id', $user->id)
        ->first();

    expect($project)->not->toBeNull();
    expect($project?->hierarchy_path)->toBe(
        sprintf('projects/%s/hierarchy/tasks_hierarchy.csv', $project?->id),
    );
    expect(Storage::disk('local')->exists('private/'.$project?->hierarchy_path))->toBeTrue();
});

it('updates a project', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->put(route('projects.update', $project), [
            'name' => 'Updated Name',
            'start_date' => $project->start_date->format('Y-m-d'),
            'end_date' => $project->end_date?->format('Y-m-d'),
        ])
        ->assertRedirect();

    expect($project->refresh()->name)->toBe('Updated Name');
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
