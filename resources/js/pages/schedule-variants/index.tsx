import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import { type BreadcrumbItem } from '@/types';
interface ScheduleVariantIndexItem {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    isDefault: boolean;
    isHidden: boolean;
    taskPath?: string | null;
    resourcePath?: string | null;
    taskCandidateCount: number;
    resourceCandidateCount: number;
}

interface ScheduleVariantIndexProps {
    project: {
        id: number;
        name: string;
    };
    variants: ScheduleVariantIndexItem[];
}

export default function ScheduleVariantIndex({ project, variants }: ScheduleVariantIndexProps) {
    const [processingId, setProcessingId] = useState<number | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Projects', href: '/projects' },
        { title: project.name, href: `/projects/${project.id}` },
        { title: 'Schedule Variants', href: `/projects/${project.id}/schedule-variants` },
    ];

    const handleToggleVisibility = (variant: ScheduleVariantIndexItem) => {
        const nextHidden = !variant.isHidden;

        router.patch(
            `/projects/${project.id}/schedule-variants/${variant.id}/visibility`,
            { is_hidden: nextHidden },
            {
                preserveScroll: true,
                onStart: () => setProcessingId(variant.id),
                onFinish: () => setProcessingId(null),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Schedule Variants · ${project.name}`} />
            <div className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Schedule Variants</h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola daftar varian schedule untuk project <span className="font-medium">{project.name}</span>.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={`/projects/${project.id}/schedule-variants/create`}>Tambah Varian</Link>
                    </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-100 dark:bg-neutral-800/50">
                            <tr className="text-left">
                                <th className="px-4 py-2">Nama</th>
                                {/* <th className="px-4 py-2">Slug</th>
                                <th className="px-4 py-2">Task Path</th>
                                <th className="px-4 py-2">Resource Path</th> */}
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {variants.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                                        Belum ada varian schedule.
                                    </td>
                                </tr>
                            )}
                            {variants.map((variant) => (
                                <tr key={variant.id} className="border-t border-neutral-200 dark:border-neutral-700">
                                    <td className="px-4 py-2 font-medium">
                                        <div className="flex items-center gap-2">
                                            <span>{variant.name}</span>
                                            {variant.isDefault && <Badge variant="secondary">Default</Badge>}
                                        </div>
                                        {variant.description && (
                                            <p className="text-sm text-muted-foreground mt-1">{variant.description}</p>
                                        )}
                                    </td>
                                    {/* <td className="px-4 py-2">
                                        <code className="rounded bg-muted px-2 py-0.5 text-xs">{variant.slug}</code>
                                    </td>
                                    <td className="px-4 py-2 text-muted-foreground">
                                        {variant.taskPath ?? <span className="italic text-muted-foreground">-</span>}
                                    </td>
                                    <td className="px-4 py-2 text-muted-foreground">
                                        {variant.resourcePath ?? <span className="italic text-muted-foreground">-</span>}
                                    </td> */}
                                    <td className="px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            {variant.isHidden ? (
                                                <Badge variant="outline" className="border-destructive/60 text-destructive">
                                                    Disembunyikan
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-emerald-600 border-emerald-500/60 dark:text-emerald-300">
                                                    Ditampilkan
                                                </Badge>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleToggleVisibility(variant)}
                                                disabled={processingId === variant.id || variant.isDefault}
                                            >
                                                {variant.isHidden ? 'Tampilkan' : 'Sembunyikan'}
                                            </Button>
                                            <Button asChild size="sm" variant="outline">
                                                <Link href={`/projects/${project.id}/schedule-variants/${variant.id}/edit`}>Edit</Link>
                                            </Button>
                                            <ConfirmDeleteDialog
                                                trigger={(
                                                    <Button asChild size="sm" variant="destructive">
                                                        <button type="button">Hapus</button>
                                                    </Button>
                                                )}
                                                href={`/projects/${project.id}/schedule-variants/${variant.id}`}
                                                message={`Anda akan menghapus varian "${variant.name}". Tindakan ini tidak dapat dibatalkan.`}
                                                confirmText="Hapus"
                                                cancelText="Batal"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
