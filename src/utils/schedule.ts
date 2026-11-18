import type { ScheduleClass } from '../types';
import { getTodayInLima } from './dates';

export const WEEKDAYS = [
  { day: 1, short: 'Lun', full: 'Lunes' },
  { day: 2, short: 'Mar', full: 'Martes' },
  { day: 3, short: 'Mié', full: 'Miércoles' },
  { day: 4, short: 'Jue', full: 'Jueves' },
  { day: 5, short: 'Vie', full: 'Viernes' },
  { day: 6, short: 'Sáb', full: 'Sábado' },
  { day: 7, short: 'Dom', full: 'Domingo' },
] as const;

export const SCHEDULE_CLASS_TYPES = [
  { value: 'teoria', label: 'Teoría' },
  { value: 'practica', label: 'Práctica' },
  { value: 'laboratorio', label: 'Laboratorio' },
] as const;

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getWeekdayInLima(date: string): number {
  const weekday = new Date(`${date}T12:00:00-05:00`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function getCurrentTimeInLima(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}

export function getScheduleConflicts(classes: ScheduleClass[]): Array<[ScheduleClass, ScheduleClass]> {
  const conflicts: Array<[ScheduleClass, ScheduleClass]> = [];
  classes.forEach((scheduleClass, index) => {
    classes.slice(index + 1).forEach((other) => {
      if (
        scheduleClass.day === other.day
        && timeToMinutes(scheduleClass.startTime) < timeToMinutes(other.endTime)
        && timeToMinutes(other.startTime) < timeToMinutes(scheduleClass.endTime)
      ) {
        conflicts.push([scheduleClass, other]);
      }
    });
  });
  return conflicts;
}

export function isClassInProgress(scheduleClass: ScheduleClass, date: string, currentTime: string): boolean {
  return date === getTodayInLima()
    && scheduleClass.day === getWeekdayInLima(date)
    && timeToMinutes(scheduleClass.startTime) <= timeToMinutes(currentTime)
    && timeToMinutes(currentTime) < timeToMinutes(scheduleClass.endTime);
}
