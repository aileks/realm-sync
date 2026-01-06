import { cn } from '@/lib/utils';

type MothIconProps = {
  className?: string;
};

export function MothIcon({ className }: MothIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn('text-amber-400', className)}>
      <g className="origin-center">
        <path
          d="M12 4C10 4 8.5 6 8 8C7 9.5 4 10 3 12C4 14 7 14.5 8 16C8.5 18 10 20 12 20C14 20 15.5 18 16 16C17 14.5 20 14 21 12C20 10 17 9.5 16 8C15.5 6 14 4 12 4Z"
          fill="currentColor"
          fillOpacity="0.3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 6C11 6 10 7.5 9.5 9C9 10 7 10.5 6 12C7 13.5 9 14 9.5 15C10 16.5 11 18 12 18C13 18 14 16.5 14.5 15C15 14 17 13.5 18 12C17 10.5 15 10 14.5 9C14 7.5 13 6 12 6Z"
          fill="currentColor"
          fillOpacity="0.5"
        />
        <circle cx="10" cy="11" r="1" fill="currentColor" />
        <circle cx="14" cy="11" r="1" fill="currentColor" />
        <path d="M10 7C9 5 8 4 7 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path
          d="M14 7C15 5 16 4 17 3"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <ellipse cx="12" cy="12" rx="2" ry="4" fill="currentColor" fillOpacity="0.7" />
      </g>
    </svg>
  );
}
