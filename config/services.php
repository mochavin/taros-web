<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'taros_core' => [
        'url' => env('TAROS_CORE_URL', 'http://taros-core:5000'),
        'timeout' => (int) env('TAROS_CORE_TIMEOUT', 21600),
        'include_non_rl' => (bool) env('TAROS_CORE_INCLUDE_NON_RL', false),
        'include_rl' => (bool) env('TAROS_CORE_INCLUDE_RL', false),
        'rl_algorithms' => env('TAROS_CORE_RL_ALGORITHMS', ''),
        'episodes' => (int) env('TAROS_CORE_EPISODES', 320),
        'steps' => (int) env('TAROS_CORE_STEPS', 96),
        'rollouts' => (int) env('TAROS_CORE_ROLLOUTS', 2),
        'diagnostic_samples' => (int) env('TAROS_CORE_DIAGNOSTIC_SAMPLES', 256),
        'log_interval' => (int) env('TAROS_CORE_LOG_INTERVAL', 10),
        'alpha_rank' => (float) env('TAROS_CORE_ALPHA_RANK', 320),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
