import { Music2 } from 'lucide-react';
import canciones from '../data/canciones.json';
import { getTodayInLima } from '../utils/dates';
import { getSongOfTheDay, readSongCatalog } from '../utils/songs';
import PageHeader from './PageHeader';
import SongCard from './SongCard';

const catalog = readSongCatalog(canciones);

export default function SongsView() {
  const today = getTodayInLima();
  const songOfTheDay = today.slice(5) === '11-17'
    ? getSongOfTheDay(catalog.songs, today)
    : undefined;

  return (
    <section className="animate-fade-in">
      <PageHeader
        eyebrow="Colección personal"
        title="Libro de canciones"
        subtitle="Un pequeño lugar para guardar la música que acompaña tus días."
      />

      {catalog.hasInvalidEntries && (
        <p role="alert" className="card mb-5 text-sm leading-relaxed text-muted">
          No pudimos leer algunas canciones. Revisa el formato de canciones.json; las canciones válidas siguen disponibles.
        </p>
      )}

      {songOfTheDay && (
        <div className="mb-5">
          <SongCard song={songOfTheDay} variant="featured" />
        </div>
      )}

      {catalog.songs.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {catalog.songs.map((song, index) => (
            <SongCard key={`${song.id}-${index}`} song={song} />
          ))}
        </div>
      ) : catalog.hasInvalidEntries ? null : (
        <div className="card flex min-h-56 flex-col items-center justify-center text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-primary">
            <Music2 size={24} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h2 className="text-xl text-ink">Tu música, a tu ritmo</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Las canciones que elijas aparecerán aquí.
          </p>
        </div>
      )}
    </section>
  );
}
