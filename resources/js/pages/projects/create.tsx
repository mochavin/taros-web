import AppLayout from '@/layouts/app-layout';
import { Form, Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { type BreadcrumbItem } from '@/types';

export default function ProjectCreate() {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Projects', href: '/projects' },
        { title: 'Create', href: '/projects/create' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tambah Project" />
            <div className="p-4">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Tambah Project</h1>
                </div>
                <Form action="/projects" method="post" className="space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Project Name</Label>
                                <Input id="name" name="name" required placeholder="Nama project" />
                                <InputError message={errors.name} />
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="start_date">Tanggal Mulai</Label>
                                    <Input id="start_date" name="start_date" type="date" required />
                                    <InputError message={errors.start_date} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="end_date">Tanggal Selesai</Label>
                                    <Input id="end_date" name="end_date" type="date" />
                                    <InputError message={errors.end_date} />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Button disabled={processing}>Simpan</Button>
                                <Button type="reset" variant="outline">Reset</Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </AppLayout>
    );
}
