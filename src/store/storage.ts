import type { AppState, CalendarEvent, EarnedPoint, Evaluation, EvaluationType, Habit, ScheduleClass, ScheduleClassType, ScheduleRange, Settings, StudyNote, Tag, Task } from '../types';

export const getDefaultState = (frases: string[] = []): AppState => ({
  tasks: [],
  habits: [],
  events: [],
  scheduleClasses: [],
  scheduleRange: { startTime: '07:00', endTime: '22:00' },
  evaluations: [],
  studyNotes: [],
  earnedPoints: [],
  tags: [],
  dayNotes: {},
  settings: {
    darkMode: false,
    selectedCiclo: null,
    gradingScaleMax: 20,
    passingGrade: 11,
  },
  onboardingDone: false,
  frases,
});

export function createBackup(state: AppState): string {
  return JSON.stringify({
    format: 'jurisplanner-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: state,
  }, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDayNotes(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.entries(value).every(([date, note]) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!match || typeof note !== 'string' || note.length > 160 || /[\r\n]/.test(note)) return false;
    const [, year, month, day] = match.map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year
      && parsed.getUTCMonth() + 1 === month
      && parsed.getUTCDate() === day;
  });
}

export function normalizeDayNotes(value: unknown): Record<string, string> {
  if (value === undefined) return {};
  if (!isDayNotes(value)) {
    throw new Error('Las notas del día tienen un formato inválido.');
  }
  return { ...value };
}

function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() + 1 === month
    && date.getUTCDate() === day;
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isScheduleClassType(value: unknown): value is ScheduleClassType {
  return value === 'teoria' || value === 'practica' || value === 'laboratorio';
}

function isScheduleClass(value: unknown): value is ScheduleClass {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.courseId === 'string'
    && value.courseId.trim().length > 0
    && typeof value.day === 'number'
    && Number.isInteger(value.day)
    && value.day >= 1
    && value.day <= 7
    && isTime(value.startTime)
    && isTime(value.endTime)
    && value.startTime < value.endTime
    && typeof value.classroom === 'string'
    && value.classroom.length <= 100
    && isScheduleClassType(value.type);
}

export function normalizeScheduleClasses(value: unknown): ScheduleClass[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every(isScheduleClass)) {
    throw new Error('El horario contiene clases incompletas o inválidas.');
  }
  return value;
}

export function normalizeScheduleRange(value: unknown): ScheduleRange {
  if (value === undefined) return { startTime: '07:00', endTime: '22:00' };
  if (
    !isRecord(value)
    || !isTime(value.startTime)
    || !isTime(value.endTime)
    || value.startTime >= value.endTime
  ) {
    throw new Error('El rango visible del horario es inválido.');
  }
  return { startTime: value.startTime, endTime: value.endTime };
}

export function normalizeSettings(value: unknown): Settings {
  if (value === undefined) return getDefaultState().settings;
  if (!isRecord(value)) throw new Error('La configuración de notas tiene un formato inválido.');

  const darkMode = value.darkMode;
  const selectedCiclo = value.selectedCiclo;
  const gradingScaleMax = value.gradingScaleMax === undefined ? 20 : value.gradingScaleMax;
  const passingGrade = value.passingGrade === undefined ? 11 : value.passingGrade;
  if (
    typeof darkMode !== 'boolean'
    || !(typeof selectedCiclo === 'number' || selectedCiclo === null)
    || typeof gradingScaleMax !== 'number'
    || !Number.isFinite(gradingScaleMax)
    || gradingScaleMax <= 0
    || typeof passingGrade !== 'number'
    || !Number.isFinite(passingGrade)
    || passingGrade < 0
    || passingGrade > gradingScaleMax
  ) {
    throw new Error('La configuración de notas tiene valores inválidos.');
  }
  return { darkMode, selectedCiclo, gradingScaleMax, passingGrade };
}

function isEvaluationType(value: unknown): value is EvaluationType {
  return value === 'practica' || value === 'parcial' || value === 'final' || value === 'trabajo' || value === 'otro';
}

function isEvaluation(value: unknown): value is Evaluation {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.courseId === 'string'
    && typeof value.name === 'string'
    && value.name.trim().length > 0
    && isEvaluationType(value.type)
    && typeof value.week === 'number'
    && Number.isInteger(value.week)
    && value.week >= 1
    && value.week <= 16
    && typeof value.weight === 'number'
    && Number.isFinite(value.weight)
    && value.weight > 0
    && value.weight <= 100
    && (value.grade === null || (typeof value.grade === 'number' && Number.isFinite(value.grade) && value.grade >= 0))
    && (value.date === null || (typeof value.date === 'string' && isValidDate(value.date)));
}

export function normalizeEvaluations(value: unknown, gradingScaleMax: number): Evaluation[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value)
    || !value.every(isEvaluation)
    || value.some((evaluation) => evaluation.grade !== null && evaluation.grade > gradingScaleMax)
  ) {
    throw new Error('Las evaluaciones contienen datos incompletos o inválidos.');
  }
  return value;
}

function isStudyNote(value: unknown): value is StudyNote {
  return isRecord(value)
    && typeof value.id === 'string'
    && (value.kind === 'quick' || value.kind === 'course')
    && typeof value.title === 'string'
    && value.title.trim().length > 0
    && value.title.length <= 120
    && typeof value.content === 'string'
    && value.content.length <= 10_000
    && (typeof value.courseId === 'string' || value.courseId === null)
    && typeof value.date === 'string'
    && isValidDate(value.date)
    && (value.week === null || (typeof value.week === 'number' && Number.isInteger(value.week) && value.week >= 1 && value.week <= 16))
    && typeof value.createdAt === 'string'
    && (value.kind !== 'course' || (
      typeof value.courseId === 'string'
      && typeof value.week === 'number'
      && Number.isInteger(value.week)
      && value.week >= 1
      && value.week <= 16
    ));
}

export function normalizeStudyNotes(value: unknown): StudyNote[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every(isStudyNote)) {
    throw new Error('Los apuntes contienen datos incompletos o inválidos.');
  }
  return value;
}

function isEarnedPoint(value: unknown): value is EarnedPoint {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.courseId === 'string'
    && value.courseId.trim().length > 0
    && typeof value.title === 'string'
    && value.title.trim().length > 0
    && value.title.length <= 120
    && typeof value.date === 'string'
    && isValidDate(value.date)
    && typeof value.earned === 'number'
    && Number.isFinite(value.earned)
    && value.earned >= 0
    && value.earned <= 100_000
    && typeof value.outOf === 'number'
    && Number.isFinite(value.outOf)
    && value.outOf > 0
    && value.outOf <= 100_000
    && typeof value.detail === 'string'
    && value.detail.length <= 1000;
}

export function normalizeEarnedPoints(value: unknown): EarnedPoint[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every(isEarnedPoint)) {
    throw new Error('Los puntos registrados contienen datos incompletos o inválidos.');
  }
  return value;
}

function isTask(value: unknown): value is Task {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.completed === 'boolean'
    && (typeof value.dueDate === 'string' || value.dueDate === null)
    && (value.priority === 'baja' || value.priority === 'media' || value.priority === 'alta')
    && typeof value.tagId === 'string'
    && typeof value.createdAt === 'string';
}

function isHabit(value: unknown): value is Habit {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.icon === 'string'
    && Array.isArray(value.completedDates)
    && value.completedDates.every((date) => typeof date === 'string');
}

function isEvent(value: unknown): value is CalendarEvent {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.date === 'string'
    && typeof value.time === 'string'
    && (value.endTime === undefined || typeof value.endTime === 'string')
    && typeof value.tagId === 'string'
    && (value.type === 'clase' || value.type === 'examen' || value.type === 'salida' || value.type === 'otro');
}

function isTag(value: unknown): value is Tag {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.color === 'string'
    && typeof value.isPersonal === 'boolean';
}

export function parseBackup(value: unknown): AppState {
  if (!isRecord(value) || value.format !== 'jurisplanner-backup' || value.version !== 1 || !isRecord(value.data)) {
    throw new Error('El archivo no tiene un formato de copia válido.');
  }

  const data = value.data;
  const dayNotes = normalizeDayNotes(data.dayNotes);
  const settings = normalizeSettings(data.settings);
  const evaluations = normalizeEvaluations(data.evaluations, settings.gradingScaleMax);
  const studyNotes = normalizeStudyNotes(data.studyNotes);
  const earnedPoints = normalizeEarnedPoints(data.earnedPoints);
  const scheduleClasses = normalizeScheduleClasses(data.scheduleClasses);
  const scheduleRange = normalizeScheduleRange(data.scheduleRange);
  if (
    !Array.isArray(data.tasks) || !data.tasks.every(isTask)
    || !Array.isArray(data.habits) || !data.habits.every(isHabit)
    || !Array.isArray(data.events) || !data.events.every(isEvent)
    || !Array.isArray(data.tags) || !data.tags.every(isTag)
    || typeof data.onboardingDone !== 'boolean'
    || !Array.isArray(data.frases) || !data.frases.every((phrase) => typeof phrase === 'string')
  ) {
    throw new Error('La copia contiene datos incompletos o inválidos.');
  }

  return {
    tasks: data.tasks,
    habits: data.habits,
    events: data.events,
    scheduleClasses,
    scheduleRange,
    evaluations,
    studyNotes,
    earnedPoints,
    tags: data.tags,
    dayNotes,
    settings,
    onboardingDone: data.onboardingDone,
    frases: data.frases,
  };
}
