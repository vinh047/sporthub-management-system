import { LoaderCircle } from 'lucide-react';

export default function LoadingState({ label = 'Đang tải dữ liệu...' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted">
      <LoaderCircle size={18} aria-hidden="true" className="animate-spin" />
      <span>{label}</span>
    </div>
  );
}
