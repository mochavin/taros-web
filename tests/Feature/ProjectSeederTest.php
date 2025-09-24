<?php

use Carbon\Carbon;
use Database\Seeders\ProjectSeeder;
use Illuminate\Support\Facades\DB;

it('creates the TA AMMONIA 2024 project when seeder runs', function () {
    // Run the specific seeder
    $this->seed(ProjectSeeder::class);

    $project = DB::table('projects')->where('name', 'TA AMMONIA 2024')->first();

    expect($project)->not->toBeNull();

    // Normalize any datetime string to Y-m-d before asserting
    expect(Carbon::parse($project->start_date)->format('Y-m-d'))->toBe('2024-06-19');
    expect(Carbon::parse($project->end_date)->format('Y-m-d'))->toBe('2024-07-14');
});
