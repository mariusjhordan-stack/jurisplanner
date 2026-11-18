import { useMemo, useState, type FormEvent } from 'react';
import {
  CakeSlice,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Check,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Plus,
} from 'lucide-react';
import { useApp, useAppActions } from '../context/AppContext';
import type { CalendarEvent, Task } from '../types';
import { formatDateLong, getTodayInLima } from '../utils/dates';
import { getCourseColorStyle } from '../utils/courseColors';
import PageHeader from './PageHeader';
import config from '../data/config.json';
import AddToCalendarButton from './AddToCalendarButton';
import DayNote from './DayNote';
import { animateCompletion } from '../utils/completionAnimation';
import { getGradeCourses } from '../utils/gradebook';

interface CalendarViewProps {
  onNavigateToWeek: (date: string) => void;
  onNavigateToNotes: () => void;
}

type AgendaItem =
  | {
    id: string;
    kind: 'event';
    title: string;
    tagId: string;
    time: string;
    eventType: CalendarEvent['type'];
    calendarEvent: CalendarEvent;
  }
  | {
    id: string;
    kind: 'task';
    title: string;
    tagId: string;
    completed: boolean;
    priority: Task['priority'];
    calendarTask: Task;
  }
  | {
    id: string;
    kind: 'evaluation';
    title: string;
    tagId: string;
    courseName: string;
    week: number;
    grade: number | null;
    weight: number;
  }
  | { id: string; kind: 'birthday'; title: string };

const WEEKDAYS = [
  { short: 'L', full: 'Lunes' },
  { short: 'M', full: 'Martes' },
  { short: 'X', full: 'Miércoles' },
  { short: 'J', full: 'Jueves' },
  { short: 'V', full: 'Viernes' },
  { short: 'S', full: 'Sábado' },
  { short: 'D', full: 'Domingo' },
];

function formatMonthKey(year: number, monthIndex: number): string {
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(monthKey: string, offset: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  return formatMonthKey(year, month - 1 + offset);
}

function getMonthDates(monthKey: string): string[] {
  const [year, month] = monthKey.split('-').map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const offset = (firstDay.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, 1 - offset + index));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  });
}

function getMonthLabel(monthKey: string): string {
  const date = new Date(`${monthKey}-01T12:00:00Z`);
  const label = new Intl.DateTimeFormat('es-PE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  return label.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase('es-PE'));
}

function isBirthday(date: string): boolean {
  return date.slice(5) === config.cumpleanos.slice(5);
}

export default function CalendarView({ onNavigateToWeek, onNavigateToNotes }: CalendarViewProps) {
  const { state } = useApp();
  const { addEvent, addTask, toggleTask } = useAppActions();
  const today = getTodayInLima();
  const [currentMonth, setCurrentMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const [showForm, setShowForm] = useState(false);
  const [itemType, setItemType] = useState<'event' | 'task'>('event');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('08:00');
  const [tagId, setTagId] = useState('');
  const [eventType, setEventType] = useState<CalendarEvent['type']>('otro');
  const [priority, setPriority] = useState<Task['priority']>('media');
  const monthDates = useMemo(() => getMonthDates(currentMonth), [currentMonth]);
  const gradeCourses = useMemo(
    () => getGradeCourses(state.tags, state.settings.selectedCiclo),
    [state.settings.selectedCiclo, state.tags],
  );
  const gradeCoursesById = useMemo(() => new Map(gradeCourses.map((course) => [course.id, course])), [gradeCourses]);
  const itemsByDate = useMemo(() => {
    const visibleDates = new Set(monthDates);
    const items = new Map<string, AgendaItem[]>();

    const addToDate = (date: string, item: AgendaItem) => {
      const currentItems = items.get(date) ?? [];
      currentItems.push(item);
      items.set(date, currentItems);
    };

    state.events.forEach((event) => {
      if (visibleDates.has(event.date)) {
        addToDate(event.date, {
          id: event.id,
          kind: 'event',
          title: event.title,
          tagId: event.tagId,
          time: event.time,
          eventType: event.type,
          calendarEvent: event,
        });
      }
    });
    state.evaluations.forEach((evaluation) => {
      const course = gradeCoursesById.get(evaluation.courseId);
      if (evaluation.date && visibleDates.has(evaluation.date) && course) {
        addToDate(evaluation.date, {
          id: evaluation.id,
          kind: 'evaluation',
          title: evaluation.name,
          tagId: course.id,
          courseName: course.name,
          week: evaluation.week,
          grade: evaluation.grade,
          weight: evaluation.weight,
        });
      }
    });
    state.tasks.forEach((task) => {
      if (task.dueDate && visibleDates.has(task.dueDate)) {
        addToDate(task.dueDate, {
          id: task.id,
          kind: 'task',
          title: task.title,
          tagId: task.tagId,
          completed: task.completed,
          priority: task.priority,
          calendarTask: task,
        });
      }
    });
    monthDates.forEach((date) => {
      if (isBirthday(date)) {
        addToDate(date, {
          id: 'birthday',
          kind: 'birthday',
          title: `Cumpleaños de ${config.nombre}`,
        });
      }
    });

    items.forEach((dayItems) => {
      dayItems.sort((a, b) => {
        if (a.kind === 'birthday') return -1;
        if (b.kind === 'birthday') return 1;
        if (a.kind === 'event' && b.kind === 'event') return (a.time ?? '').localeCompare(b.time ?? '');
        if (a.kind === 'event') return -1;
        if (b.kind === 'event') return 1;
        if (a.kind !== b.kind) return a.kind === 'evaluation' ? -1 : 1;
        return 0;
      });
    });
    return items;
  }, [gradeCoursesById, monthDates, state.events, state.evaluations, state.tasks]);
  const selectedItems = itemsByDate.get(selectedDate) ?? [];

  const changeMonth = (offset: number) => {
    const nextMonth = shiftMonth(currentMonth, offset);
    setCurrentMonth(nextMonth);
    setSelectedDate(`${nextMonth}-01`);
    setShowForm(false);
  };

  const goToToday = () => {
    setCurrentMonth(today.slice(0, 7));
    setSelectedDate(today);
    setShowForm(false);
  };

  const selectDate = (date: string) => {
    setSelectedDate(date);
    setCurrentMonth(date.slice(0, 7));
    setShowForm(false);
  };

  const resetForm = () => {
    setShowForm(false);
    setItemType('event');
    setTitle('');
    setTime('08:00');
    setTagId('');
    setEventType('otro');
    setPriority('media');
  };

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    if (itemType === 'event') {
      addEvent({
        title: trimmedTitle,
        date: selectedDate,
        time,
        tagId: tagId || 'personal',
        type: eventType,
      });
    } else {
      addTask({
        title: trimmedTitle,
        completed: false,
        dueDate: selectedDate,
        priority,
        tagId: tagId || 'personal',
      });
    }
    resetForm();
  };

  const getItemColorStyle = (item: AgendaItem) => {
    const tag = item.kind !== 'birthday'
      ? state.tags.find((course) => course.id === item.tagId)
      : undefined;
    const course = item.kind === 'birthday' ? undefined : gradeCoursesById.get(item.tagId);
    return getCourseColorStyle(course?.color ?? tag?.color ?? '', course?.id ?? tag?.id ?? item.id);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Tu agenda"
        title="Calendario"
        subtitle="Tus eventos y plazos, de un vistazo."
        action={(
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Mes anterior" onClick={() => changeMonth(-1)} className="btn-secondary !px-3">
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <button type="button" onClick={goToToday} className="btn-secondary !px-3 text-xs">Hoy</button>
            <button type="button" aria-label="Mes siguiente" onClick={() => changeMonth(1)} className="btn-secondary !px-3">
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
        )}
      />

      <div className="mb-4 flex items-center gap-2">
        <CalendarRange size={19} className="text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-ink">{getMonthLabel(currentMonth)}</h2>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
        <section className="card min-w-0 !p-2 sm:!p-4" aria-label={`Calendario de ${getMonthLabel(currentMonth)}`}>
          <div className="mb-1 grid grid-cols-7 gap-1 sm:mb-2" aria-hidden="true">
            {WEEKDAYS.map((day) => (
              <span key={day.full} title={day.full} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted sm:text-xs">
                {day.short}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDates.map((date) => {
              const dateItems = itemsByDate.get(date) ?? [];
              const isCurrentMonth = date.startsWith(currentMonth);
              const isTodayDate = date === today;
              const birthday = isBirthday(date);
              const studyNoteCount = state.studyNotes.filter((note) => note.date === date).length;
              const moreCount = Math.max(0, dateItems.length - 3);
              return (
                <button
                  type="button"
                  key={date}
                  onClick={() => selectDate(date)}
                  aria-label={`${formatDateLong(date)}${dateItems.length ? `, ${dateItems.length} ${dateItems.length === 1 ? 'elemento' : 'elementos'}` : ''}${studyNoteCount ? `, ${studyNoteCount} ${studyNoteCount === 1 ? 'apunte' : 'apuntes'}` : ''}${birthday ? `, cumpleaños de ${config.nombre}` : ''}`}
                  aria-current={isTodayDate ? 'date' : undefined}
                  aria-pressed={selectedDate === date}
                  className={`flex min-h-[54px] min-w-0 flex-col rounded-xl border p-1 text-left transition-colors sm:min-h-[76px] sm:p-1.5 ${
                    isTodayDate
                      ? 'border-primary bg-primary-soft'
                      : selectedDate === date
                        ? 'border-primary/60 bg-soft ring-1 ring-primary/30'
                        : birthday
                          ? 'border-accent/50 bg-accent-soft/50 hover:bg-accent-soft'
                          : 'border-transparent bg-surface hover:border-token hover:bg-soft'
                  } ${isCurrentMonth ? '' : 'opacity-45'}`}
                >
                  <span className="flex w-full items-center justify-between gap-0.5">
                    <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-semibold sm:h-6 sm:min-w-6 sm:text-xs ${isTodayDate ? 'bg-primary text-on-primary' : 'text-ink'}`}>
                      {Number(date.slice(8))}
                    </span>
                    {birthday && <CakeSlice size={12} className="shrink-0 text-accent" aria-hidden="true" />}
                    {(state.dayNotes[date] || studyNoteCount > 0) && <FileText size={11} className="shrink-0 text-primary" aria-label="Tiene apuntes" />}
                  </span>
                  <span className="mt-1 flex min-h-2 items-center gap-1 overflow-hidden sm:mt-2">
                    {dateItems.slice(0, 3).map((item) => (
                      <span
                        key={`${item.kind}-${item.id}`}
                        className="h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2"
                        style={{ backgroundColor: getItemColorStyle(item).backgroundColor }}
                        aria-hidden="true"
                      />
                    ))}
                    {moreCount > 0 && <span className="truncate text-[9px] font-medium text-muted sm:text-[10px]">+{moreCount}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="card min-w-0">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="section-eyebrow">{selectedItems.length} {selectedItems.length === 1 ? 'elemento' : 'elementos'}</p>
              <h2 className="mt-1 break-words text-lg font-semibold text-ink">{formatDateLong(selectedDate)}</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowForm((open) => !open)}
              className="btn-primary inline-flex shrink-0 items-center gap-1.5 !px-3 !py-2 text-sm"
              aria-expanded={showForm}
            >
              <Plus size={15} aria-hidden="true" /> Añadir
            </button>
          </div>

          <div className="mb-4">
            <DayNote date={selectedDate} />
          </div>

          {showForm && (
            <form onSubmit={handleAdd} className="mb-4 space-y-3 rounded-2xl bg-soft p-3">
              <div className="flex rounded-full border border-token bg-surface p-1">
                {([
                  ['event', 'Evento'],
                  ['task', 'Tarea con fecha'],
                ] as const).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setItemType(type)}
                    aria-pressed={itemType === type}
                    className={`flex-1 rounded-full px-2 py-1.5 text-xs font-medium ${itemType === type ? 'bg-primary-soft text-primary' : 'text-muted'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="sr-only" htmlFor="calendar-item-title">Nombre del elemento</label>
              <input
                id="calendar-item-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
                placeholder={itemType === 'event' ? 'Nombre del evento' : 'Nombre de la tarea'}
                className="input-field"
                required
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                {itemType === 'event' ? (
                  <>
                    <label className="sr-only" htmlFor="calendar-item-time">Hora del evento</label>
                    <input id="calendar-item-time" type="time" value={time} onChange={(event) => setTime(event.currentTarget.value)} className="input-field min-w-0" />
                    <label className="sr-only" htmlFor="calendar-event-type">Tipo de evento</label>
                    <select id="calendar-event-type" value={eventType} onChange={(event) => setEventType(event.currentTarget.value as CalendarEvent['type'])} className="input-field min-w-0">
                      <option value="clase">Clase</option>
                      <option value="examen">Plazo / examen</option>
                      <option value="salida">Salida</option>
                      <option value="otro">Otro</option>
                    </select>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-2 rounded-xl border border-token bg-surface px-3 text-xs text-muted">
                      <CalendarCheck size={15} aria-hidden="true" /> Plazo: {Number(selectedDate.slice(8))}
                    </span>
                    <label className="sr-only" htmlFor="calendar-task-priority">Prioridad de la tarea</label>
                    <select id="calendar-task-priority" value={priority} onChange={(event) => setPriority(event.currentTarget.value as Task['priority'])} className="input-field min-w-0">
                      <option value="baja">Prioridad baja</option>
                      <option value="media">Prioridad media</option>
                      <option value="alta">Prioridad alta</option>
                    </select>
                  </>
                )}
              </div>
              <label className="sr-only" htmlFor="calendar-item-course">Curso</label>
              <select id="calendar-item-course" value={tagId} onChange={(event) => setTagId(event.currentTarget.value)} className="input-field">
                <option value="">Sin curso</option>
                {state.tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
              </select>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 text-sm">Guardar</button>
                <button type="button" onClick={resetForm} className="btn-secondary text-sm">Cancelar</button>
              </div>
            </form>
          )}

          <div className="space-y-2 lg:max-h-[55vh] lg:overflow-y-auto lg:pr-1">
            {selectedItems.map((item) => {
              if (item.kind === 'birthday') {
                return (
                  <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft/50 p-3">
                    <CakeSlice size={18} className="shrink-0 text-accent" aria-hidden="true" />
                    <span className="text-sm font-medium text-ink">{item.title}</span>
                  </div>
                );
              }

              if (item.kind === 'evaluation') {
                return (
                  <article key={`evaluation-${item.id}`} className="card flex items-center gap-3 !p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={getItemColorStyle(item)}>
                      <ClipboardList size={17} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-medium text-ink">{item.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                        <span>Evaluación · {item.courseName}</span>
                        <span>Semana {item.week}</span>
                        <span>Peso {item.weight}%</span>
                        <span>{item.grade === null ? 'Sin nota' : `Nota ${item.grade}`}</span>
                      </span>
                    </span>
                    <button type="button" onClick={onNavigateToNotes} className="shrink-0 text-xs font-medium text-primary">Notas</button>
                  </article>
                );
              }

              const tag = item.tagId ? state.tags.find((course) => course.id === item.tagId) : undefined;
              const colorStyle = getItemColorStyle(item);
              const itemLabel = item.kind === 'task' ? 'Tarea con fecha' : item.eventType === 'examen' ? 'Plazo / examen' : 'Evento';
              const ItemIcon = item.kind === 'task' ? CalendarCheck : CalendarClock;
              const time = item.kind === 'event' ? item.time : undefined;
              const priority = item.kind === 'task' ? item.priority : undefined;
              const completed = item.kind === 'task' && item.completed;
              const content = (
                <>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={colorStyle}>
                    {completed
                      ? <Check size={17} aria-hidden="true" />
                      : <ItemIcon size={17} aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block break-words text-sm font-medium ${completed ? 'text-muted line-through' : 'text-ink'}`}>{item.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                      <span>{itemLabel}</span>
                      {time && <span className="inline-flex items-center gap-1"><Clock3 size={12} aria-hidden="true" />{time}</span>}
                      {priority && <span>Prioridad {priority}</span>}
                      {tag && <span className="tag !px-2 !py-0.5 text-[10px]" style={getCourseColorStyle(tag.color, tag.id)}>{tag.name}</span>}
                    </span>
                  </span>
                </>
              );

              return item.kind === 'task' ? (
                <article key={`task-${item.id}`} className="card flex items-center gap-2 !p-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      if (!item.completed) animateCompletion(event.currentTarget.closest('.card'));
                      toggleTask(item.id);
                    }}
                    aria-label={item.completed ? `Marcar ${item.title} como pendiente` : `Completar ${item.title}`}
                    aria-pressed={item.completed}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {content}
                  </button>
                  <AddToCalendarButton compact entry={{ kind: 'task', task: item.calendarTask }} />
                </article>
              ) : (
                <article key={`event-${item.id}`} className="card flex items-center gap-2 !p-3">
                  {content}
                  <AddToCalendarButton
                    compact
                    entry={{ kind: 'event', event: item.calendarEvent }}
                  />
                </article>
              );
            })}
            {!selectedItems.length && (
              <div className="rounded-2xl bg-soft p-4 text-center">
                <CalendarDays size={20} className="mx-auto mb-2 text-muted" aria-hidden="true" />
                <p className="text-sm text-muted">No hay eventos ni tareas con fecha para este día.</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigateToWeek(selectedDate)}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <CalendarDays size={15} aria-hidden="true" /> Ver en Mi semana
          </button>
        </aside>
      </div>
    </div>
  );
}
