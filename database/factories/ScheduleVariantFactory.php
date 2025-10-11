<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ScheduleVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ScheduleVariant>
 */
class ScheduleVariantFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $slug = str_replace('-', '_', $this->faker->unique()->slug());

        return [
            'project_id' => Project::factory(),
            'name' => ucwords(str_replace('_', ' ', $slug)),
            'slug' => $slug,
            'description' => $this->faker->optional()->sentence(),
            'is_default' => false,
            'task_path' => null,
            'resource_path' => null,
        ];
    }

    public function configure(): static
    {
        return $this
            ->afterMaking(function (ScheduleVariant $variant): void {
                $this->assignPaths($variant);
            })
            ->afterCreating(function (ScheduleVariant $variant): void {
                $this->assignPaths($variant)->save();
            });
    }

    protected function assignPaths(ScheduleVariant $variant): ScheduleVariant
    {
        if (! $variant->project_id) {
            return $variant;
        }

        $variant->task_path ??= sprintf(
            'projects/%s/schedule-variants/%s/task_schedule.csv',
            $variant->project_id,
            $variant->slug,
        );

        $variant->resource_path ??= sprintf(
            'projects/%s/schedule-variants/%s/resource_tracking.csv',
            $variant->project_id,
            $variant->slug,
        );

        return $variant;
    }
}
