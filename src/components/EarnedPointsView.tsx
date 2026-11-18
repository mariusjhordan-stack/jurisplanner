import { useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, Check, ClipboardList, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useApp, useAppActions } from '../context/AppContext';
import type { EarnedPoint } from '../types';
import { formatDateShort, getTodayInLima } from '../utils/dates';
import { getGradeCourses } from '../utils/gradebook';
import { getCourseColorStyle } from '../utils/courseColors';

type PointForm = Omit<EarnedPoint, 'id'>;

function createEmptyForm(courseId = ''): PointForm {
  return {
    courseId,
    title: '',
    date: getTodayInLima(),
    earned: 0,
    outOf: 1,
    detail: '',
  };
}

export default function EarnedPointsView() {
  const { state } = useApp();
  const { addEarnedPoint, updateEarnedPoint, deleteEarnedPoint } = useAppActions();
  const courses = useMemo(
    () => getGradeCourses(state.tags, state.settings.selectedCiclo),
    [state.settings.selectedCiclo, state.tags],
  );
  const coursesById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const [form, setForm] = useState<PointForm>(() => createEmptyForm(courses[0]?.id ?? ''));
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const points = useMemo(
    () => [...state.earnedPoints]
      .sort((a, b) => b.date.localeCompare(a.date)),
    [state.earnedPoints],
  );

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(createEmptyForm(courses[0]?.id ?? ''));
    setFormError('');
  };

  const openNewForm = () => {
    setForm(createEmptyForm(courses[0]?.id ?? ''));
    setEditingId(null);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (point: EarnedPoint) => {
    setForm({
      courseId: point.courseId,
      title: point.title,
      date: point.date,
      earned: point.earned,
      outOf: point.outOf,
      detail: point.detail,
    });
    setEditingId(point.id);
    setFormError('');
    setShowForm(true);
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!form.courseId || (!coursesById.has(form.courseId) && !editingId)) {
      setFormError('Elige el curso de este registro.');
      return;
    }
    if (!title) {
      setFormError('Escribe el concepto o actividad.');
      return;
    }
    if (!Number.isFinite(form.earned) || form.earned < 0 || !Number.isFinite(form.outOf) || form.outOf <= 0) {
      setFormError('Ingresa puntos válidos y un máximo mayor que cero.');
      return;
    }
    const payload = { ...form, title, detail: form.detail.trim() };
    if (editingId) {
      updateEarnedPoint({ ...payload, id: editingId });
    } else {
      addEarnedPoint(payload);
    }
    closeForm();
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">Lleva un registro personal de participación, controles o bonificaciones. No modifica tus promedios.</p>
        {!showForm && (
          <button type="button" onClick={openNewForm} disabled={!courses.length} className="btn-primary inline-flex items-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">
            <Plus size={16} aria-hidden="true" /> Registrar puntos
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-eyebrow">{editingId ? 'Editar registro' : 'Nuevo registro'}</p>
              <h2 className="mt-1 text-lg text-ink">Puntos ganados</h2>
            </div>
            <button type="button" onClick={closeForm} className="btn-secondary grid h-9 w-9 place-items-center !p-0" aria-label="Cerrar formulario">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-ink">
              Curso
              <select value={form.courseId} onChange={(event) => setForm((current) => ({ ...current, courseId: event.currentTarget.value }))} className="input-field mt-1.5" required>
                <option value="">Elige un curso</option>
                {editingId && form.courseId && !coursesById.has(form.courseId) && <option value={form.courseId}>Curso de otro ciclo</option>}
                {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-ink">
              Concepto
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.currentTarget.value }))} className="input-field mt-1.5" placeholder="Ej. Participación en clase" maxLength={120} required />
            </label>
            <label className="text-xs font-medium text-ink">
              Fecha
              <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.currentTarget.value }))} className="input-field mt-1.5" required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-ink">
                Ganados
                <input type="number" min="0" step="0.1" value={form.earned} onChange={(event) => setForm((current) => ({ ...current, earned: Number(event.currentTarget.value) }))} className="input-field mt-1.5" required />
              </label>
              <label className="text-xs font-medium text-ink">
                De
                <input type="number" min="0.1" step="0.1" value={form.outOf} onChange={(event) => setForm((current) => ({ ...current, outOf: Number(event.currentTarget.value) }))} className="input-field mt-1.5" required />
              </label>
            </div>
            <label className="text-xs font-medium text-ink sm:col-span-2">
              Detalle <span className="font-normal text-muted">(opcional)</span>
              <textarea value={form.detail} onChange={(event) => setForm((current) => ({ ...current, detail: event.currentTarget.value }))} className="input-field mt-1.5 min-h-20 resize-y" maxLength={1000} placeholder="Un recordatorio breve…" />
            </label>
          </div>
          {formError && <p role="alert" className="text-sm text-primary">{formError}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1 text-sm">{editingId ? 'Guardar cambios' : 'Guardar puntos'}</button>
            <button type="button" onClick={closeForm} className="btn-secondary text-sm">Cancelar</button>
          </div>
        </form>
      )}

      {points.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {points.map((point) => {
            const course = coursesById.get(point.courseId);
            return (
              <article key={point.id} className="card flex min-w-0 items-start gap-3 !p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary" style={course ? getCourseColorStyle(course.color, course.id) : undefined}>
                  <ClipboardList size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-ink">{point.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{course?.name ?? 'Curso de otro ciclo'}</span>
                    <span className="inline-flex items-center gap-1"><CalendarDays size={12} aria-hidden="true" />{formatDateShort(point.date)}</span>
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-soft px-3 py-1 text-sm font-semibold text-ink">
                    <Check size={14} className="text-primary" aria-hidden="true" />
                    {point.earned} de {point.outOf} puntos
                  </p>
                  {point.detail && <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted">{point.detail}</p>}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button type="button" onClick={() => openEditForm(point)} aria-label={`Editar ${point.title}`} className="grid h-8 w-8 place-items-center rounded-full text-muted hover-surface hover:text-primary">
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => deleteEarnedPoint(point.id)} aria-label={`Eliminar ${point.title}`} className="grid h-8 w-8 place-items-center rounded-full text-muted hover-surface hover:text-primary">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card flex min-h-48 flex-col items-center justify-center text-center">
          <ClipboardList size={23} className="mb-3 text-primary" aria-hidden="true" />
          <h2 className="text-lg text-ink">Aún no hay puntos registrados</h2>
          <p className="mt-1 text-sm text-muted">Guarda aquí participaciones o puntos extra por curso.</p>
          <button type="button" onClick={openNewForm} disabled={!courses.length} className="btn-secondary mt-4 inline-flex items-center gap-2 text-sm disabled:opacity-50">
            <Plus size={15} aria-hidden="true" /> Registrar puntos
          </button>
          {!courses.length && <p className="mt-3 text-xs text-muted">Primero agrega o elige tus cursos.</p>}
        </div>
      )}
    </section>
  );
}
