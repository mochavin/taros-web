import { cn } from '@/lib/utils';

interface CompareFilterSwitchProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    differenceCount: number;
    title?: string;
    description?: string;
    className?: string;
}

export function CompareFilterSwitch({
    checked,
    onCheckedChange,
    differenceCount,
    title = 'Filter tasks with different schedule time',
    description = 'Comparing Start and Finish across the two selected variants after baseline alignment.',
    className,
}: CompareFilterSwitchProps) {
    const differenceLabel = `${differenceCount} different task${differenceCount === 1 ? '' : 's'}`;
    const stateLabel = checked
        ? 'Different schedule only'
        : 'Show all tasks';

    return (
        <div
            className={cn(
                'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 p-3',
                className,
            )}
        >
            <div className="space-y-1">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
                {differenceLabel}
                <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    aria-label={title}
                    onClick={() => onCheckedChange(!checked)}
                    className={cn(
                        'inline-flex items-center gap-3 rounded-full px-2 py-1.5 transition-colors outline-none',
                    )}
                >
                    <span
                        className={cn(
                            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                            checked
                                ? 'bg-primary'
                                : 'bg-muted-foreground/20',
                        )}
                    >
                        <span
                            className={cn(
                                'inline-block h-5 w-5 rounded-full bg-background shadow-sm transition-transform',
                                checked
                                    ? 'translate-x-5'
                                    : 'translate-x-0.5',
                            )}
                        >
                        </span>
                    </span>
                </button>
            </div>
        </div>
    );
}
