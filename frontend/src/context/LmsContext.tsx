'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { ref, set, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { normalizeCourse, cleanForFirebase } from '@/lib/courseUtils';
import {
  AssignmentItem,
  Course,
  InstitutionalCalendarEvent,
  LiveVirtualSession,
  StudentAnalyticsRecord,
  SubmittedFileItem,
  TeacherMultimediaFeedback,
} from '@/types';
import {
  analyzeSubmissionOriginality,
  calculateRubricScoreOnScale5,
  detectBrowserTimeZone,
} from '@/lib/lmsData';

export type ActiveAcademicRole = 'student' | 'instructor' | 'admin';
export type FontScaleMode = 'normal' | 'lg' | 'xl';

interface LmsContextValue {
  courses: Course[];
  assignments: AssignmentItem[];
  calendarEvents: InstitutionalCalendarEvent[];
  liveSessions: LiveVirtualSession[];
  studentAnalytics: StudentAnalyticsRecord[];
  activeRole: ActiveAcademicRole;
  setActiveRole: (role: ActiveAcademicRole) => void;
  timeZone: string;
  detectedTimeZone: string;
  setTimeZone: (tz: string) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  fontScale: FontScaleMode;
  setFontScale: (scale: FontScaleMode) => void;
  captionsEnabled: boolean;
  setCaptionsEnabled: (enabled: boolean) => void;
  isScreenReaderActive: boolean;
  speakText: (text: string) => void;
  stopSpeaking: () => void;
  twoFactorEnabled: boolean;
  setTwoFactorEnabled: (enabled: boolean) => void;
  ssoInstitutionName: string;
  submitStudentAssignment: (
    assignmentId: string,
    files: SubmittedFileItem[],
    textExcerpt: string
  ) => void;
  gradeAssignmentWithRubric: (
    assignmentId: string,
    selectedRubricLevels: Record<string, string>,
    feedback: TeacherMultimediaFeedback
  ) => void;
  createAssignmentAndSyncCalendar: (
    newAssignment: Omit<AssignmentItem, 'id' | 'status' | 'selectedRubricLevels' | 'submittedFiles'>
  ) => AssignmentItem;
  deleteAssignment: (assignmentId: string) => void;
  createCalendarEvent: (event: Omit<InstitutionalCalendarEvent, 'id'>) => void;
  deleteCalendarEvent: (eventId: string) => void;
  createLiveSession: (session: Omit<LiveVirtualSession, 'id'>) => void;
  deleteLiveSession: (sessionId: string) => void;
}

const LmsContext = createContext<LmsContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  role: 'ipt_lms_role_v3',
  tz: 'ipt_lms_tz_v3',
  contrast: 'ipt_lms_contrast_v3',
  fontScale: 'ipt_lms_fontscale_v3',
};

function parseRtdbList<T>(val: unknown): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean) as T[];
  if (typeof val === 'object') return Object.values(val as Record<string, T>).filter(Boolean);
  return [];
}

export function LmsProvider({ children }: { children: React.ReactNode }) {
  const { effectiveIsAdmin } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<InstitutionalCalendarEvent[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveVirtualSession[]>([]);
  const [rawUsers, setRawUsers] = useState<Record<string, any>>({});
  const [rawProgress, setRawProgress] = useState<Record<string, any>>({});

  const [activeRole, setActiveRoleState] = useState<ActiveAcademicRole>('student');
  const [detectedTimeZone, setDetectedTimeZone] = useState<string>('America/Bogota');
  const [timeZone, setTimeZoneState] = useState<string>('America/Bogota');

  const [highContrast, setHighContrastState] = useState<boolean>(false);
  const [fontScale, setFontScaleState] = useState<FontScaleMode>('normal');
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(true);
  const [isScreenReaderActive, setIsScreenReaderActive] = useState<boolean>(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(true);

  useEffect(() => {
    setActiveRoleState(effectiveIsAdmin ? 'instructor' : 'student');
  }, [effectiveIsAdmin]);

  useEffect(() => {
    const detected = detectBrowserTimeZone();
    setDetectedTimeZone(detected);

    try {
      // Limpiar cualquier caché viejo de datos de prueba en el navegador
      [
        'ipt_lms_assignments_v1',
        'ipt_lms_assignments_v2',
        'ipt_lms_calendar_v1',
        'ipt_lms_calendar_v2',
        'ipt_lms_live_v1',
        'ipt_lms_live_v2',
      ].forEach((k) => localStorage.removeItem(k));

      const savedTz = localStorage.getItem(STORAGE_KEYS.tz);
      setTimeZoneState(savedTz || detected);

      const savedContrast = localStorage.getItem(STORAGE_KEYS.contrast) === 'true';
      setHighContrastState(savedContrast);
      document.documentElement.setAttribute('data-contrast', savedContrast ? 'high' : 'normal');

      const savedScale = (localStorage.getItem(STORAGE_KEYS.fontScale) as FontScaleMode) || 'normal';
      setFontScaleState(savedScale);
      document.documentElement.setAttribute('data-font-scale', savedScale);
    } catch {
      // Ignorar errores de localStorage
    }

    // Suscripción 100% en tiempo real a Firebase Realtime Database
    const unsubs: Array<() => void> = [];
    try {
      unsubs.push(
        onValue(
          ref(db, 'courses'),
          (snap) => {
            if (snap.exists()) {
              const data = snap.val();
              const list = Object.keys(data).map((key) =>
                normalizeCourse({
                  ...data[key],
                  slug: data[key].slug || key,
                })
              );
              setCourses(list);
            } else {
              setCourses([]);
            }
          },
          () => setCourses([])
        )
      );

      unsubs.push(
        onValue(
          ref(db, 'lms_assignments'),
          (snap) => {
            if (snap.exists()) {
              setAssignments(parseRtdbList<AssignmentItem>(snap.val()));
            } else {
              setAssignments([]);
            }
          },
          () => setAssignments([])
        )
      );

      unsubs.push(
        onValue(
          ref(db, 'lms_calendar'),
          (snap) => {
            if (snap.exists()) {
              setCalendarEvents(parseRtdbList<InstitutionalCalendarEvent>(snap.val()));
            } else {
              setCalendarEvents([]);
            }
          },
          () => setCalendarEvents([])
        )
      );

      unsubs.push(
        onValue(
          ref(db, 'lms_live_sessions'),
          (snap) => {
            if (snap.exists()) {
              setLiveSessions(parseRtdbList<LiveVirtualSession>(snap.val()));
            } else {
              setLiveSessions([]);
            }
          },
          () => setLiveSessions([])
        )
      );

      unsubs.push(
        onValue(
          ref(db, 'users'),
          (snap) => {
            setRawUsers(snap.exists() ? snap.val() : {});
          },
          () => setRawUsers({})
        )
      );

      unsubs.push(
        onValue(
          ref(db, 'progress'),
          (snap) => {
            setRawProgress(snap.exists() ? snap.val() : {});
          },
          () => setRawProgress({})
        )
      );
    } catch {}

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  // Construcción en tiempo real de analítica estudiantil desde usuarios reales registrados en Firebase
  const studentAnalytics = useMemo<StudentAnalyticsRecord[]>(() => {
    const userEntries = Object.entries(rawUsers || {});
    if (userEntries.length === 0) return [];

    const totalLessonsAcrossCourses = courses.reduce(
      (acc, c) =>
        acc + (c.modules || []).reduce((mAcc, m) => mAcc + (m.lessons?.length || 0), 0),
      0
    );

    const totalAssignmentsCount = assignments.length;
    const completedAssignmentsCount = assignments.filter(
      (a) => a.status === 'submitted' || a.status === 'graded'
    ).length;
    const gradedAssignments = assignments.filter((a) => typeof a.finalGrade === 'number');
    const avgGrade =
      gradedAssignments.length > 0
        ? Number(
            (
              gradedAssignments.reduce((acc, a) => acc + (a.finalGrade || 0), 0) /
              gradedAssignments.length
            ).toFixed(2)
          )
        : 0;

    return userEntries.map(([uid, uData], idx) => {
      const userProg = rawProgress?.[uid] || {};
      const completedLessonsMap = userProg.completedLessons || {};
      const completedLessonsCount = Object.values(completedLessonsMap).filter(Boolean).length;

      const videoParticipationPercent =
        totalLessonsAcrossCourses > 0
          ? Math.min(100, Math.round((completedLessonsCount / totalLessonsAcrossCourses) * 100))
          : 0;

      const primaryCourse = courses[0];
      const riskFactors: string[] = [];
      if (totalLessonsAcrossCourses > 0 && videoParticipationPercent < 50) {
        riskFactors.push('Ha visto menos de la mitad de las clases publicadas');
      }
      if (totalAssignmentsCount > completedAssignmentsCount) {
        riskFactors.push(
          `Tiene ${totalAssignmentsCount - completedAssignmentsCount} tarea(s) por entregar`
        );
      }

      const dropoutRiskLevel: StudentAnalyticsRecord['dropoutRiskLevel'] =
        riskFactors.length >= 2 ? 'high' : riskFactors.length === 1 ? 'medium' : 'low';

      return {
        id: uid,
        studentName: uData?.displayName || uData?.email?.split('@')[0] || `Estudiante ${idx + 1}`,
        studentCode: `EST-${String(idx + 1).padStart(2, '0')}`,
        email: uData?.email || '',
        program: primaryCourse?.title || 'Sin curso asignado aún',
        courseSlug: primaryCourse?.slug || '',
        videoParticipationPercent,
        assignmentsCompleted: completedAssignmentsCount,
        assignmentsTotal: totalAssignmentsCount,
        currentGpa: avgGrade,
        lastActiveHoursAgo: 1,
        dropoutRiskLevel,
        riskFactors,
      };
    });
  }, [rawUsers, rawProgress, courses, assignments]);

  const setActiveRole = useCallback((role: ActiveAcademicRole) => {
    setActiveRoleState(role);
    try {
      localStorage.setItem(STORAGE_KEYS.role, role);
    } catch {}
  }, []);

  const setTimeZone = useCallback((tz: string) => {
    setTimeZoneState(tz);
    try {
      localStorage.setItem(STORAGE_KEYS.tz, tz);
    } catch {}
  }, []);

  const setHighContrast = useCallback((enabled: boolean) => {
    setHighContrastState(enabled);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-contrast', enabled ? 'high' : 'normal');
    }
    try {
      localStorage.setItem(STORAGE_KEYS.contrast, String(enabled));
    } catch {}
  }, []);

  const setFontScale = useCallback((scale: FontScaleMode) => {
    setFontScaleState(scale);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-font-scale', scale);
    }
    try {
      localStorage.setItem(STORAGE_KEYS.fontScale, scale);
    } catch {}
  }, []);

  const speakText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO';
    utterance.rate = 1.0;
    utterance.onstart = () => setIsScreenReaderActive(true);
    utterance.onend = () => setIsScreenReaderActive(false);
    utterance.onerror = () => setIsScreenReaderActive(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsScreenReaderActive(false);
  }, []);

  const submitStudentAssignment = useCallback(
    (assignmentId: string, files: SubmittedFileItem[], textExcerpt: string) => {
      setAssignments((prev) => {
        const updated = prev.map((asg) => {
          if (asg.id !== assignmentId) return asg;
          const primaryFileName = files[0]?.fileName || 'entrega_academica.pdf';
          const plagiarismReport = analyzeSubmissionOriginality(primaryFileName, textExcerpt);
          return {
            ...asg,
            status: 'submitted' as const,
            submittedFiles: files,
            submissionTextContent: textExcerpt,
            plagiarismReport,
          };
        });
        set(ref(db, 'lms_assignments'), cleanForFirebase(updated)).catch(() => {});
        return updated;
      });

      setCalendarEvents((prev) => {
        const updated = prev.map((ev) =>
          ev.linkedAssignmentId === assignmentId ? { ...ev, isPendingDelivery: false } : ev
        );
        set(ref(db, 'lms_calendar'), cleanForFirebase(updated)).catch(() => {});
        return updated;
      });
    },
    []
  );

  const gradeAssignmentWithRubric = useCallback(
    (
      assignmentId: string,
      selectedRubricLevels: Record<string, string>,
      feedback: TeacherMultimediaFeedback
    ) => {
      setAssignments((prev) => {
        const updated = prev.map((asg) => {
          if (asg.id !== assignmentId) return asg;
          const computedGrade = calculateRubricScoreOnScale5(asg.rubric, selectedRubricLevels);
          return {
            ...asg,
            status: 'graded' as const,
            selectedRubricLevels,
            multimediaFeedback: feedback,
            finalGrade: computedGrade,
          };
        });
        set(ref(db, 'lms_assignments'), cleanForFirebase(updated)).catch(() => {});
        return updated;
      });
    },
    []
  );

  const createAssignmentAndSyncCalendar = useCallback(
    (
      newAssignmentData: Omit<
        AssignmentItem,
        'id' | 'status' | 'selectedRubricLevels' | 'submittedFiles'
      >
    ): AssignmentItem => {
      const id = `asg-${Date.now()}`;
      const created: AssignmentItem = {
        ...newAssignmentData,
        id,
        status: 'pending',
        selectedRubricLevels: {},
        submittedFiles: [],
      };

      setAssignments((prev) => {
        const next = [created, ...prev];
        set(ref(db, 'lms_assignments'), cleanForFirebase(next)).catch(() => {});
        return next;
      });

      const calendarEvent: InstitutionalCalendarEvent = {
        id: `evt-${Date.now()}`,
        title: `Entrega de tarea: ${created.title}`,
        description: `Nueva tarea publicada en ${created.courseTitle}. Archivos permitidos: ${created.allowedExtensions.join(', ')}.`,
        category: 'assignment_due',
        courseSlug: created.courseSlug,
        courseTitle: created.courseTitle,
        startUtc: created.dueDateUtc,
        endUtc: created.dueDateUtc,
        locationOrUrl: `/assignments?id=${created.id}`,
        isPendingDelivery: true,
        linkedAssignmentId: created.id,
        syncedProviders: ['google_calendar', 'outlook', 'apple_calendar'],
        createdByRole: 'instructor',
      };

      setCalendarEvents((prev) => {
        const next = [calendarEvent, ...prev];
        set(ref(db, 'lms_calendar'), cleanForFirebase(next)).catch(() => {});
        return next;
      });

      return created;
    },
    []
  );

  const deleteAssignment = useCallback((assignmentId: string) => {
    setAssignments((prev) => {
      const next = prev.filter((a) => a.id !== assignmentId);
      set(ref(db, 'lms_assignments'), cleanForFirebase(next)).catch(() => {});
      return next;
    });
    setCalendarEvents((prev) => {
      const next = prev.filter((ev) => ev.linkedAssignmentId !== assignmentId);
      set(ref(db, 'lms_calendar'), cleanForFirebase(next)).catch(() => {});
      return next;
    });
  }, []);

  const createCalendarEvent = useCallback((event: Omit<InstitutionalCalendarEvent, 'id'>) => {
    const created: InstitutionalCalendarEvent = {
      ...event,
      id: `evt-${Date.now()}`,
    };
    setCalendarEvents((prev) => {
      const next = [created, ...prev];
      set(ref(db, 'lms_calendar'), cleanForFirebase(next)).catch(() => {});
      return next;
    });
  }, []);

  const deleteCalendarEvent = useCallback((eventId: string) => {
    setCalendarEvents((prev) => {
      const next = prev.filter((ev) => ev.id !== eventId);
      set(ref(db, 'lms_calendar'), cleanForFirebase(next)).catch(() => {});
      return next;
    });
  }, []);

  const createLiveSession = useCallback((session: Omit<LiveVirtualSession, 'id'>) => {
    const created: LiveVirtualSession = {
      ...session,
      id: `live-${Date.now()}`,
    };
    setLiveSessions((prev) => {
      const next = [created, ...prev];
      set(ref(db, 'lms_live_sessions'), cleanForFirebase(next)).catch(() => {});
      return next;
    });

    const endDate = new Date(
      new Date(session.startTimeUtc).getTime() + session.durationMinutes * 60000
    );
    const providerLabel =
      session.provider === 'ms_teams'
        ? 'Microsoft Teams'
        : session.provider === 'google_meet'
          ? 'Google Meet'
          : 'Zoom';

    const calEvent: InstitutionalCalendarEvent = {
      id: `evt-live-${Date.now()}`,
      title: `Clase en vivo (${providerLabel}): ${session.title}`,
      description: `Clase en vivo con grabación disponible a cargo de ${session.instructorName}.`,
      category: 'live_class',
      courseSlug: session.courseSlug,
      courseTitle: session.courseSlug,
      startUtc: session.startTimeUtc,
      endUtc: endDate.toISOString(),
      locationOrUrl: session.joinUrl,
      syncedProviders: ['google_calendar', 'outlook', 'apple_calendar'],
      createdByRole: 'instructor',
    };

    setCalendarEvents((prev) => {
      const next = [calEvent, ...prev];
      set(ref(db, 'lms_calendar'), cleanForFirebase(next)).catch(() => {});
      return next;
    });
  }, []);

  const deleteLiveSession = useCallback((sessionId: string) => {
    setLiveSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId);
      set(ref(db, 'lms_live_sessions'), cleanForFirebase(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <LmsContext.Provider
      value={{
        courses,
        assignments,
        calendarEvents,
        liveSessions,
        studentAnalytics,
        activeRole,
        setActiveRole,
        timeZone,
        detectedTimeZone,
        setTimeZone,
        highContrast,
        setHighContrast,
        fontScale,
        setFontScale,
        captionsEnabled,
        setCaptionsEnabled,
        isScreenReaderActive,
        speakText,
        stopSpeaking,
        twoFactorEnabled,
        setTwoFactorEnabled,
        ssoInstitutionName: 'IPT (Ivan Perez Tech)',
        submitStudentAssignment,
        gradeAssignmentWithRubric,
        createAssignmentAndSyncCalendar,
        deleteAssignment,
        createCalendarEvent,
        deleteCalendarEvent,
        createLiveSession,
        deleteLiveSession,
      }}
    >
      {children}
    </LmsContext.Provider>
  );
}

export function useLms() {
  const ctx = useContext(LmsContext);
  if (!ctx) {
    throw new Error('useLms debe utilizarse dentro de un LmsProvider');
  }
  return ctx;
}
