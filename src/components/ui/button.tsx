import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
const buttonVariants = cva('button', { variants: { variant: { default: 'button-primary', secondary: 'button-secondary', ghost: 'button-ghost', outline: 'button-outline', danger: 'button-danger' }, size: { default: '', icon: 'button-icon', small: 'button-small' } }, defaultVariants: { variant: 'default', size: 'default' } });
export function Button({ className, variant, size, ...props }: ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return <button className={twMerge(clsx(buttonVariants({ variant, size }), className))} {...props} />;
}
