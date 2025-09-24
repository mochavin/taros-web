<?php

use App\Models\Project;
use App\Models\User;

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

    $this->actingAs($user)
        ->post(route('projects.store'), [
            'name' => 'New Project',
            'start_date' => now()->format('Y-m-d'),
            'end_date' => now()->addDay()->format('Y-m-d'),
        ])
        ->assertRedirect();

    expect(Project::where('name', 'New Project')->where('user_id', $user->id)->exists())->toBeTrue();
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

it('deletes a project', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->delete(route('projects.destroy', $project))
        ->assertRedirect(route('projects.index'));

    expect(Project::find($project->id))->toBeNull();
});
