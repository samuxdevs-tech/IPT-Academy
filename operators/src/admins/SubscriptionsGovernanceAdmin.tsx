"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Mail,
  Clock,
  XCircle,
  ExternalLink,
  Copy,
  Sparkles,
  Building2,
  BookOpen,
  Users,
  ShieldCheck,
  CheckCircle2,
  Save,
  Search,
  Layers,
  Video,
  FolderOpen,
  Award,
  Database,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  rtdb,
  parseStudentRecordFromRtdb,
  ParsedIptStudent,
} from "@/lib/firebase";
import { ref, onValue, set } from "firebase/database";
import {
  DEFAULT_PLAN_CONFIGS,
  PlanConfig,
  StandardPlanId,
  PlanId,
  formatCop,
} from "@/lib/subscriptionEngine";

interface TeacherHrConfig {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  attendanceModel: "quorum" | "credits" | "hybrid";
  minQuorumStudents: number;
  maxSessionCapacity: number;
  hourlyHonorariumCop: number;
  updatedAt: string;
}

export function SubscriptionsGovernanceAdmin() {
  const [subTab, setSubTab] = useState<
    "live_explorer" | "plans" | "catalog" | "your_plan" | "teacher_hr" | "antifraud"
  >("live_explorer");

  const [planConfigs, setPlanConfigs] = useState<Record<StandardPlanId, PlanConfig>>(
    () => structuredClone(DEFAULT_PLAN_CONFIGS)
  );
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [rawUsers, setRawUsers] = useState<Record<string, any>>({});
  const [rawProgress, setRawProgress] = useState<Record<string, any>>({});
  const [rawSubs, setRawSubs] = useState<Record<string, any>>({});
  const [rawCerts, setRawCerts] = useState<Record<string, any>>({});
  const [assignmentsList, setAssignmentsList] = useState<any[]>([]);
  const [liveSessionsList, setLiveSessionsList] = useState<any[]>([]);
  const [yourPlanRequests, setYourPlanRequests] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [fingerprintsList, setFingerprintsList] = useState<any[]>([]);
  const [teacherHrList, setTeacherHrList] = useState<TeacherHrConfig[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Buscador activo de base de datos (Estudiantes, Cursos y Módulos)
  const [studentQuery, setStudentQuery] = useState<string>("");
  const [courseQuery, setCourseQuery] = useState<string>("");
  const [expandedCourseSlug, setExpandedCourseSlug] = useState<string | null>(null);
  const [expandedStudentUid, setExpandedStudentUid] = useState<string | null>(null);

  // Estado para aprobar solicitud de Your Plan
  const [customSeats, setCustomSeats] = useState<number>(10);
  const [customDynCourses, setCustomDynCourses] = useState<number>(5);
  const [customLiveCredits, setCustomLiveCredits] = useState<number>(12);
  const [customTrialDays, setCustomTrialDays] = useState<number>(10);
  const [customMonthlyPrice, setCustomMonthlyPrice] = useState<number>(1450000);
  const [customBillingMethod, setCustomBillingMethod] = useState<
    "wire_transfer" | "corporate_invoice" | "card"
  >("corporate_invoice");

  // Estado para agregar configuración RRHH Docente
  const [hrName, setHrName] = useState<string>("Ing. Carlos Mendoza");
  const [hrEmail, setHrEmail] = useState<string>("carlos.mendoza@ivanperez.tech");
  const [hrModel, setHrModel] = useState<"quorum" | "credits" | "hybrid">("hybrid");
  const [hrQuorum, setHrQuorum] = useState<number>(4);
  const [hrCapacity, setHrCapacity] = useState<number>(25);
  const [hrRateCop, setHrRateCop] = useState<number>(95000);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const unsubPlans = onValue(ref(rtdb, "lms_plan_configs"), (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setPlanConfigs({
          free: { ...DEFAULT_PLAN_CONFIGS.free, ...(val.free || {}) },
          pro: { ...DEFAULT_PLAN_CONFIGS.pro, ...(val.pro || {}) },
          pro_plus: { ...DEFAULT_PLAN_CONFIGS.pro_plus, ...(val.pro_plus || {}) },
        });
      }
    });

    const unsubCourses = onValue(ref(rtdb, "courses"), (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const arr = Array.isArray(val)
          ? val.filter(Boolean)
          : Object.keys(val).map((k) => ({ ...val[k], slug: val[k].slug || k }));
        setCoursesList(arr);
        if (arr.length > 0 && !expandedCourseSlug) {
          setExpandedCourseSlug(arr[0].slug);
        }
      } else {
        setCoursesList([]);
      }
    });

    const unsubUsers = onValue(ref(rtdb, "users"), (snap) => {
      setRawUsers(snap.exists() ? snap.val() : {});
    });

    const unsubProg = onValue(ref(rtdb, "progress"), (snap) => {
      setRawProgress(snap.exists() ? snap.val() : {});
    });

    const unsubSubs = onValue(ref(rtdb, "lms_subscriptions"), (snap) => {
      setRawSubs(snap.exists() ? snap.val() : {});
    });

    const unsubCerts = onValue(ref(rtdb, "certificates"), (snap) => {
      setRawCerts(snap.exists() ? snap.val() : {});
    });

    const unsubAsg = onValue(ref(rtdb, "lms_assignments"), (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setAssignmentsList(Array.isArray(val) ? val.filter(Boolean) : Object.values(val));
      } else {
        setAssignmentsList([]);
      }
    });

    const unsubLive = onValue(ref(rtdb, "lms_live_sessions"), (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setLiveSessionsList(Array.isArray(val) ? val.filter(Boolean) : Object.values(val));
      } else {
        setLiveSessionsList([]);
      }
    });

    const unsubReqs = onValue(ref(rtdb, "lms_your_plan_requests"), (snap) => {
      if (snap.exists()) {
        setYourPlanRequests(Object.values(snap.val()));
      } else {
        setYourPlanRequests([]);
      }
    });

    const unsubOrgs = onValue(ref(rtdb, "lms_organizations"), (snap) => {
      if (snap.exists()) {
        setOrganizations(Object.values(snap.val()));
      } else {
        setOrganizations([]);
      }
    });

    const unsubInvs = onValue(ref(rtdb, "lms_invoices"), (snap) => {
      if (snap.exists()) {
        setInvoicesList(Object.values(snap.val()));
      } else {
        setInvoicesList([]);
      }
    });

    const unsubFps = onValue(ref(rtdb, "fraud_card_fingerprints"), (snap) => {
      if (snap.exists()) {
        const raw = snap.val();
        setFingerprintsList(
          Object.keys(raw).map((k) => ({ fingerprint: k, ...raw[k] }))
        );
      } else {
        setFingerprintsList([]);
      }
    });

    const unsubHr = onValue(ref(rtdb, "teacher_hr_configs"), (snap) => {
      if (snap.exists()) {
        setTeacherHrList(Object.values(snap.val()));
      } else {
        setTeacherHrList([
          {
            teacherId: "tch_01",
            teacherName: "Ing. Carlos Mendoza",
            teacherEmail: "carlos.mendoza@ivanperez.tech",
            attendanceModel: "hybrid",
            minQuorumStudents: 4,
            maxSessionCapacity: 25,
            hourlyHonorariumCop: 95000,
            updatedAt: new Date().toISOString(),
          },
        ]);
      }
    });

    return () => {
      unsubPlans();
      unsubCourses();
      unsubUsers();
      unsubProg();
      unsubSubs();
      unsubCerts();
      unsubAsg();
      unsubLive();
      unsubReqs();
      unsubOrgs();
      unsubInvs();
      unsubFps();
      unsubHr();
    };
  }, []);

  // Lista reactiva de todos los estudiantes/usuarios de ipt-course
  const parsedStudents: ParsedIptStudent[] = useMemo(() => {
    return Object.entries(rawUsers).map(([uid, u]) =>
      parseStudentRecordFromRtdb(uid, u, rawProgress, rawSubs, rawCerts, coursesList)
    );
  }, [rawUsers, rawProgress, rawSubs, rawCerts, coursesList]);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return parsedStudents;
    return parsedStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.uid.toLowerCase().includes(q) ||
        s.planId.toLowerCase().includes(q) ||
        s.coursesProgress.some((cp) => cp.courseTitle.toLowerCase().includes(q))
    );
  }, [parsedStudents, studentQuery]);

  const filteredCourses = useMemo(() => {
    const q = courseQuery.trim().toLowerCase();
    if (!q) return coursesList;
    return coursesList.filter((c) => {
      const mods = Array.isArray(c.modules)
        ? c.modules
        : Object.values(c.modules || {});
      return (
        (c.title || "").toLowerCase().includes(q) ||
        (c.slug || "").toLowerCase().includes(q) ||
        (c.category || "").toLowerCase().includes(q) ||
        mods.some(
          (m: any) =>
            (m?.title || "").toLowerCase().includes(q) ||
            (Array.isArray(m?.lessons) ? m.lessons : Object.values(m?.lessons || {})).some(
              (l: any) => (l?.title || "").toLowerCase().includes(q)
            )
        )
      );
    });
  }, [coursesList, courseQuery]);

  const handleAssignStudentPlanInRtdb = async (
    student: ParsedIptStudent,
    nextPlanId: PlanId,
    nextStatus: "trial" | "active" | "read_only" = "active"
  ) => {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 86400000).toISOString();
    const existingSub = rawSubs[student.uid] || {};

    const defaultDynamicSlugs =
      nextPlanId === "free"
        ? []
        : existingSub.activeDynamicCourseSlugs?.length > 0
        ? existingSub.activeDynamicCourseSlugs
        : coursesList[0]?.slug
        ? [coursesList[0].slug]
        : [];

    const liveCredits =
      nextPlanId === "pro_plus"
        ? nextStatus === "trial"
          ? planConfigs.pro_plus.trialLiveCredits
          : planConfigs.pro_plus.monthlyLiveCredits
        : nextPlanId === "your_plan"
        ? 12
        : 0;

    const updatedSub = {
      ...existingSub,
      id: existingSub.id || `sub_${student.uid}`,
      userId: student.uid,
      planId: nextPlanId,
      status: nextStatus,
      cancelAtPeriodEnd: false,
      readOnlyReason: nextStatus === "read_only" ? "cancelled" : null,
      billingAnchorDay: now.getUTCDate(),
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd,
      trialStart: nextStatus === "trial" ? now.toISOString() : null,
      trialEnd: nextStatus === "trial" ? periodEnd : null,
      activeDynamicCourseSlugs: defaultDynamicSlugs,
      frozenDynamicCourseSlugs: existingSub.frozenDynamicCourseSlugs || [],
      liveClassCreditsRemaining: liveCredits,
      creditsConsumedInCycle: 0,
      updatedAt: now.toISOString(),
    };

    await set(ref(rtdb, `lms_subscriptions/${student.uid}`), updatedSub);
    notify(
      `Plan de ${student.name} (${student.email}) actualizado en vivo a ${nextPlanId.toUpperCase()} (${nextStatus}).`
    );
  };

  const handleSavePlanConfigs = async () => {
    try {
      await set(ref(rtdb, "lms_plan_configs"), planConfigs);
      notify("Configuración de planes (Free, Pro y Pro+) actualizada en tiempo real.");
    } catch {
      alert("Error al guardar configuración de planes.");
    }
  };

  const handleToggleCourseModality = async (
    course: any,
    nextModality: "static" | "dynamic",
    nextFreePublic: boolean
  ) => {
    const slug = course.slug;
    if (!slug) return;
    const updated = {
      ...course,
      courseType: nextModality,
      courseModality: nextModality,
      isFreePublic: nextModality === "static" ? nextFreePublic : false,
    };
    await set(ref(rtdb, `courses/${slug}`), updated);
    notify(
      `Curso "${course.title}" actualizado a ${
        nextModality === "dynamic"
          ? "Dinámico (Pro / Pro+)"
          : nextFreePublic
          ? "Estático Liberado en Plan Free"
          : "Estático Exclusivo Pro / Pro+"
      }.`
    );
  };

  const handleApproveYourPlanRequest = async (reqItem: any) => {
    try {
      const now = new Date();
      const orgId = `org_${Date.now()}`;
      const periodEnd = new Date(
        now.getTime() + Math.max(1, customTrialDays) * 86400000
      ).toISOString();

      const newOrg = {
        id: orgId,
        name: reqItem.organizationName || `Plan Personalizado · ${reqItem.userName}`,
        ownerUserId: reqItem.userId,
        status: "active",
        totalSeatsPurchased: customSeats,
        currentPeriodEnd: periodEnd,
        trialEnd: customTrialDays > 0 ? periodEnd : null,
        customTerms: {
          agreedMonthlyPrice: customMonthlyPrice,
          currency: "COP",
          taxRatePercent: 19,
          billingCycle: "monthly",
          maxDynamicCoursesPerSeat: customDynCourses,
          monthlyLiveCreditsPerSeat: customLiveCredits,
          allowLiveAccess: customLiveCredits > 0,
          agreedTrialDays: customTrialDays,
          billingMethod: customBillingMethod,
        },
        createdAt: now.toISOString(),
      };

      const memId = `mem_${orgId}_${reqItem.userId}`;
      const newMember = {
        id: memId,
        organizationId: orgId,
        userId: reqItem.userId,
        role: "owner",
        status: "active",
        assignedAt: now.toISOString(),
      };

      const subDoc = {
        id: `sub_${reqItem.userId}`,
        userId: reqItem.userId,
        planId: "your_plan",
        organizationId: orgId,
        status: customTrialDays > 0 ? "trial" : "active",
        cancelAtPeriodEnd: false,
        readOnlyReason: null,
        billingAnchorDay: now.getUTCDate(),
        trialStart: customTrialDays > 0 ? now.toISOString() : null,
        trialEnd: customTrialDays > 0 ? periodEnd : null,
        trialPlanId: "your_plan",
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd,
        graceEndsAt: null,
        nextRetryAt: null,
        paymentRetryCount: 0,
        lastPaymentError: null,
        pendingDowngrade: null,
        activeDynamicCourseSlugs: coursesList.map((c) => c.slug).slice(0, customDynCourses),
        frozenDynamicCourseSlugs: [],
        courseLastActivityAt: {},
        lastCourseSwapAt: null,
        courseSwapsUsedInCycle: 0,
        liveClassCreditsRemaining: customLiveCredits,
        creditsConsumedInCycle: 0,
        adminOverrides: {},
        paymentMethod: null,
        updatedAt: now.toISOString(),
      };

      await set(ref(rtdb, `lms_organizations/${orgId}`), newOrg);
      await set(ref(rtdb, `lms_organization_members/${memId}`), newMember);
      await set(ref(rtdb, `lms_subscriptions/${reqItem.userId}`), subDoc);
      await set(ref(rtdb, `lms_your_plan_requests/${reqItem.id}`), {
        ...reqItem,
        status: "approved",
        proposedPriceMonthly: customMonthlyPrice,
        approvedTrialDays: customTrialDays,
      });

      notify(
        `Acuerdo "Your Plan" aprobado para ${reqItem.organizationName || reqItem.userName} con ${customTrialDays} días gratis iniciales.`
      );
    } catch {
      alert("Error al aprobar la solicitud de Your Plan.");
    }
  };

  const handleUpdateYourPlanStatus = async (
    reqItem: any,
    newStatus: "accepted" | "denied" | "pending"
  ) => {
    try {
      const now = new Date().toISOString();
      await set(ref(rtdb, `lms_your_plan_requests/${reqItem.id}`), {
        ...reqItem,
        status: newStatus,
        reviewedAt: now,
        reviewedBy: "admin",
      });
      notify(
        `Solicitud de ${reqItem.fullName || reqItem.userName || reqItem.organizationName || "usuario"} marcada como ${
          newStatus === "accepted" ? "ACEPTADA" : newStatus === "denied" ? "DENEGADA" : "PENDIENTE"
        }.`
      );
    } catch {
      alert("Error al actualizar el estado de la solicitud.");
    }
  };

  const handleSaveTeacherHr = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `tch_${Date.now()}`;
    const item: TeacherHrConfig = {
      teacherId: id,
      teacherName: hrName.trim(),
      teacherEmail: hrEmail.trim(),
      attendanceModel: hrModel,
      minQuorumStudents: Math.max(1, hrQuorum),
      maxSessionCapacity: Math.max(hrQuorum, hrCapacity),
      hourlyHonorariumCop: Math.max(0, hrRateCop),
      updatedAt: new Date().toISOString(),
    };
    const next = [...teacherHrList, item];
    setTeacherHrList(next);
    const mapObj: Record<string, TeacherHrConfig> = {};
    next.forEach((t) => {
      mapObj[t.teacherId] = t;
    });
    await set(ref(rtdb, "teacher_hr_configs"), mapObj);
    notify(`Política de Quórum y Honorarios guardada para ${item.teacherName}.`);
  };

  const handleToggleFingerprintExemption = async (fpItem: any) => {
    const nextVal = !fpItem.allowedExemptionByAdmin;
    await set(ref(rtdb, `fraud_card_fingerprints/${fpItem.fingerprint}`), {
      firstUsedByUid: fpItem.firstUsedByUid,
      firstUsedAt: fpItem.firstUsedAt,
      allowedExemptionByAdmin: nextVal,
    });
    notify(
      nextVal
        ? "Exención familiar/corporativa concedida para esta huella de tarjeta."
        : "Exención revocada."
    );
  };

  const subscriptionsList = useMemo(() => Object.values(rawSubs), [rawSubs]);
  const totalModulesCount = useMemo(
    () =>
      coursesList.reduce((acc, c) => {
        const mods = Array.isArray(c.modules)
          ? c.modules
          : Object.values(c.modules || {});
        return acc + mods.length;
      }, 0),
    [coursesList]
  );
  const totalLessonsCount = useMemo(
    () =>
      coursesList.reduce((acc, c) => {
        const mods = Array.isArray(c.modules)
          ? c.modules
          : Object.values(c.modules || {});
        return (
          acc +
          mods.reduce((mAcc: number, m: any) => {
            const less = Array.isArray(m?.lessons)
              ? m.lessons
              : Object.values(m?.lessons || {});
            return mAcc + less.length;
          }, 0)
        );
      }, 0),
    [coursesList]
  );

  return (
    <div className="space-y-5">
      {/* Sub-barra de navegación */}
      <div className="flex flex-wrap items-center gap-2 bg-[#121217] border border-white/10 rounded-xl p-1.5">
        {[
          {
            id: "live_explorer",
            label: `Base de Datos en Vivo (${parsedStudents.length} Alumnos · ${coursesList.length} Cursos · ${totalModulesCount} Módulos)`,
            icon: Database,
          },
          { id: "plans", label: "Editor de Planes (Free / Pro / Pro+)", icon: CreditCard },
          {
            id: "catalog",
            label: `Catálogo y Módulos (${coursesList.length})`,
            icon: BookOpen,
          },
          {
            id: "your_plan",
            label: `Acuerdos "Your Plan" (${yourPlanRequests.length})`,
            icon: Building2,
          },
          { id: "teacher_hr", label: "RRHH Docente: Quórum & Créditos", icon: Users },
          { id: "antifraud", label: "Antifraude & Facturación DIAN", icon: ShieldCheck },
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer ${
                active
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* 0. BUSCADOR E INSPECTOR EN VIVO DE LA BASE DE DATOS DE IPT-COURSE */}
      {subTab === "live_explorer" && (
        <div className="space-y-6">
          {/* Cinta de estado en vivo de ipt-course-students-default-rtdb */}
          <div className="bg-[#121217] border border-violet-500/30 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Escucha Activa en Tiempo Real · ipt-course-students-default-rtdb
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                Explorador en Vivo de Estudiantes, Cursos, Módulos, Tareas y Suscripciones
              </h3>
              <p className="text-xs text-zinc-400">
                Sincronizado directamente con la base de datos de <code className="text-violet-300">ipt-course-students</code>: inspecciona qué estudiantes existen, qué plan tienen, en qué módulos avanzan y qué cursos/lecciones están publicados.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center shrink-0">
              <div className="px-3.5 py-2 rounded-xl bg-[#181820] border border-white/10">
                <span className="text-base font-extrabold text-white block">
                  {parsedStudents.length}
                </span>
                <span className="text-[10px] text-zinc-400">Estudiantes en BD</span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-[#181820] border border-white/10">
                <span className="text-base font-extrabold text-violet-300 block">
                  {coursesList.length}
                </span>
                <span className="text-[10px] text-zinc-400">Cursos Activos</span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-[#181820] border border-white/10">
                <span className="text-base font-extrabold text-emerald-300 block">
                  {totalModulesCount} / {totalLessonsCount}
                </span>
                <span className="text-[10px] text-zinc-400">Módulos / Clases</span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-[#181820] border border-white/10">
                <span className="text-base font-extrabold text-amber-300 block">
                  {assignmentsList.length} / {liveSessionsList.length}
                </span>
                <span className="text-[10px] text-zinc-400">Tareas / En Vivo</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* COLUMNA IZQUIERDA (7 cols): BUSCADOR ACTIVO DE ESTUDIANTES EN IPT-COURSE */}
            <div className="lg:col-span-7 bg-[#121217] border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-violet-400" />
                    <span>
                      Estudiantes Registrados en ipt-course ({filteredStudents.length})
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Busca por nombre, correo, UID, curso o plan activo y modifica su suscripción en caliente.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    placeholder="Buscar estudiante, correo, UID..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#181820] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#181820] text-center text-xs text-zinc-400">
                  No se encontraron estudiantes con ese criterio en el nodo <code className="text-violet-300">users</code>.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStudents.map((stu) => {
                    const isExpanded = expandedStudentUid === stu.uid;
                    return (
                      <div
                        key={stu.uid}
                        className="p-4 rounded-xl bg-[#181820] border border-white/10 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-white">
                                {stu.name}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px] font-bold uppercase">
                                Plan: {stu.planId} ({stu.subscriptionStatus})
                              </span>
                              {stu.hasUsedTrial && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-semibold">
                                  Trial usado
                                </span>
                              )}
                              {stu.legalConsentAccepted && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold">
                                  Consentimiento Legal OK
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-300 mt-0.5">
                              {stu.email} ·{" "}
                              <span className="font-mono text-[11px] text-zinc-400">
                                UID: {stu.uid}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              aria-label={`Cambiar plan de ${stu.name}`}
                              value={stu.planId}
                              onChange={(e) =>
                                handleAssignStudentPlanInRtdb(
                                  stu,
                                  e.target.value as PlanId,
                                  "active"
                                )
                              }
                              className="bg-[#121217] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold"
                            >
                              <option value="free">Plan Free</option>
                              <option value="pro">Plan Pro (Activo)</option>
                              <option value="pro_plus">Plan Pro+ (Activo)</option>
                              <option value="your_plan">Your Plan (Corporativo)</option>
                            </select>

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedStudentUid(isExpanded ? null : stu.uid)
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-300 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>Detalle</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Resumen rápido de avance por curso */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
                          <div className="text-zinc-400">
                            Lecciones completadas:{" "}
                            <strong className="text-white">
                              {stu.completedLessonsCount}
                            </strong>{" "}
                            ({stu.progressPercent}%)
                          </div>
                          <div className="text-zinc-400">
                            Créditos en vivo:{" "}
                            <strong className="text-emerald-300">
                              {stu.liveCreditsRemaining}
                            </strong>
                          </div>
                          <div className="text-zinc-400">
                            Certificados emitidos:{" "}
                            <strong className="text-amber-300">
                              {stu.certificates.length}
                            </strong>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="pt-3 border-t border-white/10 space-y-2.5 text-xs">
                            <p className="font-bold text-violet-300">
                              Desglose de Progreso y Calificaciones por Curso en RTDB:
                            </p>
                            {stu.coursesProgress.map((cp) => (
                              <div
                                key={cp.courseSlug}
                                className="p-3 rounded-lg bg-[#121217] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              >
                                <div>
                                  <p className="font-semibold text-white">
                                    {cp.courseTitle}{" "}
                                    <span className="font-mono text-[10px] text-zinc-400">
                                      ({cp.courseSlug})
                                    </span>
                                  </p>
                                  <p className="text-[11px] text-zinc-400">
                                    Avance: {cp.completedLessons.length} /{" "}
                                    {cp.totalLessons} lecciones ({cp.progressPercent}%)
                                  </p>
                                </div>
                                <div className="text-right font-mono text-[11px]">
                                  <span className="text-zinc-400">
                                    C1: {cp.corte1Grade} · C2: {cp.corte2Grade} · C3:{" "}
                                    {cp.corte3Grade}
                                  </span>
                                  <span className="block font-bold text-emerald-400">
                                    Promedio: {cp.finalAverage} / 5.0
                                  </span>
                                </div>
                              </div>
                            ))}

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleAssignStudentPlanInRtdb(stu, "pro", "trial")
                                }
                                className="px-3 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 text-[11px] font-semibold cursor-pointer"
                              >
                                Activar Trial Pro (20d)
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAssignStudentPlanInRtdb(stu, "pro_plus", "trial")
                                }
                                className="px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[11px] font-semibold cursor-pointer"
                              >
                                Activar Trial Pro+ (15d + 1 clase en vivo)
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAssignStudentPlanInRtdb(
                                    stu,
                                    stu.planId as PlanId,
                                    "read_only"
                                  )
                                }
                                className="px-3 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[11px] font-semibold cursor-pointer"
                              >
                                Pasar a Modo Archivo (read_only)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* COLUMNA DERECHA (5 cols): ESTRUCTURA EN VIVO DE CURSOS, MÓDULOS Y LECCIONES */}
            <div className="lg:col-span-5 bg-[#121217] border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Cursos y Módulos en ipt-course ({filteredCourses.length})</span>
                  </h4>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={courseQuery}
                    onChange={(e) => setCourseQuery(e.target.value)}
                    placeholder="Buscar curso, módulo o lección..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#181820] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {filteredCourses.map((course) => {
                const mods = Array.isArray(course.modules)
                  ? course.modules.filter(Boolean)
                  : Object.values(course.modules || {});
                const modality =
                  course.courseModality || course.courseType || "dynamic";
                const isFree = Boolean(course.isFreePublic);
                const isExpanded = expandedCourseSlug === course.slug;

                return (
                  <div
                    key={course.slug}
                    className="p-4 rounded-xl bg-[#181820] border border-white/10 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 text-[10px] font-bold uppercase">
                          {modality === "dynamic"
                            ? "Dinámico (Pro / Pro+)"
                            : isFree
                            ? "Estático · Plan Free"
                            : "Estático · Plan Pro"}
                        </span>
                        <h5 className="text-xs font-bold text-white mt-1">
                          {course.title}
                        </h5>
                        <p className="text-[11px] font-mono text-zinc-400">
                          Slug: {course.slug} · {mods.length} módulo(s)
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCourseSlug(isExpanded ? null : course.slug)
                        }
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-zinc-300 cursor-pointer"
                      >
                        {isExpanded ? "Ocultar módulos" : "Ver módulos"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        {mods.length === 0 ? (
                          <p className="text-[11px] text-zinc-500">
                            Este curso aún no tiene módulos registrados.
                          </p>
                        ) : (
                          mods.map((m: any, mIdx: number) => {
                            const lessons = Array.isArray(m?.lessons)
                              ? m.lessons.filter(Boolean)
                              : Object.values(m?.lessons || {});
                            const resources = Array.isArray(m?.resources)
                              ? m.resources.filter(Boolean)
                              : Object.values(m?.resources || {});

                            return (
                              <div
                                key={m?.id || mIdx}
                                className="p-3 rounded-lg bg-[#121217] border border-white/5 space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-emerald-300">
                                    {m?.title || `Módulo ${mIdx + 1}`}
                                  </span>
                                  <span className="text-[10px] font-mono text-zinc-400">
                                    {lessons.length} clase(s) · {resources.length} recurso(s)
                                  </span>
                                </div>
                                {m?.description && (
                                  <p className="text-[11px] text-zinc-400">
                                    {m.description}
                                  </p>
                                )}
                                {lessons.length > 0 && (
                                  <ul className="space-y-1 pt-1">
                                    {lessons.map((les: any, lIdx: number) => (
                                      <li
                                        key={les?.id || lIdx}
                                        className="text-[11px] text-zinc-300 flex items-center justify-between gap-2 bg-white/[0.02] px-2 py-1 rounded"
                                      >
                                        <span className="truncate flex items-center gap-1.5">
                                          <Video className="w-3 h-3 text-violet-400 shrink-0" />
                                          {les?.title || `Lección ${lIdx + 1}`}
                                        </span>
                                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                                          {les?.duration || "10:00"}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 1. EDITOR DE PLANES EN TIEMPO REAL */}
      {subTab === "plans" && (
        <div className="bg-[#121217] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">
                Configuración Maestra de Planes y Pruebas Gratuitas
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Ajusta precios mensuales en COP, porcentaje de IVA, días de prueba (20d Pro / 15d Pro+), cupos de cursos dinámicos y créditos de clases en vivo.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSavePlanConfigs}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Publicar Cambios en Vivo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {(["free", "pro", "pro_plus"] as StandardPlanId[]).map((pid) => {
              const cfg = planConfigs[pid];
              return (
                <div
                  key={pid}
                  className="p-5 rounded-2xl bg-[#181820] border border-white/10 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      {pid !== "free" && (
                        <img
                          src={pid === "pro" ? "/logo-pro.svg" : "/logo-pro-plus.svg"}
                          alt={cfg.name}
                          className="w-7 h-7"
                        />
                      )}
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-violet-400 block">
                          {pid}
                        </span>
                        <h4 className="text-sm font-bold text-white">{cfg.name}</h4>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {formatCop(cfg.priceMonthly)}/mes
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Precio Mensual (COP)
                      </label>
                      <input
                        type="number"
                        value={cfg.priceMonthly}
                        onChange={(e) =>
                          setPlanConfigs({
                            ...planConfigs,
                            [pid]: { ...cfg, priceMonthly: Number(e.target.value) },
                          })
                        }
                        className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        IVA (%)
                      </label>
                      <input
                        type="number"
                        value={cfg.taxRatePercent}
                        onChange={(e) =>
                          setPlanConfigs({
                            ...planConfigs,
                            [pid]: { ...cfg, taxRatePercent: Number(e.target.value) },
                          })
                        }
                        className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Días de Prueba Gratis
                      </label>
                      <input
                        type="number"
                        value={cfg.trialDays}
                        onChange={(e) =>
                          setPlanConfigs({
                            ...planConfigs,
                            [pid]: { ...cfg, trialDays: Number(e.target.value) },
                          })
                        }
                        className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Créditos Vivo en Trial
                      </label>
                      <input
                        type="number"
                        value={cfg.trialLiveCredits}
                        onChange={(e) =>
                          setPlanConfigs({
                            ...planConfigs,
                            [pid]: {
                              ...cfg,
                              trialLiveCredits: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Cursos Dinámicos Activos
                      </label>
                      <input
                        type="number"
                        value={cfg.maxDynamicCourses}
                        onChange={(e) =>
                          setPlanConfigs({
                            ...planConfigs,
                            [pid]: {
                              ...cfg,
                              maxDynamicCourses: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">
                        Créditos En Vivo / Mes
                      </label>
                      <input
                        type="number"
                        value={cfg.monthlyLiveCredits}
                        onChange={(e) =>
                          setPlanConfigs({
                            ...planConfigs,
                            [pid]: {
                              ...cfg,
                              monthlyLiveCredits: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. CATÁLOGO DE CURSOS Y MÓDULOS */}
      {subTab === "catalog" && (
        <div className="bg-[#121217] border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">
              Gobernanza de Cursos y Módulos: Liberación en Plan Free vs. Cursos Dinámicos
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Define qué cursos estáticos están liberados gratuitamente para el Plan Free y cuáles pertenecen a la lista de Cursos Dinámicos elegibles en Pro, Pro+ y Your Plan.
            </p>
          </div>

          <div className="divide-y divide-white/10">
            {coursesList.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-500">
                No hay cursos registrados en el nodo courses.
              </div>
            ) : (
              coursesList.map((course) => {
                const modality =
                  course.courseModality || course.courseType || "dynamic";
                const isFree = Boolean(course.isFreePublic);
                const mods = Array.isArray(course.modules)
                  ? course.modules.filter(Boolean)
                  : Object.values(course.modules || {});
                return (
                  <div key={course.slug} className="py-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {course.title}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400">
                            ({course.slug})
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Modalidad actual:{" "}
                          <strong className="text-violet-300">
                            {modality === "dynamic"
                              ? "Curso Dinámico (Con Docente y Tareas)"
                              : isFree
                              ? "Curso Estático · Liberado en Plan Free"
                              : "Curso Estático · Exclusivo Pro / Pro+"}
                          </strong>{" "}
                          · {mods.length} módulo(s)
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleCourseModality(course, "static", true)
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                            modality === "static" && isFree
                              ? "bg-emerald-600 text-white border-emerald-500"
                              : "bg-[#181820] text-zinc-300 border-white/10 hover:text-white"
                          }`}
                        >
                          Estático Libre (Plan Free)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleCourseModality(course, "static", false)
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                            modality === "static" && !isFree
                              ? "bg-violet-600 text-white border-violet-500"
                              : "bg-[#181820] text-zinc-300 border-white/10 hover:text-white"
                          }`}
                        >
                          Estático Pro
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleCourseModality(course, "dynamic", false)
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                            modality === "dynamic"
                              ? "bg-amber-600 text-white border-amber-500"
                              : "bg-[#181820] text-zinc-300 border-white/10 hover:text-white"
                          }`}
                        >
                          Curso Dinámico (Pro / Pro+)
                        </button>
                      </div>
                    </div>

                    {mods.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-3 border-l-2 border-violet-500/30">
                        {mods.map((m: any, idx: number) => {
                          const lessons = Array.isArray(m?.lessons)
                            ? m.lessons.filter(Boolean)
                            : Object.values(m?.lessons || {});
                          return (
                            <div
                              key={m?.id || idx}
                              className="p-2.5 rounded-xl bg-[#181820] border border-white/5 text-xs"
                            >
                              <p className="font-bold text-white">
                                {m?.title || `Módulo ${idx + 1}`}
                              </p>
                              <p className="text-[11px] text-zinc-400">
                                {lessons.length} lección(es) publicada(s)
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. GESTOR DE SOLICITUDES "YOUR PLAN" Y CONVENIOS CORPORATIVOS */}
      {subTab === "your_plan" && (
        <div className="space-y-6">
          <div className="bg-[#121217] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <img src="/logo-your-plan.svg" alt="Your Plan" className="w-9 h-9" />
              <div>
                <h3 className="text-base font-bold text-white">
                  Bandeja Ejecutiva "Your Plan" · Negociación y Activación a Medida
                </h3>
                <p className="text-xs text-zinc-400">
                  Configura los términos acordados en la llamada con el cliente (precio mensual, método de facturación, número de asientos, cursos dinámicos, créditos en vivo y N días gratis de prueba tras aprobación).
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#181820] border border-white/10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  Asientos (Seats)
                </label>
                <input
                  type="number"
                  min={1}
                  value={customSeats}
                  onChange={(e) => setCustomSeats(Number(e.target.value))}
                  className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  Cursos Dinámicos
                </label>
                <input
                  type="number"
                  min={1}
                  value={customDynCourses}
                  onChange={(e) => setCustomDynCourses(Number(e.target.value))}
                  className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  Créditos Vivo / Mes
                </label>
                <input
                  type="number"
                  min={0}
                  value={customLiveCredits}
                  onChange={(e) => setCustomLiveCredits(Number(e.target.value))}
                  className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  Días Gratis Pactados
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={customTrialDays}
                  onChange={(e) => setCustomTrialDays(Number(e.target.value))}
                  className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  Tarifa Mensual (COP)
                </label>
                <input
                  type="number"
                  min={0}
                  value={customMonthlyPrice}
                  onChange={(e) => setCustomMonthlyPrice(Number(e.target.value))}
                  className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">
                  Facturación
                </label>
                <select
                  value={customBillingMethod}
                  onChange={(e) => setCustomBillingMethod(e.target.value as any)}
                  className="w-full bg-[#121217] border border-white/10 rounded-lg px-2 py-1.5 text-white"
                >
                  <option value="corporate_invoice">Factura / Orden Compra</option>
                  <option value="wire_transfer">Transferencia / PSE</option>
                  <option value="card">Tarjeta Corporativa</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {yourPlanRequests.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#181820] border border-white/5 text-center text-xs text-zinc-400">
                  No hay solicitudes recibidas para "Your Plan" en este momento.
                </div>
              ) : (
                yourPlanRequests.map((reqItem) => {
                  const contactName = reqItem.fullName || reqItem.userName || reqItem.organizationName || "Interesado";
                  const contactEmail = reqItem.email || reqItem.userEmail || "sin-correo@gmail.com";
                  const descText = reqItem.description || (reqItem.seatsRequested ? `Solicita ${reqItem.seatsRequested} cupos y ${reqItem.desiredDynamicCourses || 0} cursos dinámicos.` : "Sin descripción de requerimientos");
                  const currentStatus = reqItem.status || "pending";
                  const createdDate = reqItem.createdAt ? new Date(reqItem.createdAt).toLocaleString("es-CO") : "Reciente";

                  // Plantillas de correo personal
                  const acceptSubject = encodeURIComponent("Aceptación de Asesoría - Your Plan IPT Course");
                  const acceptBody = encodeURIComponent(
                    `Hola ${contactName},\n\nHemos evaluado tu solicitud para Your Plan en IPT Course y nos complace comunicarte que ha sido ACEPTADA.\n\nRespecto a los requerimientos específicos que nos compartiste:\n"${descText}"\n\nPodemos estructurar tu acompañamiento formativo a la medida. ¿En qué horario te resultaría más cómodo coordinar una breve llamada de bienvenida para coordinar temario y detalles?\n\nCordialmente,\nEquipo IPT Course\nhttps://iptapps.com`
                  );

                  const denySubject = encodeURIComponent("Respuesta a tu solicitud - Your Plan IPT Course");
                  const denyBody = encodeURIComponent(
                    `Hola ${contactName},\n\nAgradecemos tu interés en IPT Course y el tiempo dedicado a presentarnos tus requerimientos para Your Plan.\n\nTras analizar en detalle el alcance solicitado:\n"${descText}"\n\nLamentamos informarte que en este momento no disponemos de la disponibilidad docente o técnica requerida para atender estos requerimientos específicos con el nivel de calidad exigido, por lo que no es posible admitir tu solicitud en este ciclo.\n\nTe invitamos a explorar los programas regulares en nuestra plataforma o volver a contactarnos en el futuro.\n\nCordialmente,\nEquipo IPT Course\nhttps://iptapps.com`
                  );

                  return (
                    <div
                      key={reqItem.id}
                      className="p-5 rounded-2xl bg-[#181820] border border-white/10 space-y-4 shadow-lg hover:border-white/20 transition-all"
                    >
                      {/* Cabecera de la Solicitud */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-extrabold text-white">
                            {contactName}
                          </span>
                          {currentStatus === "accepted" ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Aceptado
                            </span>
                          ) : currentStatus === "denied" ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold uppercase flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              Denegado
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Pendiente de Respuesta
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                          <span>{createdDate}</span>
                        </div>
                      </div>

                      {/* Datos de Contacto y Requerimientos */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                        <div className="md:col-span-4 space-y-2 bg-[#121217] p-3 rounded-xl border border-white/5">
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
                              Gmail / Correo Electrónico
                            </span>
                            <a
                              href={`mailto:${contactEmail}`}
                              className="text-violet-300 font-bold hover:underline break-all"
                            >
                              {contactEmail}
                            </a>
                          </div>
                          {reqItem.contactPhone && (
                            <div>
                              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
                                Teléfono
                              </span>
                              <span className="text-zinc-300 font-mono">{reqItem.contactPhone}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
                              Consentimiento Datos
                            </span>
                            <span className="text-emerald-400 font-semibold">
                              {reqItem.consentAccepted ? "Aceptado (Ley 1581)" : "Registrado"}
                            </span>
                          </div>
                        </div>

                        <div className="md:col-span-8 bg-[#121217] p-3 rounded-xl border border-white/5 space-y-1.5">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
                            Descripción de Requerimientos Específicos
                          </span>
                          <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                            {descText}
                          </p>
                        </div>
                      </div>

                      {/* Barra de Acciones del Operador */}
                      <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                        {/* Selector de Estado */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-400 font-semibold">
                            Marcar estado:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateYourPlanStatus(reqItem, "accepted")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === "accepted"
                                ? "bg-emerald-600 text-white"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            ✓ Aceptar (Accept)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateYourPlanStatus(reqItem, "denied")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === "denied"
                                ? "bg-rose-600 text-white"
                                : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            ✗ Denegar (Denied)
                          </button>
                          {currentStatus !== "pending" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateYourPlanStatus(reqItem, "pending")}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-medium cursor-pointer"
                            >
                              Restablecer
                            </button>
                          )}
                        </div>

                        {/* Enlaces de Envío Personal de Gmail */}
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={`mailto:${contactEmail}?subject=${acceptSubject}&body=${acceptBody}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                            title="Abre Gmail o tu cliente con la plantilla de aceptación prellenada"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Mandar Gmail Aceptación</span>
                          </a>

                          <a
                            href={`mailto:${contactEmail}?subject=${denySubject}&body=${denyBody}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-bold transition-colors cursor-pointer"
                            title="Abre Gmail o tu cliente con la plantilla de denegación prellenada"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Mandar Gmail Denegación</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(contactEmail);
                              notify(`Correo ${contactEmail} copiado al portapapeles.`);
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs cursor-pointer"
                            title="Copiar dirección de correo"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {organizations.length > 0 && (
            <div className="bg-[#121217] border border-white/10 rounded-2xl p-6 space-y-3">
              <h4 className="text-sm font-bold text-white">
                Organizaciones Activas en "Your Plan" ({organizations.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className="p-4 rounded-xl bg-[#181820] border border-white/10 text-xs space-y-1"
                  >
                    <p className="font-bold text-white">{org.name}</p>
                    <p className="text-zinc-400">
                      Cupos contratados: {org.totalSeatsPurchased} · Estado:{" "}
                      <strong className="text-emerald-400">
                        {org.status || org.contractStatus}
                      </strong>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. RRHH DOCENTE: MODELO DE QUÓRUM MÍNIMO Y BOLSA DE CRÉDITOS */}
      {subTab === "teacher_hr" && (
        <div className="bg-[#121217] border border-white/10 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-white">
              Recursos Humanos Docente · Escalabilidad de Clases en Vivo
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Evita costos fijos de horas docentes sin alumnos: configura el quórum mínimo por docente para confirmar cada sesión en vivo y el valor hora liquidado solo sobre sesiones dictadas con quórum cumplido.
            </p>
          </div>

          <form
            onSubmit={handleSaveTeacherHr}
            className="p-4 rounded-xl bg-[#181820] border border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-end"
          >
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">
                Nombre del Docente
              </label>
              <input
                type="text"
                required
                value={hrName}
                onChange={(e) => setHrName(e.target.value)}
                className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">
                Correo Institucional
              </label>
              <input
                type="email"
                required
                value={hrEmail}
                onChange={(e) => setHrEmail(e.target.value)}
                className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">
                Modelo de Activación
              </label>
              <select
                value={hrModel}
                onChange={(e) => setHrModel(e.target.value as any)}
                className="w-full bg-[#121217] border border-white/10 rounded-lg px-2 py-1.5 text-white"
              >
                <option value="hybrid">Quórum Mínimo + Créditos</option>
                <option value="quorum">Solo Quórum Mínimo</option>
                <option value="credits">Bolsa de Créditos Bajo Demanda</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">
                Quórum Mín. Alumnos
              </label>
              <input
                type="number"
                min={1}
                value={hrQuorum}
                onChange={(e) => setHrQuorum(Number(e.target.value))}
                className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">
                Honorario / Hora (COP)
              </label>
              <input
                type="number"
                min={0}
                value={hrRateCop}
                onChange={(e) => setHrRateCop(Number(e.target.value))}
                className="w-full bg-[#121217] border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold cursor-pointer"
            >
              Guardar Regla Docente
            </button>
          </form>

          <div className="divide-y divide-white/10">
            {teacherHrList.map((t) => (
              <div
                key={t.teacherId}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-bold text-white">
                    {t.teacherName}{" "}
                    <span className="text-zinc-400 font-normal">({t.teacherEmail})</span>
                  </p>
                  <p className="text-zinc-400 mt-0.5">
                    Modelo: <strong className="text-violet-300">{t.attendanceModel}</strong> ·
                    Quórum mínimo: <strong>{t.minQuorumStudents} alumnos</strong> · Cupo máx:{" "}
                    <strong>{t.maxSessionCapacity}</strong>
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono font-bold">
                  {formatCop(t.hourlyHonorariumCop)} / hora efectiva
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. CONSOLA ANTIFRAUDE (EXENCIÓN DE TARJETAS) & FACTURACIÓN DIAN */}
      {subTab === "antifraud" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#121217] border border-white/10 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">
                Huellas de Tarjetas y Exenciones Familiares / Corporativas
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Si dos miembros de una misma familia o empresa comparten tarjeta para su prueba gratuita, puedes autorizar la exención manual aquí sin desactivar el escudo antifraude general.
              </p>
            </div>

            {fingerprintsList.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#181820] text-xs text-zinc-400 text-center">
                Aún no hay huellas de tarjetas registradas en pruebas gratuitas.
              </div>
            ) : (
              <div className="space-y-2.5">
                {fingerprintsList.map((fp) => (
                  <div
                    key={fp.fingerprint}
                    className="p-3.5 rounded-xl bg-[#181820] border border-white/10 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-mono font-bold text-violet-300">
                        {fp.fingerprint}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Primer uso por UID: {fp.firstUsedByUid}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleFingerprintExemption(fp)}
                      className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                        fp.allowedExemptionByAdmin
                          ? "bg-emerald-600 text-white"
                          : "bg-white/10 text-zinc-300 hover:text-white"
                      }`}
                    >
                      {fp.allowedExemptionByAdmin
                        ? "Exención Activa"
                        : "Autorizar Exención"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#121217] border border-white/10 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">
                Suscripciones Activas ({subscriptionsList.length}) y Facturas DIAN (
                {invoicesList.length})
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Monitoreo en vivo de membresías, estados de gracia y comprobantes tributarios con desglose de IVA.
              </p>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {subscriptionsList.map((s: any) => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-xl bg-[#181820] border border-white/10 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-white">
                      Usuario: {s.userId} · Plan:{" "}
                      <span className="uppercase text-violet-300">{s.planId}</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Estado: <strong>{s.status}</strong> · Corte:{" "}
                      {s.currentPeriodEnd
                        ? new Date(s.currentPeriodEnd).toLocaleDateString("es-CO")
                        : "N/A"}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-white/5 text-zinc-300 font-mono text-[11px]">
                    Créditos Vivo: {s.liveClassCreditsRemaining || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
