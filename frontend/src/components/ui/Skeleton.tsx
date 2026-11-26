import type { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
}

export default function Skeleton({ width, height, className = '', style, ...props }: SkeletonProps) {
  return (
    <div
      {...props}
      aria-hidden="true"
      style={{ width, height, ...style }}
      className={`animate-pulse rounded-control bg-slate-200 ${className}`}
    />
  );
}
