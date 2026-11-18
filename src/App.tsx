import { useState, useEffect } from 'react';
import { AppProvider, useApp, useAppActions } from './context/AppContext';
import OnboardingScreen from './components/OnboardingScreen';
import BirthdayScreen from './components/BirthdayScreen';
import NavBar from './components/NavBar';
import WeekView from './components/WeekView';
import TasksView from './components/TasksView';
import HabitsView from './components/HabitsView';
import EventsView from './components/EventsView';
import CoursesView from './components/CoursesView';
import SongsView from './components/SongsView';
import SettingsView from './components/SettingsView';
import config from './data/config.json';
import { getTodayInLima } from './utils/dates';
import type { NavTab } from './types';
import HomeView from './components/HomeView';
import FocusView from './components/FocusView';
import useFocusTimer from './hooks/useFocusTimer';
import CalendarView from './components/CalendarView';
import NotesView from './components/NotesView';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function AppContent() {
  const { state, appReady, loadError, persistenceError, retryLoad, retryPersistence } = useApp();
  const { setOnboardingDone } = useAppActions();
  const focusTimer = useFocusTimer();
  const [activeTab, setActiveTab] = useState<NavTab>('inicio');
  const [weekTargetDate, setWeekTargetDate] = useState<string | null>(null);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [birthdayDismissed, setBirthdayDismissed] = useState(false);
  const [today, setToday] = useState(getTodayInLima);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installCardDismissed, setInstallCardDismissed] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const userAgent = navigator.userAgent;
  const androidChrome = /Android/i.test(userAgent)
    && /Chrome\/\d/i.test(userAgent)
    && !/(EdgA?|OPR|SamsungBrowser)/i.test(userAgent);
  const appleMobile = /iPhone|iPad|iPod/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const birthdayPhase = today < config.cumpleaños ? 'waiting' : today === config.cumpleaños ? 'celebration' : 'letter';
  const birthdayRequested = new URLSearchParams(window.location.search).get('modo') === 'cumple';
  const birthdayAvailable = birthdayPhase !== 'waiting' || birthdayRequested;
  const birthdayLabel = birthdayPhase === 'letter' ? 'Mi carta' : 'Modo cumpleaños';
  const showBirthday = (birthdayPhase === 'celebration' || birthdayRequested) && !birthdayDismissed;

  useEffect(() => {
    const timer = window.setInterval(() => setToday(getTodayInLima()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallCardDismissed(false);
    };
    const onAppInstalled = () => {
      setInstallPrompt(null);
      setInstallCardDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

    let active = true;
    let registration: ServiceWorkerRegistration | null = null;
    const onUpdateFound = () => {
      const installing = registration?.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller && registration) {
          setServiceWorkerRegistration(registration);
          setUpdateAvailable(true);
        }
      });
    };

    void navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(async (nextRegistration) => {
        if (!active) return;
        registration = nextRegistration;
        setServiceWorkerRegistration(nextRegistration);
        nextRegistration.addEventListener('updatefound', onUpdateFound);
        if (nextRegistration.waiting && navigator.serviceWorker.controller) setUpdateAvailable(true);
        await nextRegistration.update();
      })
      .catch((error: unknown) => {
        if (active) console.error('No se pudo registrar la aplicación sin conexión.', error);
      });

    return () => {
      active = false;
      registration?.removeEventListener('updatefound', onUpdateFound);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    setInstallPrompt(null);
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch (error) {
      console.error('No se pudo iniciar la instalación de la aplicación.', error);
    }
  };

  const activateUpdate = () => {
    const waitingWorker = serviceWorkerRegistration?.waiting;
    if (!waitingWorker) {
      setUpdateAvailable(false);
      return;
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  const installInstructions = appleMobile
    ? 'En Safari, toca Compartir y elige «Añadir a pantalla de inicio».'
    : androidChrome
      ? 'En Chrome, abre el menú ⋮ y elige «Instalar aplicación» o «Añadir a pantalla de inicio».'
      : 'Abre el menú del navegador y busca «Instalar aplicación» o «Añadir a pantalla de inicio».';

  const navigateToTab = (tab: NavTab) => {
    if (tab === 'semana') setWeekTargetDate(null);
    setActiveTab(tab);
  };

  if (!appReady) {
    return (
      <div className="app-shell min-h-screen flex items-center justify-center p-6">
        <p role="status" className="text-sm text-muted">Cargando tu espacio...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="app-shell min-h-screen flex items-center justify-center p-6">
        <div className="card max-w-sm w-full text-center p-8">
          <p role="alert" className="mb-4 text-sm text-ink">{loadError}</p>
          <button type="button" className="btn-primary w-full" onClick={() => void retryLoad()}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!state.onboardingDone) {
    return <OnboardingScreen onContinue={setOnboardingDone} />;
  }

  if (showBirthday) {
    return (
      <BirthdayScreen
        phase={birthdayPhase}
        onClose={() => setBirthdayDismissed(true)}
      />
    );
  }

  if (activeTab === 'cumple') {
    return <BirthdayScreen phase={birthdayPhase} onClose={() => setActiveTab('inicio')} />;
  }

  const renderView = () => {
    switch (activeTab) {
      case 'inicio': return (
        <HomeView
          onNavigate={navigateToTab}
          showInstallCard={androidChrome && Boolean(installPrompt) && !installCardDismissed}
          onInstall={() => void installApp()}
          onDismissInstallCard={() => setInstallCardDismissed(true)}
        />
      );
      case 'semana': return <WeekView onNavigate={navigateToTab} initialDate={weekTargetDate ?? today} />;
      case 'calendario': return (
        <CalendarView
          onNavigateToWeek={(date) => {
            setWeekTargetDate(date);
            setActiveTab('semana');
          }}
          onNavigateToNotes={() => setActiveTab('notas')}
        />
      );
      case 'tareas': return <TasksView timer={focusTimer} onOpenFocus={() => setActiveTab('enfoque')} />;
      case 'enfoque': return <FocusView timer={focusTimer} />;
      case 'habitos': return <HabitsView />;
      case 'eventos': return <EventsView />;
      case 'cursos': return <CoursesView />;
      case 'notas': return <NotesView onNavigate={navigateToTab} />;
      case 'canciones': return <SongsView />;
      case 'ajustes': return (
        <SettingsView
          installAvailable={Boolean(installPrompt)}
          installInstructions={installInstructions}
          onInstall={() => void installApp()}
        />
      );
      default: return <WeekView onNavigate={navigateToTab} initialDate={today} />;
    }
  };

  return (
    <div className="app-shell">
      <NavBar
        activeTab={activeTab}
        onTabChange={navigateToTab}
        onCollapseChange={setNavCollapsed}
        birthdayAvailable={birthdayAvailable}
        birthdayLabel={birthdayLabel}
      />

      {/* Main content */}
      <main className={`${navCollapsed ? 'lg:ml-[84px]' : 'lg:ml-[264px]'} min-h-screen px-4 pb-24 pt-7 transition-[margin] duration-200 sm:px-7 lg:px-10 lg:pb-10`}>
        <div className="mx-auto w-full max-w-[1240px]">
          {persistenceError && (
            <div className="card mb-6 flex flex-wrap items-center justify-between gap-3" role="alert">
              <p className="text-sm text-ink">No se guardaron los últimos cambios: {persistenceError}</p>
              <button type="button" className="btn-secondary text-sm" onClick={() => void retryPersistence()}>
                Reintentar guardado
              </button>
            </div>
          )}
          {updateAvailable && (
            <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 !py-3" role="status">
              <p className="text-sm text-ink">Hay una versión nueva</p>
              <button type="button" className="btn-secondary text-sm" onClick={activateUpdate}>
                Actualizar
              </button>
            </div>
          )}
          {renderView()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
