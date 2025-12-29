import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';

interface ProjectListItem {
    id: number;
    name: string;
    start_date: string;
    end_date: string | null;
    start_baseline: string | null;
}

export default function ProjectsIndex({ projects }: { projects: ProjectListItem[] }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Projects', href: '/projects' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Projects" />
            <div className="flex flex-col gap-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Manajemen Project</h1>
                    <Button asChild>
                        <Link href="/projects/create">Tambah Project</Link>
                    </Button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-100 dark:bg-neutral-800/50">
                            <tr className="text-left">
                                <th className="px-4 py-2">Nama Project</th>
                                <th className="px-4 py-2">Periode</th>
                                <th className="px-4 py-2">Start Baseline</th>
                                <th className="px-4 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                                        Belum ada project.
                                    </td>
                                </tr>
                            )}
                            {projects.map(p => (
                                <tr key={p.id} className="border-t border-neutral-200 dark:border-neutral-700">
                                    <td className="px-4 py-2 font-medium">
                                        <Link href={`/projects/${p.id}`} className="hover:underline text-primary">
                                            {p.name}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2">
                                        {new Date(p.start_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        {' - '}
                                        {p.end_date ? new Date(p.end_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                                    </td>
                                    <td className="px-4 py-2">
                                        {p.start_baseline ? new Date(p.start_baseline).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                                    </td>
                                    <td className="px-4 py-2 text-right space-x-2">
                                        <Button variant="secondary" size="sm" asChild>
                                            <Link href={`/projects/${p.id}`}>
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/projects/${p.id}/edit`}>
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <ConfirmDeleteDialog
                                            trigger={(
                                                <Button variant="destructive" size="sm" asChild>
                                                    <button type="button">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </Button>
                                            )}
                                            href={`/projects/${p.id}`}
                                            message={`Apakah Anda yakin ingin menghapus "${p.name}"? Tindakan ini tidak dapat dibatalkan.`}
                                        />
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
