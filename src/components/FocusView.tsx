import { useEffect, useRef, useState } from 'react';
import {
  Expand,
  Pause,
  Play,
  RotateCcw,
  Timer,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { FocusMode, FocusTimerController } from '../hooks/useFocusTimer';
import PageHeader from './PageHeader';

const FOCUS_MODES: { id: FocusMode; label: string }[] = [
  { id: 'focus', label: 'Enfoque' },
  { id: 'shortBreak', label: 'Descanso corto' },
  { id: 'longBreak', label: 'Descanso largo' },
  { id: 'breathing', label: 'Respirar' },
];

const MODE_LABELS: Record<FocusMode, string> = {
  focus: 'Enfoque',
  shortBreak: 'Descanso corto',
  longBreak: 'Descanso largo',
  breathing: 'Respirar',
};

interface FocusViewProps {
  timer: FocusTimerController;
}

interface WakeLockHandle extends EventTarget {
  released: boolean;
  release: () => Promise<void>;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function useScreenWakeLock(isRunning: boolean) {
  useEffect(() => {
    if (!isRunning || !('wakeLock' in navigator)) return undefined;
    const wakeLock = navigator.wakeLock;
    if (!wakeLock) return undefined;

    let active = true;
    let requesting = false;
    let sentinel: WakeLockHandle | null = null;

    const requestLock = async () => {
      if (!active || requesting || sentinel && !sentinel.released) return;
      requesting = true;
      try {
        const nextSentinel = await wakeLock.request('screen');
        if (!active) {
          await nextSentinel.release();
          return;
        }
        sentinel = nextSentinel;
        nextSentinel.addEventListener('release', () => {
          if (sentinel === nextSentinel) sentinel = null;
        }, { once: true });
      } catch (error) {
        if (active) console.warn('No se pudo mantener la pantalla activa durante Enfoque.', error);
      } finally {
        requesting = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void requestLock();
    };

    void requestLock();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (sentinel && !sentinel.released) {
        void sentinel.release().catch((error: unknown) => console.error('No se pudo liberar Screen Wake Lock.', error));
      }
    };
  }, [isRunning]);
}

export function FocusWidget({ timer, onOpenFocus }: { timer: FocusTimerController; onOpenFocus: () => void }) {
  return (
    <aside className="card h-fit lg:sticky lg:top-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Timer size={19} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div>
          <p className="section-eyebrow">Un momento a la vez</p>
          <h2 className="mt-1 text-lg text-ink">Enfoque</h2>
        </div>
      </div>
      <div className="rounded-3xl bg-soft px-4 py-6 text-center">
        <span className="font-serif text-5xl tracking-tight text-ink tabular-nums" aria-label={`Temporizador: ${formatTime(timer.remainingSeconds)}`}>
          {formatTime(timer.remainingSeconds)}
        </span>
        <p className="mt-2 text-xs text-muted">{MODE_LABELS[timer.mode]}</p>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="btn-primary inline-flex flex-1 items-center justify-center gap-2 text-sm"
          onClick={timer.isRunning ? timer.pause : timer.start}
        >
          {timer.isRunning ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
          {timer.isRunning ? 'Pausar' : timer.remainingSeconds === 0 ? 'Repetir' : 'Iniciar'}
        </button>
        <button type="button" className="btn-secondary grid w-11 place-items-center !px-0" onClick={timer.reset} aria-label="Reiniciar temporizador">
          <RotateCcw size={16} aria-hidden="true" />
        </button>
      </div>
      <button type="button" className="mt-4 w-full text-center text-xs font-medium text-primary" onClick={onOpenFocus}>
        Abrir Enfoque completo
      </button>
      <p className="mt-3 text-center text-xs leading-relaxed text-muted">
        {timer.sessionsToday} {timer.sessionsToday === 1 ? 'sesión de enfoque' : 'sesiones de enfoque'} hoy
      </p>
    </aside>
  );
}

export default function FocusView({ timer }: FocusViewProps) {
  const { state } = useApp();
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [browserFullscreen, setBrowserFullscreen] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [durationDrafts, setDurationDrafts] = useState({
    focus: String(timer.durations.focus),
    shortBreak: String(timer.durations.shortBreak),
    longBreak: String(timer.durations.longBreak),
  });
  const fullscreen = browserFullscreen || fallbackFullscreen;
  const phaseSeconds = timer.elapsedSeconds % 14;
  const breathingPhase = phaseSeconds < 4 ? 'Inhala…' : phaseSeconds < 8 ? 'Sostén…' : 'Exhala…';
  const linkedTask = state.tasks.find((task) => task.id === timer.linkedTaskId);
  const displayedTaskId = linkedTask ? linkedTask.id : '';

  useScreenWakeLock(timer.isRunning);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    const updateFullscreen = () => setBrowserFullscreen(document.fullscreenElement === fullscreenRef.current);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && fallbackFullscreen) setFallbackFullscreen(false);
    };
    document.addEventListener('fullscreenchange', updateFullscreen);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreen);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [fallbackFullscreen]);

  const enterFullscreen = async () => {
    const element = fullscreenRef.current;
    if (!element) return;
    if (!element.requestFullscreen) {
      setFallbackFullscreen(true);
      return;
    }
    try {
      await element.requestFullscreen();
    } catch (error) {
      console.error('No se pudo activar la pantalla completa del navegador; se usará la vista ampliada.', error);
      setFallbackFullscreen(true);
    }
  };

  const exitFullscreen = async () => {
    setFallbackFullscreen(false);
    if (!document.fullscreenElement || !document.exitFullscreen) return;
    try {
      await document.exitFullscreen();
    } catch (error) {
      console.error('No se pudo salir de la pantalla completa del navegador.', error);
    }
  };

  const commitDuration = (durationMode: 'focus' | 'shortBreak' | 'longBreak') => {
    const draft = durationDrafts[durationMode].trim();
    const parsed = Number(draft);
    const next = draft && Number.isFinite(parsed) ? Math.max(1, Math.min(180, Math.round(parsed))) : timer.durations[durationMode];
    timer.setDuration(durationMode, next);
    setDurationDrafts((current) => ({ ...current, [durationMode]: String(next) }));
  };

  return (
    <div
      ref={fullscreenRef}
      className={`animate-fade-in mx-auto w-full max-w-[1120px] ${fullscreen ? 'fixed inset-0 z-[100] flex min-h-screen max-w-none flex-col overflow-y-auto bg-surface p-4 sm:p-8' : ''}`}
    >
      {fullscreen ? (
        <div className="flex justify-end">
          <button type="button" className="btn-secondary inline-flex items-center gap-2 text-sm" onClick={() => void exitFullscreen()}>
            <X size={16} aria-hidden="true" /> Salir
          </button>
        </div>
      ) : (
        <PageHeader
          eyebrow="Un momento a la vez"
          title="Enfoque"
          subtitle="Concéntrate, descansa o tómate un momento para respirar."
          action={(
            <button type="button" className="btn-primary inline-flex items-center gap-2 text-sm" onClick={() => void enterFullscreen()}>
              <Expand size={16} aria-hidden="true" /> Pantalla completa
            </button>
          )}
        />
      )}

      <div className={`${fullscreen ? 'flex flex-1 items-center justify-center' : 'grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]'}`}>
        <section className={`card ${fullscreen ? 'w-full max-w-2xl border-0 bg-transparent text-center shadow-none' : ''}`}>
          {!fullscreen && (
            <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Modo de temporizador">
              {FOCUS_MODES.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => timer.setMode(item.id)}
                  aria-pressed={timer.mode === item.id}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${timer.mode === item.id ? 'bg-primary text-on-primary' : 'bg-soft text-muted hover-surface'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <p className={`section-eyebrow ${fullscreen ? 'text-primary' : ''}`}>{MODE_LABELS[timer.mode]}</p>
          <div className={`${fullscreen ? 'mt-4' : 'mt-6'} rounded-[32px] bg-primary-soft px-4 py-8 sm:px-8 sm:py-12`}>
            {timer.mode === 'breathing' && !reducedMotion && (
              <div className="breathing-orb mx-auto mb-7 grid h-36 w-36 place-items-center rounded-full bg-accent-soft sm:h-48 sm:w-48" aria-hidden="true">
                <span className="h-20 w-20 rounded-full bg-surface/70 shadow-inner sm:h-28 sm:w-28" />
              </div>
            )}
            <p className="font-serif text-7xl tracking-tight text-ink tabular-nums sm:text-8xl" aria-label={`Tiempo restante: ${formatTime(timer.remainingSeconds)}`}>
              {formatTime(timer.remainingSeconds)}
            </p>
            {timer.mode === 'breathing' && (
              <p className="mt-3 font-serif text-2xl italic text-primary" aria-live="polite">
                {breathingPhase}
              </p>
            )}
            {timer.remainingSeconds === 0 && !timer.isRunning && (
              <p className="mt-3 text-sm text-muted" role="status">Sesión completada. Tómate un momento antes de continuar.</p>
            )}
            {timer.mode === 'focus' && (
              <p className="mt-3 text-sm text-muted">
                {timer.sessionsToday} {timer.sessionsToday === 1 ? 'sesión de enfoque' : 'sesiones de enfoque'} hoy
              </p>
            )}
          </div>
          <div className={`mt-5 flex flex-wrap justify-center gap-3 ${fullscreen ? 'sm:mt-8' : ''}`}>
            <button
              type="button"
              className="btn-primary inline-flex min-h-12 min-w-36 items-center justify-center gap-2 px-6 text-base"
              onClick={timer.isRunning ? timer.pause : timer.start}
            >
              {timer.isRunning ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
              {timer.isRunning ? 'Pausar' : timer.remainingSeconds === 0 ? 'Empezar de nuevo' : 'Iniciar'}
            </button>
            <button type="button" className="btn-secondary inline-flex min-h-12 items-center justify-center gap-2 px-5 text-base" onClick={timer.reset}>
              <RotateCcw size={17} aria-hidden="true" /> Reiniciar
            </button>
            {fullscreen && (
              <button type="button" className="btn-secondary inline-flex min-h-12 items-center justify-center gap-2 px-5 text-base" onClick={() => void exitFullscreen()}>
                <X size={17} aria-hidden="true" /> Salir
              </button>
            )}
          </div>
          {timer.isRunning && (
            <p className="mt-4 text-xs text-muted" role="status">
              {timer.mode === 'breathing' && reducedMotion ? `Sigue el ritmo: ${breathingPhase.toLocaleLowerCase('es')}` : 'La sesión seguirá activa si cambias de sección.'}
            </p>
          )}
        </section>

        {!fullscreen && (
          <aside className="card space-y-5">
            <div>
              <p className="section-eyebrow mb-3">Duración</p>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {([
                  ['focus', 'Enfoque'],
                  ['shortBreak', 'Descanso corto'],
                  ['longBreak', 'Descanso largo'],
                ] as const).map(([durationMode, label]) => (
                  <label key={durationMode} className="flex items-center justify-between gap-3 text-sm text-ink">
                    <span>{label}</span>
                    <span className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={180}
                        step={1}
                        value={durationDrafts[durationMode]}
                        disabled={timer.isRunning}
                        onChange={(event) => setDurationDrafts((current) => ({ ...current, [durationMode]: event.currentTarget.value }))}
                        onBlur={() => commitDuration(durationMode)}
                        aria-label={`Duración de ${label.toLocaleLowerCase('es')} en minutos`}
                        className="input-field w-20 px-2 py-2 text-center tabular-nums disabled:opacity-60"
                      />
                      <span className="text-xs text-muted">min</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 text-sm text-ink">
              <span>Tiempo para respirar</span>
              <select
                value={timer.durations.breathing}
                disabled={timer.isRunning}
                onChange={(event) => timer.setBreathingMinutes(Number(event.currentTarget.value))}
                aria-label="Duración del ejercicio de respiración"
                className="input-field w-24 px-2 py-2 text-sm disabled:opacity-60"
              >
                <option value={3}>3 min</option>
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
              </select>
            </label>

            <label className="flex items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={timer.soundEnabled}
                onChange={(event) => timer.setSoundEnabled(event.currentTarget.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              {timer.soundEnabled ? <Volume2 size={17} className="text-primary" aria-hidden="true" /> : <VolumeX size={17} className="text-muted" aria-hidden="true" />}
              Sonido suave al terminar
            </label>
            <p className="-mt-3 text-xs leading-relaxed text-muted">El sonido está apagado por defecto y solo se usa al finalizar.</p>

            <label className="block text-sm text-ink" htmlFor="focus-task">
              Vincular con una tarea (opcional)
              <select
                id="focus-task"
                value={displayedTaskId}
                onChange={(event) => timer.setLinkedTaskId(event.currentTarget.value)}
                className="input-field mt-2"
              >
                <option value="">Sin tarea vinculada</option>
                {state.tasks.map((task) => (
                  <option key={task.id} value={task.id}>{task.completed ? '✓ ' : ''}{task.title}</option>
                ))}
              </select>
            </label>
            {linkedTask && <p className="text-xs text-muted">Sesión vinculada: <span className="font-medium text-ink">{linkedTask.title}</span></p>}
          </aside>
        )}
      </div>
    </div>
  );
}
