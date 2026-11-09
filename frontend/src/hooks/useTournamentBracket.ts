import { useEffect, useState } from 'react';
import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { tournamentBracketApi } from '../api/tournamentBracketApi';
import type { TournamentBracket } from '../api/tournamentBracketApi';
import { getErrorMessage } from '../api/errors';

export function useTournamentBracket(tournamentId: number) {
  const [bracket, setBracket] = useState<TournamentBracket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;
    const apply = (data: TournamentBracket) => {
      if (active && data.tournamentId === tournamentId) {
        setBracket((previous) => previous && previous.tournamentId === tournamentId && previous.version > data.version ? previous : data);
        setError(null);
      }
    };
    const refresh = async () => {
      try { apply(await tournamentBracketApi.get(tournamentId, controller.signal)); }
      catch (err) { if (active) setError(getErrorMessage(err)); }
    };
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
    const connection = new HubConnectionBuilder().withUrl(`${base}/hubs/tournaments`)
      .withAutomaticReconnect().configureLogging(LogLevel.Error).build();
    connection.on('BracketUpdated', apply);
    const join = async () => {
      await connection.invoke('JoinTournamentGroup', tournamentId);
      if (active) setConnected(true);
      await refresh(); // Catch changes between the initial GET and group subscription.
    };
    const start = async () => {
      try { await connection.start(); if (active) await join(); }
      catch {
        if (!active) return;
        setConnected(false);
        await connection.stop();
        clearTimeout(retry);
        if (active) retry = setTimeout(() => void start(), 5000);
      }
    };
    connection.onreconnecting(() => { if (active) setConnected(false); });
    connection.onreconnected(() => { void join().catch(() => { if (active) void connection.stop(); }); });
    connection.onclose(() => {
      if (active) { setConnected(false); clearTimeout(retry); retry = setTimeout(() => void start(), 5000); }
    });
    void refresh();
    void start();
    // Also recover notifications lost during a server restart or broadcast failure.
    const poll = setInterval(() => void refresh(), 15000);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(retry);
      clearInterval(poll);
      connection.off('BracketUpdated', apply);
      if (connection.state === HubConnectionState.Connected) {
        void connection.invoke('LeaveTournamentGroup', tournamentId).catch(() => {}).finally(() => connection.stop());
      } else void connection.stop();
    };
  }, [tournamentId, revision]);

  const accept = (data: TournamentBracket) => setBracket((old) => old && old.version > data.version ? old : data);
  return { bracket, error, connected, accept, refresh: () => setRevision((value) => value + 1) };
}
