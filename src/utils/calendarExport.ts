import type { CalendarEvent, Task } from '../types';

export type CalendarExportEntry =
  | { kind: 'event'; event: CalendarEvent }
  | { kind: 'task'; task: Task };

function formatIcsDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error('La fecha no tiene un formato válido.');

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    parsed.getUTCFullYear() !== Number(year)
    || parsed.getUTCMonth() + 1 !== Number(month)
    || parsed.getUTCDate() !== Number(day)
  ) {
    throw new Error('La fecha no existe en el calendario.');
  }
  return `${year}${month}${day}`;
}

function formatIcsTime(time: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) throw new Error('La hora del evento no tiene un formato válido.');
  return `${match[1]}${match[2]}00`;
}

function addOneDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, '0'),
    String(next.getUTCDate()).padStart(2, '0'),
  ].join('');
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function foldLine(line: string): string {
  const encoder = new TextEncoder();
  let folded = '';
  let byteLength = 0;
  for (const character of line) {
    const characterLength = encoder.encode(character).length;
    if (byteLength + characterLength > 75) {
      folded += '\r\n ';
      byteLength = 1;
    }
    folded += character;
    byteLength += characterLength;
  }
  return folded;
}

function getEntryDetails(entry: CalendarExportEntry) {
  if (entry.kind === 'event') {
    const { event } = entry;
    const date = formatIcsDate(event.date);
    const startTime = formatIcsTime(event.time);
    const lines = [
      `DTSTART;TZID=America/Lima:${date}T${startTime}`,
    ];
    if (event.endTime) {
      const endTime = formatIcsTime(event.endTime);
      const endDate = endTime < startTime ? addOneDay(event.date) : date;
      lines.push(`DTEND;TZID=America/Lima:${endDate}T${endTime}`);
    }
    return {
      id: event.id,
      title: event.title,
      description: 'Evento guardado en JurisPlanner.',
      dateLine: lines,
    };
  }

  const { task } = entry;
  if (!task.dueDate) throw new Error('Esta tarea no tiene una fecha límite.');
  const date = formatIcsDate(task.dueDate);
  return {
    id: task.id,
    title: task.title,
    description: 'Plazo de día completo guardado en JurisPlanner.',
    dateLine: [
      `DTSTART;VALUE=DATE:${date}`,
      `DTEND;VALUE=DATE:${addOneDay(task.dueDate)}`,
    ],
  };
}

export function createCalendarFile(entry: CalendarExportEntry): string {
  const details = getEntryDetails(entry);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const uid = `${entry.kind}-${encodeURIComponent(details.id)}@jurisplanner.local`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JurisPlanner//Calendario personal//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE',
    'TZID:America/Lima',
    'X-LIC-LOCATION:America/Lima',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0500',
    'TZNAME:-05',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    ...details.dateLine,
    `SUMMARY:${escapeText(details.title)}`,
    `DESCRIPTION:${escapeText(details.description)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio',
    'TRIGGER:-PT30M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

export function downloadCalendarFile(entry: CalendarExportEntry): void {
  const content = createCalendarFile(entry);
  const title = entry.kind === 'event' ? entry.event.title : entry.task.title;
  const safeTitle = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'agenda';
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeTitle}.ics`;
  link.style.display = 'none';
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
