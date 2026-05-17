import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import projects from '@/routes/projects';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Clock3, Folder, Layers, Plus } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

interface DashboardStats {
    totalProjects: number;
    totalVariants: number;
}

interface RecentProject {
    id: number;
    name: string;
    startDate: string | null;
    endDate: string | null;
    scheduleVariantsCount: number;
    pendingRlVariantsCount: number;
    updatedAt: string;
}

interface DashboardProps {
    stats: DashboardStats;
    recentProjects: RecentProject[];
}

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

function formatDate(value: string | null): string {
    if (!value) {
        return '-';
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return '-';
    }

    return dateFormatter.format(parsed);
}

function formatDateTime(value: string): string {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return '-';
    }

    return dateTimeFormatter.format(parsed);
}

export default function Dashboard({ stats, recentProjects }: DashboardProps) {
    const { auth } = usePage<SharedData>().props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-4">
                <section className="rounded-xl border border-sidebar-border/70 bg-gradient-to-br from-primary/10 via-background to-background p-6 dark:border-sidebar-border">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Selamat datang, {auth.user.name}.
                            </p>
                            <h1 className="text-2xl font-semibold tracking-tight">
                                Ringkasan Manajemen Project
                            </h1>
                            <p className="max-w-2xl text-sm text-muted-foreground">
                                Pantau jumlah project dan project yang terakhir
                                diperbarui dalam satu tampilan.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button asChild>
                                <Link href={projects.create()}>
                                    <Plus className="h-4 w-4" />
                                    Tambah Project
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={projects.index()}>
                                    <Folder className="h-4 w-4" />
                                    Lihat Semua
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Total Project</CardDescription>
                            <CardTitle className="text-3xl">
                                {stats.totalProjects}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Folder className="h-4 w-4" />
                                Semua project yang Anda miliki.
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Total Schedule Variant</CardDescription>
                            <CardTitle className="text-3xl">
                                {stats.totalVariants}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Layers className="h-4 w-4" />
                                Seluruh varian jadwal lintas project.
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section>
                    <Card className="overflow-hidden py-0">
                        <CardHeader className="border-b border-sidebar-border/70 py-4 dark:border-sidebar-border">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <CardTitle>Project Terbaru</CardTitle>
                                    <CardDescription>
                                        Daftar project yang terakhir diperbarui.
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={projects.index()}>
                                        Kelola Project
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {recentProjects.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                                    <Folder className="h-6 w-6 text-muted-foreground" />
                                    <p className="font-medium">
                                        Belum ada project.
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Tambahkan project pertama untuk mulai
                                        memantau schedule variant.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/60">
                                            <tr className="text-left text-muted-foreground">
                                                <th className="px-4 py-3 font-medium">
                                                    Project
                                                </th>
                                                <th className="px-4 py-3 font-medium">
                                                    Periode
                                                </th>
                                                <th className="px-4 py-3 font-medium">
                                                    Variant
                                                </th>
                                                <th className="px-4 py-3 font-medium">
                                                    Update Terakhir
                                                </th>
                                                <th className="px-4 py-3 text-right font-medium">
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentProjects.map((project) => (
                                                <tr
                                                    key={project.id}
                                                    className="border-t border-sidebar-border/70 dark:border-sidebar-border"
                                                >
                                                    <td className="px-4 py-3 font-medium">
                                                        <div className="flex flex-col">
                                                            <Link
                                                                href={projects.show(
                                                                    project.id,
                                                                )}
                                                                className="transition-colors hover:text-primary hover:underline"
                                                            >
                                                                {project.name}
                                                            </Link>
                                                            {project.pendingRlVariantsCount >
                                                                0 && (
                                                                <Link
                                                                    href={projects.scheduleVariants.index(
                                                                        project.id,
                                                                    )}
                                                                    className="mt-1 text-xs font-normal text-amber-700 underline-offset-2 hover:underline dark:text-amber-300"
                                                                >
                                                                    {
                                                                        project.pendingRlVariantsCount
                                                                    }{' '}
                                                                    variant RL
                                                                    masih
                                                                    training
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {formatDate(
                                                            project.startDate,
                                                        )}{' '}
                                                        -{' '}
                                                        {formatDate(
                                                            project.endDate,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {project.scheduleVariantsCount}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Clock3 className="h-3.5 w-3.5" />
                                                            {formatDateTime(
                                                                project.updatedAt,
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            asChild
                                                        >
                                                            <Link
                                                                href={projects.show(
                                                                    project.id,
                                                                )}
                                                            >
                                                                Buka
                                                                <ArrowRight className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>
                </div>
        </AppLayout>
    );
}
