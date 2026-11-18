import { ArrowUpRight, Music2 } from 'lucide-react';
import { useState } from 'react';
import type { Song } from '../types';
import { getSongEmbed } from '../utils/songs';

interface SongCardProps {
  song: Song;
  variant?: 'catalog' | 'featured' | 'home';
  playButtonLabel?: string;
}

function Turntable({ spinning }: { spinning: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0 text-primary" aria-hidden="true">
      <rect x="3" y="3" width="42" height="42" rx="12" fill="var(--primary-soft)" />
      <circle
        className={spinning ? 'vinyl-record-spinning' : ''}
        cx="22"
        cy="24"
        r="15"
        fill="var(--primary)"
      />
      <circle cx="22" cy="24" r="11.5" fill="none" stroke="var(--surface)" strokeOpacity=".35" />
      <circle cx="22" cy="24" r="7.5" fill="none" stroke="var(--surface)" strokeOpacity=".35" />
      <circle cx="22" cy="24" r="2" fill="var(--surface)" />
      <path d="m37 9-2 17-6 6" fill="none" stroke="var(--ink)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <circle cx="29" cy="32" r="2" fill="var(--accent)" />
    </svg>
  );
}

export default function SongCard({ song, variant = 'catalog', playButtonLabel }: SongCardProps) {
  const [playerOpen, setPlayerOpen] = useState(false);
  const embed = song.url ? getSongEmbed(song.url) : null;
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.titulo} ${song.artista}`)}`;
  const isCompact = variant === 'home';
  const label = variant === 'featured' ? 'Canción del día • 17 de noviembre' : song.momento;

  return (
    <article className={`card flex flex-col ${variant === 'featured' ? 'bg-primary-soft' : ''} ${isCompact ? 'gap-4 sm:flex-row sm:items-center' : 'min-h-52 justify-between'}`}>
      <div className={`flex min-w-0 ${isCompact ? 'items-center gap-4' : 'flex-col'}`}>
        <Turntable spinning={playerOpen} />
        <div className={isCompact ? 'min-w-0' : 'mt-4'}>
          <p className="section-eyebrow">{variant === 'home' ? 'Una canción para ti' : label}</p>
          <h2 className={`mt-1 text-ink ${variant === 'featured' ? 'truncate font-serif text-xl' : 'text-xl font-medium'}`}>
            {song.titulo}{variant === 'featured' ? ` — ${song.artista}` : ''}
          </h2>
          {variant !== 'featured' && <p className="mt-1 text-sm text-muted">{song.artista}</p>}
        </div>
      </div>

      {song.nota_personal && (
        <p className={`text-sm leading-relaxed text-muted ${isCompact ? 'sm:max-w-sm' : 'mt-4'}`}>{song.nota_personal}</p>
      )}

      <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${isCompact ? 'sm:ml-auto' : 'mt-5'}`}>
        {song.url ? (
          <a
            href={song.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-primary"
          >
            <Music2 size={16} strokeWidth={1.5} aria-hidden="true" />
            Escuchar
            <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
          </a>
        ) : (
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-primary"
          >
            <Music2 size={16} strokeWidth={1.5} aria-hidden="true" />
            Buscar en YouTube
            <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
          </a>
        )}

        {embed && (
          <button
            type="button"
            onClick={() => setPlayerOpen((open) => !open)}
            aria-expanded={playerOpen}
            className="btn-secondary !px-4 !py-2 text-sm"
          >
            {playerOpen ? 'Cerrar reproductor' : playButtonLabel ?? 'Reproducir aquí'}
          </button>
        )}
        {!embed && playButtonLabel && (
          <a
            href={song.url || searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary !px-4 !py-2 text-sm"
          >
            {playButtonLabel}
          </a>
        )}
      </div>

      {playerOpen && embed && (
        <div className="mt-4 w-full">
          <p className="mb-2 text-xs text-muted">Necesita internet</p>
          <iframe
            title={`Reproductor de ${song.titulo} — ${song.artista}`}
            src={embed.url}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            className={`w-full rounded-2xl ${embed.platform === 'spotify' ? 'h-[352px]' : 'aspect-video'}`}
          />
        </div>
      )}
    </article>
  );
}
