import { useMemo, useState, type FormEvent } from 'react';
import { BookOpen, CalendarDays, FileText, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useApp, useAppActions } from '../context/AppContext';
import type { StudyNote } from '../types';
import { formatDateLong, formatDateShort, getTodayInLima } from '../utils/dates';
import { getGradeCourses } from '../utils/gradebook';
import { getCourseColorStyle } from '../utils/courseColors';

type NoteForm = Omit<StudyNote, 'id' | 'createdAt'>;

function createEmptyForm(): NoteForm {
  return {
    kind: 'quick',
    title: '',
    content: '',
    courseId: null,
    date: getTodayInLima(),
    week: null,
  };
}

export default function StudyNotesView() {
  const { state } = useApp();
  const { addStudyNote, updateStudyNote, deleteStudyNote } = useAppActions();
  const [form, setForm] = useState<NoteForm>(createEmptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | StudyNote['kind']>('all');
  const [formError, setFormError] = useState('');
  const courses = useMemo(
    () => getGradeCourses(state.tags, state.settings.selectedCiclo),
    [state.settings.selectedCiclo, state.tags],
  );
  const coursesById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const notes = useMemo(
    () => state.studyNotes
      .filter((note) => filter === 'all' || note.kind === filter)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [filter, state.studyNotes],
  );
  const selectedNote = state.studyNotes.find((note) => note.id === selectedId);

  const resetForm = () => {
    setForm(createEmptyForm());
    setShowForm(false);
    setEditingId(null);
    setFormError('');
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
    setSelectedId(null);
  };

  const editNote = (note: StudyNote) => {
    setForm({
      kind: note.kind,
      title: note.title,
      content: note.content,
      courseId: note.courseId,
      date: note.date,
      week: note.week,
    });
    setEditingId(note.id);
    setShowForm(true);
    setFormError('');
    setSelectedId(null);
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) {
      setFormError('Escribe un título y el contenido del apunte.');
      return;
    }
    if (form.kind === 'course' && !form.courseId) {
      setFormError('Elige el curso al que pertenece este apunte.');
      return;
    }
    if (form.kind === 'course' && !form.week) {
      setFormError('Elige la semana del ciclo.');
      return;
    }
    const payload = {
      ...form,
      title,
      content,
      courseId: form.courseId || null,
      week: form.kind === 'course' ? form.week : null,
    };
    if (editingId) {
      const current = state.studyNotes.find((note) => note.id === editingId);
      if (current) updateStudyNote({ ...current, ...payload });
    } else {
      addStudyNote({ ...payload, createdAt: new Date().toISOString() });
    }
    resetForm();
  };

  return (
    <section className="space-y-4">
      {!showForm && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Apuntes rápidos o ligados a un curso.</p>
          <button type="button" onClick={openNewForm} className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus size={16} aria-hidden="true" /> Nuevo apunte
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-eyebrow">{editingId ? 'Editar apunte' : 'Nuevo apunte'}</p>
              <h2 className="mt-1 text-lg text-ink">{form.kind === 'quick' ? 'Nota rápida' : 'Apunte de curso'}</h2>
            </div>
            <button type="button" onClick={resetForm} className="btn-secondary grid h-9 w-9 place-items-center !p-0" aria-label="Cerrar formulario">
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {!editingId && (
            <div className="flex rounded-full border border-token bg-surface p-1">
              {([
                ['quick', 'Rápida'],
                ['course', 'Por curso'],
              ] as const).map(([kind, label]) => (
                <button
                  type="button"
                  key={kind}
                  onClick={() => setForm((current) => ({ ...current, kind, week: kind === 'course' ? current.week ?? 1 : null }))}
                  aria-pressed={form.kind === kind}
                  className={`flex-1 rounded-full px-3 py-2 text-xs font-medium ${form.kind === kind ? 'bg-primary-soft text-primary' : 'text-muted'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <label className="block text-xs font-medium text-ink">
            Título
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.currentTarget.value }))}
              className="input-field mt-1.5"
              maxLength={120}
              placeholder="Ej. Elementos del acto jurídico"
              required
              autoFocus
            />
          </label>
          <label className="block text-xs font-medium text-ink">
            Contenido
            <textarea
              value={form.content}
              onChange={(event) => setForm((current) => ({ ...current, content: event.currentTarget.value }))}
              className="input-field mt-1.5 min-h-32 resize-y"
              maxLength={10_000}
              placeholder="Escribe el apunte…"
              required
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-ink">
              Fecha
              <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.currentTarget.value }))} className="input-field mt-1.5" required />
            </label>
            <label className="text-xs font-medium text-ink">
              Curso {form.kind === 'quick' && <span className="font-normal text-muted">(opcional)</span>}
              <select
                value={form.courseId ?? ''}
                onChange={(event) => setForm((current) => ({ ...current, courseId: event.currentTarget.value || null }))}
                className="input-field mt-1.5"
                required={form.kind === 'course'}
              >
                <option value="">Sin curso</option>
                {form.courseId && !coursesById.has(form.courseId) && <option value={form.courseId}>Curso de otro ciclo</option>}
                {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
              </select>
            </label>
            {form.kind === 'course' && (
              <label className="text-xs font-medium text-ink sm:col-span-2">
                Semana del ciclo
                <select
                  value={form.week ?? 1}
                  onChange={(event) => setForm((current) => ({ ...current, week: Number(event.currentTarget.value) }))}
                  className="input-field mt-1.5"
                >
                  {Array.from({ length: 16 }, (_, index) => index + 1).map((week) => <option key={week} value={week}>Semana {week}</option>)}
                </select>
              </label>
            )}
          </div>

          {formError && <p role="alert" className="text-sm text-primary">{formError}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1 text-sm">{editingId ? 'Guardar cambios' : 'Guardar apunte'}</button>
            <button type="button" onClick={resetForm} className="btn-secondary text-sm">Cancelar</button>
          </div>
        </form>
      )}

      <div className="flex gap-2" role="group" aria-label="Filtrar apuntes">
        {([
          ['all', 'Todos'],
          ['quick', 'Rápidos'],
          ['course', 'Por curso'],
        ] as const).map(([value, label]) => (
          <button
            type="button"
            key={value}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`rounded-full px-3.5 py-2 text-xs font-medium ${filter === value ? 'bg-primary text-on-primary' : 'bg-surface text-muted hover-surface'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {notes.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {notes.map((note) => {
            const course = note.courseId ? coursesById.get(note.courseId) : undefined;
            return (
              <article key={note.id} className="card flex min-w-0 items-start gap-3 !p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary" style={course ? getCourseColorStyle(course.color, course.id) : undefined}>
                  {note.kind === 'course' ? <BookOpen size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}
                </span>
                <button type="button" onClick={() => setSelectedId(note.id)} className="min-w-0 flex-1 text-left">
                  <span className="block break-words text-sm font-semibold text-ink">{note.title}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {formatDateShort(note.date)}
                    {course ? ` · ${course.name}` : note.courseId ? ' · Curso de otro ciclo' : ''}
                    {note.week ? ` · Semana ${note.week}` : ''}
                  </span>
                  <span className="mt-2 line-clamp-2 block whitespace-pre-line text-xs leading-relaxed text-muted">{note.content}</span>
                </button>
                <div className="flex shrink-0 flex-col gap-1">
                  <button type="button" onClick={() => editNote(note)} aria-label={`Editar ${note.title}`} className="grid h-8 w-8 place-items-center rounded-full text-muted hover-surface hover:text-primary">
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => deleteStudyNote(note.id)} aria-label={`Eliminar ${note.title}`} className="grid h-8 w-8 place-items-center rounded-full text-muted hover-surface hover:text-primary">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card flex min-h-48 flex-col items-center justify-center text-center">
          <FileText size={23} className="mb-3 text-primary" aria-hidden="true" />
          <h2 className="text-lg text-ink">Aún no hay apuntes</h2>
          <p className="mt-1 text-sm text-muted">Guarda una idea rápida o un apunte de curso.</p>
          <button type="button" onClick={openNewForm} className="btn-secondary mt-4 inline-flex items-center gap-2 text-sm">
            <Plus size={15} aria-hidden="true" /> Crear apunte
          </button>
        </div>
      )}

      {selectedNote && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/35 p-0 sm:items-center sm:p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedId(null);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="study-note-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] border border-token bg-surface p-5 shadow-2xl sm:rounded-[28px] sm:p-7">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="section-eyebrow">{selectedNote.kind === 'course' ? 'Apunte de curso' : 'Nota rápida'}</p>
                <h2 id="study-note-title" className="mt-1 break-words text-2xl text-ink">{selectedNote.title}</h2>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><CalendarDays size={13} aria-hidden="true" />{formatDateLong(selectedNote.date)}</span>
                  {selectedNote.courseId && (coursesById.get(selectedNote.courseId)?.name ?? 'Curso de otro ciclo')}
                  {selectedNote.week && `Semana ${selectedNote.week}`}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} className="btn-secondary grid h-9 w-9 shrink-0 place-items-center !p-0" aria-label="Cerrar apunte">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-ink">{selectedNote.content}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => editNote(selectedNote)} className="btn-secondary inline-flex items-center gap-2 text-sm">
                <Pencil size={14} aria-hidden="true" /> Editar
              </button>
              <button type="button" onClick={() => setSelectedId(null)} className="btn-primary text-sm">Listo</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
