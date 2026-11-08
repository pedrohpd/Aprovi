import { useCallback, useEffect, useRef, useState } from "react";

export type TimerPhase = "focus" | "break";
export type TimerConfig = { focus: number; rest: number };

const DEFAULTS: TimerConfig = { focus: 25, rest: 5 };

/**
 * Timer Pomodoro. Vive no App (e não na tela) para continuar contando
 * quando o aluno troca de aba. Usa um horário-alvo para não perder tempo
 * se o navegador pausar os intervalos em segundo plano.
 */
export function useTimer(onPhaseEnd?: (finished: TimerPhase) => void) {
  const [config, setConfig] = useState<TimerConfig>(DEFAULTS);
  const [phase, setPhase] = useState<TimerPhase>("focus");
  const [remaining, setRemaining] = useState(DEFAULTS.focus * 60);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const callback = useRef(onPhaseEnd);
  callback.current = onPhaseEnd;

  const minutesFor = (p: TimerPhase, c: TimerConfig) => (p === "focus" ? c.focus : c.rest);
  const running = endAt !== null;
  const seconds = running ? Math.max(0, Math.ceil((endAt - now) / 1000)) : remaining;

  useEffect(() => {
    if (endAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endAt]);

  useEffect(() => {
    if (endAt === null || now < endAt) return;
    const next: TimerPhase = phase === "focus" ? "break" : "focus";
    setPhase(next);
    setRemaining(minutesFor(next, config) * 60);
    setEndAt(null);
    callback.current?.(phase);
  }, [now, endAt, phase, config]);

  const toggle = useCallback(() => {
    if (endAt !== null) {
      setRemaining(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
      setEndAt(null);
    } else {
      const t = Date.now();
      setNow(t);
      setEndAt(t + remaining * 1000);
    }
  }, [endAt, remaining]);

  const restart = useCallback(() => {
    setEndAt(null);
    setPhase("focus");
    setRemaining(config.focus * 60);
  }, [config.focus]);

  const updateConfig = useCallback(
    (next: TimerConfig) => {
      // Se o relógio ainda está "intocado" na fase atual, ele acompanha o novo valor.
      if (endAt === null && remaining === minutesFor(phase, config) * 60) {
        setRemaining(minutesFor(phase, next) * 60);
      }
      setConfig(next);
    },
    [endAt, remaining, phase, config],
  );

  return { config, phase, seconds, running, toggle, restart, updateConfig };
}

export function formatClock(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
