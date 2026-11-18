/**
 * Date utilities – all dates in America/Lima timezone
 */

const TIMEZONE = 'America/Lima';

export function getTodayInLima(): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function getGreetingInLima(): string {
  const hour = Number(new Intl.DateTimeFormat('en', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(new Date()));
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function getAge(birthDate: string, today = getTodayInLima()): number {
  const [birthYear, birthMonth, birthDay] = birthDate.split('-').map(Number);
  const [year, month, day] = today.split('-').map(Number);
  return year - birthYear - (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0);
}

export function getNowInLima(): Date {
  const str = new Date().toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(str);
}

export function getWeekDates(referenceDate?: string): string[] {
  const ref = referenceDate ? new Date(referenceDate + 'T12:00:00') : getNowInLima();
  const day = ref.getDay();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - ((day + 6) % 7));

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateDisplay(dateStr: string): string {
  return formatDateShort(dateStr);
}

function getDateForLima(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00-05:00`);
}

export function formatDateLong(dateStr: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(getDateForLima(dateStr)).toLocaleLowerCase('es-PE');
}

export function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(getDateForLima(dateStr)).replace(/(\p{L})\./gu, '$1').toLocaleLowerCase('es-PE');
}

export function getDayName(dateStr: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TIMEZONE,
    weekday: 'long',
  }).format(getDateForLima(dateStr)).toLocaleLowerCase('es-PE');
}

export function getDayShort(dateStr: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: TIMEZONE,
    weekday: 'short',
  }).format(getDateForLima(dateStr)).replace(/(\p{L})\./gu, '$1').toLocaleLowerCase('es-PE');
}

export function getDayNumber(dateStr: string): number {
  return Number(new Intl.DateTimeFormat('es-PE', {
    timeZone: TIMEZONE,
    day: 'numeric',
  }).format(getDateForLima(dateStr)));
}

export function isToday(dateStr: string): boolean {
  return dateStr === getTodayInLima();
}

export function isPast(dateStr: string): boolean {
  return dateStr < getTodayInLima();
}

export function isWithinDays(dateStr: string, days: number): boolean {
  const today = getTodayInLima();
  const target = dateStr;
  const diff = (new Date(target + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

export function isBirthdayToday(birthdayStr: string): boolean {
  return birthdayStr === getTodayInLima();
}

export function getStreakCount(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;

  const sorted = [...completedDates].sort().reverse();
  const today = getTodayInLima();

  // Start counting from today or yesterday
  let streak = 0;
  let checkDate = today;

  if (!sorted.includes(today)) {
    // Check if yesterday is included
    const yesterday = new Date(today + 'T12:00:00');
    yesterday.setDate(yesterday.getDate() - 1);
    checkDate = formatDate(yesterday);
    if (!sorted.includes(checkDate)) return 0;
  }

  while (sorted.includes(checkDate)) {
    streak++;
    const prev = new Date(checkDate + 'T12:00:00');
    prev.setDate(prev.getDate() - 1);
    checkDate = formatDate(prev);
  }

  return streak;
}
