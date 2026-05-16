<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class TarosCoreClient
{
    public function processMpp(string $path, string $filename, ?string $projectStartDatetime = null): Response
    {
        $url = rtrim((string) config('services.taros_core.url'), '/').'/process';
        $timeout = (int) config('services.taros_core.timeout', 21600);

        return Http::timeout($timeout)
            ->attach('file', fopen($path, 'r'), $filename)
            ->post($url, [
                'include_rl' => config('services.taros_core.include_rl', true) ? '1' : '0',
                'rl_algorithms' => (string) config('services.taros_core.rl_algorithms', 'reinforce'),
                'episodes' => (string) config('services.taros_core.episodes', 320),
                'steps' => (string) config('services.taros_core.steps', 96),
                'rollouts' => (string) config('services.taros_core.rollouts', 2),
                'diagnostic_samples' => (string) config('services.taros_core.diagnostic_samples', 256),
                'log_interval' => (string) config('services.taros_core.log_interval', 10),
                'alpha_rank' => (string) config('services.taros_core.alpha_rank', 320),
                'project_start_datetime' => $projectStartDatetime ?? '2024-06-19 00:00:00',
            ]);
    }
}
