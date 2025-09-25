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

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
