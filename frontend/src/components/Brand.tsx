import { Volleyball } from 'lucide-react';

/** Logo SportHub dùng chung ở mọi trang */
export default function Brand({ size = 'md', light = false }: { size?: 'sm' | 'md' | 'lg'; light?: boolean }) {
  const box = { sm: 'w-8 h-8', md: 'w-9 h-9', lg: 'w-11 h-11' }[size];
  const icon = { sm: 18, md: 20, lg: 24 }[size];
  const text = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' }[size];
  return (
    <span className="flex items-center gap-2">
      <span className={`${box} rounded-xl grid place-items-center shadow-sm ${light ? 'bg-white text-red-700' : 'bg-gradient-to-br from-red-600 to-red-800 text-white'}`}>
        <Volleyball size={icon} strokeWidth={2.2} />
      </span>
      <span className={`${text} font-extrabold tracking-tight ${light ? 'text-white' : 'text-gray-900'}`}>
        Sport<span className={light ? 'text-red-200' : 'text-red-700'}>Hub</span>
      </span>
    </span>
  );
}
