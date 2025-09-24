import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'

type ConfirmDeleteDialogProps = {
    trigger: React.ReactNode
    href: string
    method?: 'delete' | 'post' | 'put'
    message?: string
    confirmText?: string
    cancelText?: string
}

export default function ConfirmDeleteDialog({
    trigger,
    href,
    method = 'delete',
    message = 'Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan.',
    confirmText = 'Hapus',
    cancelText = 'Batal',
}: ConfirmDeleteDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Konfirmasi Hapus</DialogTitle>
                    <DialogDescription>{message}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">{cancelText}</Button>
                    </DialogClose>
                    <Button asChild variant="destructive">
                        <Link as="button" method={method} href={href} preserveScroll preserveState>
                            {confirmText}
                        </Link>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
