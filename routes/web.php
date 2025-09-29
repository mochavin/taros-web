<?php

use App\Http\Controllers\ProjectController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    // Serve schedule CSVs from storage/app/private for the schedule viewer
    Route::get('projects/{project}/schedule/task_schedule.csv', function ($project) {
        $file = storage_path('app/private/task_schedule.csv');
        if (!file_exists($file)) {
            abort(404);
        }
        return response()->file($file, ['Content-Type' => 'text/csv']);
    })->name('projects.schedule.tasks');

    Route::get('projects/{project}/schedule/resource_tracking.csv', function ($project) {
        $file = storage_path('app/private/resource_tracking.csv');
        if (!file_exists($file)) {
            abort(404);
        }
        return response()->file($file, ['Content-Type' => 'text/csv']);
    })->name('projects.schedule.resources');

    Route::resource('projects', ProjectController::class);
});

// Public endpoints for schedule viewer variants (safe: only known variants)
Route::get('schedule-viewer/variant/{variant}/task_schedule.csv', function ($variant) {
    $map = [
        'dqn_improve_lag' => 'with_lags/task_schedule_dqn_improve_lag.csv',
        'ppo' => 'with_lags/task_schedule_ppo.csv',
        'dqn_no_lag' => 'no_lags/task_schedule_dqn_500_ignore_lag.csv',
        'greedy' => 'no_lags/task_schedule_greedy.csv',
    ];
    if (!array_key_exists($variant, $map)) {
        abort(404);
    }
    $file = storage_path('app/private/' . $map[$variant]);
    if (!file_exists($file)) {
        abort(404);
    }
    return response()->file($file, ['Content-Type' => 'text/csv']);
});

Route::get('schedule-viewer/variant/{variant}/resource_tracking.csv', function ($variant) {
    $map = [
        'dqn_improve_lag' => 'with_lags/resource_tracking_improve_lag.csv',
        'ppo' => 'with_lags/resource_tracking_ppo.csv',
        'dqn_no_lag' => 'no_lags/resource_tracking_dqn_500_ignore_lag.csv',
        'greedy' => 'no_lags/resource_tracking_greedy.csv',
    ];
    if (!array_key_exists($variant, $map)) {
        abort(404);
    }
    $file = storage_path('app/private/' . $map[$variant]);
    if (!file_exists($file)) {
        abort(404);
    }
    return response()->file($file, ['Content-Type' => 'text/csv']);
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
