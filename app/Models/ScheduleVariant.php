<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleVariant extends Model
{
    /** @use HasFactory<\Database\Factories\ScheduleVariantFactory> */
    use HasFactory;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'project_id',
        'name',
        'slug',
        'description',
        'is_default',
        'task_path',
        'resource_path',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_default' => 'bool',
        ];
    }

    /**
     * Get the project that owns the schedule variant.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return array<int, string>
     */
    public function taskStorageCandidates(): array
    {
        return array_values(array_filter([$this->task_path]));
    }

    /**
     * @return array<int, string>
     */
    public function resourceStorageCandidates(): array
    {
        return array_values(array_filter([$this->resource_path]));
    }
}
