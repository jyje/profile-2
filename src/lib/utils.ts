import {clsx, type ClassValue} from 'clsx';
import {extendTailwindMerge} from 'tailwind-merge';

// Tailwind 4 prefixes are variants (tw:px-4), not Tailwind 3's tw-px-4.
const merge = extendTailwindMerge({prefix: 'tw'});

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs));
}
