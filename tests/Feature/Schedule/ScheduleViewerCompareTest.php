<?php

use App\Models\Project;
use App\Models\ScheduleVariant;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;

beforeEach(function () {
    $this->user = User::factory()->create();
    actingAs($this->user);
});

test('schedule viewer page loads with compare mode available when multiple variants exist', function () {
    $project = Project::factory()->create([
        'user_id' => $this->user->id,
    ]);

    ScheduleVariant::factory()->count(3)->create([
        'project_id' => $project->id,
        'is_hidden' => false,
    ]);

    $response = get(route('projects.show', $project));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('projects/show')
        ->has('scheduleVariants', 3)
        ->has('scheduleVariants.0', fn (Assert $variant) => $variant
            ->has('slug')
            ->has('name')
            ->has('taskCandidates')
            ->has('resCandidates')
        )
    );
});

test('schedule viewer shows only visible variants for comparison', function () {
    $project = Project::factory()->create([
        'user_id' => $this->user->id,
    ]);

    // Create visible variants
    ScheduleVariant::factory()->count(2)->create([
        'project_id' => $project->id,
        'is_hidden' => false,
    ]);

    // Create hidden variant
    ScheduleVariant::factory()->create([
        'project_id' => $project->id,
        'is_hidden' => true,
    ]);

    $response = get(route('projects.show', $project));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->has('scheduleVariants', 2) // Only visible variants
    );
});

test('schedule viewer can handle single variant selection', function () {
    $project = Project::factory()->create([
        'user_id' => $this->user->id,
    ]);

    $variant = ScheduleVariant::factory()->create([
        'project_id' => $project->id,
        'is_hidden' => false,
        'slug' => 'baseline',
        'name' => 'Baseline Schedule',
    ]);

    $response = get(route('projects.show', $project));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->has('scheduleVariants', 1)
        ->where('scheduleVariants.0.slug', 'baseline')
        ->where('scheduleVariants.0.name', 'Baseline Schedule')
    );
});

test('schedule viewer compare mode requires at least two variants', function () {
    $project = Project::factory()->create([
        'user_id' => $this->user->id,
    ]);

    // Only one variant
    ScheduleVariant::factory()->create([
        'project_id' => $project->id,
        'is_hidden' => false,
    ]);

    $response = get(route('projects.show', $project));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->has('scheduleVariants', 1)
    );
});

test('schedule viewer provides task and resource candidate URLs for each variant', function () {
    $project = Project::factory()->create([
        'user_id' => $this->user->id,
    ]);

    $variant = ScheduleVariant::factory()->create([
        'project_id' => $project->id,
        'is_hidden' => false,
        'slug' => 'optimized',
    ]);

    $response = get(route('projects.show', $project));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->has('scheduleVariants.0.taskCandidates')
        ->has('scheduleVariants.0.resCandidates')
        ->where('scheduleVariants.0.slug', 'optimized')
    );
});

test('schedule viewer sets default variant when specified', function () {
    $project = Project::factory()->create([
        'user_id' => $this->user->id,
    ]);

    $variant1 = ScheduleVariant::factory()->create([
        'project_id' => $project->id,
        'is_hidden' => false,
        'slug' => 'baseline',
    ]);

    $variant2 = ScheduleVariant::factory()->create([
        'project_id' => $project->id,
        'is_hidden' => false,
        'slug' => 'optimized',
    ]);

    $response = get(route('projects.show', $project));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->has('scheduleVariants', 2)
        ->where('defaultVariant', 'optimized')
    );
});

test('unauthorized user cannot access schedule viewer', function () {
    $otherUser = User::factory()->create();

    $project = Project::factory()->create([
        'user_id' => $otherUser->id,
    ]);

    ScheduleVariant::factory()->create([
        'project_id' => $project->id,
        'is_hidden' => false,
    ]);

    $response = get(route('projects.show', $project));

    $response->assertForbidden();
});

test('schedule viewer handles multiple variants for comparison across all tabs', function () {
    $project = Project::factory()->create([
        'user_id' => $this->user->id,
    ]);

    // Create multiple variants with different names
    $variants = collect([
        'baseline' => 'Baseline Schedule',
        'optimized' => 'Optimized Schedule',
        'aggressive' => 'Aggressive Schedule',
    ])->map(fn ($name, $slug) => ScheduleVariant::factory()->create([
        'project_id' => $project->id,
        'is_hidden' => false,
        'slug' => $slug,
        'name' => $name,
    ]));

    $response = get(route('projects.show', $project));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->has('scheduleVariants', 3)
        ->where('scheduleVariants.0.slug', 'baseline')
        ->where('scheduleVariants.0.name', 'Baseline Schedule')
        ->where('scheduleVariants.1.slug', 'optimized')
        ->where('scheduleVariants.1.name', 'Optimized Schedule')
        ->where('scheduleVariants.2.slug', 'aggressive')
        ->where('scheduleVariants.2.name', 'Aggressive Schedule')
    );
});

test('schedule viewer page includes project information', function () {
    $project = Project::factory()->create([
        'user_id' => $this->user->id,
        'name' => 'Test Construction Project',
    ]);

    ScheduleVariant::factory()->create([
        'project_id' => $project->id,
        'is_hidden' => false,
    ]);

    $response = get(route('projects.show', $project));

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->where('project.id', $project->id)
        ->where('project.name', 'Test Construction Project')
    );
});
