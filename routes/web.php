<?php

use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ScheduleVariantController;
use App\Models\Project;
use App\Models\ScheduleVariant;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::get('projects/{project}/schedule-variants/{scheduleVariant}/task_schedule.csv', [
        ScheduleVariantController::class,
        'taskScheduleCsv',
    ])->name('projects.schedule-variants.tasks');

    Route::get('projects/{project}/schedule-variants/{scheduleVariant}/resource_tracking.csv', [
        ScheduleVariantController::class,
        'resourceTrackingCsv',
    ])->name('projects.schedule-variants.resources');

    Route::get('projects/{project}/hierarchy.csv', function (Project $project) {
        abort_if($project->user_id !== Auth::id(), 403);

        if (! $project->hierarchy_path) {
            abort(404);
        }

        $path = $project->hierarchy_path;

        if (! Storage::disk('local')->exists($path)) {
            abort(404);
        }

        return response()->file(Storage::disk('local')->path($path), ['Content-Type' => 'text/csv']);
    })->name('projects.hierarchy');

    Route::resource('projects', ProjectController::class);
    Route::patch('projects/{project}/visibility', [
        ProjectController::class,
        'updateVisibility',
    ])->name('projects.visibility');
    Route::patch('projects/{project}/schedule-variants/{scheduleVariant}/visibility', [
        ScheduleVariantController::class,
        'updateVisibility',
    ])->name('projects.schedule-variants.visibility');
    Route::resource('projects.schedule-variants', ScheduleVariantController::class)->except(['show']);
});

// Public endpoints for schedule viewer variants backed by persisted configuration
Route::get('schedule-viewer/variant/{scheduleVariant:slug}/task_schedule.csv', function (ScheduleVariant $scheduleVariant) {
    return app(ScheduleVariantController::class)->taskScheduleCsv($scheduleVariant->project, $scheduleVariant);
})->name('schedule-variants.tasks');

Route::get('schedule-viewer/variant/{scheduleVariant:slug}/resource_tracking.csv', function (ScheduleVariant $scheduleVariant) {
    return app(ScheduleVariantController::class)->resourceTrackingCsv($scheduleVariant->project, $scheduleVariant);
})->name('schedule-variants.resources');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
