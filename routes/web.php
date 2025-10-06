<?php

use App\Http\Controllers\ProjectController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    // Serve schedule CSVs from storage/app/private for the schedule viewer
    Route::get('projects/{project}/schedule/task_schedule.csv', function ($project) {
        $file = storage_path('app/private/task_schedule.csv');
        if (! file_exists($file)) {
            abort(404);
        }

        return response()->file($file, ['Content-Type' => 'text/csv']);
    })->name('projects.schedule.tasks');

    Route::get('projects/{project}/schedule/resource_tracking.csv', function ($project) {
        $file = storage_path('app/private/resource_tracking.csv');
        if (! file_exists($file)) {
            abort(404);
        }

        return response()->file($file, ['Content-Type' => 'text/csv']);
    })->name('projects.schedule.resources');

    Route::resource('projects', ProjectController::class);
});

// Public endpoints for schedule viewer variants (safe: only known variants)
Route::get('schedule-viewer/variant/{variant}/task_schedule.csv', function ($variant) {
    $map = [
        // Variants coming from storage/app/private (folders shown in the screenshot)
        'dqn_500_episodes_lag_is_0' => 'dqn 500 episodes lag is 0/task_schedule.csv',
        'dqn_5000_episode' => 'dqn 5000 episode/task_schedule.csv',
        'dqn_no_resource_constraint_500' => 'dqn no resource constraint 500/task_schedule.csv',
        'greedy_w_negatif_lag' => 'greedy w negatif lag/task_schedule.csv',
        'greedy_wo_negatif_lag' => 'greedy wo negatif lag/task_schedule.csv',
        'ppo' => 'PPO 1000 episodes/task_schedule.csv',
        'ppo_no_resource_constraint' => 'PPO wo resource constraint/task_schedule.csv',
        // keep legacy keys for backwards compatibility if present
        'dqn_improve_lag' => 'with_lags/task_schedule_dqn_improve_lag.csv',
        'dqn_no_lag' => 'no_lags/task_schedule_dqn_500_ignore_lag.csv',
        'greedy' => 'no_lags/task_schedule_greedy.csv',
    ];
    if (! array_key_exists($variant, $map)) {
        abort(404);
    }
    $file = storage_path('app/private/'.$map[$variant]);
    if (! file_exists($file)) {
        abort(404);
    }

    return response()->file($file, ['Content-Type' => 'text/csv']);
});

Route::get('schedule-viewer/variant/{variant}/resource_tracking.csv', function ($variant) {
    $map = [
        // Variants coming from storage/app/private (folders shown in the screenshot)
        'dqn_500_episodes_lag_is_0' => 'dqn 500 episodes lag is 0/resource_tracking.csv',
        'dqn_5000_episode' => 'dqn 5000 episode/resource_tracking.csv',
        'dqn_no_resource_constraint_500' => 'dqn no resource constraint 500/resource_tracking.csv',
        'greedy_w_negatif_lag' => 'greedy w negatif lag/resource_tracking.csv',
        'greedy_wo_negatif_lag' => 'greedy wo negatif lag/resource_tracking.csv',
        'ppo' => 'PPO 1000 episodes/resource_tracking.csv',
        'ppo_no_resource_constraint' => 'PPO wo resource constraint/resource_tracking.csv',
        // keep legacy keys for backwards compatibility if present
        'dqn_improve_lag' => 'with_lags/resource_tracking_improve_lag.csv',
        'dqn_no_lag' => 'no_lags/resource_tracking_dqn_500_ignore_lag.csv',
        'greedy' => 'no_lags/resource_tracking_greedy.csv',
    ];
    if (! array_key_exists($variant, $map)) {
        abort(404);
    }
    $file = storage_path('app/private/'.$map[$variant]);
    if (! file_exists($file)) {
        abort(404);
    }

    return response()->file($file, ['Content-Type' => 'text/csv']);
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';