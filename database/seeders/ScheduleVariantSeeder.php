<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\ScheduleVariant;
use Illuminate\Database\Seeder;

class ScheduleVariantSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $defaultProject = Project::query()->first();

        if (! $defaultProject) {
            $defaultProject = Project::factory()->create();
        }

        $variants = [
            [
                'name' => 'DQN (5000 Episode)',
                'slug' => 'dqn_5000_episode',
                'description' => 'maps to storage/app/private/dqn 5000 episode',
                'is_default' => true,
            ],
            [
                'name' => 'DQN (500 Episodes Lag 0)',
                'slug' => 'dqn_500_episodes_lag_is_0',
                'description' => 'maps to storage/app/private/dqn 500 episodes lag is 0',
                'is_default' => false,
            ],
            [
                'name' => 'DQN (No Resource Constraint 500)',
                'slug' => 'dqn_no_resource_constraint_500',
                'description' => 'maps to storage/app/private/dqn no resource constraint 500',
                'is_default' => false,
            ],
            [
                'name' => 'Greedy (With Negatif Lag)',
                'slug' => 'greedy_w_negatif_lag',
                'description' => 'maps to storage/app/private/greedy w negatif lag',
                'is_default' => false,
            ],
            [
                'name' => 'Greedy (Without Negatif Lag)',
                'slug' => 'greedy_wo_negatif_lag',
                'description' => 'maps to storage/app/private/greedy wo negatif lag',
                'is_default' => false,
            ],
            [
                'name' => 'PPO (1000 Episodes)',
                'slug' => 'ppo',
                'description' => 'maps to storage/app/private/PPO 1000 episodes',
                'is_default' => false,
            ],
            [
                'name' => 'PPO (Without Resource Constraint)',
                'slug' => 'ppo_no_resource_constraint',
                'description' => 'maps to storage/app/private/PPO wo resource constraint',
                'is_default' => false,
            ],
            [
                'name' => 'Legacy DQN Improve Lag',
                'slug' => 'dqn_improve_lag',
                'description' => 'legacy mapping for with_lags dataset',
                'is_default' => false,
            ],
            [
                'name' => 'Legacy DQN No Lag',
                'slug' => 'dqn_no_lag',
                'description' => 'legacy mapping for dqn no lag dataset',
                'is_default' => false,
            ],
            [
                'name' => 'Legacy Greedy',
                'slug' => 'greedy',
                'description' => 'legacy mapping for greedy dataset',
                'is_default' => false,
            ],
        ];

        foreach ($variants as $variant) {
            ScheduleVariant::updateOrCreate(
                [
                    'slug' => $variant['slug'],
                    'project_id' => $defaultProject->id,
                ],
                array_merge($variant, [
                    'project_id' => $defaultProject->id,
                    'task_path' => $this->buildPath($defaultProject, $variant['slug'], 'task_schedule.csv'),
                    'resource_path' => $this->buildPath($defaultProject, $variant['slug'], 'resource_tracking.csv'),
                ])
            );
        }
    }

    protected function buildPath(Project $project, string $slug, string $filename): string
    {
        return sprintf('projects/%s/schedule-variants/%s/%s', $project->getKey(), $slug, $filename);
    }
}
