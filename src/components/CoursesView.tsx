import { useEffect, useState } from 'react';
import { BookOpen, BookOpenCheck, CirclePlus, GraduationCap, Trash2 } from 'lucide-react';
import { useApp, useAppActions } from '../context/AppContext';
import type { Tag } from '../types';
import planEstudios from '../data/plan-estudios.json';
import PageHeader from './PageHeader';
import { COURSE_COLOR_PALETTE, getCourseColorStyle } from '../utils/courseColors';

const DEFAULT_COURSE_COLOR = COURSE_COLOR_PALETTE[0].value;

export default function CoursesView() {
  const { state } = useApp();
  const { setTags, addTag, updateTag, deleteTag, updateSettings, setOnboardingDone } = useAppActions();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<string>(DEFAULT_COURSE_COLOR);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const selectedCiclo = state.settings.selectedCiclo;
  const officialCycle = selectedCiclo == null
    ? undefined
    : planEstudios.ciclos.find((cycle) => cycle.ciclo === selectedCiclo);

  useEffect(() => {
    if (!officialCycle) return;
    const personalTags = state.tags.filter((tag) => tag.isPersonal);
    const otherCourseTags = state.tags.filter((tag) => !tag.isPersonal && !tag.id.startsWith(`course-${selectedCiclo}-`));
    const courseTags = officialCycle.cursos.map((course, index) => {
      const id = `course-${selectedCiclo}-${index}`;
      const existing = state.tags.find((tag) => tag.id === id);
      const color = COURSE_COLOR_PALETTE.some((item) => item.value === existing?.color)
        ? existing!.color
        : COURSE_COLOR_PALETTE[index % COURSE_COLOR_PALETTE.length].value;
      return {
        id,
        name: course.nombre,
        color,
        isPersonal: false,
      };
    });
    const nextTags = [...personalTags, ...otherCourseTags, ...courseTags];
    if (JSON.stringify(nextTags) !== JSON.stringify(state.tags)) setTags(nextTags);
  }, [officialCycle, selectedCiclo, setTags, state.tags]);

  const handleSelectCiclo = (ciclo: number) => {
    const personalTags = state.tags.filter((t) => t.isPersonal);
    const otherCourseTags = state.tags.filter((tag) => !tag.isPersonal && !tag.id.startsWith(`course-${ciclo}-`));
    const courses = planEstudios.ciclos.find((cycle) => cycle.ciclo === ciclo)?.cursos ?? [];

    const courseTags: Tag[] = courses.map((course, i) => {
      const existingColor = state.tags.find((tag) => tag.id === `course-${ciclo}-${i}`)?.color;
      return {
        id: `course-${ciclo}-${i}`,
        name: course.nombre,
        color: existingColor && COURSE_COLOR_PALETTE.some((color) => color.value === existingColor)
          ? existingColor
          : COURSE_COLOR_PALETTE[i % COURSE_COLOR_PALETTE.length].value,
        isPersonal: false,
      };
    });

    setTags([...personalTags, ...otherCourseTags, ...courseTags]);
    updateSettings({ selectedCiclo: ciclo });
    setOnboardingDone();
  };

  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    addTag({
      name: newTagName.trim(),
      color: newTagColor,
      isPersonal: false,
    });
    setNewTagName('');
    setNewTagColor(DEFAULT_COURSE_COLOR);
    setShowAddForm(false);
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag.id);
    setEditName(tag.name);
  };

  const handleSaveEdit = (tag: Tag) => {
    if (editName.trim()) {
      updateTag({ ...tag, name: editName.trim() });
    }
    setEditingTag(null);
  };

  const personalTags = state.tags.filter((t) => t.isPersonal);
  const courseTags = state.tags.filter((t) => !t.isPersonal);
  const extraCourseTags = courseTags.filter((tag) => !tag.id.startsWith('course-'));

  // Ciclo selection screen
  if (selectedCiclo === null) {
    return (
      <div className="animate-fade-in mx-auto w-full max-w-3xl py-8">
        <div className="mb-9 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-3xl bg-primary-soft text-primary">
            <BookOpen size={24} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <PageHeader
            eyebrow="Empecemos por aquí"
            title="¿En qué ciclo estás?"
            subtitle={`${planEstudios.carrera} — selecciona el ciclo en el que estás.`}
            centered
          />
        </div>

        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4 stagger-children">
          {planEstudios.ciclos.map(({ ciclo }) => (
            <button
              key={ciclo}
              onClick={() => handleSelectCiclo(Number(ciclo))}
              className="card cursor-pointer py-6 text-center transition-transform hover:-translate-y-1"
            >
              <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary">
                <GraduationCap size={19} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span className="block font-serif text-2xl text-ink">{ciclo}</span>
              <span className="mt-1 block text-xs text-muted">Ciclo</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in mx-auto w-full max-w-[1120px]">
      <PageHeader
        eyebrow={`Ciclo ${selectedCiclo}`}
        title="Mis cursos"
        subtitle="El plan disponible incluye créditos y requisitos. Docentes, horarios y avance del sílabo no están registrados."
        action={(
          <button type="button" onClick={() => setShowAddForm((value) => !value)} className="btn-primary inline-flex items-center gap-2 text-sm">
            <CirclePlus size={16} strokeWidth={1.5} aria-hidden="true" />
            Añadir curso
          </button>
        )}
      />

      {/* Add form */}
      {showAddForm && (
        <div className="card mb-4 animate-fade-in space-y-3">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Nombre del curso..."
            className="input-field"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
          />
          <div>
            <p className="mb-2 text-xs text-muted">Color del curso:</p>
            <div className="flex flex-wrap gap-2">
              {COURSE_COLOR_PALETTE.map((color) => (
                <button
                  type="button"
                  key={color.value}
                  onClick={() => setNewTagColor(color.value)}
                  aria-label={`Elegir color ${color.name}`}
                  aria-pressed={newTagColor === color.value}
                  className={`h-8 w-8 rounded-full border border-token transition-transform ${newTagColor === color.value ? 'scale-110 ring-2 ring-primary ring-offset-2' : ''}`}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddTag} className="btn-primary text-sm flex-1">Agregar</button>
            <button onClick={() => setShowAddForm(false)} className="btn-secondary text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Personal tags */}
      {personalTags.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg text-ink">
            <BookOpenCheck size={17} strokeWidth={1.5} aria-hidden="true" /> Personales
          </h2>
          <div className="flex flex-wrap gap-2">
            {personalTags.map((tag) => (
              <div key={tag.id} className="tag px-3 py-1.5 text-sm font-medium" style={getCourseColorStyle(tag.color, tag.id)}>
                {tag.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course tags */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-lg text-ink">
            <BookOpen size={17} strokeWidth={1.5} aria-hidden="true" /> Plan de estudios
          </h2>
          <button
            onClick={() => {
              updateSettings({ selectedCiclo: null });
              const tags = state.tags.filter((t) => t.isPersonal);
              setTags(tags);
            }}
            className="text-sm text-muted transition-colors hover:text-primary"
          >
            Cambiar ciclo
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-token bg-surface">
          <div className="min-w-[700px] divide-y divide-[var(--border)]">
          {officialCycle?.cursos.map((course, index) => {
            const tagId = `course-${selectedCiclo}-${index}`;
            const tag = state.tags.find((item) => item.id === tagId);
            const color = tag?.color ?? COURSE_COLOR_PALETTE[index % COURSE_COLOR_PALETTE.length].value;
            return (
              <article key={course.codigo} className="grid grid-cols-[12px_72px_minmax(180px,1fr)_90px_minmax(150px,0.8fr)] items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-soft">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                <span className="font-medium text-muted">{course.codigo}</span>
                <span className="truncate font-medium text-ink" title={course.nombre}>{course.nombre}</span>
                <span className="text-muted">{course.creditos} créditos</span>
                <span className="truncate text-xs text-muted" title={`Requisito: ${course.requisito}`}>Req.: {course.requisito}</span>
              </article>
            );
          })}
          {extraCourseTags.map((tag) => (
            <article key={tag.id} className="grid grid-cols-[12px_minmax(180px,1fr)_auto_auto] items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-soft">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} aria-hidden="true" />
              {editingTag === tag.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  onBlur={() => handleSaveEdit(tag)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSaveEdit(tag)}
                  className="input-field py-1.5 text-sm"
                  autoFocus
                />
              ) : (
                <button type="button" className="truncate text-left font-medium text-ink hover:text-primary" onClick={() => handleEditTag(tag)}>
                  {tag.name}
                </button>
              )}
              <div className="flex items-center gap-1">
                {COURSE_COLOR_PALETTE.map((color) => (
                  <button
                    type="button"
                    key={color.value}
                    onClick={() => updateTag({ ...tag, color: color.value })}
                    aria-label={`Cambiar ${tag.name} a ${color.name}`}
                    aria-pressed={tag.color === color.value}
                    className={`h-5 w-5 rounded-full border border-token ${tag.color === color.value ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Personal</span>
                <button
                  type="button"
                  onClick={() => deleteTag(tag.id)}
                  aria-label={`Eliminar ${tag.name}`}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-ink"
                >
                  <Trash2 size={15} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}
