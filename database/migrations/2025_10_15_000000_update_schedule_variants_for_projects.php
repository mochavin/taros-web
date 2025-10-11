<?php

use App\Models\Project;
use App\Models\ScheduleVariant;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('schedule_variants', function (Blueprint $table) {
            $table->foreignIdFor(Project::class)
                ->nullable()
                ->constrained()
                ->cascadeOnDelete()
                ->after('id');
            $table->string('task_path')->nullable()->after('is_default');
            $table->string('resource_path')->nullable()->after('task_path');
        });

        ScheduleVariant::query()->each(function (ScheduleVariant $variant) {
            $variant->forceFill([
                'task_path' => is_array($variant->task_paths) ? ($variant->task_paths[0] ?? null) : null,
                'resource_path' => is_array($variant->resource_paths) ? ($variant->resource_paths[0] ?? null) : null,
            ])->save();
        });

        Schema::table('schedule_variants', function (Blueprint $table) {
            $table->dropColumn('task_paths');
            $table->dropColumn('resource_paths');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schedule_variants', function (Blueprint $table) {
            $table->json('task_paths')->nullable()->after('is_default');
            $table->json('resource_paths')->nullable()->after('task_paths');
        });

        ScheduleVariant::query()->each(function (ScheduleVariant $variant) {
            $task = $variant->task_path ? [$variant->task_path] : [];
            $resource = $variant->resource_path ? [$variant->resource_path] : [];

            $variant->forceFill([
                'task_paths' => $task,
                'resource_paths' => $resource,
            ])->save();
        });

        Schema::table('schedule_variants', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_id');
            $table->dropColumn('task_path');
            $table->dropColumn('resource_path');
        });
    }
};
