import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import { type BreadcrumbItem } from '@/types';
import { ScheduleViewerComponent } from '@/components/schedule/schedule-viewer-component';
import type { ScheduleVariantOption } from '@/types/schedule';
import { formatIndoDateTime } from '@/lib/schedule-utils';

interface ProjectShowData {
    project: {
        id: number;
        name: string;
        start_date: string;
        end_date: string | null;
        start_baseline: string | null;
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={project.name} />
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">{project.name}</h1>
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                        <Button asChild variant="secondary">
                            <Link href={`/projects/${project.id}/schedule-variants`}>Schedule Variants</Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={`/projects/${project.id}/edit`}>Edit</Link>
                        </Button>
                        <ConfirmDeleteDialog
                            trigger={(
                                <Button asChild variant="destructive">
                                    <button type="button">Delete</button>
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
                    <div className="rounded-lg border border-sidebar-border/70 p-4 dark:border-sidebar-border bg-muted/30">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Project Baseline:</span>
                            <span>{formatIndoDateTime(project.start_baseline)}</span>
                        </div>
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
