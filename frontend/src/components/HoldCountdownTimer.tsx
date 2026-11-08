import { useEffect, useRef, useState } from 'react';

interface HoldCountdownTimerProps {
  expiresAt: string;
  onExpire: () => void;
}

const getRemainingSeconds = (expiresAt: string) => {
  const expiresAtMilliseconds = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMilliseconds)) return null;
  return Math.max(0, Math.ceil((expiresAtMilliseconds - Date.now()) / 1000));
};

export default function HoldCountdownTimer({ expiresAt, onExpire }: HoldCountdownTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(() => getRemainingSeconds(expiresAt));
  const onExpireRef = useRef(onExpire);
  const expiredAtRef = useRef<string | null>(null);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    expiredAtRef.current = null;
    const expiresAtMilliseconds = Date.parse(expiresAt);
    if (!Number.isFinite(expiresAtMilliseconds)) return;

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((expiresAtMilliseconds - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0 && expiredAtRef.current !== expiresAt) {
        expiredAtRef.current = expiresAt;
        onExpireRef.current();
      }
    };

    const timeoutId = window.setTimeout(updateRemaining, 0);
    const intervalId = window.setInterval(updateRemaining, 1000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [expiresAt]);

  if (secondsRemaining === null) {
    return <span className="text-sm font-semibold text-red-700" role="alert">Thời hạn giữ chỗ không hợp lệ</span>;
  }

  const minutes = Math.floor(secondsRemaining / 60).toString().padStart(2, '0');
  const seconds = (secondsRemaining % 60).toString().padStart(2, '0');

  return (
    <span className="font-mono text-lg font-bold tabular-nums" aria-live="polite">
      {minutes}:{seconds}
    </span>
  );
}
