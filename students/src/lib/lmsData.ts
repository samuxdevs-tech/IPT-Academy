import {
  AssignmentItem,
  Course,
  InstitutionalCalendarEvent,
  LiveVirtualSession,
  RubricCriterion,
  StudentAnalyticsRecord,
  VideoCaptionCue,
  VideoChapterMarker,
  VideoQualityVariant,
  VideoRetentionPoint,
} from '@/types';

export const SUPPORTED_TIMEZONES = [
  { id: 'America/Bogota', label: 'Hora de Colombia, Perú y Ecuador', country: 'Colombia' },
  { id: 'America/Mexico_City', label: 'Hora de Ciudad de México', country: 'México' },
  { id: 'America/New_York', label: 'Hora de Miami y Nueva York', country: 'Estados Unidos' },
  { id: 'America/Argentina/Buenos_Aires', label: 'Hora de Argentina y Chile', country: 'Suramérica' },
  { id: 'Europe/Madrid', label: 'Hora de España', country: 'Europa' },
] as const;

export function detectBrowserTimeZone(): string {
  if (typeof window === 'undefined') return 'America/Bogota';
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
  } catch {
    return 'America/Bogota';
  }
}

export function formatUtcInTimeZone(
  utcIso: string,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const date = new Date(utcIso);
    return new Intl.DateTimeFormat('es-CO', {
      timeZone,
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...options,
    }).format(date);
  } catch {
    return utcIso;
  }
}

export function getTimeZoneOffsetLabel(timeZone: string): string {
  const found = SUPPORTED_TIMEZONES.find((t) => t.id === timeZone);
  if (found) return found.label;
  return 'Hora local';
}

// ============================================================================
// OPCIONES DE CALIDAD DE VIDEO (SIN VIDEOS FALSOS PRECARGADOS)
// ============================================================================

export const DEFAULT_ABR_VARIANTS: VideoQualityVariant[] = [
  {
    resolution: '1080p',
    bitrateKbps: 4800,
    fps: 60,
    codec: 'Imagen muy nítida (para internet rápido)',
    streamUrl: '',
  },
  {
    resolution: '720p',
    bitrateKbps: 2650,
    fps: 30,
    codec: 'Buena calidad (recomendada)',
    streamUrl: '',
  },
  {
    resolution: '480p',
    bitrateKbps: 1350,
    fps: 30,
    codec: 'Calidad media (para internet normal)',
    streamUrl: '',
  },
  {
    resolution: '360p',
    bitrateKbps: 780,
    fps: 30,
    codec: 'Bajo consumo de datos',
    streamUrl: '',
  },
  {
    resolution: '240p',
    bitrateKbps: 380,
    fps: 24,
    codec: 'Para internet lento (evita que el video se detenga)',
    streamUrl: '',
  },
];

// ============================================================================
// DATOS INICIALES EN BLANCO (100% SINCRONIZADOS CON FIREBASE RTDB Y PANEL ADMIN)
// ============================================================================

export const DEFAULT_VIDEO_CHAPTERS: VideoChapterMarker[] = [];
export const DEFAULT_VIDEO_CAPTIONS: VideoCaptionCue[] = [];
export const INITIAL_LIVE_SESSIONS: LiveVirtualSession[] = [];
export const INSTITUTIONAL_COURSES: Course[] = [];
export const INITIAL_ASSIGNMENTS: AssignmentItem[] = [];
export const INITIAL_CALENDAR_EVENTS: InstitutionalCalendarEvent[] = [];
export const INITIAL_STUDENT_ANALYTICS: StudentAnalyticsRecord[] = [];
export const VIDEO_RETENTION_CURVE: VideoRetentionPoint[] = [];

// ============================================================================
// CÁLCULO DE NOTAS, REVISIÓN DE CITAS Y DESCARGA DE CALENDARIO
// ============================================================================

export function calculateRubricScoreOnScale5(
  rubric: RubricCriterion[],
  selectedLevels: Record<string, string>
): number {
  if (!rubric || !rubric.length) return 0;
  let weightedSum = 0;
  let totalWeight = 0;

  for (const criterion of rubric) {
    const chosenLevelId = selectedLevels?.[criterion.id];
    const level = criterion.levels.find((l) => l.id === chosenLevelId);
    const points = level ? level.points : 0;
    weightedSum += points * (criterion.weightPercent / 100);
    totalWeight += criterion.weightPercent;
  }

  if (totalWeight <= 0) return 0;
  return Number(weightedSum.toFixed(2));
}


export function generateInstitutionalIcsFeed(events: InstitutionalCalendarEvent[]): string {
  const formatIcsDate = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IPT Academy//Calendario de Clases//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:IPT Academy — Mis Clases y Entregas',
    'X-WR-TIMEZONE:UTC',
  ];

  for (const ev of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}@iptcourse.local`,
      `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
      `DTSTART:${formatIcsDate(ev.startUtc)}`,
      `DTEND:${formatIcsDate(ev.endUtc)}`,
      `SUMMARY:${ev.title.replace(/,/g, '\\,')}`,
      `DESCRIPTION:${(ev.description + ' - Curso: ' + ev.courseTitle).replace(/\n/g, '\\n')}`,
      `LOCATION:${ev.locationOrUrl}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
