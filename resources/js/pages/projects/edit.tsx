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
        start_baseline: string | null;
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
                <Form action={`/projects/${project.id}`} method="post" encType="multipart/form-data" className="space-y-6" data-test="edit-project-form">
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
                            <div className="grid gap-2">
                                <Label htmlFor="start_baseline">Start Baseline (Optional)</Label>
                                <Input id="start_baseline" name="start_baseline" type="datetime-local" defaultValue={project.start_baseline ?? ''} />
                                <p className="text-xs text-muted-foreground">Baseline awal untuk Gantt Chart.</p>
                                <InputError message={errors.start_baseline} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="hierarchy_file">MPP / Hierarchy File</Label>
                                <Input id="hierarchy_file" name="hierarchy_file" type="file" accept=".mpp,.csv,text/csv" />
                                <p className="text-xs text-muted-foreground">Kosongkan jika tidak ingin mengganti file. Unggah .mpp untuk memproses ulang, atau CSV untuk memperbarui hierarchy manual.</p>
                                <InputError message={errors.hierarchy_file} />
                            </div>
                            <fieldset className="space-y-3">
                                <div>
                                    <legend className="text-sm font-medium">Training Options</legend>
                                    <p className="text-xs text-muted-foreground">Tanpa pilihan training, jadwal asli dari MPP menjadi varian default.</p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input name="train_non_rl" type="checkbox" value="1" className="size-4 rounded border-input" />
                                        <span>Non-RL</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input name="train_dqn" type="checkbox" value="1" className="size-4 rounded border-input" />
                                        <span>DQN</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input name="train_ppo" type="checkbox" value="1" className="size-4 rounded border-input" />
                                        <span>PPO</span>
                                    </label>
                                </div>
                                <InputError message={errors.train_non_rl} />
                                <InputError message={errors.train_dqn} />
                                <InputError message={errors.train_ppo} />
                            </fieldset>
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
