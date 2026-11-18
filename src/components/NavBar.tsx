import { useState } from 'react';
import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CakeSlice,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  House,
  ListTodo,
  Menu,
  MoonStar,
  Music2,
  Settings2,
  Sprout,
  Timer,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { NavTab } from '../types';
import config from '../data/config.json';

interface NavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onCollapseChange: (collapsed: boolean) => void;
  birthdayAvailable: boolean;
  birthdayLabel: string;
}

const primaryTabs: { id: NavTab; label: string; icon: LucideIcon }[] = [
  { id: 'inicio', label: 'Inicio', icon: House },
  { id: 'semana', label: 'Semana', icon: CalendarDays },
  { id: 'tareas', label: 'Tareas', icon: ListTodo },
];

const additionalTabs: { id: NavTab; label: string; icon: LucideIcon }[] = [
  { id: 'habitos', label: 'Hábitos', icon: Sprout },
  { id: 'enfoque', label: 'Enfoque', icon: Timer },
  { id: 'calendario', label: 'Calendario', icon: CalendarRange },
  { id: 'eventos', label: 'Eventos', icon: CalendarClock },
  { id: 'cursos', label: 'Mis cursos', icon: BookOpen },
  { id: 'notas', label: 'Notas', icon: ClipboardList },
  { id: 'canciones', label: 'Libro de canciones', icon: Music2 },
  { id: 'cumple', label: 'Modo cumpleaños', icon: CakeSlice },
  { id: 'ajustes', label: 'Ajustes', icon: Settings2 },
];

export default function NavBar({ activeTab, onTabChange, onCollapseChange, birthdayAvailable, birthdayLabel }: NavBarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const allTabs = [...primaryTabs, ...additionalTabs]
    .filter((tab) => tab.id !== 'cumple' || birthdayAvailable)
    .map((tab) => tab.id === 'cumple' ? { ...tab, label: birthdayLabel } : tab);
  const moreTabs = allTabs.filter((tab) => !primaryTabs.some((primary) => primary.id === tab.id));
  const moreIsActive = moreTabs.some((tab) => tab.id === activeTab);

  const selectTab = (tab: NavTab) => {
    onTabChange(tab);
    setMoreOpen(false);
  };

  return (
    <>
      <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-token bg-surface/95 px-2 pt-2 pb-[max(.5rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium transition-colors ${
                activeTab === tab.id ? 'bg-primary-soft text-primary' : 'text-muted hover-surface'
              }`}
            >
              <tab.icon size={19} strokeWidth={1.6} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-current={moreIsActive ? 'page' : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium transition-colors ${
              moreIsActive || moreOpen ? 'bg-primary-soft text-primary' : 'text-muted hover-surface'
            }`}
          >
            <Menu size={19} strokeWidth={1.6} aria-hidden="true" />
            <span>Más</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar más secciones"
            className="absolute inset-0 bg-ink/35"
            onClick={() => setMoreOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="more-sections-title"
            className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-[28px] border border-token bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="section-eyebrow">Tu espacio</p>
                <h2 id="more-sections-title" className="mt-1 text-xl text-ink">Más secciones</h2>
              </div>
              <button type="button" className="btn-secondary grid h-10 w-10 place-items-center !p-0" onClick={() => setMoreOpen(false)} aria-label="Cerrar menú">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {moreTabs.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => selectTab(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl border px-3 text-left text-sm transition-colors ${
                    activeTab === tab.id ? 'border-primary bg-primary-soft text-primary' : 'border-token bg-surface text-ink hover-surface'
                  }`}
                >
                  <tab.icon size={18} strokeWidth={1.5} aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      <nav
        aria-label="Navegación principal"
        className={`fixed bottom-0 left-0 top-0 z-40 hidden flex-col border-r border-token bg-surface/90 p-4 backdrop-blur-xl transition-[width] lg:flex ${
          collapsed ? 'w-[84px]' : 'w-[264px]'
        }`}
      >
        <div className={`mb-8 flex min-h-12 items-center gap-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
              <MoonStar size={21} strokeWidth={1.5} aria-hidden="true" />
            </span>
            {!collapsed && <h1 className="truncate font-serif text-lg font-medium text-ink">JurisPlanner</h1>}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={() => {
                setCollapsed(true);
                onCollapseChange(true);
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover-surface"
              aria-label="Colapsar menú"
            >
              <ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}
          {collapsed && (
            <button
              type="button"
              onClick={() => {
                setCollapsed(false);
                onCollapseChange(false);
              }}
              className="absolute -right-3 top-7 grid h-7 w-7 place-items-center rounded-full border border-token bg-surface text-muted shadow-sm"
              aria-label="Expandir menú"
            >
              <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}
        </div>

        <p className={`section-eyebrow mb-3 px-3 ${collapsed ? 'sr-only' : ''}`}>Tu espacio</p>
        <div className="flex flex-1 flex-col gap-1">
          {allTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              title={collapsed ? tab.label : undefined}
              aria-label={tab.label}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 transition-colors ${
                collapsed ? 'justify-center' : ''
              } ${
                activeTab === tab.id
                  ? 'bg-primary-soft font-medium text-primary'
                  : 'text-muted hover-surface'
              }`}
            >
              <tab.icon size={19} strokeWidth={1.5} aria-hidden="true" />
              {!collapsed && <span className="text-sm">{tab.label}</span>}
            </button>
          ))}
        </div>

        <div className="mt-5 border-t border-token pt-4">
          <div className={`flex items-center gap-3 rounded-2xl bg-soft p-3 ${collapsed ? 'justify-center' : ''}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft font-serif text-lg text-primary" aria-hidden="true">
              {config.nombre.slice(0, 1).toLocaleUpperCase('es')}
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">{config.nombre}</span>
                <span className="block text-xs text-muted">Para ti</span>
              </span>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
