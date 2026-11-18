import { useMemo, useState } from 'react';
import { CalendarClock, Check, ChevronLeft, ChevronRight, ClipboardList, Clock3, Plus } from 'lucide-react';
import type { NavTab } from '../types';
import { useApp, useAppActions } from '../context/AppContext';
import { formatDate, formatDateLong, formatDateShort, getWeekDates, isToday, getTodayInLima } from '../utils/dates';
import { getCourseColorStyle } from '../utils/courseColors';
import PageHeader from './PageHeader';
import AddToCalendarButton from './AddToCalendarButton';
import DayNote from './DayNote';
import HabitMark from './HabitMark';
import { animateCompletion } from '../utils/completionAnimation';
import { getGradeCourses } from '../utils/gradebook';
import { getWeekdayInLima, SCHEDULE_CLASS_TYPES } from '../utils/schedule';
import ScheduleView from './ScheduleView';

const DAY_COLORS = [
  { backgroundColor: '#ead9ff', color: '#604779' },
  { backgroundColor: '#fde4cf', color: '#815536' },
  { backgroundColor: '#dcecdf', color: '#405c45' },
  { backgroundColor: '#f8dde5', color: '#744654' },
  { backgroundColor: '#d9ebf4', color: '#3d5a69' },
  { backgroundColor: '#f4e9b8', color: '#69591d' },
  { backgroundColor: '#e4e6f4', color: '#4f526f' },
];

function getWeekOffset(date: string): number {
  const currentWeek = getWeekDates(getTodayInLima())[0];
  const targetWeek = getWeekDates(date)[0];
  return Math.round(
    (new Date(`${targetWeek}T12:00:00Z`).getTime() - new Date(`${currentWeek}T12:00:00Z`).getTime())
      / (7 * 24 * 60 * 60 * 1000),
  );
}

export default function WeekView({
  onNavigate,
  initialDate = getTodayInLima(),
}: {
  onNavigate: (tab: NavTab) => void;
  initialDate?: string;
}) {
  const { state } = useApp();
  const { toggleTask, toggleHabitToday } = useAppActions();
  const [weekOffset, setWeekOffset] = useState(() => getWeekOffset(initialDate));
  const [selected, setSelected] = useState(initialDate);
  const [mode, setMode] = useState<'agenda' | 'schedule'>('agenda');
  const base = useMemo(() => {
    const date = new Date(`${getTodayInLima()}T12:00:00`);
    date.setDate(date.getDate() + weekOffset * 7);
    return formatDate(date);
  }, [weekOffset]);
  const dates = useMemo(() => getWeekDates(base), [base]);
  const gradeCourses = useMemo(
    () => getGradeCourses(state.tags, state.settings.selectedCiclo),
    [state.settings.selectedCiclo, state.tags],
  );
  const gradeCoursesById = useMemo(() => new Map(gradeCourses.map((course) => [course.id, course])), [gradeCourses]);

  const getDayItems = (date: string) => ({
    events: state.events.filter((event) => event.date === date).sort((a, b) => a.time.localeCompare(b.time)),
    scheduleClasses: state.scheduleClasses
      .filter((scheduleClass) => scheduleClass.day === getWeekdayInLima(date))
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    tasks: state.tasks.filter((task) => task.dueDate === date),
    evaluations: state.evaluations.filter((evaluation) => (
      evaluation.date === date && gradeCoursesById.has(evaluation.courseId)
    )),
    habits: state.habits,
  });

  const renderAgenda = (date: string) => {
    const { events, scheduleClasses, tasks, evaluations, habits } = getDayItems(date);
    return (
      <div className="space-y-2">
        {scheduleClasses.map((scheduleClass) => {
          const course = gradeCoursesById.get(scheduleClass.courseId);
          const type = SCHEDULE_CLASS_TYPES.find((item) => item.value === scheduleClass.type)?.label ?? 'Teoría';
          return (
            <article key={scheduleClass.id} className="card flex items-center gap-3 !p-3.5" style={getCourseColorStyle(course?.color ?? '', scheduleClass.courseId)}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/40">
                <Clock3 size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-medium">{course?.name ?? 'Curso no disponible'}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span>{scheduleClass.startTime}–{scheduleClass.endTime}</span>
                  <span>{type}</span>
                  {scheduleClass.classroom && <span>{scheduleClass.classroom}</span>}
                </span>
              </span>
            </article>
          );
        })}
        {events.map((event) => {
          const tag = state.tags.find((item) => item.id === event.tagId);
          return (
            <article key={event.id} className="card flex items-center gap-3 !p-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-ink" style={tag ? getCourseColorStyle(tag.color, tag.id) : undefined}>
                <CalendarClock size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-medium text-ink">{event.title}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><Clock3 size={13} aria-hidden="true" />{event.time}{event.endTime ? ` – ${event.endTime}` : ''}</span>
                  {tag && <span className="tag !px-2.5 !py-1 text-[10px]" style={getCourseColorStyle(tag.color, tag.id)}>{tag.name}</span>}
                </span>
              </span>
              <AddToCalendarButton compact entry={{ kind: 'event', event }} />
            </article>
          );
        })}
        {evaluations.map((evaluation) => {
          const course = gradeCoursesById.get(evaluation.courseId);
          if (!course) return null;
          return (
            <article key={evaluation.id} className="card flex items-center gap-3 !p-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={getCourseColorStyle(course.color, course.id)}>
                <ClipboardList size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-medium text-ink">{evaluation.name}</span>
                <span className="mt-1 block text-xs text-muted">
                  Evaluación · {course.name} · Semana {evaluation.week}
                  {evaluation.grade === null ? '' : ` · Nota ${evaluation.grade}`}
                </span>
              </span>
              <button type="button" onClick={() => onNavigate('notas')} className="text-xs font-medium text-primary">Notas</button>
            </article>
          );
        })}
        {tasks.map((task) => {
          const tag = state.tags.find((item) => item.id === task.tagId);
          return (
            <div key={task.id} className="card flex items-center gap-3 !p-3.5">
              <button
                type="button"
                onClick={(event) => {
                  if (!task.completed) animateCompletion(event.currentTarget.closest('.card'));
                  toggleTask(task.id);
                }}
                aria-label={task.completed ? `Marcar ${task.title} como pendiente` : `Completar ${task.title}`}
                aria-pressed={task.completed}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${task.completed ? 'bg-primary text-on-primary' : 'bg-surface-2 text-muted'}`}>
                  {task.completed && <Check size={16} aria-hidden="true" />}
                </span>
                <span className={`min-w-0 flex-1 break-words text-sm ${task.completed ? 'text-muted line-through' : 'text-ink'}`}>{task.title}</span>
                {tag && <span className="tag !px-2.5 !py-1 text-[10px]" style={getCourseColorStyle(tag.color, tag.id)}>{tag.name}</span>}
              </button>
              <AddToCalendarButton compact entry={{ kind: 'task', task }} />
            </div>
          );
        })}
        {habits.map((habit) => {
          const completed = habit.completedDates.includes(date);
          const canToggle = date === getTodayInLima();
          return (
            <button
              key={habit.id}
              type="button"
              onClick={(event) => {
                if (!canToggle) return;
                if (!completed) animateCompletion(event.currentTarget);
                toggleHabitToday(habit.id);
              }}
              disabled={!canToggle}
              className="card flex w-full items-center gap-3 !p-3.5 text-left disabled:cursor-default"
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${completed ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-muted'}`}>
                <HabitMark value={habit.icon} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-medium text-ink">{habit.name}</span>
                <span className="mt-1 block text-xs text-muted">{completed ? 'Completado' : 'Pendiente'}</span>
              </span>
              {completed && <Check size={17} className="shrink-0 text-primary" aria-label="Completado" />}
            </button>
          );
        })}
        {!scheduleClasses.length && !events.length && !tasks.length && !evaluations.length && !habits.length && (
          <div className="flex items-center justify-between gap-3 py-2">
            <p className="text-sm text-muted">Aún no hay nada para este día.</p>
            <button type="button" className="btn-secondary inline-flex shrink-0 items-center gap-2 text-sm" onClick={() => onNavigate('eventos')}>
              <Plus size={15} aria-hidden="true" /> Añadir
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderBoardDay = (date: string, index: number) => {
    const { events, scheduleClasses, tasks, evaluations, habits } = getDayItems(date);
    const completedTasks = tasks.filter((task) => task.completed).length;
    const completedHabits = habits.filter((habit) => habit.completedDates.includes(date)).length;
    const total = tasks.length + habits.length;
    const completed = completedTasks + completedHabits;
    const progress = total ? Math.round((completed / total) * 100) : 0;
    const today = isToday(date);
    const colors = DAY_COLORS[index];

    return (
      <article
        key={date}
        className={`flex min-h-[420px] min-w-[150px] snap-start flex-col overflow-hidden rounded-2xl border bg-surface ${today ? 'border-primary ring-2 ring-token' : 'border-token'}`}
        aria-current={today ? 'date' : undefined}
      >
        <header className="px-3 py-3" style={colors}>
          <h3 className="text-sm font-semibold">{formatDateShort(date)}</h3>
          {today && <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide">Hoy</span>}
          <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
            <span>{total ? `${completed}/${total} completados` : 'Sin pendientes'}</span>
            <span>{scheduleClasses.length} {scheduleClasses.length === 1 ? 'clase' : 'clases'} · {events.length} {events.length === 1 ? 'evento' : 'eventos'}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/55" role="progressbar" aria-label={`Progreso de ${formatDateShort(date)}`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-current transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </header>

        <div className="flex-1 space-y-2 p-2">
          <DayNote date={date} compact />
          {scheduleClasses.map((scheduleClass) => {
            const course = gradeCoursesById.get(scheduleClass.courseId);
            return (
              <div key={scheduleClass.id} className="rounded-xl border border-white/60 p-2" style={getCourseColorStyle(course?.color ?? '', scheduleClass.courseId)}>
                <span className="block text-[10px] font-medium">{scheduleClass.startTime}–{scheduleClass.endTime}</span>
                <p className="mt-1 break-words text-xs font-semibold">{course?.name ?? 'Curso no disponible'}</p>
                <span className="mt-1 block text-[9px]">
                  {SCHEDULE_CLASS_TYPES.find((item) => item.value === scheduleClass.type)?.label ?? 'Teoría'}
                  {scheduleClass.classroom ? ` · ${scheduleClass.classroom}` : ''}
                </span>
              </div>
            );
          })}
          {events.map((event) => {
            const tag = state.tags.find((item) => item.id === event.tagId);
            return (
              <div key={event.id} className="flex items-start gap-1 rounded-xl border border-token bg-soft p-2">
                <div className="min-w-0 flex-1">
                  <span className="block text-[10px] font-medium text-muted">{event.time}{event.endTime ? ` – ${event.endTime}` : ''}</span>
                  <p className="mt-1 break-words text-xs font-medium text-ink">{event.title}</p>
                  {tag && <span className="mt-1.5 inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[9px]" style={getCourseColorStyle(tag.color, tag.id)}>{tag.name}</span>}
                </div>
                <AddToCalendarButton compact entry={{ kind: 'event', event }} />
              </div>
            );
          })}
          {evaluations.map((evaluation) => {
            const course = gradeCoursesById.get(evaluation.courseId);
            if (!course) return null;
            return (
              <button
                key={evaluation.id}
                type="button"
                onClick={() => onNavigate('notas')}
                className="flex w-full items-start gap-1.5 rounded-xl border border-token p-2 text-left"
                style={getCourseColorStyle(course.color, course.id)}
                title={`${course.name} · Semana ${evaluation.week}${evaluation.grade === null ? '' : ` · Nota ${evaluation.grade}`}`}
              >
                <ClipboardList size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block break-words text-[10px] font-medium">{evaluation.name}</span>
                  <span className="mt-0.5 block truncate text-[9px]">{course.name}{evaluation.grade === null ? '' : ` · ${evaluation.grade}`}</span>
                </span>
              </button>
            );
          })}
          {tasks.map((task) => {
            const tag = state.tags.find((item) => item.id === task.tagId);
            return (
              <div key={task.id} className="flex items-start gap-1 rounded-xl border border-token bg-surface p-2">
                <button
                  type="button"
                  onClick={(event) => {
                    if (!task.completed) animateCompletion(event.currentTarget.closest('div'));
                    toggleTask(task.id);
                  }}
                  aria-label={task.completed ? `Marcar ${task.title} como pendiente` : `Completar ${task.title}`}
                  aria-pressed={task.completed}
                  className="flex min-w-0 flex-1 items-start gap-2 text-left"
                >
                  <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${task.completed ? 'border-primary bg-primary text-on-primary' : 'border-token text-transparent'}`}>
                    {task.completed && <Check size={10} aria-hidden="true" />}
                  </span>
                  <span className="min-w-0">
                    <span className={`block break-words text-xs ${task.completed ? 'text-muted line-through' : 'text-ink'}`}>{task.title}</span>
                    {tag && <span className="mt-1 inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[9px]" style={getCourseColorStyle(tag.color, tag.id)}>{tag.name}</span>}
                  </span>
                </button>
                <AddToCalendarButton compact entry={{ kind: 'task', task }} />
              </div>
            );
          })}
          {habits.map((habit) => {
            const completedToday = habit.completedDates.includes(date);
            const canToggle = date === getTodayInLima();
            return (
              <button
                type="button"
                key={habit.id}
                onClick={(event) => {
                  if (!canToggle) return;
                  if (!completedToday) animateCompletion(event.currentTarget);
                  toggleHabitToday(habit.id);
                }}
                disabled={!canToggle}
                title={`${habit.name}: ${completedToday ? 'completado' : 'pendiente'}`}
                className={`flex min-w-0 items-center gap-1.5 rounded-lg border px-1.5 py-1 text-[10px] ${completedToday ? 'border-primary/40 bg-primary-soft text-ink' : 'border-token bg-soft text-muted'}`}
              >
                <span className="grid h-4 w-4 shrink-0 place-items-center">
                  <HabitMark value={habit.icon} size={12} />
                </span>
                <span className="min-w-0 truncate">{habit.name}</span>
                {completedToday && <Check size={11} className="ml-auto shrink-0 text-primary" aria-hidden="true" />}
              </button>
            );
          })}
          {!scheduleClasses.length && !events.length && !tasks.length && !evaluations.length && !habits.length && (
            <button type="button" onClick={() => onNavigate('eventos')} className="flex min-h-20 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-token text-xs text-muted hover:text-primary">
              <Plus size={15} aria-hidden="true" /> Añadir evento
            </button>
          )}
        </div>
      </article>
    );
  };

  const changeWeek = (offset: number) => {
    setWeekOffset((current) => current + offset);
    setSelected((current) => {
      const date = new Date(`${current}T12:00:00`);
      date.setDate(date.getDate() + offset * 7);
      return formatDate(date);
    });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Tu ritmo, tu semana"
        title="Mi semana"
        subtitle="Una mirada amable a lo que tienes por delante."
        action={(
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Semana anterior" onClick={() => changeWeek(-1)} className="btn-secondary !px-3">
              <ChevronLeft size={17} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => { setWeekOffset(0); setSelected(getTodayInLima()); }} className="btn-secondary !px-3 text-xs">Hoy</button>
            <button type="button" aria-label="Semana siguiente" onClick={() => changeWeek(1)} className="btn-secondary !px-3">
              <ChevronRight size={17} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        )}
      />

      <div role="tablist" aria-label="Vistas de Semana" className="mb-4 inline-flex rounded-full border border-token bg-surface p-1">
        <button type="button" role="tab" aria-selected={mode === 'agenda'} onClick={() => setMode('agenda')} className={`rounded-full px-4 py-2 text-sm ${mode === 'agenda' ? 'bg-primary text-on-primary' : 'text-muted'}`}>
          Agenda
        </button>
        <button type="button" role="tab" aria-selected={mode === 'schedule'} onClick={() => setMode('schedule')} className={`rounded-full px-4 py-2 text-sm ${mode === 'schedule' ? 'bg-primary text-on-primary' : 'text-muted'}`}>
          Horario
        </button>
      </div>

      {mode === 'agenda' ? (
        <>
          <div className="mb-3 flex gap-2 overflow-x-auto snap-x snap-mandatory pb-3 lg:hidden">
            {dates.map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => setSelected(date)}
                aria-pressed={selected === date}
                className={`card min-w-[92px] shrink-0 snap-start !p-3 text-center ${selected === date ? 'ring-2 ring-token' : ''}`}
              >
                <span className="block text-xs font-medium text-ink">{formatDateShort(date)}</span>
                {isToday(date) && <span className="mt-1 block text-[10px] text-primary">Hoy</span>}
              </button>
            ))}
          </div>

          <section className="card lg:hidden">
            <header className="mb-4">
              <h2 className="font-semibold text-ink">{formatDateLong(selected)}</h2>
            </header>
            <div className="mb-3">
              <DayNote date={selected} />
            </div>
            {renderAgenda(selected)}
          </section>

          <section className="hidden lg:block">
            <div className="snap-x snap-mandatory overflow-x-auto pb-3">
              <div className="grid min-w-[1080px] grid-cols-7 gap-3">
                {dates.map(renderBoardDay)}
              </div>
            </div>
          </section>
        </>
      ) : (
        <ScheduleView dates={dates} selectedDate={selected} onSelectDate={setSelected} />
      )}
    </div>
  );
}
