<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->string('source_mpp_path')->nullable()->after('hierarchy_path');
            $table->string('processing_status')->default('manual')->after('source_mpp_path');
            $table->text('processing_message')->nullable()->after('processing_status');
            $table->timestamp('processing_started_at')->nullable()->after('processing_message');
            $table->timestamp('processing_completed_at')->nullable()->after('processing_started_at');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->dropColumn([
                'source_mpp_path',
                'processing_status',
                'processing_message',
                'processing_started_at',
                'processing_completed_at',
            ]);
        });
    }
};
