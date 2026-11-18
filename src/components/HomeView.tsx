import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronRight, Clock3, ClipboardList, Download, Flower2, Heart, Plus, Sprout, X } from 'lucide-react';
import type { NavTab } from '../types';
import { useApp, useAppActions } from '../context/AppContext';
import PageHeader from './PageHeader';
import HabitMark from './HabitMark';
import config from '../data/config.json';
import { formatDateLong, formatDateShort, getAge, getGreetingInLima, getStreakCount, getTodayInLima } from '../utils/dates';
import AddToCalendarButton from './AddToCalendarButton';
import { animateCompletion } from '../utils/completionAnimation';
import { getGradeCourses } from '../utils/gradebook';
import canciones from '../data/canciones.json';
import { getSongOfTheDay, readSongCatalog } from '../utils/songs';
import SongCard from './SongCard';
import { getCourseColorStyle } from '../utils/courseColors';
import { getCurrentTimeInLima, getWeekdayInLima, isClassInProgress, SCHEDULE_CLASS_TYPES, timeToMinutes } from '../utils/schedule';

const songCatalog = readSongCatalog(canciones);

interface HomeViewProps {
  onNavigate: (tab: NavTab) => void;
  showInstallCard: boolean;
  onInstall: () => void;
  onDismissInstallCard: () => void;
}

export default function HomeView({ onNavigate, showInstallCard, onInstall, onDismissInstallCard }: HomeViewProps) {
  const { state } = useApp();
  const { toggleTask, toggleHabitToday } = useAppActions();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const today = getTodayInLima();
  const currentTime = getCurrentTimeInLima(now);
  const songOfTheDay = getSongOfTheDay(songCatalog.songs, today);
  const todayHabits = state.habits.map((habit) => ({
    ...habit,
    completed: habit.completedDates.includes(today),
  }));
  const completedHabits = todayHabits.filter((habit) => habit.completed).length;
  const habitProgress = todayHabits.length ? Math.round((completedHabits / todayHabits.length) * 100) : 0;
  const currentStreak = Math.max(0, ...state.habits.map((habit) => getStreakCount(habit.completedDates)), 0);
  const hasData = state.tasks.length > 0 || state.habits.length > 0 || state.events.length > 0 || state.evaluations.length > 0 || state.scheduleClasses.length > 0;
  const gradeCourses = getGradeCourses(state.tags, state.settings.selectedCiclo);
  const gradeCourseIds = new Set(gradeCourses.map((course) => course.id));
  const nextClass = state.scheduleClasses
    .filter((scheduleClass) => (
      scheduleClass.day === getWeekdayInLima(today)
      && timeToMinutes(scheduleClass.endTime) > timeToMinutes(currentTime)
    ))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
  const nextClassCourse = nextClass ? gradeCourses.find((course) => course.id === nextClass.courseId) : undefined;
  const upcomingDeadlines = [
    ...state.tasks
      .filter((task) => !task.completed && task.dueDate && task.dueDate >= today)
      .map((task) => ({ kind: 'task' as const, id: task.id, title: task.title, date: task.dueDate!, task })),
    ...state.evaluations
      .filter((evaluation) => evaluation.grade === null && evaluation.date && evaluation.date >= today && gradeCourseIds.has(evaluation.courseId))
      .map((evaluation) => ({
        kind: 'evaluation' as const,
        id: evaluation.id,
        title: evaluation.name,
        date: evaluation.date!,
        evaluation,
        courseName: gradeCourses.find((course) => course.id === evaluation.courseId)?.name ?? '',
      })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  const phrase = state.frases.length
    ? state.frases[(Number(today.slice(-2)) - 1) % state.frases.length]
    : '';
  const dateLabel = formatDateLong(today);

  const weeklySummary = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() - (6 - index));
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const taskDone = state.tasks.filter((task) => task.completed && task.dueDate === iso).length;
    const habitDone = state.habits.filter((habit) => habit.completedDates.includes(iso)).length;
    return { iso, label: new Intl.DateTimeFormat('es-PE', { weekday: 'short' }).format(date).replace(/\./g, '').toLowerCase(), value: Math.min(100, ((taskDone + habitDone) * 100) / Math.max(1, Math.max(state.tasks.length, state.habits.length, 1))) };
  });

  const metrics = [
    ...(state.tasks.length ? [{
      label: 'Tareas hoy',
      value: state.tasks.filter((task) => !task.completed && task.dueDate === today).length,
      tone: 'bg-primary-soft text-primary',
    }] : []),
    ...(state.habits.length ? [
      { label: 'Hábitos', value: `${completedHabits}/${todayHabits.length}`, tone: 'bg-accent-soft text-ink' },
      { label: 'Meta', value: `${habitProgress}%`, tone: 'bg-surface text-muted' },
    ] : []),
    ...(state.events.length ? [{
      label: 'Eventos',
      value: state.events.length,
      tone: 'bg-surface-2 text-ink',
    }] : []),
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow={`Santuario personal • ${getAge(config.cumpleanos, today)} años`}
        title={(
          <>
            {getGreetingInLima()}, {config.nombre}
            <Flower2 className="ml-2 inline-block text-accent" size={30} strokeWidth={1.5} aria-hidden="true" />
          </>
        )}
        subtitle={<span className="font-serif text-base italic">Hoy es un buen día para avanzar a tu propio ritmo, sin prisas y cuidando de ti.</span>}
        action={(
          <div className="inline-flex w-fit items-center gap-3 rounded-2xl border border-token bg-surface px-4 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-ink">
            <CalendarDays size={18} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span>
            <span className="section-eyebrow block">Hoy</span>
            <span className="text-sm font-medium text-ink">{dateLabel}</span>
          </span>
          </div>
        )}
      />

      {showInstallCard && (
        <aside className="card mb-5 flex flex-wrap items-center justify-between gap-4 bg-primary-soft !p-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-primary">
              <Download size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">Lleva tu espacio contigo</h2>
              <p className="mt-1 text-xs text-muted">Instala JurisPlanner para abrirlo desde tu pantalla de inicio.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-primary !px-4 !py-2 text-sm" onClick={onInstall}>Instalar app</button>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full text-muted hover-surface" onClick={onDismissInstallCard} aria-label="Cerrar aviso de instalación">
              <X size={17} aria-hidden="true" />
            </button>
          </div>
        </aside>
      )}

      {metrics.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className={`card !p-4 ${metric.tone}`}>
              <p className="text-xs uppercase tracking-[0.12em] opacity-80">{metric.label}</p>
              <p className="mt-3 text-2xl font-semibold text-ink">{metric.value}</p>
            </div>
          ))}
        </div>
      )}

      {songOfTheDay && (
        <div className="mb-5">
          <SongCard song={songOfTheDay} variant="home" />
        </div>
      )}

      {nextClass && nextClassCourse && (
        <section className="card mb-5 flex items-center gap-4" style={getCourseColorStyle(nextClassCourse.color, nextClassCourse.id)}>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/40">
            <Clock3 size={21} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="section-eyebrow">{isClassInProgress(nextClass, today, currentTime) ? 'En curso ahora' : 'Tu horario'}</p>
            <h2 className="mt-1 text-xl">Próxima clase</h2>
            <p className="mt-1 truncate text-sm font-medium">{nextClassCourse.name}</p>
            <p className="mt-1 text-xs">
              {nextClass.startTime}–{nextClass.endTime} · {SCHEDULE_CLASS_TYPES.find((item) => item.value === nextClass.type)?.label ?? 'Teoría'}
              {nextClass.classroom ? ` · ${nextClass.classroom}` : ''}
            </p>
          </div>
        </section>
      )}

      {!hasData ? (
        <section className="card">
          <p className="section-eyebrow">Un primer paso, sin presión</p>
          <h2 className="mt-1 text-2xl text-ink">Empieza hoy</h2>
          <p className="mt-2 text-sm text-muted">Elige por dónde quieres empezar; puedes cambiar de idea cuando quieras.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Añadir tarea', tab: 'tareas' as const, icon: Plus },
              { label: 'Crear hábito', tab: 'habitos' as const, icon: Sprout },
              { label: 'Ver mi semana', tab: 'semana' as const, icon: CalendarDays },
            ].map((shortcut) => (
              <button
                type="button"
                key={shortcut.tab}
                onClick={() => onNavigate(shortcut.tab)}
                className="flex items-center justify-between gap-3 rounded-2xl border border-token bg-soft px-4 py-4 text-left transition-colors hover-surface"
              >
                <span className="text-sm font-medium text-ink">{shortcut.label}</span>
                <shortcut.icon size={18} className="shrink-0 text-primary" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      ) : (
      <>
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        {state.habits.length > 0 && (
        <section className="card relative flex min-h-64 flex-col justify-between overflow-hidden bg-primary-soft lg:col-span-5">
          <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-surface/50 blur-3xl" />
          <div className="relative">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-surface/80 text-primary">
              <Sprout size={21} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <p className="section-eyebrow mt-6 text-primary">Tu constancia</p>
            <h2 className="mt-1 text-2xl text-ink">Racha actual</h2>
            <p className="mt-3 flex items-baseline gap-2 text-ink">
              <span className="font-serif text-5xl">{currentStreak}</span>
              <span className="text-sm text-muted">{currentStreak === 1 ? 'día' : 'días'}</span>
            </p>
          </div>
          <div className="relative mt-8">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>Hábitos de hoy</span>
              <span>{completedHabits} de {todayHabits.length}</span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-surface/70"
              role="progressbar"
              aria-label="Hábitos completados hoy"
              aria-valuenow={habitProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${habitProgress}%` }} />
            </div>
          </div>
        </section>
        )}

        {(state.tasks.length > 0 || state.evaluations.some((evaluation) => evaluation.grade === null && evaluation.date && gradeCourseIds.has(evaluation.courseId))) && (
        <section className="card flex flex-col lg:col-span-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="section-eyebrow">Lo que viene</p>
              <h2 className="mt-1 text-2xl text-ink">Próximos plazos</h2>
            </div>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full text-primary transition-colors hover-surface"
              onClick={() => onNavigate('tareas')}
              aria-label="Ver tareas y evaluaciones"
            >
              <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
          {upcomingDeadlines.length ? (
            <div className="space-y-2">
              {upcomingDeadlines.map((deadline) => (
                <div key={`${deadline.kind}-${deadline.id}`} className="deadline-row flex items-center gap-2 rounded-2xl border border-token bg-surface p-3.5 transition-colors hover-surface">
                  <button
                    type="button"
                    onClick={(event) => {
                      if (deadline.kind === 'task') {
                        animateCompletion(event.currentTarget.closest('.deadline-row'));
                        toggleTask(deadline.id);
                      } else {
                        onNavigate('notas');
                      }
                    }}
                    aria-label={deadline.kind === 'task' ? `Completar ${deadline.title}` : `Ver ${deadline.title} en Notas`}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-ink">
                      {deadline.kind === 'task'
                        ? <Clock3 size={17} strokeWidth={1.5} aria-hidden="true" />
                        : <ClipboardList size={17} strokeWidth={1.5} aria-hidden="true" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{deadline.title}</span>
                      <span className="mt-1 block text-xs text-muted">
                        {formatDateShort(deadline.date)}
                        {deadline.kind === 'evaluation' ? ` · ${deadline.courseName}` : ''}
                      </span>
                    </span>
                    {deadline.kind === 'task' && (
                      <span className="grid h-6 w-6 place-items-center rounded-full border border-token text-muted">
                        <Check size={13} strokeWidth={1.5} aria-hidden="true" />
                      </span>
                    )}
                  </button>
                  {deadline.kind === 'task' && <AddToCalendarButton compact entry={{ kind: 'task', task: deadline.task }} />}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-start justify-center rounded-2xl bg-soft p-5">
              <p className="text-sm leading-relaxed text-muted">No tienes plazos próximos. Puedes añadir una tarea cuando quieras.</p>
              <button type="button" className="btn-secondary mt-4 inline-flex items-center gap-2 text-sm" onClick={() => onNavigate('tareas')}>
                <Plus size={15} strokeWidth={1.5} aria-hidden="true" /> Añadir tarea
              </button>
            </div>
          )}
          <button type="button" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary" onClick={() => onNavigate('tareas')}>
            Ver todas las tareas <ChevronRight size={15} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </section>
        )}

        {state.habits.length > 0 && (
        <section className="card flex flex-col lg:col-span-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="section-eyebrow">Pequeños pasos</p>
              <h2 className="mt-1 text-2xl text-ink">Hábitos de hoy</h2>
            </div>
            <button type="button" className="text-sm font-medium text-primary" onClick={() => onNavigate('habitos')}>
              Ver todos
            </button>
          </div>
          {todayHabits.length ? (
            <div className="grid flex-1 gap-2 sm:grid-cols-2">
              {todayHabits.slice(0, 4).map((habit) => (
                <button
                  type="button"
                  key={habit.id}
                  onClick={(event) => {
                    if (!habit.completed) animateCompletion(event.currentTarget);
                    toggleHabitToday(habit.id);
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-token p-3 text-left transition-colors hover-surface"
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${habit.completed ? 'bg-primary-soft text-primary' : 'bg-soft text-muted'}`}>
                    {habit.completed ? <Check size={19} strokeWidth={1.5} aria-label="Completado" /> : <HabitMark value={habit.icon} size={19} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{habit.name}</span>
                  <span className="sr-only">{habit.completed ? 'Completado hoy' : 'Pendiente hoy'}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-start justify-center rounded-2xl bg-soft p-5">
              <p className="text-sm leading-relaxed text-muted">Todavía no tienes hábitos en tu rutina.</p>
              <button type="button" className="btn-secondary mt-4 inline-flex items-center gap-2 text-sm" onClick={() => onNavigate('habitos')}>
                <Plus size={15} strokeWidth={1.5} aria-hidden="true" /> Crear un hábito
              </button>
            </div>
          )}
        </section>
        )}

        {phrase && (
        <section className="card flex min-h-56 flex-col justify-between bg-surface-2 lg:col-span-5">
          <div>
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-surface/80 text-primary">
              <Heart size={20} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <p className="section-eyebrow text-primary">Un recordatorio amable</p>
            {phrase ? (
              <p className="mt-3 font-serif text-xl italic leading-relaxed text-ink">«{phrase}»</p>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted">Añade una frase personal para encontrarla aquí cuando la necesites.</p>
            )}
          </div>
          <button type="button" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary" onClick={() => onNavigate('ajustes')}>
            {phrase ? 'Editar frases' : 'Añadir una frase'} <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </section>
        )}
      </div>

      {(state.tasks.length > 0 || state.habits.length > 0) && (
      <section className="card mt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="section-eyebrow">Vista semanal</p>
            <h2 className="mt-1 text-2xl text-ink">Tu progreso</h2>
          </div>
          <button type="button" className="text-sm font-medium text-primary" onClick={() => onNavigate('semana')}>
            Ver semana
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weeklySummary.map((day) => (
            <div key={day.iso} className="flex flex-col items-center gap-2 rounded-2xl bg-soft p-2 text-center">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">{day.label}</span>
              <div className="flex h-20 w-full items-end justify-center rounded-xl border border-token bg-surface/70 p-1">
                <div className="w-full rounded-lg bg-primary transition-all" style={{ height: `${Math.max(14, day.value)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
      )}
      </>
      )}
    </div>
  );
}
