import { MoonStar } from 'lucide-react';
import mensaje from '../data/mensaje.txt?raw';

export default function OnboardingScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center p-5 sm:p-8">
      <section className="card w-full max-w-2xl text-center !p-7 sm:!p-12">
        <MoonStar className="moon-glow mx-auto mb-5 text-primary" size={42} strokeWidth={1.5} aria-hidden="true" />
        <div className="whitespace-pre-line text-left font-serif text-base leading-relaxed text-ink sm:text-lg">
          {mensaje}
        </div>
        <button type="button" className="btn-primary mt-8 w-full sm:w-auto" onClick={onContinue}>
          Entrar a mi espacio
        </button>
      </section>
    </main>
  );
}
