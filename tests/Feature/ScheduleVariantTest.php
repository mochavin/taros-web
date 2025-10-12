<?php

use App\Models\Project;
use App\Models\ScheduleVariant;
use App\Models\User;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\delete;
use function Pest\Laravel\get;
use function Pest\Laravel\patch;
use function Pest\Laravel\post;
use function Pest\Laravel\put;

beforeEach(function (): void {
    /** @var User $user */
    $user = User::factory()->create();

    actingAs($user);

    /** @var Project $project */
    $project = Project::factory()->for($user)->create();

    test()->project = $project;
});

it('lists schedule variants with candidate counts', function (): void {
    /** @var Project $project */
    $project = test()->project;

    $default = ScheduleVariant::factory()
        ->for($project)
        ->create([
            'name' => 'Default Variant',
            'slug' => 'default_variant',
            'is_default' => true,
        ]);

    $secondary = ScheduleVariant::factory()
        ->for($project)
        ->create([
            'name' => 'Secondary',
            'slug' => 'secondary',
            'is_default' => false,
        ]);

    $response = get(route('projects.schedule-variants.index', $project));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('schedule-variants/index')
        ->has('variants', 2)
        ->where('variants.0.id', $default->id)
        ->where('variants.0.isDefault', true)
        ->where('variants.0.taskCandidateCount', 1)
        ->where('variants.0.resourceCandidateCount', 1)
        ->where('variants.0.isHidden', false)
        ->where('variants.0.taskPath', $default->task_path)
        ->where('variants.1.id', $secondary->id)
        ->where('variants.1.isDefault', false)
        ->where('variants.1.taskCandidateCount', 1)
        ->where('variants.1.resourceCandidateCount', 1)
        ->where('variants.1.isHidden', false)
    );
});

it('stores a schedule variant and resets previous default', function (): void {
    Storage::fake('local');

    /** @var Project $project */
    $project = test()->project;

    $existing = ScheduleVariant::factory()
        ->for($project)
        ->create([
            'is_default' => true,
        ]);

    $taskUpload = UploadedFile::fake()->create('task_schedule.csv', 10, 'text/csv');
    $resourceUpload = UploadedFile::fake()->create('resource_tracking.csv', 12, 'text/csv');

    $response = post(route('projects.schedule-variants.store', $project), [
        'name' => 'New Variant',
        'slug' => 'New Variant',
        'description' => 'Test variant',
        'is_default' => true,
        'task_file' => $taskUpload,
        'resource_file' => $resourceUpload,
    ]);

    $response->assertRedirect(route('projects.schedule-variants.index', $project));

    $created = ScheduleVariant::query()
        ->where('project_id', $project->id)
        ->where('slug', 'new_variant')
        ->first();

    expect($created)->not->toBeNull();
    expect($created->is_default)->toBeTrue();

    /** @var FilesystemAdapter $disk */
    $disk = Storage::disk('local');

    $disk->assertExists('private/'.$created->task_path);
    $disk->assertExists('private/'.$created->resource_path);

    expect($existing->fresh()->is_default)->toBeFalse();
});

it('updates a schedule variant, replaces files, and enforces single default', function (): void {
    Storage::fake('local');

    /** @var Project $project */
    $project = test()->project;

    $first = ScheduleVariant::factory()
        ->for($project)
        ->create([
            'slug' => 'first',
            'is_default' => true,
        ]);

    $second = ScheduleVariant::factory()
        ->for($project)
        ->create([
            'slug' => 'second',
            'is_default' => false,
        ]);

    $originalTaskPath = $second->task_path;
    $originalResourcePath = $second->resource_path;

    Storage::disk('local')->put('private/'.$originalTaskPath, 'old tasks');
    Storage::disk('local')->put('private/'.$originalResourcePath, 'old resources');

    $taskUpload = UploadedFile::fake()->create('task_schedule.csv', 15, 'text/csv');
    $resourceUpload = UploadedFile::fake()->create('resource_tracking.csv', 18, 'text/csv');

    $response = put(route('projects.schedule-variants.update', [$project, $second]), [
        'name' => 'Second Updated',
        'slug' => 'second-updated',
        'description' => '',
        'is_default' => true,
        'task_file' => $taskUpload,
        'resource_file' => $resourceUpload,
    ]);

    $response->assertRedirect(route('projects.schedule-variants.index', $project));

    $updated = $second->fresh();

    expect($updated->slug)->toBe('second_updated');
    expect($updated->is_default)->toBeTrue();
    expect($first->fresh()->is_default)->toBeFalse();

    /** @var FilesystemAdapter $disk */
    $disk = Storage::disk('local');

    $disk->assertMissing('private/'.$originalTaskPath);
    $disk->assertMissing('private/'.$originalResourcePath);

    $disk->assertExists('private/'.$updated->task_path);
    $disk->assertExists('private/'.$updated->resource_path);
});

it('allows updating a schedule variant without changing its slug', function (): void {
    Storage::fake('local');

    /** @var Project $project */
    $project = test()->project;

    $variant = ScheduleVariant::factory()
        ->for($project)
        ->create([
            'slug' => 'unchanged_slug',
            'is_default' => false,
        ]);

    Storage::disk('local')->put('private/'.$variant->task_path, 'tasks content');
    Storage::disk('local')->put('private/'.$variant->resource_path, 'resources content');

    $response = put(route('projects.schedule-variants.update', [$project, $variant]), [
        'name' => 'Updated Label',
        'slug' => 'unchanged_slug',
        'description' => $variant->description ?? '',
        'is_default' => false,
    ]);

    $response->assertRedirect(route('projects.schedule-variants.index', $project));
    $response->assertSessionHasNoErrors();

    $refreshed = $variant->fresh();

    expect($refreshed->slug)->toBe('unchanged_slug');
    expect($refreshed->name)->toBe('Updated Label');
});

it('deletes a schedule variant, cleans stored files, and assigns fallback default', function (): void {
    Storage::fake('local');

    /** @var Project $project */
    $project = test()->project;

    $primary = ScheduleVariant::factory()
        ->for($project)
        ->create([
            'slug' => 'primary',
            'is_default' => true,
        ]);

    $secondary = ScheduleVariant::factory()
        ->for($project)
        ->create([
            'slug' => 'secondary',
            'is_default' => false,
        ]);

    Storage::disk('local')->put('private/'.$primary->task_path, 'task');
    Storage::disk('local')->put('private/'.$primary->resource_path, 'resource');

    $response = delete(route('projects.schedule-variants.destroy', [$project, $primary]));

    $response->assertRedirect(route('projects.schedule-variants.index', $project));

    expect(ScheduleVariant::query()->whereKey($primary->id)->exists())->toBeFalse();
    expect($secondary->fresh()->is_default)->toBeTrue();

    /** @var FilesystemAdapter $disk */
    $disk = Storage::disk('local');

    $disk->assertMissing('private/'.$primary->task_path);
    $disk->assertMissing('private/'.$primary->resource_path);
});

it('updates schedule variant visibility through dedicated endpoint', function (): void {
    /** @var Project $project */
    $project = test()->project;

    $variant = ScheduleVariant::factory()
        ->for($project)
        ->create([
            'is_hidden' => false,
        ]);

    $response = patch(route('projects.schedule-variants.visibility', [$project, $variant]), [
        'is_hidden' => true,
    ]);

    $response->assertRedirect();
    expect($variant->fresh()->is_hidden)->toBeTrue();

    $response = patch(route('projects.schedule-variants.visibility', [$project, $variant]), [
        'is_hidden' => false,
    ]);

    $response->assertRedirect();
    expect($variant->fresh()->is_hidden)->toBeFalse();
});

it('prevents hiding the default variant through visibility endpoint', function (): void {
    /** @var Project $project */
    $project = test()->project;

    $default = ScheduleVariant::factory()
        ->for($project)
        ->create([
            'is_default' => true,
            'is_hidden' => false,
        ]);

    $response = patch(route('projects.schedule-variants.visibility', [$project, $default]), [
        'is_hidden' => true,
    ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors('is_hidden');
    expect($default->fresh()->is_hidden)->toBeFalse();
});

it('excludes hidden variants from project show payload', function (): void {
    /** @var Project $project */
    $project = test()->project;

    $visible = ScheduleVariant::factory()
        ->for($project)
        ->create([
            'is_default' => true,
            'is_hidden' => false,
        ]);

    ScheduleVariant::factory()
        ->for($project)
        ->create([
            'is_default' => false,
            'is_hidden' => true,
        ]);

    $response = get(route('projects.show', $project));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('projects/show')
        ->has('scheduleVariants', 1)
        ->where('scheduleVariants.0.id', $visible->id)
        ->where('scheduleVariants.0.isHidden', false)
        ->where('defaultVariant', $visible->slug)
    );
});

it('serves task schedule csv through public endpoint', function (): void {
    Storage::fake('local');

    $variant = ScheduleVariant::factory()->create([
        'slug' => 'dqn_variant',
    ]);

    Storage::disk('local')->put('private/'.$variant->task_path, 'TaskID,TaskName');

    $response = get(route('schedule-variants.tasks', ['scheduleVariant' => $variant->slug]));

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('text/csv');
    /** @var BinaryFileResponse $binary */
    $binary = $response->baseResponse;
    expect($binary)->toBeInstanceOf(BinaryFileResponse::class);
    expect($binary->getFile()->getFilename())->toBe('task_schedule.csv');
});

it('returns 404 when file is missing', function (): void {
    Storage::fake('local');

    $variant = ScheduleVariant::factory()->create([
        'slug' => 'missing',
    ]);

    get(route('schedule-variants.tasks', ['scheduleVariant' => $variant->slug]))->assertNotFound();
});
