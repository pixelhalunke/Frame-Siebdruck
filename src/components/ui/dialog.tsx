import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { Button } from './button';
export function Modal({ title, description, open, onOpenChange, children, className = '', returnFocusRef }: { title: string; description: string; open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode; className?: string; returnFocusRef?: RefObject<HTMLElement | null> }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className={`dialog ${className}`} onCloseAutoFocus={event => { if (returnFocusRef?.current) { event.preventDefault(); returnFocusRef.current.focus(); } }}><div className="dialog-heading"><Dialog.Title>{title}</Dialog.Title><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Schließen"><X size={20}/></Button></Dialog.Close></div><Dialog.Description>{description}</Dialog.Description>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
