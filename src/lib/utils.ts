import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Id, TableNames } from '../../convex/_generated/dataModel';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toId<T extends TableNames>(param: string): Id<T> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- route params are strings that must be cast to Convex IDs
  return param as Id<T>;
}
