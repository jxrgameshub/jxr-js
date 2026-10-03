/**
 * cn — merge conditional class names and resolve Tailwind conflicts.
 *
 * Uses `clsx` for conditional composition and `tailwind-merge` so later
 * utility classes win over earlier ones (e.g. `p-2` + `p-4` → `p-4`).
 * Both are resolved through the JXR import map, so no install is required.
 */
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type ClassValue =
  | string
  | number
  | null
  | boolean
  | undefined
  | ClassValue[]
  | Record<string, boolean>;

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
