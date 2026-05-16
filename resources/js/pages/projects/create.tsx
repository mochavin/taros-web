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
                <Form action="/projects" method="post" encType="multipart/form-data" className="space-y-6">
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
                            <div className="grid gap-2">
                                <Label htmlFor="start_baseline">Start Baseline (Optional)</Label>
                                <Input id="start_baseline" name="start_baseline" type="datetime-local" />
                                <p className="text-xs text-muted-foreground">Baseline awal untuk Gantt Chart.</p>
                                <InputError message={errors.start_baseline} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="hierarchy_file">MPP / Hierarchy File</Label>
                                <Input id="hierarchy_file" name="hierarchy_file" type="file" required accept=".mpp,.csv,text/csv" />
                                <p className="text-xs text-muted-foreground">Unggah .mpp untuk diproses, atau CSV hierarchy untuk input manual.</p>
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
