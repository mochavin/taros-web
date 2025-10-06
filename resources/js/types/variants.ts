import type { Variants } from './schedule';

export const VARIANTS: Variants = {
    DQN: {
        // maps to storage/app/private/dqn 5000 episode
        tasksCandidates: [
            '/schedule-viewer/variant/dqn_5000_episode/task_schedule.csv',
            '/storage/app/private/dqn 5000 episode/task_schedule.csv',
            'task_schedule_dqn_5000_episode.csv',
            'task_schedule.csv',
        ],
        resCandidates: [
            '/schedule-viewer/variant/dqn_5000_episode/resource_tracking.csv',
            '/storage/app/private/dqn 5000 episode/resource_tracking.csv',
            'resource_tracking_dqn_5000_episode.csv',
            'resource_tracking.csv',
        ],
    },
    DQN_no_lag: {
        // maps to storage/app/private/dqn 500 episodes lag is 0
        tasksCandidates: [
            '/schedule-viewer/variant/dqn_500_episodes_lag_is_0/task_schedule.csv',
            '/storage/app/private/dqn 500 episodes lag is 0/task_schedule.csv',
            'task_schedule_dqn_500_episodes_lag_is_0.csv',
            'task_schedule.csv',
        ],
        resCandidates: [
            '/schedule-viewer/variant/dqn_500_episodes_lag_is_0/resource_tracking.csv',
            '/storage/app/private/dqn 500 episodes lag is 0/resource_tracking.csv',
            'resource_tracking_dqn_500_episodes_lag_is_0.csv',
            'resource_tracking.csv',
        ],
    },
    DQN_no_resource_constraint: {
        // maps to storage/app/private/dqn no resource constraint 500
        tasksCandidates: [
            '/schedule-viewer/variant/dqn_no_resource_constraint_500/task_schedule.csv',
            '/storage/app/private/dqn no resource constraint 500/task_schedule.csv',
            'task_schedule_dqn_no_resource_constraint_500.csv',
            'task_schedule.csv',
        ],
        resCandidates: [
            '/schedule-viewer/variant/dqn_no_resource_constraint_500/resource_tracking.csv',
            '/storage/app/private/dqn no resource constraint 500/resource_tracking.csv',
            'resource_tracking_dqn_no_resource_constraint_500.csv',
            'resource_tracking.csv',
        ],
    },
    greedy_with_negative_lag: {
        // maps to storage/app/private/greedy w negatif lag
        tasksCandidates: [
            '/schedule-viewer/variant/greedy_w_negatif_lag/task_schedule.csv',
            '/storage/app/private/greedy w negatif lag/task_schedule.csv',
            'task_schedule_greedy_w_negatif_lag.csv',
            'task_schedule.csv',
        ],
        resCandidates: [
            '/schedule-viewer/variant/greedy_w_negatif_lag/resource_tracking.csv',
            '/storage/app/private/greedy w negatif lag/resource_tracking.csv',
            'resource_tracking_greedy_w_negatif_lag.csv',
            'resource_tracking.csv',
        ],
    },
    greedy_wo_negative_lag: {
        // maps to storage/app/private/greedy wo negatif lag
        tasksCandidates: [
            '/schedule-viewer/variant/greedy_wo_negatif_lag/task_schedule.csv',
            '/storage/app/private/greedy wo negatif lag/task_schedule.csv',
            'task_schedule_greedy_wo_negatif_lag.csv',
            'task_schedule.csv',
        ],
        resCandidates: [
            '/schedule-viewer/variant/greedy_wo_negatif_lag/resource_tracking.csv',
            '/storage/app/private/greedy wo negatif lag/resource_tracking.csv',
            'resource_tracking_greedy_wo_negatif_lag.csv',
            'resource_tracking.csv',
        ],
    },
    PPO: {
        // maps to storage/app/private/PPO
        tasksCandidates: [
            '/schedule-viewer/variant/ppo/task_schedule.csv',
            '/storage/app/private/PPO 1000 episodes/task_schedule.csv',
            'task_schedule_ppo.csv',
            'task_schedule.csv',
        ],
        resCandidates: [
            '/schedule-viewer/variant/ppo/resource_tracking.csv',
            '/storage/app/private/PPO 1000 episodes/resource_tracking.csv',
            'resource_tracking_ppo.csv',
            'resource_tracking.csv',
        ],
    },
    PPO_no_resource_constraint: {
        // maps to storage/app/private/PPO wo resource constraint
        tasksCandidates: [
            '/schedule-viewer/variant/ppo_no_resource_constraint/task_schedule.csv',
            '/storage/app/private/PPO wo resource constraint/task_schedule.csv',
            'task_schedule_ppo_no_resource_constraint.csv',
            'task_schedule.csv',
        ],
        resCandidates: [
            '/schedule-viewer/variant/ppo_no_resource_constraint/resource_tracking.csv',
            '/storage/app/private/PPO wo resource constraint/resource_tracking.csv',
            'resource_tracking_ppo_no_resource_constraint.csv',
            'resource_tracking.csv',
        ]
    },
};

export const DEFAULT_VARIANT = 'DQN';