import { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import { type BreadcrumbItem } from '@/types';
import { Download, Eye, EyeOff, FileText, Plus, Pencil, Trash2, Calendar, Search, Filter } from 'lucide-react';
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
    const [searchQuery, setSearchQuery] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Projects', href: '/projects' },
        { title: project.name, href: `/projects/${project.id}` },
        { title: 'Schedule Variants', href: `/projects/${project.id}/schedule-variants` },
    ];

    const buildDownloadUrl = (variantId: number, type: 'task' | 'resource') =>
        `/projects/${project.id}/schedule-variants/${variantId}/${type === 'task' ? 'task_schedule' : 'resource_tracking'}.csv`;

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

    const filteredVariants = useMemo(() => {
        return variants.filter((variant) => {
            // Search filter
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = searchQuery === '' ||
                variant.name.toLowerCase().includes(searchLower) ||
                (variant.description?.toLowerCase().includes(searchLower) ?? false);

            // Visibility filter
            const matchesVisibility =
                visibilityFilter === 'all' ||
                (visibilityFilter === 'visible' && !variant.isHidden) ||
                (visibilityFilter === 'hidden' && variant.isHidden);

            return matchesSearch && matchesVisibility;
        });
    }, [variants, searchQuery, visibilityFilter]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Schedule Variants · ${project.name}`} />
            <div className="p-4 md:p-6 space-y-6">
                {/* Header Section */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Schedule Variants</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Kelola daftar varian schedule untuk project <span className="font-semibold">{project.name}</span>
                        </p>
                    </div>
                    <Button asChild className="w-full sm:w-auto">
                        <Link href={`/projects/${project.id}/schedule-variants/create`}>
                            Tambah Varian
                        </Link>
                    </Button>
                </div>

                {/* Search and Filter Section */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Cari nama atau deskripsi varian..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="flex items-center gap-2 sm:w-auto">
                        <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
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
                {(searchQuery || visibilityFilter !== 'all') && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Menampilkan {filteredVariants.length} dari {variants.length} varian</span>
                        {(searchQuery || visibilityFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery('');
                                    setVisibilityFilter('all');
                                }}
                                className="h-auto p-0 text-xs underline hover:no-underline"
                            >
                                Reset filter
                            </Button>
                        )}
                    </div>
                )}

                {/* Variants List */}
                {variants.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                <FileText className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold text-lg mb-1">Belum ada varian schedule</h3>
                            <p className="text-sm text-muted-foreground mb-4 text-center">
                                Mulai dengan menambahkan varian schedule pertama Anda
                            </p>
                            <Button asChild>
                                <Link href={`/projects/${project.id}/schedule-variants/create`}>
                                    <Plus className="h-4 w-4" />
                                    Tambah Varian
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : filteredVariants.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                <Search className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold text-lg mb-1">Tidak ada hasil ditemukan</h3>
                            <p className="text-sm text-muted-foreground mb-4 text-center">
                                Coba ubah kata kunci pencarian atau filter Anda
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearchQuery('');
                                    setVisibilityFilter('all');
                                }}
                            >
                                Reset Filter
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {filteredVariants.map((variant) => (
                            <Card key={variant.id} className="hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <CardTitle className="text-lg">{variant.name}</CardTitle>
                                                {variant.isDefault && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Default
                                                    </Badge>
                                                )}
                                                {variant.isHidden ? (
                                                    <Badge variant="outline" className="border-destructive/60 text-destructive text-xs">
                                                        <EyeOff className="h-3 w-3 mr-1" />
                                                        Disembunyikan
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/60 dark:text-emerald-300 text-xs">
                                                        <Eye className="h-3 w-3 mr-1" />
                                                        Ditampilkan
                                                    </Badge>
                                                )}
                                            </div>
                                            {variant.description && (
                                                <CardDescription className="mt-2">
                                                    {variant.description}
                                                </CardDescription>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex flex-col gap-3">
                                        {/* Actions */}
                                        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                                            {/* Primary Actions */}
                                            <div className="flex gap-2 flex-wrap">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleToggleVisibility(variant)}
                                                    disabled={processingId === variant.id || variant.isDefault}
                                                    className="flex-1 sm:flex-none"
                                                >
                                                    {variant.isHidden ? (
                                                        <>
                                                            <Eye className="h-4 w-4" />
                                                            Tampilkan
                                                        </>
                                                    ) : (
                                                        <>
                                                            <EyeOff className="h-4 w-4" />
                                                            Sembunyikan
                                                        </>
                                                    )}
                                                </Button>
                                                <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none">
                                                    <Link href={`/projects/${project.id}/schedule-variants/${variant.id}/edit`}>
                                                        <Pencil className="h-4 w-4" />
                                                        Edit
                                                    </Link>
                                                </Button>
                                                <ConfirmDeleteDialog
                                                    trigger={(
                                                        <Button size="sm" variant="destructive" asChild className="flex-1 sm:flex-none">
                                                            <button type="button">
                                                                <Trash2 className="h-4 w-4" />
                                                                Hapus
                                                            </button>
                                                        </Button>
                                                    )}
                                                    href={`/projects/${project.id}/schedule-variants/${variant.id}`}
                                                    message={`Anda akan menghapus varian "${variant.name}". Tindakan ini tidak dapat dibatalkan.`}
                                                    confirmText="Hapus"
                                                    cancelText="Batal"
                                                />
                                            </div>

                                            {/* Download Actions */}
                                            <div className="flex gap-2 flex-wrap sm:ml-auto">
                                                {variant.taskPath ? (
                                                    <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none">
                                                        <a
                                                            href={buildDownloadUrl(variant.id, 'task')}
                                                            download={`${variant.name}_task_schedule.csv`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                            Task
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <Button size="sm" variant="outline" disabled className="flex-1 sm:flex-none">
                                                        <Download className="h-4 w-4" />
                                                        Task
                                                    </Button>
                                                )}
                                                {variant.resourcePath ? (
                                                    <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-none">
                                                        <a
                                                            href={buildDownloadUrl(variant.id, 'resource')}
                                                            download={`${variant.name}_resource_tracking.csv`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                            Resource
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <Button size="sm" variant="outline" disabled className="flex-1 sm:flex-none">
                                                        <Download className="h-4 w-4" />
                                                        Resource
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
