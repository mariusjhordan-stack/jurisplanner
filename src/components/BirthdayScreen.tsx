import '@fontsource/caveat/600.css';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CakeSlice, MoonStar } from 'lucide-react';
import config from '../data/config.json';
import carta from '../data/carta.txt?raw';
import canciones from '../data/canciones.json';
import { getAge } from '../utils/dates';
import { readSongCatalog } from '../utils/songs';
import SongCard from './SongCard';

type BirthdayPhase = 'waiting' | 'celebration' | 'letter';

interface BirthdayScreenProps {
  phase: BirthdayPhase;
  onClose: () => void;
}

function getCountdown(target: number, now: number) {
  const totalSeconds = Math.max(0, Math.floor((target - now) / 1000));
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

const letterBlocks = carta.trim().split(/\n\s*\n/);
const [openingBlock = '', ...remainingBlocks] = letterBlocks;
const [openingLine = '', ...openingRemainder] = openingBlock.split('\n');
const letterParagraphs = [
  ...[openingRemainder.join('\n').trim()].filter(Boolean),
  ...remainingBlocks.map((paragraph) => paragraph.trim()).filter(Boolean),
];
const luna = readSongCatalog(canciones).songs.find((song) => song.titulo.trim().toLocaleLowerCase('es-PE') === 'luna');
const signature = typeof config.firma === 'string' ? config.firma.trim() : '';

function Envelope({ opened, onOpen }: { opened: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-expanded={opened}
      aria-label={opened ? 'Sobre abierto, carta revelada' : 'Abrir el sobre con la carta'}
      className={`birthday-envelope ${opened ? 'is-open' : ''}`}
    >
      <svg viewBox="0 0 320 240" role="img" aria-labelledby="envelope-title">
        <title id="envelope-title">{opened ? 'Sobre abierto con una carta' : 'Sobre sellado con una luna'}</title>
        <rect x="14" y="77" width="292" height="144" rx="18" className="envelope-back" />
        <g className="envelope-letter">
          <rect x="57" y="29" width="206" height="167" rx="8" className="envelope-letter-paper" />
          <path d="M82 61h156M82 78h128M82 95h143" className="envelope-letter-lines" />
          <path d="M82 130h102" className="envelope-letter-lines" />
        </g>
        <path d="M14 83 160 185 306 83v120H14z" className="envelope-front" />
        <path d="M14 83 160 165 306 83 160 19z" className="envelope-flap" />
        <g className="envelope-seal" aria-hidden="true">
          <circle cx="160" cy="145" r="24" className="envelope-wax" />
          <path d="M165 128a16 16 0 1 0 10 27 14 14 0 0 1-10-27Z" className="envelope-moon" />
        </g>
      </svg>
      <span className="mt-1 block text-sm font-medium text-primary">
        {opened ? 'La carta está abierta' : 'Toca para abrir tu carta'}
      </span>
    </button>
  );
}

export default function BirthdayScreen({ phase, onClose }: BirthdayScreenProps) {
  const [now, setNow] = useState(Date.now);
  const [opened, setOpened] = useState(false);
  const letterBodyRef = useRef<HTMLDivElement>(null);
  const target = new Date(`${config.cumpleaños}T00:00:00-05:00`).getTime();
  const countdown = getCountdown(target, now);

  useEffect(() => {
    if (phase !== 'waiting') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (!opened || !letterBodyRef.current) return undefined;
    const revealItems = Array.from(letterBodyRef.current.querySelectorAll<HTMLElement>('.letter-reveal'));
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [opened]);

  const isCelebration = phase === 'celebration';
  const isWaiting = phase === 'waiting';

  return (
    <main className="app-shell relative flex min-h-screen flex-col items-center overflow-x-hidden px-4 py-10 sm:px-8 sm:py-12">
      <div className="birthday-night-sky" aria-hidden="true" />
      {isCelebration && (
        <div className="birthday-confetti" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${-((index * 7) % 13)}s` }} />
          ))}
        </div>
      )}

      <header className="relative z-10 mb-6 w-full max-w-3xl text-center">
        {isWaiting ? (
          <MoonStar className="moon-glow mx-auto mb-3 text-primary" size={40} strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <CakeSlice className="mx-auto mb-3 text-accent" size={38} strokeWidth={1.5} aria-hidden="true" />
        )}
        <p className="section-eyebrow mb-2">{isWaiting ? 'Un día especial se acerca' : isCelebration ? 'Hoy celebramos' : 'Un recuerdo para ti'}</p>
        <h1 className="page-title text-3xl sm:text-4xl">
          {isWaiting
            ? `Falta poquito, ${config.nombre}`
            : isCelebration
              ? `¡Feliz cumpleaños, ${config.nombre}!`
              : 'Mi carta'}
        </h1>
      </header>

      {isWaiting ? (
        <section className="card relative z-10 w-full max-w-lg text-center !p-6 sm:!p-10">
          <p className="text-sm leading-relaxed text-muted">Tu carta estará aquí el día de tu cumpleaños.</p>
          <div className="mt-7 grid grid-cols-4 gap-2 sm:gap-3" aria-label="Cuenta regresiva para el cumpleaños">
            {[
              { label: 'días', value: countdown.days },
              { label: 'horas', value: countdown.hours },
              { label: 'minutos', value: countdown.minutes },
              { label: 'segundos', value: countdown.seconds },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl bg-primary-soft px-1 py-3 sm:px-2 sm:py-4">
                <span className="block font-serif text-2xl tabular-nums text-ink sm:text-3xl">{String(value).padStart(2, '0')}</span>
                <span className="mt-1 block text-[9px] uppercase tracking-wider text-muted sm:text-[10px]">{label}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
          {isCelebration && (
            <p className="mb-2 rounded-full border border-token bg-surface/75 px-4 py-2 text-center font-serif text-sm italic text-muted">
              Hoy cumples {getAge(config.cumpleanos)} años
            </p>
          )}

          <Envelope opened={opened} onOpen={() => setOpened(true)} />

          {opened && (
            <article
              ref={letterBodyRef}
              className={`birthday-paper relative mt-5 w-full max-w-2xl rounded-[28px] p-6 sm:mt-7 sm:p-11 ${isCelebration ? 'animate-fade-in' : ''}`}
            >
              <div className="mx-auto max-w-[62ch] font-serif text-base leading-[1.9] sm:text-lg">
                {openingLine && <h2 className="letter-reveal mb-6 text-center font-serif text-2xl leading-snug sm:text-3xl">{openingLine}</h2>}
                {letterParagraphs.map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 12)}`} className="letter-reveal mb-5 whitespace-pre-line last:mb-0">
                    {paragraph}
                  </p>
                ))}
                {signature && <p className="letter-reveal mt-8 text-right font-caveat text-3xl font-semibold">{signature}</p>}
              </div>
            </article>
          )}

          {opened && luna && (
            <div className="mt-5 w-full max-w-2xl">
              <SongCard song={luna} variant="home" playButtonLabel="Poner Luna" />
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="btn-secondary relative z-10 mt-7 inline-flex items-center gap-2"
      >
        {isWaiting ? 'Volver a mi espacio' : isCelebration ? 'Entrar a mi espacio' : 'Volver al inicio'}
        <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </main>
  );
}
