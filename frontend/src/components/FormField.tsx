import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Eye, EyeOff } from 'lucide-react';

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; icon: LucideIcon };

/** Ô nhập có nhãn và icon; ô mật khẩu có nút hiện/ẩn */
export default function FormField({ label, icon: Icon, type = 'text', ...rest }: Props) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <label className="block">
      <span className="block mb-1.5 text-sm font-medium text-gray-700">{label}</span>
      <span className="relative block">
        <Icon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          {...rest}
          type={isPassword && show ? 'text' : type}
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-11 text-gray-900 placeholder:text-gray-400 transition focus:border-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </span>
    </label>
  );
}
