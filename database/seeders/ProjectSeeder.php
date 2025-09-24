<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\User;
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

        // Create some projects for that user
        Project::factory()->count(10)->for($user)->create();
    }
}
