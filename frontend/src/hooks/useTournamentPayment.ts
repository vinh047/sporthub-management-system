import { useEffect, useRef, useState } from 'react';
import { tournamentApi } from '../api/tournamentApi';
import type { TournamentFeePayment } from '../api/tournamentApi';
import { getErrorMessage } from '../api/errors';

export function useTournamentPayment(tournamentId: number, teamId: number) {
  const [payment, setPayment] = useState<TournamentFeePayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const submitting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const check = async () => {
      try {
        const result = await tournamentApi.getPaymentStatus(tournamentId, teamId, controller.signal);
        if (controller.signal.aborted) return;
        setPayment(result);
        setLoaded(true);
        setLoading(false);
        attempts += 1;
        if (result?.paymentStatus === 'Pending' && attempts < 10) {
          timer = setTimeout(() => void check(), 3000);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(err));
        setLoaded(false);
        setLoading(false);
      }
    };
    void check();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [tournamentId, teamId, refreshKey]);

  const pay = async () => {
    if (submitting.current || !loaded) return;
    submitting.current = true;
    setPaying(true);
    setError(null);
    try {
      const result = await tournamentApi.createVnPayPayment(tournamentId, teamId);
      const url = new URL(result.paymentUrl);
      if (url.protocol !== 'https:') throw new Error('Liên kết thanh toán không hợp lệ.');
      window.location.assign(url.href);
    } catch (err) {
      setError(getErrorMessage(err));
      submitting.current = false;
      setPaying(false);
    }
  };

  const refresh = () => {
    setLoading(true);
    setLoaded(false);
    setError(null);
    setRefreshKey((key) => key + 1);
  };
  return { payment, loading, paying, error, loaded, pay, refresh };
}
