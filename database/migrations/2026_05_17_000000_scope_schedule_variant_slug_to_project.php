<?php

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
            $table->dropUnique('schedule_variants_slug_unique');
            $table->unique(['project_id', 'slug'], 'schedule_variants_project_id_slug_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schedule_variants', function (Blueprint $table) {
            $table->dropUnique('schedule_variants_project_id_slug_unique');
            $table->unique('slug', 'schedule_variants_slug_unique');
        });
    }
};
