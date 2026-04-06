import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, EyeOff, Filter, Pencil, Search, Trash2 } from 'lucide-react';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';

interface ProjectListItem {
    id: number;
    name: string;
    start_date: string;
    end_date: string | null;
    start_baseline: string | null;
    is_hidden: boolean;
}

export default function ProjectsIndex({ projects }: { projects: ProjectListItem[] }) {
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('visible');
    const [visibilityDialogProject, setVisibilityDialogProject] = useState<ProjectListItem | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Projects', href: '/projects' },
    ];

    const filteredProjects = useMemo(() => {
        return projects.filter((project) => {
            const matchesSearch =
                searchQuery.trim() === '' ||
                project.name.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesVisibility =
                visibilityFilter === 'all' ||
                (visibilityFilter === 'visible' && !project.is_hidden) ||
                (visibilityFilter === 'hidden' && project.is_hidden);

            return matchesSearch && matchesVisibility;
        });
    }, [projects, searchQuery, visibilityFilter]);

    const handleToggleVisibility = (project: ProjectListItem) => {
        router.patch(
            `/projects/${project.id}/visibility`,
            { is_hidden: !project.is_hidden },
            {
                preserveScroll: true,
                onStart: () => setProcessingId(project.id),
                onFinish: () => {
                    setProcessingId(null);
                    setVisibilityDialogProject(null);
                },
            },
        );
    };

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
                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Cari nama project..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="flex items-center gap-2 sm:w-auto">
                        <Filter className="hidden h-4 w-4 text-muted-foreground sm:block" />
                        <Select value={visibilityFilter} onValueChange={(value: 'all' | 'visible' | 'hidden') => setVisibilityFilter(value)}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="visible">Ditampilkan</SelectItem>
                                <SelectItem value="hidden">Disembunyikan</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {(searchQuery || visibilityFilter !== 'visible') && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Menampilkan {filteredProjects.length} dari {projects.length} project</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearchQuery('');
                                setVisibilityFilter('visible');
                            }}
                            className="h-auto p-0 text-xs underline hover:no-underline"
                        >
                            Reset filter
                        </Button>
                    </div>
                )}
                <div className="overflow-x-auto rounded-lg border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-100 dark:bg-neutral-800/50">
                            <tr className="text-left">
                                <th className="px-4 py-2">Nama Project</th>
                                {/* <th className="px-4 py-2">Status</th> */}
                                <th className="px-4 py-2">Periode</th>
                                <th className="px-4 py-2">Start Baseline</th>
                                <th className="px-4 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                                        Belum ada project.
                                    </td>
                                </tr>
                            )}
                            {projects.length > 0 && filteredProjects.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                                        Tidak ada project yang cocok dengan filter saat ini.
                                    </td>
                                </tr>
                            )}
                            {filteredProjects.map(p => (
                                <tr key={p.id} className="border-t border-neutral-200 dark:border-neutral-700">
                                    <td className="px-4 py-2 font-medium">
                                        <Link href={`/projects/${p.id}`} className="hover:underline text-primary">
                                            {p.name}
                                        </Link>
                                    </td>
                                    {/* <td className="px-4 py-2">
                                        {p.is_hidden ? (
                                            <Badge variant="outline" className="border-destructive/60 text-destructive">
                                                <EyeOff className="h-3 w-3" />
                                                Disembunyikan
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="border-emerald-500/60 text-emerald-600 dark:text-emerald-300">
                                                <Eye className="h-3 w-3" />
                                                Ditampilkan
                                            </Badge>
                                        )}
                                    </td> */}
                                    <td className="px-4 py-2">
                                        {new Date(p.start_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        {' - '}
                                        {p.end_date ? new Date(p.end_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                                    </td>
                                    <td className="px-4 py-2">
                                        {p.start_baseline ? new Date(p.start_baseline).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                                    </td>
                                    <td className="px-4 py-2 text-right space-x-2">
                                        {/* <Button variant="secondary" size="sm" asChild>
                                            <Link href={`/projects/${p.id}`}>
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                        </Button> */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setVisibilityDialogProject(p)}
                                            disabled={processingId === p.id}
                                            title={p.is_hidden ? 'Tampilkan project' : 'Sembunyikan project'}
                                        >
                                            {p.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
            <Dialog
                open={visibilityDialogProject !== null}
                onOpenChange={(open) => {
                    if (!open && processingId === null) {
                        setVisibilityDialogProject(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {visibilityDialogProject?.is_hidden ? 'Konfirmasi Tampilkan Project' : 'Konfirmasi Sembunyikan Project'}
                        </DialogTitle>
                        <DialogDescription>
                            {visibilityDialogProject
                                ? visibilityDialogProject.is_hidden
                                    ? `Project "${visibilityDialogProject.name}" akan ditampilkan kembali di daftar project aktif.`
                                    : `Project "${visibilityDialogProject.name}" akan disembunyikan dari daftar project aktif.`
                                : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setVisibilityDialogProject(null)}
                            disabled={processingId !== null}
                        >
                            Batal
                        </Button>
                        <Button
                            variant='default'
                            onClick={() => {
                                if (visibilityDialogProject) {
                                    handleToggleVisibility(visibilityDialogProject);
                                }
                            }}
                            disabled={processingId !== null || visibilityDialogProject === null}
                        >
                            {visibilityDialogProject?.is_hidden ? 'Tampilkan' : 'Sembunyikan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
