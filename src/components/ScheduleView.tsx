import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Clock3, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp, useAppActions } from '../context/AppContext';
import type { ScheduleClass, ScheduleClassType } from '../types';
import { formatDateShort, getTodayInLima } from '../utils/dates';
import { getCourseColorStyle } from '../utils/courseColors';
import { getGradeCourses } from '../utils/gradebook';
import {
  getCurrentTimeInLima,
  getScheduleConflicts,
  getWeekdayInLima,
  SCHEDULE_CLASS_TYPES,
  timeToMinutes,
  WEEKDAYS,
} from '../utils/schedule';

interface ScheduleViewProps {
  dates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

interface ScheduleForm {
  courseId: string;
  day: string;
  startTime: string;
  endTime: string;
  classroom: string;
  type: ScheduleClassType;
}

const EMPTY_FORM: ScheduleForm = {
  courseId: '',
  day: '1',
  startTime: '08:00',
  endTime: '09:00',
  classroom: '',
  type: 'teoria',
};

const HOUR_HEIGHT = 48;

function getTypeLabel(type: ScheduleClassType): string {
  return SCHEDULE_CLASS_TYPES.find((item) => item.value === type)?.label ?? 'Teoría';
}

function getClassConflicts(scheduleClass: ScheduleForm, classes: ScheduleClass[], editingId: string | null): ScheduleClass[] {
  const start = timeToMinutes(scheduleClass.startTime);
  const end = timeToMinutes(scheduleClass.endTime);
  return classes.filter((other) => (
    other.id !== editingId
    && other.day === Number(scheduleClass.day)
    && start < timeToMinutes(other.endTime)
    && timeToMinutes(other.startTime) < end
  ));
}

export default function ScheduleView({ dates, selectedDate, onSelectDate }: ScheduleViewProps) {
  const { state } = useApp();
  const { addScheduleClass, updateScheduleClass, deleteScheduleClass, setScheduleRange } = useAppActions();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [now, setNow] = useState(() => new Date());
  const currentTime = getCurrentTimeInLima(now);
  const currentDay = getWeekdayInLima(getTodayInLima());
  const courses = useMemo(
    () => getGradeCourses(state.tags, state.settings.selectedCiclo),
    [state.settings.selectedCiclo, state.tags],
  );
  const coursesById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const conflicts = useMemo(() => getScheduleConflicts(state.scheduleClasses), [state.scheduleClasses]);
  const conflictingIds = new Set(conflicts.flatMap(([first, second]) => [first.id, second.id]));
  const formConflicts = getClassConflicts(form, state.scheduleClasses, editingId);
  const dayNumber = getWeekdayInLima(selectedDate);
  const selectedClasses = state.scheduleClasses
    .filter((scheduleClass) => scheduleClass.day === dayNumber)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const rangeStart = timeToMinutes(state.scheduleRange.startTime);
  const rangeEnd = timeToMinutes(state.scheduleRange.endTime);
  const hourCount = (rangeEnd - rangeStart) / 60;
  const hourMarks = Array.from({ length: hourCount + 1 }, (_, index) => rangeStart + index * 60);
  const hourOptions = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
  const outsideRangeCount = state.scheduleClasses.filter((item) => (
    timeToMinutes(item.endTime) <= rangeStart || timeToMinutes(item.startTime) >= rangeEnd
  )).length;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const updateFormField = <K extends keyof ScheduleForm>(key: K, value: ScheduleForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const openNewForm = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      courseId: courses[0]?.id ?? '',
      day: String(dayNumber),
    });
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (scheduleClass: ScheduleClass) => {
    setEditingId(scheduleClass.id);
    setForm({
      courseId: scheduleClass.courseId,
      day: String(scheduleClass.day),
      startTime: scheduleClass.startTime,
      endTime: scheduleClass.endTime,
      classroom: scheduleClass.classroom,
      type: scheduleClass.type,
    });
    setFormError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setFormError('');
  };

  const saveClass = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!coursesById.has(form.courseId)) {
      setFormError('Elige un curso de Mis cursos.');
      return;
    }
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(form.startTime)
      || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(form.endTime)
      || form.startTime >= form.endTime) {
      setFormError('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    const scheduleClass = {
      courseId: form.courseId,
      day: Number(form.day),
      startTime: form.startTime,
      endTime: form.endTime,
      classroom: form.classroom.trim(),
      type: form.type,
    };
    if (editingId) updateScheduleClass({ ...scheduleClass, id: editingId });
    else addScheduleClass(scheduleClass);
    closeForm();
  };

  const removeClass = (scheduleClass: ScheduleClass) => {
    const courseName = coursesById.get(scheduleClass.courseId)?.name ?? 'esta clase';
    if (window.confirm(`¿Eliminar ${courseName} del horario?`)) {
      deleteScheduleClass(scheduleClass.id);
      closeForm();
    }
  };

  const changeRange = (key: 'startTime' | 'endTime', value: string) => {
    setScheduleRange({ ...state.scheduleRange, [key]: value });
  };

  const renderClassBlock = (scheduleClass: ScheduleClass, date: string) => {
    const course = coursesById.get(scheduleClass.courseId);
    const start = Math.max(timeToMinutes(scheduleClass.startTime), rangeStart);
    const end = Math.min(timeToMinutes(scheduleClass.endTime), rangeEnd);
    if (end <= start) return null;
    const inProgress = date === getTodayInLima()
      && isClassOnToday(scheduleClass, currentDay, currentTime);
    const hasConflict = conflictingIds.has(scheduleClass.id);
    return (
      <button
        key={scheduleClass.id}
        type="button"
        onClick={() => openEditForm(scheduleClass)}
        aria-label={`Editar ${course?.name ?? 'curso no disponible'}, ${scheduleClass.startTime} a ${scheduleClass.endTime}`}
        title={`${course?.name ?? 'Curso no disponible'} · ${scheduleClass.startTime}–${scheduleClass.endTime}${scheduleClass.classroom ? ` · ${scheduleClass.classroom}` : ''} · ${getTypeLabel(scheduleClass.type)}`}
        className={`absolute inset-x-1 z-10 overflow-hidden rounded-xl border border-white/60 px-2 py-1 text-left shadow-sm ${inProgress ? 'ring-2 ring-primary ring-offset-1' : ''} ${hasConflict ? 'ring-2 ring-rose-500' : ''}`}
        style={{
          ...getCourseColorStyle(course?.color ?? '', scheduleClass.courseId),
          top: `${((start - rangeStart) / 60) * HOUR_HEIGHT}px`,
          height: `${Math.max(28, ((end - start) / 60) * HOUR_HEIGHT)}px`,
        }}
      >
        <span className="block truncate text-[11px] font-semibold">{course?.name ?? 'Curso no disponible'}</span>
        <span className="block truncate text-[10px]">{scheduleClass.startTime}–{scheduleClass.endTime}</span>
        {scheduleClass.classroom && <span className="hidden truncate text-[10px] xl:block">{scheduleClass.classroom}</span>}
      </button>
    );
  };

  return (
    <section aria-label="Horario semanal">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-eyebrow">Vista de horario</p>
          <h2 className="mt-1 text-xl text-ink">Clases semanales</h2>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-ink">
            Desde
            <select
              aria-label="Hora inicial visible"
              value={state.scheduleRange.startTime}
              onChange={(event) => changeRange('startTime', event.currentTarget.value)}
              className="input-field mt-1 !w-auto !px-3 !py-2"
            >
              {hourOptions.slice(0, 23).map((time) => (
                <option key={time} value={time} disabled={time >= state.scheduleRange.endTime}>{time}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-ink">
            Hasta
            <select
              aria-label="Hora final visible"
              value={state.scheduleRange.endTime}
              onChange={(event) => changeRange('endTime', event.currentTarget.value)}
              className="input-field mt-1 !w-auto !px-3 !py-2"
            >
              {hourOptions.slice(1).map((time) => (
                <option key={time} value={time} disabled={time <= state.scheduleRange.startTime}>{time}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={openNewForm} className="btn-primary hidden items-center gap-2 text-sm sm:inline-flex">
            <Plus size={16} aria-hidden="true" /> Añadir clase
          </button>
        </div>
      </div>

      {conflicts.length > 0 && (
        <p role="status" className="mb-3 rounded-2xl border border-accent/40 bg-accent-soft px-4 py-3 text-sm text-ink">
          Hay {conflicts.length} superposición{conflicts.length === 1 ? '' : 'es'} en tu horario. Revisa las clases resaltadas.
        </p>
      )}
      {outsideRangeCount > 0 && (
        <p role="status" className="mb-3 text-xs text-muted">
          {outsideRangeCount} {outsideRangeCount === 1 ? 'clase queda' : 'clases quedan'} fuera del rango visible. Ajusta las horas para verla.
        </p>
      )}
      {!courses.length && (
        <p className="mb-3 text-sm text-muted">Primero selecciona un ciclo o agrega un curso en Mis cursos.</p>
      )}

      <div className="mb-3 flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 sm:hidden">
        {dates.map((date) => {
          const today = date === getTodayInLima();
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              aria-pressed={selectedDate === date}
              aria-current={today ? 'date' : undefined}
              className={`card min-w-[84px] shrink-0 snap-start !p-3 text-center ${selectedDate === date ? 'ring-2 ring-token' : ''}`}
            >
              <span className="block text-xs font-medium text-ink">{formatDateShort(date)}</span>
              {today && <span className="mt-1 block text-[10px] text-primary">Hoy</span>}
            </button>
          );
        })}
      </div>

      <div className="sm:hidden">
        <h3 className="mb-3 text-sm font-medium text-ink">
          {WEEKDAYS.find((item) => item.day === dayNumber)?.full} · {formatDateShort(selectedDate)}
        </h3>
        {selectedClasses.length ? (
          <div className="space-y-2">
            {selectedClasses.map((scheduleClass) => {
              const course = coursesById.get(scheduleClass.courseId);
              const inProgress = isClassOnToday(scheduleClass, currentDay, currentTime)
                && selectedDate === getTodayInLima();
              const hasConflict = conflictingIds.has(scheduleClass.id);
              return (
                <article
                  key={scheduleClass.id}
                  className={`card !p-4 ${inProgress ? 'ring-2 ring-primary' : ''} ${hasConflict ? 'ring-2 ring-rose-500' : ''}`}
                  style={getCourseColorStyle(course?.color ?? '', scheduleClass.courseId)}
                >
                  {inProgress && <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide">En curso</p>}
                  <div className="flex items-start gap-3">
                    <Clock3 size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{course?.name ?? 'Curso no disponible'}</p>
                      <p className="mt-1 text-xs">{scheduleClass.startTime}–{scheduleClass.endTime} · {getTypeLabel(scheduleClass.type)}</p>
                      {scheduleClass.classroom && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs">
                          <MapPin size={13} aria-hidden="true" /> {scheduleClass.classroom}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => openEditForm(scheduleClass)} aria-label={`Editar ${course?.name ?? 'clase'}`} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/40">
                        <Pencil size={15} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => removeClass(scheduleClass)} aria-label={`Eliminar ${course?.name ?? 'clase'}`} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/40">
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card py-10 text-center">
            <p className="text-sm text-muted">Aún no tienes clases para este día.</p>
            <p className="mt-1 text-xs text-muted">Agrega aquí tu horario semanal cuando quieras.</p>
          </div>
        )}
      </div>

      <div className="hidden max-h-[65vh] overflow-auto rounded-2xl border border-token bg-surface sm:block">
        <div
          className="grid w-max min-w-full"
          style={{ gridTemplateColumns: '68px repeat(7, minmax(150px, 1fr))' }}
        >
          <div className="sticky left-0 top-0 z-30 flex h-12 items-center justify-center border-b border-token bg-surface text-[10px] font-semibold uppercase text-muted">
            Hora
          </div>
          {dates.map((date) => {
            const today = date === getTodayInLima();
            return (
              <div key={date} className={`sticky top-0 z-20 flex h-12 flex-col justify-center border-b border-l border-token bg-surface px-2 ${today ? 'text-primary' : 'text-ink'}`}>
                <span className="text-xs font-semibold">{WEEKDAYS.find((item) => item.day === getWeekdayInLima(date))?.short}</span>
                <span className="text-[10px] text-muted">{formatDateShort(date)}{today ? ' · Hoy' : ''}</span>
              </div>
            );
          })}

          <div className="sticky left-0 z-10 bg-surface" style={{ height: `${hourCount * HOUR_HEIGHT}px` }}>
            {hourMarks.map((minutes) => {
              const isRangeStart = minutes === rangeStart;
              const isRangeEnd = minutes === rangeEnd;
              const top = ((minutes - rangeStart) / 60) * HOUR_HEIGHT;
              return (
                <span
                  key={minutes}
                  className="absolute right-2 text-[10px] leading-none text-muted"
                  style={{
                    top: `${top + (isRangeStart ? 4 : isRangeEnd ? -4 : 0)}px`,
                    transform: isRangeStart ? 'none' : isRangeEnd ? 'translateY(-100%)' : 'translateY(-50%)',
                  }}
                >
                  {`${String(Math.floor(minutes / 60)).padStart(2, '0')}:00`}
                </span>
              );
            })}
          </div>
          {dates.map((date) => {
            const weekday = getWeekdayInLima(date);
            const dayClasses = state.scheduleClasses
              .filter((scheduleClass) => scheduleClass.day === weekday)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            const isCurrentDay = date === getTodayInLima() && currentDay === weekday;
            const currentMinutes = timeToMinutes(currentTime);
            const showNow = isCurrentDay && currentMinutes >= rangeStart && currentMinutes <= rangeEnd;
            return (
              <div
                key={date}
                className="relative border-l border-token"
                style={{
                  height: `${hourCount * HOUR_HEIGHT}px`,
                  backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0, var(--border) 1px, transparent 1px, transparent ${HOUR_HEIGHT}px)`,
                }}
              >
                {dayClasses.map((scheduleClass) => renderClassBlock(scheduleClass, date))}
                {showNow && (
                  <div className="absolute inset-x-0 z-20 h-0.5 bg-rose-500" style={{ top: `${((currentMinutes - rangeStart) / 60) * HOUR_HEIGHT}px` }}>
                    <span className="absolute -top-2 right-1 rounded bg-rose-500 px-1 text-[9px] font-semibold text-white">Ahora</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={openNewForm}
        aria-label="Añadir clase"
        className="fixed bottom-24 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-primary text-on-primary shadow-lg sm:hidden"
      >
        <Plus size={23} aria-hidden="true" />
      </button>

      {formOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
          <form
            onSubmit={saveClass}
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-form-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-surface p-5 shadow-2xl sm:rounded-[2rem]"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="schedule-form-title" className="text-xl text-ink">{editingId ? 'Editar clase' : 'Añadir clase'}</h2>
              <button type="button" onClick={closeForm} className="text-sm text-muted">Cerrar</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-ink sm:col-span-2">
                Curso
                <select value={form.courseId} onChange={(event) => updateFormField('courseId', event.currentTarget.value)} className="input-field mt-1.5" required>
                  <option value="" disabled>Elige un curso de Mis cursos</option>
                  {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-ink">
                Día
                <select value={form.day} onChange={(event) => updateFormField('day', event.currentTarget.value)} className="input-field mt-1.5">
                  {WEEKDAYS.map((day) => <option key={day.day} value={day.day}>{day.full}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-ink">
                Tipo
                <select
                  value={form.type}
                  onChange={(event) => {
                    const selectedType = SCHEDULE_CLASS_TYPES.find((item) => item.value === event.currentTarget.value)?.value;
                    if (selectedType) updateFormField('type', selectedType);
                  }}
                  className="input-field mt-1.5"
                >
                  {SCHEDULE_CLASS_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-ink">
                Inicio
                <input type="time" value={form.startTime} onChange={(event) => updateFormField('startTime', event.currentTarget.value)} className="input-field mt-1.5" required />
              </label>
              <label className="text-xs font-medium text-ink">
                Fin
                <input type="time" value={form.endTime} onChange={(event) => updateFormField('endTime', event.currentTarget.value)} className="input-field mt-1.5" required />
              </label>
              <label className="text-xs font-medium text-ink sm:col-span-2">
                Aula <span className="font-normal text-muted">(opcional)</span>
                <input type="text" value={form.classroom} onChange={(event) => updateFormField('classroom', event.currentTarget.value)} maxLength={100} className="input-field mt-1.5" placeholder="Ej. B-204" />
              </label>
            </div>
            {formConflicts.length > 0 && (
              <p role="status" className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-xs text-ink">
                Se superpone con {formConflicts.map((item) => coursesById.get(item.courseId)?.name ?? 'otra clase').join(', ')}. Puedes guardar igualmente.
              </p>
            )}
            {formError && <p role="alert" className="mt-3 text-sm text-primary">{formError}</p>}
            <div className="mt-5 flex gap-2">
              <button type="submit" disabled={!courses.length} className="btn-primary flex-1 text-sm disabled:opacity-50">
                Guardar clase
              </button>
              {editingId && (
                <button type="button" onClick={() => {
                  const scheduleClass = state.scheduleClasses.find((item) => item.id === editingId);
                  if (scheduleClass) removeClass(scheduleClass);
                }} className="btn-secondary text-sm">
                  Eliminar
                </button>
              )}
              <button type="button" onClick={closeForm} className="btn-secondary text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function isClassOnToday(scheduleClass: ScheduleClass, todayDay: number, currentTime: string): boolean {
  return scheduleClass.day === todayDay
    && timeToMinutes(scheduleClass.startTime) <= timeToMinutes(currentTime)
    && timeToMinutes(currentTime) < timeToMinutes(scheduleClass.endTime);
}
