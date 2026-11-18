import { useId, useMemo, useState, type FormEvent } from 'react';
import { BookOpen, CalendarDays, FileText, Plus, X } from 'lucide-react';
import { useApp, useAppActions } from '../context/AppContext';
import type { StudyNote } from '../types';
import { formatDateLong } from '../utils/dates';
import { getGradeCourses } from '../utils/gradebook';

export default function DayNote({ date, compact = false }: { date: string; compact?: boolean }) {
  const { state } = useApp();
  const { setDayNote, addStudyNote } = useAppActions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [courseId, setCourseId] = useState('');
  const inputId = useId();
  const note = state.dayNotes[date] ?? '';
  const dayNotes = useMemo(
    () => state.studyNotes
      .filter((studyNote) => studyNote.date === date)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [date, state.studyNotes],
  );
  const selectedNote = dayNotes.find((studyNote) => studyNote.id === selectedId);
  const courses = useMemo(
    () => getGradeCourses(state.tags, state.settings.selectedCiclo),
    [state.settings.selectedCiclo, state.tags],
  );
  const coursesById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);

  const closeDialog = () => {
    setDialogOpen(false);
    setShowQuickForm(false);
    setSelectedId(null);
    setTitle('');
    setContent('');
    setCourseId('');
  };

  const saveQuickNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent) return;
    const quickNote: Omit<StudyNote, 'id'> = {
      kind: 'quick',
      title: trimmedTitle,
      content: trimmedContent,
      courseId: courseId || null,
      date,
      week: null,
      createdAt: new Date().toISOString(),
    };
    addStudyNote(quickNote);
    setTitle('');
    setContent('');
    setCourseId('');
    setShowQuickForm(false);
  };

  return (
    <>
      <div className={`rounded-xl border border-token bg-soft ${compact ? 'p-2' : 'p-3'}`}>
        <label htmlFor={inputId} className="block text-xs font-medium text-ink">Nota del día</label>
        <input
          id={inputId}
          type="text"
          value={note}
          onChange={(event) => setDayNote(date, event.currentTarget.value)}
          maxLength={160}
          placeholder="Una idea para recordar…"
          className="input-field mt-2 !py-2 text-sm"
          aria-label={`Nota del día, ${date}`}
        />
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <FileText size={14} aria-hidden="true" />
          Apuntes{dayNotes.length ? ` · ${dayNotes.length}` : ''}
        </button>
      </div>

      {dialogOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/35 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="day-notes-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-[28px] border border-token bg-surface p-5 shadow-2xl sm:rounded-[28px] sm:p-6">
            <header className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="section-eyebrow">{formatDateLong(date)}</p>
                <h2 id="day-notes-title" className="mt-1 text-xl text-ink">
                  {selectedNote ? selectedNote.title : showQuickForm ? 'Nota rápida' : 'Apuntes del día'}
                </h2>
                {selectedNote && (
                  <p className="mt-1 text-xs text-muted">
                    {selectedNote.courseId ? coursesById.get(selectedNote.courseId)?.name ?? 'Curso de otro ciclo' : 'Nota rápida'}
                    {selectedNote.week ? ` · Semana ${selectedNote.week}` : ''}
                  </p>
                )}
              </div>
              <button type="button" onClick={closeDialog} className="btn-secondary grid h-9 w-9 shrink-0 place-items-center !p-0" aria-label="Cerrar apuntes">
                <X size={16} aria-hidden="true" />
              </button>
            </header>

            {selectedNote ? (
              <>
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-ink">{selectedNote.content}</p>
                <button type="button" onClick={() => setSelectedId(null)} className="btn-secondary mt-5 text-sm">Volver a los apuntes</button>
              </>
            ) : showQuickForm ? (
              <form onSubmit={saveQuickNote} className="space-y-3">
                <label className="block text-xs font-medium text-ink">
                  Título
                  <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} className="input-field mt-1.5" maxLength={120} placeholder="¿Qué quieres recordar?" required autoFocus />
                </label>
                <label className="block text-xs font-medium text-ink">
                  Contenido
                  <textarea value={content} onChange={(event) => setContent(event.currentTarget.value)} className="input-field mt-1.5 min-h-28 resize-y" maxLength={10_000} placeholder="Escribe el apunte…" required />
                </label>
                <label className="block text-xs font-medium text-ink">
                  Curso <span className="font-normal text-muted">(opcional)</span>
                  <select value={courseId} onChange={(event) => setCourseId(event.currentTarget.value)} className="input-field mt-1.5">
                    <option value="">Sin curso</option>
                    {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
                  </select>
                </label>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1 text-sm">Guardar nota</button>
                  <button type="button" onClick={() => setShowQuickForm(false)} className="btn-secondary text-sm">Cancelar</button>
                </div>
              </form>
            ) : (
              <>
                {dayNotes.length ? (
                  <div className="space-y-2">
                    {dayNotes.map((studyNote) => (
                      <button
                        key={studyNote.id}
                        type="button"
                        onClick={() => setSelectedId(studyNote.id)}
                        className="flex w-full items-start gap-3 rounded-xl border border-token bg-soft p-3 text-left hover-surface"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                          {studyNote.kind === 'course' ? <BookOpen size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-medium text-ink">{studyNote.title}</span>
                          <span className="mt-1 block text-xs text-muted">
                            {studyNote.courseId ? coursesById.get(studyNote.courseId)?.name ?? 'Curso de otro ciclo' : 'Nota rápida'}
                            {studyNote.week ? ` · Semana ${studyNote.week}` : ''}
                          </span>
                        </span>
                        <CalendarDays size={15} className="mt-1 shrink-0 text-muted" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-soft p-4 text-center text-sm text-muted">Aún no guardaste apuntes para este día.</p>
                )}
                <button type="button" onClick={() => setShowQuickForm(true)} className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 text-sm">
                  <Plus size={15} aria-hidden="true" /> Crear nota rápida
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
