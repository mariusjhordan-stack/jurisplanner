import type { Song } from '../types';

export interface SongCatalog {
  songs: Song[];
  hasInvalidEntries: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function readSongCatalog(value: unknown): SongCatalog {
  if (!Array.isArray(value)) return { songs: [], hasInvalidEntries: true };

  let hasInvalidEntries = false;
  const songs = value.flatMap((entry, index): Song[] => {
    if (
      !isRecord(entry)
      || typeof entry.titulo !== 'string'
      || !entry.titulo.trim()
      || typeof entry.artista !== 'string'
      || !entry.artista.trim()
      || typeof entry.momento !== 'string'
      || typeof entry.nota_personal !== 'string'
    ) {
      hasInvalidEntries = true;
      return [];
    }

    const rawUrl = typeof entry.url === 'string' ? entry.url.trim() : '';
    if (entry.url !== undefined && typeof entry.url !== 'string') hasInvalidEntries = true;
    if (rawUrl && !isWebUrl(rawUrl)) hasInvalidEntries = true;

    return [{
      id: typeof entry.id === 'number' && Number.isFinite(entry.id) ? entry.id : index + 1,
      titulo: entry.titulo.trim(),
      artista: entry.artista.trim(),
      momento: entry.momento.trim(),
      nota_personal: entry.nota_personal.trim(),
      url: rawUrl && isWebUrl(rawUrl) ? rawUrl : '',
      favorita: typeof entry.favorita === 'boolean' ? entry.favorita : false,
    }];
  });

  return { songs, hasInvalidEntries };
}

export function getSongOfTheDay(songs: Song[], date: string): Song | undefined {
  if (!songs.length) return undefined;

  if (date.slice(5) === '11-17') {
    const luna = songs.find((song) => song.titulo.trim().toLocaleLowerCase('es') === 'luna');
    if (luna) return luna;
  }

  const [year, month, day] = date.split('-').map(Number);
  const dayIndex = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  return songs[dayIndex % songs.length];
}

export type SongEmbed = { platform: 'youtube' | 'spotify'; url: string };

export function getSongEmbed(url: string): SongEmbed | null {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (['youtu.be', 'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(hostname)) {
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    const videoId = hostname === 'youtu.be'
      ? segments[0]
      : parsedUrl.searchParams.get('v') ?? segments.find((_, index) => ['embed', 'shorts', 'live'].includes(segments[index - 1]));
    if (!videoId || !/^[\w-]{11}$/.test(videoId)) return null;
    return {
      platform: 'youtube',
      url: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`,
    };
  }

  if (hostname === 'open.spotify.com') {
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    const contentSegments = segments[0] === 'embed' ? segments.slice(1) : segments;
    const [type, id] = contentSegments;
    if (!['track', 'album', 'playlist', 'episode', 'show'].includes(type) || !id || !/^[A-Za-z0-9]+$/.test(id)) return null;
    return {
      platform: 'spotify',
      url: `https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}`,
    };
  }

  return null;
}
