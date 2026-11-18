import { useState } from 'react';
import { BookOpen, CalendarClock, CalendarDays, PartyPopper, Pin, Plus, Trash2 } from 'lucide-react';
import { useApp, useAppActions } from '../context/AppContext';
import type { CalendarEvent } from '../types';
import { formatDateLong, isToday, isPast } from '../utils/dates';
import PageHeader from './PageHeader';
import { getCourseColorStyle } from '../utils/courseColors';
import AddToCalendarButton from './AddToCalendarButton';

export default function EventsView() {
  const { state } = useApp();
  const { addEvent, deleteEvent } = useAppActions();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('08:00');
  const [endTime, setEndTime] = useState('');
  const [tagId, setTagId] = useState('');
  const [eventType, setEventType] = useState<CalendarEvent['type']>('otro');

  const handleAdd = () => {
    if (!title.trim() || !date) return;
    addEvent({
      title: title.trim(),
      date,
      time,
      endTime: endTime || undefined,
      tagId: tagId || 'personal',
      type: eventType,
    });
    setTitle('');
    setDate('');
    setTime('08:00');
    setEndTime('');
    setTagId('');
    setEventType('otro');
    setShowForm(false);
  };

  const sortedEvents = [...state.events].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  // Group by date
  const grouped = sortedEvents.reduce<Record<string, CalendarEvent[]>>((acc, evt) => {
    if (!acc[evt.date]) acc[evt.date] = [];
    acc[evt.date].push(evt);
    return acc;
  }, {});

  const getTag = (id: string) => state.tags.find((t) => t.id === id);

  const typeIcons = {
    clase: BookOpen,
    examen: CalendarDays,
    salida: PartyPopper,
    otro: Pin,
  };

  return (
    <div className="animate-fade-in mx-auto w-full max-w-[960px]">
      <PageHeader
        eyebrow="Tu agenda"
        title="Eventos"
        subtitle="Clases, actividades y fechas importantes."
        action={(
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Plus size={16} strokeWidth={1.5} aria-hidden="true" /> Nuevo evento
          </button>
        )}
      />

      {/* Add form */}
      {showForm && (
        <div className="card mb-4 animate-fade-in space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nombre del evento..."
            className="input-field"
            autoFocus
          />
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field flex-1 min-w-[140px]"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input-field w-28"
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="Fin"
              className="input-field w-28"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as CalendarEvent['type'])}
              className="input-field flex-1 min-w-[120px]"
            >
              <option value="clase">Clase</option>
              <option value="examen">Examen</option>
              <option value="salida">Salida</option>
              <option value="otro">Otro</option>
            </select>
            <select
              value={tagId}
              onChange={(e) => setTagId(e.target.value)}
              className="input-field flex-1 min-w-[120px]"
            >
              <option value="">Etiqueta...</option>
              {state.tags.map((tag) => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
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

      {/* Events by date */}
      <div className="space-y-6 stagger-children">
        {Object.entries(grouped).map(([dateStr, events]) => (
          <div key={dateStr}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className={`text-sm font-semibold ${
                isToday(dateStr)
                  ? 'text-primary'
                  : isPast(dateStr)
                  ? 'text-muted'
                  : 'text-ink'
              }`}>
                {isToday(dateStr) ? 'Hoy' : formatDateLong(dateStr)}
              </h3>
              {isPast(dateStr) && !isToday(dateStr) && (
                <span className="text-[10px] text-muted">(pasado)</span>
              )}
            </div>

            <div className="space-y-2">
              {events.map((event) => {
                const tag = getTag(event.tagId);
                const EventIcon = typeIcons[event.type];
                return (
                  <div key={event.id} className="card flex items-center gap-3 group">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"
                      style={tag ? getCourseColorStyle(tag.color, tag.id) : undefined}
                    >
                      <EventIcon size={20} aria-hidden="true" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-ink break-words">
                        {event.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted">
                          {event.time}{event.endTime ? ` – ${event.endTime}` : ''}
                        </span>
                        {tag && (
                          <span className="tag text-[10px]" style={getCourseColorStyle(tag.color, tag.id)}>
                            {tag.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <AddToCalendarButton entry={{ kind: 'event', event }} />

                    <button
                      onClick={() => deleteEvent(event.id)}
                      type="button"
                      aria-label={`Eliminar ${event.title}`}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted opacity-70 transition-colors hover:bg-accent-soft hover:text-ink sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {state.events.length === 0 && (
        <div className="card flex flex-col items-center py-12 text-center">
          <CalendarClock className="mb-3 text-primary" size={30} aria-hidden="true" />
          <p className="text-sm text-muted">Agrega tu primer evento</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-secondary mt-4 inline-flex items-center gap-2 text-sm"
          >
            <Plus size={15} aria-hidden="true" /> Añadir evento
          </button>
        </div>
      )}
    </div>
  );
}
