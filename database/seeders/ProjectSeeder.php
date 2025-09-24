<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Ensure there is at least one user to associate projects with
        $user = User::firstWhere('email', 'test@example.com') ?: User::factory()->create();

        // Add the specific project requested by the user.
        // Use firstOrCreate so running the seeder multiple times won't duplicate it.
        Project::firstOrCreate([
            'name' => 'TA AMMONIA 2024',
            'user_id' => $user->id,
        ], [
            // The projects table uses `date` columns; times will be truncated.
            'start_date' => Carbon::parse('2024-06-19 00:00:00')->format('Y-m-d'),
            'end_date' => Carbon::parse('2024-07-14 01:00:00')->format('Y-m-d'),
        ]);

        // Create some projects for that user
        Project::factory()->count(2)->for($user)->create();

    }
}
