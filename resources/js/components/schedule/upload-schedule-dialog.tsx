import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import React from 'react';

interface UploadScheduleDialogProps {
    onTaskFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onResourceFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UploadScheduleDialog({
    onTaskFileChange,
    onResourceFileChange,
}: UploadScheduleDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2">
                    <Upload className="h-4 w-4" />
                    Upload CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Upload Schedule Data</DialogTitle>
                    <DialogDescription>
                        Upload your task and resource CSV files to view or compare schedules.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="fileTasks">Tasks CSV</Label>
                        <Input
                            id="fileTasks"
                            type="file"
                            accept=".csv"
                            onChange={onTaskFileChange}
                            className="cursor-pointer"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Required: TaskID, TaskName, Start, Finish
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="fileRes">Resources CSV</Label>
                        <Input
                            id="fileRes"
                            type="file"
                            accept=".csv"
                            onChange={onResourceFileChange}
                            className="cursor-pointer"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Required: ResourceID, TaskID, SegmentStart, SegmentEnd
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button">
                            Selesai
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
