import { useState } from 'react';
import {
  CalendarDays,
  Check,
  Columns3,
  List,
  Plus,
  Timer,
  Trash2,
} from 'lucide-react';
import { useApp, useAppActions } from '../context/AppContext';
import type { Task } from '../types';
import { formatDateShort, isPast, isWithinDays } from '../utils/dates';
import PageHeader from './PageHeader';
import { getCourseColorStyle } from '../utils/courseColors';
import { FocusWidget } from './FocusView';
import type { FocusTimerController } from '../hooks/useFocusTimer';
import AddToCalendarButton from './AddToCalendarButton';
import { animateCompletion } from '../utils/completionAnimation';

export default function TasksView({ timer, onOpenFocus }: { timer: FocusTimerController; onOpenFocus: () => void }) {
  const { state } = useApp();
  const { addTask, toggleTask, deleteTask } = useAppActions();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('media');
  const [tagId, setTagId] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'columns'>('list');

  const handleAdd = () => {
    if (!title.trim()) return;
    addTask({
      title: title.trim(),
      completed: false,
      dueDate: dueDate || null,
      priority,
      tagId: tagId || 'personal',
    });
    setTitle('');
    setDueDate('');
    setPriority('media');
    setTagId('');
    setShowForm(false);
  };

  const filteredTasks = state.tasks
    .filter((task) => {
      if (filter === 'pending') return !task.completed;
      if (filter === 'done') return task.completed;
      return true;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const priorityOrder = { alta: 0, media: 1, baja: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

  const getDueStyle = (task: Task) => {
    if (!task.dueDate || task.completed) return 'text-muted';
    if (isPast(task.dueDate) || isWithinDays(task.dueDate, 2)) return 'text-primary font-semibold';
    return 'text-muted';
  };

  const renderTask = (task: Task) => {
    const tag = state.tags.find((item) => item.id === task.tagId);
    return (
      <article key={task.id} className="card group flex items-start gap-3 !p-4">
        <button
          type="button"
          onClick={(event) => {
            if (!task.completed) animateCompletion(event.currentTarget.closest('article'));
            toggleTask(task.id);
          }}
          aria-label={task.completed ? `Marcar ${task.title} como pendiente` : `Completar ${task.title}`}
          aria-pressed={task.completed}
          className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors ${
            task.completed ? 'border-primary bg-primary text-on-primary' : 'border-token text-transparent hover:border-primary'
          }`}
        >
          <Check size={14} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <p className={`whitespace-normal break-normal text-sm font-medium ${task.completed ? 'text-muted line-through' : 'text-ink'}`}>
            {task.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="tag !px-2.5 !py-1 text-[10px]">{task.priority}</span>
            {tag && <span className="tag !px-2.5 !py-1 text-[10px]" style={getCourseColorStyle(tag.color, tag.id)}>{tag.name}</span>}
            {task.dueDate && (
              <span className={`inline-flex items-center gap-1 text-[11px] ${getDueStyle(task)}`}>
                <CalendarDays size={13} strokeWidth={1.5} aria-hidden="true" />
                {formatDateShort(task.dueDate)}
              </span>
            )}
          </div>
        </div>
        {task.dueDate && <AddToCalendarButton entry={{ kind: 'task', task }} />}
        <button
          type="button"
          onClick={() => deleteTask(task.id)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted opacity-70 transition-colors hover:bg-accent-soft hover:text-ink sm:opacity-0 sm:group-hover:opacity-100"
          aria-label={`Eliminar ${task.title}`}
        >
          <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </article>
    );
  };

  const columns = [
    { title: 'Pendientes', tasks: filteredTasks.filter((task) => !task.completed) },
    { title: 'Completadas', tasks: filteredTasks.filter((task) => task.completed) },
  ].filter((column) => filter === 'all' || column.tasks.length > 0);

  return (
    <div className="animate-fade-in mx-auto w-full max-w-[960px]">
      <PageHeader
        eyebrow="A tu propio ritmo"
        title="Tareas y plazos"
        subtitle="Un paso claro a la vez."
        action={(
          <button type="button" onClick={() => setShowForm((value) => !value)} className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
            Nueva tarea
          </button>
        )}
      />

      {showForm && (
        <div className="card mb-5 animate-fade-in space-y-3">
          <label className="sr-only" htmlFor="task-title">Nombre de la tarea</label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="¿Qué necesitas hacer?"
            className="input-field"
            autoFocus
            onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="sr-only" htmlFor="task-due-date">Fecha límite</label>
            <input id="task-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="input-field" />
            <label className="sr-only" htmlFor="task-priority">Prioridad</label>
            <select id="task-priority" value={priority} onChange={(event) => setPriority(event.target.value as Task['priority'])} className="input-field">
              <option value="baja">Prioridad baja</option>
              <option value="media">Prioridad media</option>
              <option value="alta">Prioridad alta</option>
            </select>
            <label className="sr-only" htmlFor="task-tag">Etiqueta</label>
            <select id="task-tag" value={tagId} onChange={(event) => setTagId(event.target.value)} className="input-field">
              <option value="">Sin etiqueta</option>
              {state.tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} className="btn-primary flex-1 text-sm">Guardar tarea</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className={viewMode === 'list' ? 'grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_290px]' : ''}>
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {(['all', 'pending', 'done'] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={`rounded-full px-3.5 py-2 text-xs font-medium transition-colors ${
                    filter === value ? 'bg-primary text-on-primary' : 'bg-surface text-muted hover-surface'
                  }`}
                >
                  {value === 'all' ? 'Todas' : value === 'pending' ? 'Pendientes' : 'Completadas'}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {viewMode === 'columns' && (
                <button type="button" onClick={onOpenFocus} className="btn-secondary inline-flex items-center gap-2 !px-3 !py-2 text-xs">
                  <Timer size={15} aria-hidden="true" /> Ir a Enfoque
                </button>
              )}
              <div className="flex rounded-full border border-token bg-surface p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label="Vista de lista"
                  aria-pressed={viewMode === 'list'}
                  className={`grid h-8 w-8 place-items-center rounded-full ${viewMode === 'list' ? 'bg-primary-soft text-primary' : 'text-muted'}`}
                >
                  <List size={16} strokeWidth={1.5} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('columns')}
                  aria-label="Vista por columnas"
                  aria-pressed={viewMode === 'columns'}
                  className={`grid h-8 w-8 place-items-center rounded-full ${viewMode === 'columns' ? 'bg-primary-soft text-primary' : 'text-muted'}`}
                >
                  <Columns3 size={16} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {filteredTasks.length ? (
            viewMode === 'list' ? (
              <div className="space-y-3 stagger-children">{filteredTasks.map(renderTask)}</div>
            ) : (
              <>
                <div className="hidden snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:flex">
                  {columns.map((column) => (
                    <section key={column.title} className="min-w-[240px] flex-1 snap-start rounded-3xl bg-soft p-3 sm:p-4">
                      <h2 className="mb-3 flex items-center justify-between px-1 text-lg text-ink">
                        {column.title}
                        <span className="rounded-full bg-surface px-2.5 py-1 font-sans text-xs text-muted">{column.tasks.length}</span>
                      </h2>
                      <div className="space-y-3">{column.tasks.map(renderTask)}</div>
                    </section>
                  ))}
                </div>
                <div className="space-y-3 stagger-children sm:hidden">{filteredTasks.map(renderTask)}</div>
              </>
            )
          ) : (
            <div className="card flex min-h-56 flex-col items-center justify-center text-center">
              <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Check size={21} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <h2 className="text-xl text-ink">
                {filter === 'done' ? 'Aún no hay tareas completadas' : filter === 'pending' ? 'Todo al día' : 'Un espacio para empezar'}
              </h2>
              <p className="mt-2 max-w-sm text-sm text-muted">
                {filter === 'all' ? 'Cuando tengas algo pendiente, puedes anotarlo aquí.' : 'No hay tareas en esta sección.'}
              </p>
              {filter === 'all' && (
                <button type="button" onClick={() => setShowForm(true)} className="btn-secondary mt-4 inline-flex items-center gap-2 text-sm">
                  <Plus size={15} strokeWidth={1.5} aria-hidden="true" /> Añadir primera tarea
                </button>
              )}
            </div>
          )}
        </section>

        {viewMode === 'list' && <FocusWidget timer={timer} onOpenFocus={onOpenFocus} />}
      </div>
    </div>
  );
}
