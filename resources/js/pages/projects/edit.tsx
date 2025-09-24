import AppLayout from '@/layouts/app-layout';
import { Form, Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { type BreadcrumbItem } from '@/types';

interface ProjectFormData {
    project: {
        id: number;
        name: string;
        start_date: string;
        end_date: string | null;
    };
}

export default function ProjectEdit({ project }: ProjectFormData) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Projects', href: '/projects' },
        { title: project.name, href: `/projects/${project.id}` },
        { title: 'Edit', href: `/projects/${project.id}/edit` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${project.name}`} />
            <div className="p-4">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Edit Project</h1>
                </div>
                <Form action={`/projects/${project.id}`} method="post" className="space-y-6" data-test="edit-project-form">
                    {({ processing, errors }) => (
                        <>
                            <input type="hidden" name="_method" value="put" />
                            <div className="grid gap-2">
                                <Label htmlFor="name">Project Name</Label>
                                <Input id="name" name="name" required defaultValue={project.name} />
                                <InputError message={errors.name} />
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="start_date">Tanggal Mulai</Label>
                                    <Input id="start_date" name="start_date" type="date" required defaultValue={project.start_date} />
                                    <InputError message={errors.start_date} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="end_date">Tanggal Selesai</Label>
                                    <Input id="end_date" name="end_date" type="date" defaultValue={project.end_date ?? ''} />
                                    <InputError message={errors.end_date} />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Button disabled={processing}>Update</Button>
                                <Button asChild variant="outline">
                                    <Link href={`/projects/${project.id}`}>Batal</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </AppLayout>
    );
}
