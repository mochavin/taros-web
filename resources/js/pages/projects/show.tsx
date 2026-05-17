import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import { type BreadcrumbItem } from '@/types';
import { ScheduleViewerComponent } from '@/components/schedule/schedule-viewer-component';
import type { ScheduleVariantOption } from '@/types/schedule';
import { formatIndoDateTime } from '@/lib/schedule-utils';
import { Calendar, Pencil } from 'lucide-react';
import { useEffect } from 'react';

interface ProjectShowData {
    project: {
        id: number;
        name: string;
        start_date: string;
        end_date: string | null;
        start_baseline: string | null;
        processing_status: string | null;
        processing_message: string | null;
        processing_started_at: string | null;
        processing_completed_at: string | null;
        created_at: string;
        updated_at: string;
    };
    scheduleVariants: ScheduleVariantOption[];
    defaultVariant?: string | null;
    hierarchyCandidates: string[];
}

export default function ProjectShow({ project, scheduleVariants, defaultVariant, hierarchyCandidates }: ProjectShowData) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Projects', href: '/projects' },
        { title: project.name, href: `/projects/${project.id}` },
    ];
    const isProcessing = project.processing_status === 'queued' || project.processing_status === 'processing';

    useEffect(() => {
        if (!isProcessing) {
            return;
        }

        const interval = window.setInterval(() => {
            router.reload({
                only: ['project', 'scheduleVariants', 'defaultVariant', 'hierarchyCandidates'],
            });
        }, 5000);

        return () => window.clearInterval(interval);
    }, [isProcessing]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={project.name} />
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                        <Button asChild variant="outline" size="icon" className="h-8 w-8">
                            <Link href={`/projects/${project.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                        <Button asChild variant="secondary">
                            <Link href={`/projects/${project.id}/schedule-variants`}>
                                Schedule Variants
                            </Link>
                        </Button>
                        <ConfirmDeleteDialog
                            trigger={(
                                <Button variant="destructive">
                                    Delete
                                </Button>
                            )}
                            href={`/projects/${project.id}`}
                            message={`Anda akan menghapus project "${project.name}". Ini tidak dapat dibatalkan.`}
                            confirmText="Hapus"
                            cancelText="Batal"
                        />
                    </div>
                </div>

                {project.start_baseline && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">Project Baseline:</span>
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-semibold">
                            {formatIndoDateTime(project.start_baseline)}
                        </span>
                    </div>
                )}

                {project.processing_status && project.processing_status !== 'manual' && (
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">MPP Processing:</span>
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                {project.processing_status}
                            </span>
                            {isProcessing && (
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/projects/${project.id}`}>Refresh</Link>
                                </Button>
                            )}
                        </div>
                        {project.processing_message && (
                            <p className="mt-1 text-muted-foreground">{project.processing_message}</p>
                        )}
                    </div>
                )}

                {/* Schedule viewer component */}
                <div className="rounded-lg dark:border-sidebar-border">
                    {/* <h2 className="text-lg font-medium mb-2">Schedule Viewer</h2>
                    <p className="text-sm text-muted-foreground mb-4">Upload task_schedule.csv and resource_tracking.csv or drop them into the viewer.</p> */}
                    <ScheduleViewerComponent
                        projectId={project.id}
                        variants={scheduleVariants}
                        defaultVariant={defaultVariant}
                        hierarchyCandidates={hierarchyCandidates}
                        startBaseline={project.start_baseline}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
