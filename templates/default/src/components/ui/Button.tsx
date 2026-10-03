import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  /** Render as the child element (Radix Slot composition) instead of a <button>. */
  asChild?: boolean;
}

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'jxr-btn jxr-btn-primary',
  ghost: 'jxr-btn jxr-btn-ghost',
  subtle: 'jxr-btn jxr-btn-subtle',
};

const SIZES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'jxr-btn-sm',
  md: '',
  lg: 'jxr-btn-lg',
};

/**
 * Button — token-styled control built on Radix Slot for polymorphism.
 * Styling lives in styles.css (.jxr-btn*) so the look stays themeable.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', asChild = false, ...props },
  ref
) {
  const Comp: any = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  );
});
