import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/input-error';
import { type BreadcrumbItem } from '@/types';

interface ScheduleVariantEditPayload {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    is_default: boolean;
    task_path?: string | null;
    resource_path?: string | null;
}

interface ScheduleVariantEditProps {
    project: {
        id: number;
        name: string;
    };
    variant: ScheduleVariantEditPayload;
}

export default function ScheduleVariantEdit({ project, variant }: ScheduleVariantEditProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Projects', href: '/projects' },
        { title: project.name, href: `/projects/${project.id}` },
        { title: 'Schedule Variants', href: `/projects/${project.id}/schedule-variants` },
        { title: variant.name, href: `/projects/${project.id}/schedule-variants/${variant.id}/edit` },
    ];

    const form = useForm({
        name: variant.name,
        slug: variant.slug,
        description: variant.description ?? '',
        is_default: variant.is_default,
        task_file: null as File | null,
        resource_file: null as File | null,
    });

    const { data, setData, processing, errors, transform, reset, post } = form;

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        transform((formData) => ({
            ...formData,
            _method: 'put',
        }));

        post(`/projects/${project.id}/schedule-variants/${variant.id}`, {
            preserveScroll: true,
            onFinish: () => {
                transform((formData) => formData);
                setData('task_file', null);
                setData('resource_file', null);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${variant.name}`} />
            <div className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Edit Schedule Variant</h1>
                        <p className="text-sm text-muted-foreground">
                            Perbarui informasi varian schedule untuk project <span className="font-medium">{project.name}</span>.
                        </p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href={`/projects/${project.id}/schedule-variants`}>Kembali</Link>
                    </Button>
                </div>

                <form onSubmit={submit} className="space-y-6" encType="multipart/form-data">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nama</Label>
                            <Input
                                id="name"
                                name="name"
                                value={data.name}
                                onChange={(event) => setData('name', event.target.value)}
                                required
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug</Label>
                            <Input
                                id="slug"
                                name="slug"
                                value={data.slug}
                                onChange={(event) => setData('slug', event.target.value)}
                                required
                            />
                            <InputError message={errors.slug} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Deskripsi</Label>
                        <Textarea
                            id="description"
                            name="description"
                            value={data.description}
                            onChange={(event) => setData('description', event.target.value)}
                        />
                        <InputError message={errors.description} />
                    </div>

                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="is_default"
                            checked={data.is_default}
                            onCheckedChange={(value) => setData('is_default', value === true)}
                        />
                        <Label htmlFor="is_default" className="text-sm">
                            Jadikan varian default
                        </Label>
                    </div>
                    <InputError message={errors.is_default} />

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="task_file">File CSV Tasks</Label>
                            <Input
                                id="task_file"
                                type="file"
                                accept=".csv,.txt"
                                onChange={(event) => setData('task_file', event.target.files?.[0] ?? null)}
                            />
                            {variant.task_path && !data.task_file && (
                                <p className="text-xs text-muted-foreground break-words">
                                    Saat ini: <span className="font-medium">{variant.task_path}</span>
                                </p>
                            )}
                            {data.task_file && (
                                <p className="text-xs text-muted-foreground break-words">Baru: {data.task_file.name}</p>
                            )}
                            <InputError message={errors.task_file} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="resource_file">File CSV Resources</Label>
                            <Input
                                id="resource_file"
                                type="file"
                                accept=".csv,.txt"
                                onChange={(event) => setData('resource_file', event.target.files?.[0] ?? null)}
                            />
                            {variant.resource_path && !data.resource_file && (
                                <p className="text-xs text-muted-foreground break-words">
                                    Saat ini: <span className="font-medium">{variant.resource_path}</span>
                                </p>
                            )}
                            {data.resource_file && (
                                <p className="text-xs text-muted-foreground break-words">Baru: {data.resource_file.name}</p>
                            )}
                            <InputError message={errors.resource_file} />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            Simpan Perubahan
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={processing}
                            onClick={() => reset()}
                        >
                            Reset
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
