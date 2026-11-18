import { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { useApp, useAppActions } from '../context/AppContext';
import { createBackup, parseBackup } from '../store/storage';
import PageHeader from './PageHeader';

interface SettingsViewProps {
  installAvailable: boolean;
  installInstructions: string;
  onInstall: () => void;
}

function GradeSettings({
  gradingScaleMax,
  passingGrade,
  maxRecordedGrade,
  onSave,
}: {
  gradingScaleMax: number;
  passingGrade: number;
  maxRecordedGrade: number;
  onSave: (values: { gradingScaleMax: number; passingGrade: number }) => void;
}) {
  const [scaleInput, setScaleInput] = useState(String(gradingScaleMax));
  const [passingInput, setPassingInput] = useState(String(passingGrade));
  const [error, setError] = useState('');

  const save = () => {
    if (!scaleInput.trim() || !passingInput.trim()) {
      setError('Completa ambos valores.');
      return;
    }
    const scale = Number(scaleInput);
    const passing = Number(passingInput);
    if (!Number.isFinite(scale) || scale <= 0) {
      setError('La escala máxima debe ser mayor que cero.');
      return;
    }
    if (scale < maxRecordedGrade) {
      setError('La escala máxima no puede ser menor que una nota ya registrada.');
      return;
    }
    if (!Number.isFinite(passing) || passing < 0 || passing > scale) {
      setError('La nota aprobatoria debe estar entre cero y la escala máxima.');
      return;
    }
    onSave({ gradingScaleMax: scale, passingGrade: passing });
    setError('');
  };

  return (
    <div className="card mb-4 space-y-3">
      <div>
        <h3 className="text-sm font-medium text-ink">Notas</h3>
        <p className="mt-1 text-xs text-muted">Configura la escala y la nota mínima para aprobar.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-ink">
          Escala máxima
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={scaleInput}
            onChange={(event) => setScaleInput(event.currentTarget.value)}
            className="input-field mt-1.5"
          />
        </label>
        <label className="text-xs font-medium text-ink">
          Nota aprobatoria
          <input
            type="number"
            min="0"
            step="0.1"
            value={passingInput}
            onChange={(event) => setPassingInput(event.currentTarget.value)}
            className="input-field mt-1.5"
          />
        </label>
      </div>
      {error && <p role="alert" className="text-xs text-primary">{error}</p>}
      <button type="button" className="btn-secondary w-full text-sm" onClick={save}>Guardar escala</button>
    </div>
  );
}

export default function SettingsView({ installAvailable, installInstructions, onInstall }: SettingsViewProps) {
  const { state } = useApp();
  const { toggleDarkMode, updateSettings, updatePhrases, replaceAppData, clearAppData } = useAppActions();
  const fileInput = useRef<HTMLInputElement>(null);
  const [backupMessage, setBackupMessage] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const exportBackup = () => {
    try {
      const backup = new Blob([createBackup(state)], { type: 'application/json' });
      const url = URL.createObjectURL(backup);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'jurisplanner-copia.json';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setBackupMessage('Copia exportada.');
    } catch {
      setBackupMessage('No se pudo exportar la copia.');
    }
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const contents: unknown = JSON.parse(await file.text());
      const importedState = parseBackup(contents);
      await replaceAppData(importedState);
      setBackupMessage('Copia importada.');
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'No se pudo importar la copia.');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const deleteAllData = async () => {
    try {
      await clearAppData();
      setConfirmingDelete(false);
      setBackupMessage('Todos los datos fueron borrados.');
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'No se pudieron borrar los datos. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="animate-fade-in mx-auto w-full max-w-lg">
      <PageHeader eyebrow="Tu espacio personal" title="Ajustes" subtitle="Preferencias y copias de seguridad." />

      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-ink">Modo oscuro</h3>
            <p className="mt-0.5 text-xs text-muted">{state.settings.darkMode ? 'Modo noche' : 'Modo día'}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.settings.darkMode}
            aria-label="Activar modo oscuro"
            onClick={toggleDarkMode}
            className={`relative h-7 w-12 rounded-full border border-token transition-colors ${state.settings.darkMode ? 'bg-primary' : 'bg-surface-2'}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-sm transition-all ${state.settings.darkMode ? 'left-[25px]' : 'left-0.5'}`}
            />
          </button>
        </div>
      </div>

      <GradeSettings
        key={`${state.settings.gradingScaleMax}-${state.settings.passingGrade}`}
        gradingScaleMax={state.settings.gradingScaleMax}
        passingGrade={state.settings.passingGrade}
        maxRecordedGrade={Math.max(0, ...state.evaluations.map((evaluation) => evaluation.grade ?? 0))}
        onSave={updateSettings}
      />

      <div className="card mb-4">
        <h3 className="text-sm font-medium text-ink">Aplicación</h3>
        <button
          type="button"
          className="btn-primary mt-3 inline-flex w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onInstall}
          disabled={!installAvailable}
        >
          <Download size={16} aria-hidden="true" />
          Instalar app
        </button>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {installAvailable ? 'La instalación está disponible en este dispositivo.' : installInstructions}
        </p>
      </div>

      <div className="card mb-4">
        <h3 className="mb-2 text-sm font-medium text-ink">Frases del día</h3>
        <p className="mb-2 text-xs text-muted">Una frase por línea. Se elige una distinta según el día del mes.</p>
        <textarea
          className="input-field min-h-28"
          value={state.frases.join('\n')}
          onChange={(event) => updatePhrases(event.target.value.split('\n').map((line) => line.trim()).filter(Boolean))}
          placeholder="Escribe aquí tus frases"
        />
      </div>

      <div className="card mb-4 space-y-3">
        <h3 className="text-sm font-medium text-ink">Datos</h3>
        <button
          className="btn-secondary w-full text-sm"
          onClick={exportBackup}
        >
          Exportar copia
        </button>
        <button
          className="btn-secondary w-full text-sm"
          onClick={() => fileInput.current?.click()}
        >
          Importar copia
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void importBackup(event.currentTarget.files?.[0])}
        />
        {backupMessage && <p role="status" className="text-sm text-muted">{backupMessage}</p>}
      </div>

      <div className="card mb-4">
        <h3 className="mb-2 text-sm font-medium text-ink">Acerca de</h3>
        <p className="text-xs leading-relaxed text-muted">
          Tus datos se guardan solo en este dispositivo. Usa Exportar copia para respaldarlos.
        </p>
      </div>

      <div className="card mb-4">
        <h3 className="mb-2 text-sm font-medium text-ink">Zona de cuidado</h3>
        <p className="mb-3 text-xs text-muted">Esto borrará todas tus tareas, eventos y configuración.</p>
        {confirmingDelete ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-ink">¿Confirmas que quieres borrar todos los datos? Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmingDelete(false)} className="btn-secondary text-sm">Cancelar</button>
              <button
                onClick={() => void deleteAllData()}
                className="btn-secondary bg-accent-soft text-ink text-sm"
              >
                Sí, borrar todo
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmingDelete(true)} className="btn-secondary bg-accent-soft text-ink text-sm">
            Borrar todos los datos
          </button>
        )}
      </div>

    </div>
  );
}
