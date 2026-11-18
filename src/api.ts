import type { AppState } from './types';
import { getDefaultState, normalizeDayNotes, normalizeEarnedPoints, normalizeEvaluations, normalizeScheduleClasses, normalizeScheduleRange, normalizeSettings, normalizeStudyNotes } from './store/storage';

export type AppData = AppState;
const LOCAL_DATA_KEY = 'jurisplanner-data';

function getStorage(): Storage {
  if (typeof window === 'undefined') {
    throw new Error('El almacenamiento local solo está disponible en el navegador.');
  }
  try {
    return window.localStorage;
  } catch (error) {
    throw new Error('No se pudo acceder al almacenamiento local.', { cause: error });
  }
}

function parseSavedData(raw: string, defaultPhrases: string[]): AppData {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new Error('Los datos guardados no se pueden leer.', { cause: error });
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Los datos guardados tienen un formato inválido.');
  }
  const { authenticated: _legacyAuth, ...savedData } = value as Partial<AppData> & { authenticated?: unknown };
  const savedPhrases = Array.isArray(savedData.frases)
    ? savedData.frases.filter((phrase): phrase is string => typeof phrase === 'string')
    : [];
  const settings = normalizeSettings(savedData.settings);
  const scheduleClasses = normalizeScheduleClasses(savedData.scheduleClasses);
  const scheduleRange = normalizeScheduleRange(savedData.scheduleRange);
  return {
    ...getDefaultState(defaultPhrases),
    ...savedData,
    scheduleClasses,
    scheduleRange,
    evaluations: normalizeEvaluations(savedData.evaluations, settings.gradingScaleMax),
    studyNotes: normalizeStudyNotes(savedData.studyNotes),
    earnedPoints: normalizeEarnedPoints(savedData.earnedPoints),
    dayNotes: normalizeDayNotes(savedData.dayNotes),
    settings,
    frases: savedPhrases.length ? savedPhrases : defaultPhrases,
  };
}

export async function fetchAppData(defaultPhrases: string[] = []): Promise<{ initialized: boolean; data: AppData }> {
  const storage = getStorage();
  const raw = storage.getItem(LOCAL_DATA_KEY);
  if (!raw) {
    return { initialized: false, data: getDefaultState(defaultPhrases) };
  }

  return { initialized: true, data: parseSavedData(raw, defaultPhrases) };
}

export async function saveAppData(data: AppData): Promise<void> {
  const storage = getStorage();
  try {
    storage.setItem(LOCAL_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    throw new Error('No se pudieron guardar los datos en este dispositivo.', { cause: error });
  }
}
