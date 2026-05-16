<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'is_hidden',
        'start_baseline',
        'user_id',
        'hierarchy_path',
        'source_mpp_path',
        'processing_status',
        'processing_message',
        'processing_started_at',
        'processing_completed_at',
    ];

    /**
     * Casts for the model.
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'is_hidden' => 'boolean',
            'start_baseline' => 'datetime',
            'processing_started_at' => 'datetime',
            'processing_completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scheduleVariants(): HasMany
    {
        return $this->hasMany(ScheduleVariant::class);
    }
}
