import { useCallback, useEffect, useRef, useState } from 'react';
import { getTodayInLima } from '../utils/dates';

export type FocusMode = 'focus' | 'shortBreak' | 'longBreak' | 'breathing';
export type FocusTimerMode = Exclude<FocusMode, 'breathing'>;
export type BreathingMinutes = 3 | 5 | 10;

export interface FocusDurations {
  focus: number;
  shortBreak: number;
  longBreak: number;
  breathing: BreathingMinutes;
}

export interface FocusTimerController {
  mode: FocusMode;
  durations: FocusDurations;
  remainingSeconds: number;
  elapsedSeconds: number;
  totalSeconds: number;
  sessionsToday: number;
  soundEnabled: boolean;
  linkedTaskId: string;
  isRunning: boolean;
  setMode: (mode: FocusMode) => void;
  setDuration: (mode: FocusTimerMode, minutes: number) => void;
  setBreathingMinutes: (minutes: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setLinkedTaskId: (taskId: string) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

interface StoredFocusSettings {
  durations: FocusDurations;
  soundEnabled: boolean;
  linkedTaskId: string;
  sessionDate: string;
  sessionsToday: number;
}

const STORAGE_KEY = 'jurisplanner:focus:v1';
const DEFAULT_DURATIONS: FocusDurations = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  breathing: 5,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeDuration(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(1, Math.min(180, Math.round(value)))
    : fallback;
}

function normalizeBreathingMinutes(value: unknown): BreathingMinutes {
  return value === 3 || value === 10 ? value : 5;
}

function defaultSettings(today: string): StoredFocusSettings {
  return {
    durations: { ...DEFAULT_DURATIONS },
    soundEnabled: false,
    linkedTaskId: '',
    sessionDate: today,
    sessionsToday: 0,
  };
}

function loadSettings(): StoredFocusSettings {
  const today = getTodayInLima();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings(today);

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) throw new Error('El formato guardado no es válido.');
    const durations = isRecord(parsed.durations) ? parsed.durations : {};

    return {
      durations: {
        focus: normalizeDuration(durations.focus, DEFAULT_DURATIONS.focus),
        shortBreak: normalizeDuration(durations.shortBreak, DEFAULT_DURATIONS.shortBreak),
        longBreak: normalizeDuration(durations.longBreak, DEFAULT_DURATIONS.longBreak),
        breathing: normalizeBreathingMinutes(durations.breathing),
      },
      soundEnabled: parsed.soundEnabled === true,
      linkedTaskId: typeof parsed.linkedTaskId === 'string' ? parsed.linkedTaskId : '',
      sessionDate: isDate(parsed.sessionDate) ? parsed.sessionDate : today,
      sessionsToday: typeof parsed.sessionsToday === 'number' && Number.isInteger(parsed.sessionsToday) && parsed.sessionsToday >= 0
        ? parsed.sessionsToday
        : 0,
    };
  } catch (error) {
    console.error('No se pudieron leer las preferencias de Enfoque.', error);
    return defaultSettings(today);
  }
}

function playCompletionTone(): void {
  try {
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) {
      console.warn('El navegador no admite el sonido opcional de Enfoque.');
      return;
    }

    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.035, startAt + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.8);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      void context.close().catch((error: unknown) => console.error('No se pudo cerrar el audio de Enfoque.', error));
    };
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.85);
  } catch (error) {
    console.error('No se pudo reproducir el sonido de Enfoque.', error);
  }
}

export default function useFocusTimer(): FocusTimerController {
  const [stored, setStored] = useState(loadSettings);
  const [mode, setCurrentMode] = useState<FocusMode>('focus');
  const [remainingSeconds, setRemainingSeconds] = useState(stored.durations.focus * 60);
  const [endAt, setEndAt] = useState<number | null>(null);
  const completedRef = useRef(true);

  const totalSeconds = mode === 'breathing'
    ? stored.durations.breathing * 60
    : stored.durations[mode] * 60;
  const today = getTodayInLima();
  const sessionsToday = stored.sessionDate === today ? stored.sessionsToday : 0;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      console.error('No se pudieron guardar las preferencias de Enfoque.', error);
    }
  }, [stored]);

  const completeSession = useCallback((completedMode: FocusMode) => {
    setEndAt(null);
    setRemainingSeconds(0);
    if (completedMode === 'focus') {
      const completedToday = getTodayInLima();
      setStored((current) => ({
        ...current,
        sessionDate: completedToday,
        sessionsToday: current.sessionDate === completedToday ? current.sessionsToday + 1 : 1,
      }));
    }
    if (stored.soundEnabled) playCompletionTone();
  }, [stored.soundEnabled]);

  useEffect(() => {
    if (endAt === null) return undefined;

    const updateRemaining = () => {
      const seconds = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0 && !completedRef.current) {
        completedRef.current = true;
        completeSession(mode);
      }
    };

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 250);
    return () => window.clearInterval(interval);
  }, [completeSession, endAt, mode]);

  const setMode = useCallback((nextMode: FocusMode) => {
    completedRef.current = true;
    setEndAt(null);
    setCurrentMode(nextMode);
    const minutes = nextMode === 'breathing' ? stored.durations.breathing : stored.durations[nextMode];
    setRemainingSeconds(minutes * 60);
  }, [stored.durations]);

  const setDuration = useCallback((durationMode: FocusTimerMode, minutes: number) => {
    const nextMinutes = normalizeDuration(minutes, DEFAULT_DURATIONS[durationMode]);
    setStored((current) => ({
      ...current,
      durations: { ...current.durations, [durationMode]: nextMinutes },
    }));
    if (mode === durationMode && endAt === null) setRemainingSeconds(nextMinutes * 60);
  }, [endAt, mode]);

  const setBreathingMinutes = useCallback((minutes: number) => {
    const nextMinutes = normalizeBreathingMinutes(minutes);
    setStored((current) => ({
      ...current,
      durations: { ...current.durations, breathing: nextMinutes },
    }));
    if (mode === 'breathing' && endAt === null) setRemainingSeconds(nextMinutes * 60);
  }, [endAt, mode]);

  const start = useCallback(() => {
    if (endAt !== null) return;
    const seconds = remainingSeconds > 0 ? remainingSeconds : totalSeconds;
    completedRef.current = false;
    setRemainingSeconds(seconds);
    setEndAt(Date.now() + seconds * 1000);
  }, [endAt, remainingSeconds, totalSeconds]);

  const pause = useCallback(() => {
    if (endAt === null) return;
    const seconds = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    if (seconds === 0 && !completedRef.current) {
      completedRef.current = true;
      completeSession(mode);
      return;
    }
    completedRef.current = true;
    setRemainingSeconds(seconds);
    setEndAt(null);
  }, [completeSession, endAt, mode]);

  const reset = useCallback(() => {
    completedRef.current = true;
    setEndAt(null);
    setRemainingSeconds(totalSeconds);
  }, [totalSeconds]);

  return {
    mode,
    durations: stored.durations,
    remainingSeconds,
    elapsedSeconds: Math.max(0, totalSeconds - remainingSeconds),
    totalSeconds,
    sessionsToday,
    soundEnabled: stored.soundEnabled,
    linkedTaskId: stored.linkedTaskId,
    isRunning: endAt !== null,
    setMode,
    setDuration,
    setBreathingMinutes,
    setSoundEnabled: (enabled) => setStored((current) => ({ ...current, soundEnabled: enabled })),
    setLinkedTaskId: (taskId) => setStored((current) => ({ ...current, linkedTaskId: taskId })),
    start,
    pause,
    reset,
  };
}
