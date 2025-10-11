import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/input-error';
import { type BreadcrumbItem } from '@/types';

interface ScheduleVariantCreateForm {
    name: string;
    slug: string;
    description: string;
    is_default: boolean;
    task_file: File | null;
    resource_file: File | null;
}

interface ScheduleVariantCreateProps {
    project: {
        id: number;
        name: string;
    };
}

export default function ScheduleVariantCreate({ project }: ScheduleVariantCreateProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Projects', href: '/projects' },
        { title: project.name, href: `/projects/${project.id}` },
        { title: 'Schedule Variants', href: `/projects/${project.id}/schedule-variants` },
        { title: 'Create', href: `/projects/${project.id}/schedule-variants/create` },
    ];

    const { data, setData, post, processing, errors, reset } = useForm<ScheduleVariantCreateForm>({
        name: '',
        slug: '',
        description: '',
        is_default: false,
        task_file: null,
        resource_file: null,
    });

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post(`/projects/${project.id}/schedule-variants`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Tambah Schedule Variant · ${project.name}`} />
            <div className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Tambah Schedule Variant</h1>
                        <p className="text-sm text-muted-foreground">
                            Lengkapi informasi varian schedule untuk project <span className="font-medium">{project.name}</span>.
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
                                placeholder="Contoh: DQN (5000 Episode)"
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
                                placeholder="Contoh: dqn_5000_episode"
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
                            placeholder="Informasi tambahan mengenai varian ini"
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
                                required
                            />
                            {data.task_file && (
                                <p className="text-xs text-muted-foreground break-words">{data.task_file.name}</p>
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
                                required
                            />
                            {data.resource_file && (
                                <p className="text-xs text-muted-foreground break-words">{data.resource_file.name}</p>
                            )}
                            <InputError message={errors.resource_file} />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            Simpan
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
