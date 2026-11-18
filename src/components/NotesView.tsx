import { useMemo, useState, type FormEvent } from 'react';
import { BookOpen, CalendarDays, Check, ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp, useAppActions } from '../context/AppContext';
import type { Evaluation, EvaluationType, NavTab } from '../types';
import { formatDateShort } from '../utils/dates';
import { formatGrade, getCourseGradeSummary, getCycleAverage, getGradeCourses } from '../utils/gradebook';
import PageHeader from './PageHeader';
import StudyNotesView from './StudyNotesView';
import EarnedPointsView from './EarnedPointsView';

const EVALUATION_TYPES: { value: EvaluationType; label: string }[] = [
  { value: 'practica', label: 'Práctica' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'final', label: 'Final' },
  { value: 'trabajo', label: 'Trabajo' },
  { value: 'otro', label: 'Otro' },
];

interface EvaluationForm {
  courseId: string;
  name: string;
  type: EvaluationType;
  week: string;
  weight: string;
  grade: string;
  date: string;
}

const EMPTY_FORM: EvaluationForm = {
  courseId: '',
  name: '',
  type: 'practica',
  week: '1',
  weight: '',
  grade: '',
  date: '',
};

function getEvaluationTypeLabel(type: EvaluationType): string {
  return EVALUATION_TYPES.find((item) => item.value === type)?.label ?? 'Otro';
}

function getEvaluationType(value: string): EvaluationType | null {
  return EVALUATION_TYPES.find((item) => item.value === value)?.value ?? null;
}

export default function NotesView({ onNavigate }: { onNavigate: (tab: NavTab) => void }) {
  const { state } = useApp();
  const { addEvaluation, updateEvaluation, deleteEvaluation } = useAppActions();
  const [section, setSection] = useState<'evaluations' | 'notes' | 'points'>('evaluations');
  const [view, setView] = useState<'courses' | 'weeks'>('courses');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EvaluationForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const courses = useMemo(
    () => getGradeCourses(state.tags, state.settings.selectedCiclo),
    [state.settings.selectedCiclo, state.tags],
  );
  const coursesById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const cycleAverage = getCycleAverage(
    courses,
    state.evaluations,
    state.settings.gradingScaleMax,
    state.settings.passingGrade,
  );
  const updateFormField = <K extends keyof EvaluationForm>(key: K, value: EvaluationForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const openNewEvaluation = (courseId = courses[0]?.id ?? '') => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, courseId });
    setFormError('');
    setShowForm(true);
  };

  const editEvaluation = (evaluation: Evaluation) => {
    setEditingId(evaluation.id);
    setForm({
      courseId: evaluation.courseId,
      name: evaluation.name,
      type: evaluation.type,
      week: String(evaluation.week),
      weight: String(evaluation.weight),
      grade: evaluation.grade === null ? '' : String(evaluation.grade),
      date: evaluation.date ?? '',
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormError('');
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    const week = Number(form.week);
    const weight = Number(form.weight);
    const grade = form.grade === '' ? null : Number(form.grade);
    if (!coursesById.has(form.courseId)) {
      setFormError('Elige un curso para esta evaluación.');
      return;
    }
    if (!name) {
      setFormError('Escribe el nombre de la evaluación.');
      return;
    }
    if (!Number.isInteger(week) || week < 1 || week > 16) {
      setFormError('La semana debe estar entre 1 y 16.');
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
      setFormError('El peso debe ser mayor que 0 y no superar el 100%.');
      return;
    }
    if (
      grade !== null
      && (!Number.isFinite(grade) || grade < 0 || grade > state.settings.gradingScaleMax)
    ) {
      setFormError(`La nota debe estar entre 0 y ${formatGrade(state.settings.gradingScaleMax)}.`);
      return;
    }

    const evaluation = {
      courseId: form.courseId,
      name,
      type: form.type,
      week,
      weight,
      grade,
      date: form.date || null,
    };
    if (editingId) {
      updateEvaluation({ ...evaluation, id: editingId });
    } else {
      addEvaluation(evaluation);
    }
    closeForm();
    setForm(EMPTY_FORM);
  };

  const removeEvaluation = (id: string) => {
    deleteEvaluation(id);
    if (editingId === id) closeForm();
  };

  const weeklyEvaluations = state.evaluations
    .filter((evaluation) => evaluation.week === selectedWeek && coursesById.has(evaluation.courseId))
    .sort((a, b) => {
      const courseNameA = coursesById.get(a.courseId)?.name ?? '';
      const courseNameB = coursesById.get(b.courseId)?.name ?? '';
      const courseNameOrder = courseNameA.localeCompare(courseNameB, 'es');
      if (courseNameOrder) return courseNameOrder;
      if (a.date && b.date) return a.date.localeCompare(b.date);
      if (a.date) return -1;
      if (b.date) return 1;
      return a.name.localeCompare(b.name, 'es');
    });

  const renderEvaluation = (evaluation: Evaluation) => {
    const course = coursesById.get(evaluation.courseId);
    if (!course) return null;
    return (
      <article key={evaluation.id} className="flex items-start gap-3 rounded-xl border border-token bg-surface p-3">
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: course.color }} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium text-ink">{evaluation.name}</p>
          <p className="mt-1 text-xs text-muted">
            {getEvaluationTypeLabel(evaluation.type)} · {evaluation.weight}% · Semana {evaluation.week}
            {evaluation.date && <> · <span className="inline-flex items-center gap-1"><CalendarDays size={12} aria-hidden="true" />{formatDateShort(evaluation.date)}</span></>}
          </p>
          <p className="mt-1 text-xs font-medium text-ink">
            {evaluation.grade === null ? 'Sin nota todavía' : `Nota: ${formatGrade(evaluation.grade)} / ${formatGrade(state.settings.gradingScaleMax)}`}
          </p>
          <p className="mt-1 text-[11px] text-muted">{course.name}</p>
        </div>
        <button
          type="button"
          onClick={() => editEvaluation(evaluation)}
          aria-label={`Editar ${evaluation.name}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover-surface hover:text-primary"
        >
          <Pencil size={15} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => removeEvaluation(evaluation.id)}
          aria-label={`Eliminar ${evaluation.name}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover-surface hover:text-primary"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </article>
    );
  };

  return (
    <div className="animate-fade-in mx-auto w-full max-w-[1120px]">
      <PageHeader
        eyebrow="Tu avance académico"
        title="Notas"
        subtitle={section === 'evaluations' ? 'Registra evaluaciones y mira cómo vas, curso por curso.' : section === 'notes' ? 'Apuntes rápidos y de tus cursos, en un solo lugar.' : 'Lleva tus puntos y participaciones por curso, sin alterar tus promedios.'}
        action={(
          section === 'evaluations' ? (
            <button
              type="button"
              onClick={() => openNewEvaluation()}
              disabled={!courses.length}
              className="btn-primary inline-flex items-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} aria-hidden="true" /> Nueva evaluación
            </button>
          ) : undefined
        )}
      />

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Secciones de notas">
        {([
          ['evaluations', 'Evaluaciones'],
          ['notes', 'Apuntes'],
          ['points', 'Puntos ganados'],
        ] as const).map(([id, label]) => (
          <button
            type="button"
            role="tab"
            key={id}
            onClick={() => setSection(id)}
            aria-selected={section === id}
            className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${section === id ? 'bg-primary text-on-primary' : 'bg-surface text-muted hover-surface'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'evaluations' && showForm && (
        <form onSubmit={handleSave} className="card mb-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">{editingId ? 'Editar evaluación' : 'Nueva evaluación'}</h2>
            <button type="button" onClick={closeForm} className="text-sm text-muted hover:text-primary">Cerrar</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-medium text-ink sm:col-span-2 lg:col-span-1">
              Curso
              <select value={form.courseId} onChange={(event) => updateFormField('courseId', event.currentTarget.value)} className="input-field mt-1.5" required>
                <option value="">Elige un curso</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-ink sm:col-span-2 lg:col-span-1">
              Nombre
              <input value={form.name} onChange={(event) => updateFormField('name', event.currentTarget.value)} className="input-field mt-1.5" placeholder="Ej. Práctica de lectura" required maxLength={100} />
            </label>
            <label className="text-xs font-medium text-ink">
              Tipo
              <select value={form.type} onChange={(event) => {
                const type = getEvaluationType(event.currentTarget.value);
                if (type) updateFormField('type', type);
              }} className="input-field mt-1.5">
                {EVALUATION_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-ink">
              Semana del ciclo
              <select value={form.week} onChange={(event) => updateFormField('week', event.currentTarget.value)} className="input-field mt-1.5">
                {Array.from({ length: 16 }, (_, index) => index + 1).map((week) => <option key={week} value={week}>Semana {week}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-ink">
              Peso (%)
              <input type="number" min="0.1" max="100" step="0.1" value={form.weight} onChange={(event) => updateFormField('weight', event.currentTarget.value)} className="input-field mt-1.5" placeholder="Ej. 20" required />
            </label>
            <label className="text-xs font-medium text-ink">
              Nota (opcional)
              <input type="number" min="0" max={state.settings.gradingScaleMax} step="0.1" value={form.grade} onChange={(event) => updateFormField('grade', event.currentTarget.value)} className="input-field mt-1.5" placeholder={`Sin nota / ${formatGrade(state.settings.gradingScaleMax)}`} />
            </label>
            <label className="text-xs font-medium text-ink">
              Fecha (opcional)
              <input type="date" value={form.date} onChange={(event) => updateFormField('date', event.currentTarget.value)} className="input-field mt-1.5" />
            </label>
          </div>
          {formError && <p role="alert" className="text-sm text-primary">{formError}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1 text-sm">{editingId ? 'Guardar cambios' : 'Guardar evaluación'}</button>
            <button type="button" onClick={closeForm} className="btn-secondary text-sm">Cancelar</button>
          </div>
        </form>
      )}

      {section === 'evaluations' && <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button type="button" onClick={() => setView('courses')} aria-pressed={view === 'courses'} className={`rounded-full px-4 py-2 text-xs font-medium ${view === 'courses' ? 'bg-primary text-on-primary' : 'bg-surface text-muted hover-surface'}`}>
            Por curso
          </button>
          <button type="button" onClick={() => setView('weeks')} aria-pressed={view === 'weeks'} className={`rounded-full px-4 py-2 text-xs font-medium ${view === 'weeks' ? 'bg-primary text-on-primary' : 'bg-surface text-muted hover-surface'}`}>
            Por semana
          </button>
        </div>
        {view === 'weeks' && (
          <label className="flex items-center gap-2 text-xs font-medium text-ink">
            Semana
            <select value={selectedWeek} onChange={(event) => setSelectedWeek(Number(event.currentTarget.value))} className="input-field !w-auto !py-2">
              {Array.from({ length: 16 }, (_, index) => index + 1).map((week) => <option key={week} value={week}>{week}</option>)}
            </select>
          </label>
        )}
      </div>}

      {section === 'evaluations' && state.settings.selectedCiclo !== null && (
        <section className="card mb-4 flex flex-wrap items-center justify-between gap-3 bg-primary-soft">
          <div>
            <p className="section-eyebrow">Ciclo {state.settings.selectedCiclo}</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">Promedio ponderado por créditos</h2>
          </div>
          <p className="font-serif text-3xl text-primary">
            {cycleAverage === null ? '—' : formatGrade(cycleAverage)}
            <span className="ml-1 font-sans text-sm text-muted">/ {formatGrade(state.settings.gradingScaleMax)}</span>
          </p>
        </section>
      )}

      {section === 'notes' ? (
        <StudyNotesView />
      ) : section === 'points' ? (
        <EarnedPointsView />
      ) : !courses.length ? (
        <section className="card flex min-h-60 flex-col items-center justify-center text-center">
          <BookOpen size={24} className="mb-3 text-primary" aria-hidden="true" />
          <h2 className="text-xl text-ink">Primero, tus cursos</h2>
          <p className="mt-2 max-w-md text-sm text-muted">Elige tu ciclo o añade un curso personalizado para empezar a registrar evaluaciones.</p>
          <button type="button" onClick={() => onNavigate('cursos')} className="btn-secondary mt-4 text-sm">Ir a Mis cursos</button>
        </section>
      ) : view === 'courses' ? (
        <>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {courses.map((course) => {
              const evaluations = state.evaluations
                .filter((evaluation) => evaluation.courseId === course.id)
                .sort((a, b) => a.week - b.week || (a.date ?? '').localeCompare(b.date ?? ''));
              const summary = getCourseGradeSummary(
                evaluations,
                state.settings.gradingScaleMax,
                state.settings.passingGrade,
              );
              const progress = Math.min(100, Math.max(0, summary.evaluatedWeight));
              return (
                <article key={course.id} className="card min-w-0 !p-4 sm:!p-5">
                  <header className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: course.color }} aria-hidden="true" />
                      <div className="min-w-0">
                        <h2 className="break-words text-lg font-semibold text-ink">{course.name}</h2>
                        <p className="mt-1 text-xs text-muted">{course.official ? `${course.credits} créditos` : 'Curso personalizado'}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => openNewEvaluation(course.id)} className="btn-secondary inline-flex shrink-0 items-center gap-1.5 !px-3 !py-2 text-xs">
                      <Plus size={14} aria-hidden="true" /> Añadir
                    </button>
                  </header>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-soft p-3">
                      <p className="text-muted">Acumulado</p>
                      <p className="mt-1 font-semibold text-ink">{formatGrade(summary.accumulated)} / {formatGrade(state.settings.gradingScaleMax)}</p>
                    </div>
                    <div className="rounded-xl bg-soft p-3">
                      <p className="text-muted">Promedio evaluado</p>
                      <p className="mt-1 font-semibold text-ink">{summary.average === null ? '—' : `${formatGrade(summary.average)} / ${formatGrade(state.settings.gradingScaleMax)}`}</p>
                    </div>
                    <div className="rounded-xl bg-soft p-3">
                      <p className="text-muted">Peso evaluado</p>
                      <p className="mt-1 font-semibold text-ink">{formatGrade(summary.evaluatedWeight)}%</p>
                    </div>
                    <div className="rounded-xl bg-soft p-3">
                      <p className="text-muted">Peso restante</p>
                      <p className="mt-1 font-semibold text-ink">{formatGrade(summary.remainingWeight)}%</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label={`Peso evaluado de ${course.name}`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {evaluations.length > 0 && Math.abs(summary.totalWeight - 100) > 0.05 && (
                    <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-xs text-ink">
                      Los pesos suman {formatGrade(summary.totalWeight)}%; deben sumar 100%.
                    </p>
                  )}
                  <p className="mt-3 text-xs font-medium text-ink">
                    {summary.alreadyPassed
                      ? 'Ya aprobaste.'
                      : summary.unreachable
                        ? 'Con lo que falta ya no alcanza para aprobar.'
                        : summary.neededGrade === null
                          ? 'Registra evaluaciones y sus pesos para calcular lo que falta.'
                          : `Necesitas ${formatGrade(summary.neededGrade)} en lo que falta para aprobar.`}
                  </p>

                  <div className="mt-4 space-y-2">
                    {evaluations.map(renderEvaluation)}
                    {!evaluations.length && (
                      <div className="rounded-xl border border-dashed border-token p-4 text-center">
                        <ClipboardList size={19} className="mx-auto mb-2 text-muted" aria-hidden="true" />
                        <p className="text-xs text-muted">Aún no hay evaluaciones para este curso.</p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <section className="card">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
              <CalendarDays size={17} aria-hidden="true" />
            </span>
            <div>
              <p className="section-eyebrow">Vista de evaluaciones</p>
              <h2 className="text-lg font-semibold text-ink">Semana {selectedWeek}</h2>
            </div>
          </div>
          <div className="space-y-2">
            {weeklyEvaluations.map(renderEvaluation)}
            {!weeklyEvaluations.length && (
              <div className="rounded-xl bg-soft p-6 text-center">
                <Check size={20} className="mx-auto mb-2 text-primary" aria-hidden="true" />
                <p className="text-sm text-muted">No hay evaluaciones registradas para la semana {selectedWeek}.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
