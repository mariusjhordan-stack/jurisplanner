import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { downloadCalendarFile, type CalendarExportEntry } from '../utils/calendarExport';

export default function AddToCalendarButton({
  entry,
  compact = false,
}: {
  entry: CalendarExportEntry;
  compact?: boolean;
}) {
  const [error, setError] = useState('');
  const title = entry.kind === 'event' ? entry.event.title : entry.task.title;

  const handleDownload = () => {
    try {
      downloadCalendarFile(entry);
      setError('');
    } catch (downloadError) {
      console.error('No se pudo preparar el archivo de calendario.', downloadError);
      setError('No se pudo preparar el archivo de calendario.');
    }
  };

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={handleDownload}
        aria-label={`Añadir ${title} a mi calendario`}
        title="Añadir a mi calendario"
        className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-token text-muted transition-colors hover:bg-primary-soft hover:text-primary ${
          compact ? 'h-8 w-8' : 'min-h-8 px-2.5 text-xs'
        }`}
      >
        <CalendarPlus size={15} aria-hidden="true" />
        {!compact && <span className="hidden sm:inline">Añadir a mi calendario</span>}
      </button>
      {error && (
        <span role="alert" className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-token bg-surface px-2 py-1.5 text-[11px] text-ink shadow-lg">
          {error}
        </span>
      )}
    </span>
  );
}
