import { useState } from 'react';
import {
  Apple,
  BookOpen,
  Droplets,
  Flame,
  Flower2,
  MoonStar,
  Music2,
  Pencil,
  Pill,
  Sprout,
  Star,
  Target,
  PersonStanding,
  Trash2,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { useApp, useAppActions } from '../context/AppContext';
import { getTodayInLima, getStreakCount } from '../utils/dates';
import PageHeader from './PageHeader';
import HabitMark from './HabitMark';
import { animateCompletion } from '../utils/completionAnimation';

const HABIT_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: 'Star', icon: Star },
  { name: 'Droplets', icon: Droplets },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'PersonStanding', icon: PersonStanding },
  { name: 'Wind', icon: Wind },
  { name: 'MoonStar', icon: MoonStar },
  { name: 'Music2', icon: Music2 },
  { name: 'Apple', icon: Apple },
  { name: 'Pencil', icon: Pencil },
  { name: 'Flower2', icon: Flower2 },
  { name: 'Pill', icon: Pill },
  { name: 'Target', icon: Target },
];

const SUGGESTED_HABITS = [
  { name: 'Tomar agua', icon: 'Droplets' },
  { name: 'Dormir bien', icon: 'MoonStar' },
  { name: 'Caminar', icon: 'PersonStanding' },
  { name: 'Leer un rato', icon: 'BookOpen' },
  { name: 'Estirar', icon: 'Wind' },
];

export default function HabitsView() {
  const { state } = useApp();
  const { toggleHabitToday, addHabit, deleteHabit } = useAppActions();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Star');

  const today = getTodayInLima();

  const handleAdd = () => {
    if (!name.trim()) return;
    addHabit({ name: name.trim(), icon });
    setName('');
    setIcon('Star');
    setShowForm(false);
  };

  return (
    <div className="animate-fade-in mx-auto w-full max-w-[960px]">
      <PageHeader
        eyebrow="Rituales cotidianos"
        title="Hábitos"
        subtitle="Pequeños pasos que se sienten bien."
        action={(
          <button type="button" onClick={() => setShowForm((value) => !value)} className="btn-primary inline-flex items-center gap-2 text-sm">
            <Sprout size={16} strokeWidth={1.5} aria-hidden="true" /> Nuevo hábito
          </button>
        )}
      />

      {/* Add form */}
      {showForm && (
        <div className="card mb-4 animate-fade-in space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del hábito..."
            className="input-field"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <div>
            <p className="mb-2 text-xs text-muted">Icono:</p>
            <div className="flex flex-wrap gap-2">
              {HABIT_ICONS.map(({ name, icon: Icon }) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => setIcon(name)}
                  aria-label={`Usar icono ${name}`}
                  aria-pressed={icon === name}
                  className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${
                    icon === name ? 'bg-primary-soft text-primary ring-1 ring-token' : 'bg-soft text-muted hover:text-primary'
                  }`}
                >
                  <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary text-sm flex-1">
              Agregar
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Habits list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger-children">
        {state.habits.map((habit) => {
          const completedToday = habit.completedDates.includes(today);
          const streak = getStreakCount(habit.completedDates);

          return (
            <div key={habit.id} className="card group flex items-center gap-4">
              <button
                onClick={(event) => {
                  if (!completedToday) animateCompletion(event.currentTarget.closest('.card'));
                  toggleHabitToday(habit.id);
                }}
                aria-label={`${completedToday ? 'Desmarcar' : 'Completar'} ${habit.name}`}
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition-all duration-300 ${
                  completedToday
                    ? 'bg-primary-soft text-primary'
                    : 'bg-soft text-muted hover:scale-105'
                }`}
              >
                <HabitMark value={habit.icon} size={22} />
              </button>

              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${
                  completedToday
                    ? 'text-primary'
                    : 'text-ink'
                } break-words`}>
                  {habit.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {completedToday && <span className="text-xs font-medium text-primary">Hecho hoy</span>}
                  {streak > 0 && (
                    <span className="text-xs text-primary flex items-center gap-1">
                      <Flame className={streak >= 3 ? 'streak-fire' : ''} size={14} aria-hidden="true" />
                      {streak} día{streak !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => deleteHabit(habit.id)}
                aria-label={`Eliminar ${habit.name}`}
                className="grid h-8 w-8 place-items-center rounded-full text-muted opacity-70 transition-colors hover:bg-accent-soft hover:text-ink sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {state.habits.length === 0 && (
        <div className="card flex min-h-56 flex-col items-center justify-center text-center text-muted">
          <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Sprout size={22} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h2 className="text-xl text-ink">Empieza con algo pequeño</h2>
          <p className="mt-2 text-sm">Tus hábitos se irán formando a tu ritmo.</p>
          <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
            {SUGGESTED_HABITS.map((suggestion) => {
              const exists = state.habits.some((habit) => habit.name.toLocaleLowerCase('es') === suggestion.name.toLocaleLowerCase('es'));
              return (
                <button
                  type="button"
                  key={suggestion.name}
                  disabled={exists}
                  onClick={() => addHabit(suggestion)}
                  className="btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion.name}
                </button>
              );
            })}
          </div>
          <button type="button" className="mt-4 text-sm font-medium text-primary" onClick={() => setShowForm(true)}>Crear uno personalizado</button>
        </div>
      )}
    </div>
  );
}
