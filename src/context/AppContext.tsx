import { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState, type ReactNode } from 'react';
import type { AppState, EarnedPoint, Task, Habit, CalendarEvent, Evaluation, ScheduleClass, ScheduleRange, Settings, StudyNote, Tag } from '../types';
import { fetchAppData, saveAppData } from '../api';
import { getDefaultState } from '../store/storage';
import { v4 as uuidv4 } from 'uuid';
import { getTodayInLima } from '../utils/dates';

type PhraseData = string[] | { frases?: string[] };
const phraseModules = import.meta.glob<PhraseData>('../data/frases.json', {
  eager: true,
  import: 'default',
});
const phraseData = Object.values(phraseModules)[0];
const defaultPhrases = Array.isArray(phraseData)
  ? phraseData.filter((phrase): phrase is string => typeof phrase === 'string')
  : phraseData && Array.isArray(phraseData.frases)
    ? phraseData.frases.filter((phrase): phrase is string => typeof phrase === 'string')
    : [];

type Action =
  | { type: 'ADD_TASK'; payload: Omit<Task, 'id' | 'createdAt'> }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'TOGGLE_TASK'; payload: string }
  | { type: 'ADD_HABIT'; payload: Omit<Habit, 'id' | 'completedDates'> }
  | { type: 'DELETE_HABIT'; payload: string }
  | { type: 'TOGGLE_HABIT_TODAY'; payload: string }
  | { type: 'ADD_EVENT'; payload: Omit<CalendarEvent, 'id'> }
  | { type: 'UPDATE_EVENT'; payload: CalendarEvent }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'ADD_SCHEDULE_CLASS'; payload: Omit<ScheduleClass, 'id'> }
  | { type: 'UPDATE_SCHEDULE_CLASS'; payload: ScheduleClass }
  | { type: 'DELETE_SCHEDULE_CLASS'; payload: string }
  | { type: 'SET_SCHEDULE_RANGE'; payload: ScheduleRange }
  | { type: 'ADD_EVALUATION'; payload: Omit<Evaluation, 'id'> }
  | { type: 'UPDATE_EVALUATION'; payload: Evaluation }
  | { type: 'DELETE_EVALUATION'; payload: string }
  | { type: 'ADD_STUDY_NOTE'; payload: Omit<StudyNote, 'id'> }
  | { type: 'UPDATE_STUDY_NOTE'; payload: StudyNote }
  | { type: 'DELETE_STUDY_NOTE'; payload: string }
  | { type: 'ADD_EARNED_POINT'; payload: Omit<EarnedPoint, 'id'> }
  | { type: 'UPDATE_EARNED_POINT'; payload: EarnedPoint }
  | { type: 'DELETE_EARNED_POINT'; payload: string }
  | { type: 'SET_TAGS'; payload: Tag[] }
  | { type: 'SET_DAY_NOTE'; payload: { date: string; note: string } }
  | { type: 'ADD_TAG'; payload: Omit<Tag, 'id'> }
  | { type: 'UPDATE_TAG'; payload: Tag }
  | { type: 'DELETE_TAG'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'SET_ONBOARDING_DONE' }
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'UPDATE_PHRASES'; payload: string[] };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_TASK':
      return {
        ...state,
        tasks: [...state.tasks, { ...action.payload, id: uuidv4(), createdAt: new Date().toISOString() }],
      };
    case 'UPDATE_TASK':
      return { ...state, tasks: state.tasks.map((task) => (task.id === action.payload.id ? action.payload : task)) };
    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.payload) };
    case 'TOGGLE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((task) => task.id === action.payload ? { ...task, completed: !task.completed } : task),
      };
    case 'ADD_HABIT':
      return {
        ...state,
        habits: [...state.habits, { ...action.payload, id: uuidv4(), completedDates: [] }],
      };
    case 'DELETE_HABIT':
      return { ...state, habits: state.habits.filter((habit) => habit.id !== action.payload) };
    case 'TOGGLE_HABIT_TODAY': {
      const today = getTodayInLima();
      return {
        ...state,
        habits: state.habits.map((habit) => {
          if (habit.id !== action.payload) return habit;
          const completedDates = habit.completedDates.includes(today)
            ? habit.completedDates.filter((date) => date !== today)
            : [...habit.completedDates, today];
          return { ...habit, completedDates };
        }),
      };
    }
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, { ...action.payload, id: uuidv4() }] };
    case 'UPDATE_EVENT':
      return { ...state, events: state.events.map((event) => event.id === action.payload.id ? action.payload : event) };
    case 'DELETE_EVENT':
      return { ...state, events: state.events.filter((event) => event.id !== action.payload) };
    case 'ADD_SCHEDULE_CLASS':
      return { ...state, scheduleClasses: [...state.scheduleClasses, { ...action.payload, id: uuidv4() }] };
    case 'UPDATE_SCHEDULE_CLASS':
      return {
        ...state,
        scheduleClasses: state.scheduleClasses.map((item) => item.id === action.payload.id ? action.payload : item),
      };
    case 'DELETE_SCHEDULE_CLASS':
      return { ...state, scheduleClasses: state.scheduleClasses.filter((item) => item.id !== action.payload) };
    case 'SET_SCHEDULE_RANGE':
      return { ...state, scheduleRange: action.payload };
    case 'ADD_EVALUATION':
      return { ...state, evaluations: [...state.evaluations, { ...action.payload, id: uuidv4() }] };
    case 'UPDATE_EVALUATION':
      return {
        ...state,
        evaluations: state.evaluations.map((evaluation) => evaluation.id === action.payload.id ? action.payload : evaluation),
      };
    case 'DELETE_EVALUATION':
      return { ...state, evaluations: state.evaluations.filter((evaluation) => evaluation.id !== action.payload) };
    case 'ADD_STUDY_NOTE':
      return { ...state, studyNotes: [...state.studyNotes, { ...action.payload, id: uuidv4() }] };
    case 'UPDATE_STUDY_NOTE':
      return { ...state, studyNotes: state.studyNotes.map((note) => note.id === action.payload.id ? action.payload : note) };
    case 'DELETE_STUDY_NOTE':
      return { ...state, studyNotes: state.studyNotes.filter((note) => note.id !== action.payload) };
    case 'ADD_EARNED_POINT':
      return { ...state, earnedPoints: [...state.earnedPoints, { ...action.payload, id: uuidv4() }] };
    case 'UPDATE_EARNED_POINT':
      return { ...state, earnedPoints: state.earnedPoints.map((point) => point.id === action.payload.id ? action.payload : point) };
    case 'DELETE_EARNED_POINT':
      return { ...state, earnedPoints: state.earnedPoints.filter((point) => point.id !== action.payload) };
    case 'SET_TAGS':
      return { ...state, tags: action.payload };
    case 'SET_DAY_NOTE': {
      const dayNotes = { ...state.dayNotes };
      const note = action.payload.note.slice(0, 160);
      if (note.trim()) dayNotes[action.payload.date] = note;
      else delete dayNotes[action.payload.date];
      return { ...state, dayNotes };
    }
    case 'ADD_TAG':
      return { ...state, tags: [...state.tags, { ...action.payload, id: uuidv4() }] };
    case 'UPDATE_TAG':
      return { ...state, tags: state.tags.map((tag) => tag.id === action.payload.id ? action.payload : tag) };
    case 'DELETE_TAG':
      return {
        ...state,
        tags: state.tags.filter((tag) => tag.id !== action.payload),
        evaluations: state.evaluations.filter((evaluation) => evaluation.courseId !== action.payload),
        studyNotes: state.studyNotes.filter((note) => note.courseId !== action.payload),
        earnedPoints: state.earnedPoints.filter((point) => point.courseId !== action.payload),
        scheduleClasses: state.scheduleClasses.filter((item) => item.courseId !== action.payload),
      };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'TOGGLE_DARK_MODE':
      return { ...state, settings: { ...state.settings, darkMode: !state.settings.darkMode } };
    case 'SET_ONBOARDING_DONE':
      return { ...state, onboardingDone: true };
    case 'LOAD_STATE':
      return action.payload;
    case 'UPDATE_PHRASES':
      return { ...state, frases: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  appReady: boolean;
  loadError: string;
  persistenceError: string;
  retryLoad: () => Promise<void>;
  retryPersistence: () => Promise<void>;
  replaceAppData: (nextState: AppState) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, getDefaultState(defaultPhrases));
  const [appReady, setAppReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [persistenceError, setPersistenceError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const skipSave = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueue = useRef(Promise.resolve());

  const retryLoad = useCallback(async () => {
    setAppReady(false);
    setLoadError('');
    try {
      const { data } = await fetchAppData(defaultPhrases);
      skipSave.current = true;
      dispatch({ type: 'LOAD_STATE', payload: data });
      setHydrated(true);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los datos.');
    } finally {
      setAppReady(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data } = await fetchAppData(defaultPhrases);
        if (!active) return;
        skipSave.current = true;
        dispatch({ type: 'LOAD_STATE', payload: data });
        setHydrated(true);
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los datos.');
      } finally {
        if (active) setAppReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const retryPersistence = useCallback(async () => {
    setPersistenceError('');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      await saveQueue.current.catch(() => undefined);
      await saveAppData(state);
    } catch (error) {
      setPersistenceError(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
      throw error;
    }
  }, [state]);

  const replaceAppData = useCallback(async (nextState: AppState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      await saveQueue.current.catch(() => undefined);
      await saveAppData(nextState);
      skipSave.current = true;
      dispatch({ type: 'LOAD_STATE', payload: nextState });
      setPersistenceError('');
    } catch (error) {
      setPersistenceError(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
      throw error;
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', state.settings.darkMode ? 'dark' : 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      getComputedStyle(root).getPropertyValue('--bg').trim(),
    );
  }, [state.settings.darkMode]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    const snapshot = state;
    saveTimer.current = setTimeout(() => {
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(() => saveAppData(snapshot))
        .then(() => setPersistenceError(''))
        .catch((error: unknown) => {
          setPersistenceError(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
        });
    }, 250);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [hydrated, state]);

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      appReady,
      loadError,
      persistenceError,
      retryLoad,
      retryPersistence,
      replaceAppData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

export function useAppActions() {
  const { dispatch, replaceAppData } = useApp();

  return {
    replaceAppData,
    addTask: useCallback((task: Omit<Task, 'id' | 'createdAt'>) => dispatch({ type: 'ADD_TASK', payload: task }), [dispatch]),
    updateTask: useCallback((task: Task) => dispatch({ type: 'UPDATE_TASK', payload: task }), [dispatch]),
    deleteTask: useCallback((id: string) => dispatch({ type: 'DELETE_TASK', payload: id }), [dispatch]),
    toggleTask: useCallback((id: string) => dispatch({ type: 'TOGGLE_TASK', payload: id }), [dispatch]),
    addHabit: useCallback((habit: Omit<Habit, 'id' | 'completedDates'>) => dispatch({ type: 'ADD_HABIT', payload: habit }), [dispatch]),
    deleteHabit: useCallback((id: string) => dispatch({ type: 'DELETE_HABIT', payload: id }), [dispatch]),
    toggleHabitToday: useCallback((id: string) => dispatch({ type: 'TOGGLE_HABIT_TODAY', payload: id }), [dispatch]),
    addEvent: useCallback((event: Omit<CalendarEvent, 'id'>) => dispatch({ type: 'ADD_EVENT', payload: event }), [dispatch]),
    updateEvent: useCallback((event: CalendarEvent) => dispatch({ type: 'UPDATE_EVENT', payload: event }), [dispatch]),
    deleteEvent: useCallback((id: string) => dispatch({ type: 'DELETE_EVENT', payload: id }), [dispatch]),
    addScheduleClass: useCallback(
      (scheduleClass: Omit<ScheduleClass, 'id'>) => dispatch({ type: 'ADD_SCHEDULE_CLASS', payload: scheduleClass }),
      [dispatch],
    ),
    updateScheduleClass: useCallback(
      (scheduleClass: ScheduleClass) => dispatch({ type: 'UPDATE_SCHEDULE_CLASS', payload: scheduleClass }),
      [dispatch],
    ),
    deleteScheduleClass: useCallback((id: string) => dispatch({ type: 'DELETE_SCHEDULE_CLASS', payload: id }), [dispatch]),
    setScheduleRange: useCallback(
      (scheduleRange: ScheduleRange) => dispatch({ type: 'SET_SCHEDULE_RANGE', payload: scheduleRange }),
      [dispatch],
    ),
    addEvaluation: useCallback(
      (evaluation: Omit<Evaluation, 'id'>) => dispatch({ type: 'ADD_EVALUATION', payload: evaluation }),
      [dispatch],
    ),
    updateEvaluation: useCallback(
      (evaluation: Evaluation) => dispatch({ type: 'UPDATE_EVALUATION', payload: evaluation }),
      [dispatch],
    ),
    deleteEvaluation: useCallback((id: string) => dispatch({ type: 'DELETE_EVALUATION', payload: id }), [dispatch]),
    addStudyNote: useCallback((note: Omit<StudyNote, 'id'>) => dispatch({ type: 'ADD_STUDY_NOTE', payload: note }), [dispatch]),
    updateStudyNote: useCallback((note: StudyNote) => dispatch({ type: 'UPDATE_STUDY_NOTE', payload: note }), [dispatch]),
    deleteStudyNote: useCallback((id: string) => dispatch({ type: 'DELETE_STUDY_NOTE', payload: id }), [dispatch]),
    addEarnedPoint: useCallback((point: Omit<EarnedPoint, 'id'>) => dispatch({ type: 'ADD_EARNED_POINT', payload: point }), [dispatch]),
    updateEarnedPoint: useCallback((point: EarnedPoint) => dispatch({ type: 'UPDATE_EARNED_POINT', payload: point }), [dispatch]),
    deleteEarnedPoint: useCallback((id: string) => dispatch({ type: 'DELETE_EARNED_POINT', payload: id }), [dispatch]),
    setTags: useCallback((tags: Tag[]) => dispatch({ type: 'SET_TAGS', payload: tags }), [dispatch]),
    setDayNote: useCallback(
      (date: string, note: string) => dispatch({ type: 'SET_DAY_NOTE', payload: { date, note } }),
      [dispatch],
    ),
    addTag: useCallback((tag: Omit<Tag, 'id'>) => dispatch({ type: 'ADD_TAG', payload: tag }), [dispatch]),
    updateTag: useCallback((tag: Tag) => dispatch({ type: 'UPDATE_TAG', payload: tag }), [dispatch]),
    deleteTag: useCallback((id: string) => dispatch({ type: 'DELETE_TAG', payload: id }), [dispatch]),
    updateSettings: useCallback((settings: Partial<Settings>) => dispatch({ type: 'UPDATE_SETTINGS', payload: settings }), [dispatch]),
    toggleDarkMode: useCallback(() => dispatch({ type: 'TOGGLE_DARK_MODE' }), [dispatch]),
    setOnboardingDone: useCallback(() => dispatch({ type: 'SET_ONBOARDING_DONE' }), [dispatch]),
    updatePhrases: useCallback((phrases: string[]) => dispatch({ type: 'UPDATE_PHRASES', payload: phrases }), [dispatch]),
    clearAppData: useCallback(
      () => replaceAppData(getDefaultState(defaultPhrases)),
      [replaceAppData],
    ),
  };
}
