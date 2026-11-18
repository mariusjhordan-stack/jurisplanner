export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
  priority: 'baja' | 'media' | 'alta';
  tagId: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  completedDates: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime?: string;
  tagId: string;
  type: 'clase' | 'examen' | 'salida' | 'otro';
}

export type ScheduleClassType = 'teoria' | 'practica' | 'laboratorio';

export interface ScheduleClass {
  id: string;
  courseId: string;
  day: number;
  startTime: string;
  endTime: string;
  classroom: string;
  type: ScheduleClassType;
}

export interface ScheduleRange {
  startTime: string;
  endTime: string;
}

export type EvaluationType = 'practica' | 'parcial' | 'final' | 'trabajo' | 'otro';

export interface Evaluation {
  id: string;
  courseId: string;
  name: string;
  type: EvaluationType;
  week: number;
  weight: number;
  grade: number | null;
  date: string | null;
}

export interface StudyNote {
  id: string;
  kind: 'quick' | 'course';
  title: string;
  content: string;
  courseId: string | null;
  date: string;
  week: number | null;
  createdAt: string;
}

export interface EarnedPoint {
  id: string;
  courseId: string;
  title: string;
  date: string;
  earned: number;
  outOf: number;
  detail: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  isPersonal: boolean;
}

export interface Settings {
  darkMode: boolean;
  selectedCiclo: number | null;
  gradingScaleMax: number;
  passingGrade: number;
}

export interface AppState {
  tasks: Task[];
  habits: Habit[];
  events: CalendarEvent[];
  scheduleClasses: ScheduleClass[];
  scheduleRange: ScheduleRange;
  evaluations: Evaluation[];
  studyNotes: StudyNote[];
  earnedPoints: EarnedPoint[];
  tags: Tag[];
  dayNotes: Record<string, string>;
  settings: Settings;
  onboardingDone: boolean;
  frases: string[];
}

export type NavTab = 'inicio' | 'semana' | 'calendario' | 'tareas' | 'enfoque' | 'habitos' | 'eventos' | 'cursos' | 'notas' | 'canciones' | 'cumple' | 'ajustes';

export interface Config {
  nombre: string;
  cumpleaños: string;
  cumpleanos: string;
  pista: string;
  saludo: string;
  zona: string;
}

export interface Song {
  id: number;
  titulo: string;
  artista: string;
  momento: string;
  nota_personal: string;
  url: string;
  favorita: boolean;
}

export interface PlanEstudios {
  carrera: string;
  ciclos: Record<string, string[]>;
}
