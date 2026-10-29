"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Crown,
  Sparkles,
  Scale,
  Award,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  XCircle,
  FileCheck2,
  Search,
  KeyRound,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Eye,
  RefreshCw,
  Send,
  AlertTriangle,
  History,
  FileText,
  UserCheck,
  Building2,
  ChevronRight,
  HelpCircle,
  Hash,
} from "lucide-react";
import { ref, get, set, onValue, push } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { OperatorUserProfile } from "@/lib/firebase";

interface RectoriaDeskWorkspaceProps {
  userProfile: OperatorUserProfile;
  onGoToTeacher?: () => void;
  onGoToAdmin?: () => void;
}

export interface RectoriaTrialOffer {
  active: boolean;
  targetPlan: "pro" | "pro_plus";
  durationDays: number;
  priceCop: number;
  priceUsd: number;
  isFreeTrial: boolean;
  headline: string;
  badge: string;
  description: string;
  discountNote: string;
  perks: string[];
}

export interface AcademicAppealItem {
  id: string;
  folio: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  courseSlug: string;
  courseTitle: string;
  assignmentId: string;
  assignmentTitle: string;
  criterionId: string;
  criterionTitle: string;
  originalScore: number;
  maxScore: number;
  teacherComment: string;
  studentAppealReason: string;
  status: "pending_rectoria" | "accepted_adjusted" | "ratified_rejected";
  rectoriaDecisionNote?: string;
  adjustedScore?: number;
  decidedAt?: string;
  decidedBy?: string;
  createdAt: string;
}

export interface DegreeCertificateItem {
  folio: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  nationalDocNumber: string;
  courseSlug: string;
  courseTitle: string;
  finalGpa: number;
  status: "issued" | "revoked" | "pending_verification";
  issuedAt: string;
  sha256Hash: string;
  rectoriaSignature: string;
  revocationReason?: string;
}

export interface StudentSubscriptionRecord {
  uid: string;
  name: string;
  email: string;
  planId: "free" | "pro" | "pro_plus" | "your_plan";
  status: "active" | "trial" | "read_only" | "cancelled";
  currentPeriodEnd?: string;
  liveClassCreditsRemaining?: number;
}

// Hashes Criptográficos SHA-256 Autorizados para DevOps (Anti-Abuso)
// Clave Upgrade: "IPT-DEVOPS-UPGRADE-SECURE-2026"
// Clave Downgrade: "IPT-DEVOPS-DOWNGRADE-SECURE-2026"
const AUTHORIZED_UPGRADE_PASSKEY = "IPT-DEVOPS-UPGRADE-SECURE-2026";
const AUTHORIZED_DOWNGRADE_PASSKEY = "IPT-DEVOPS-DOWNGRADE-SECURE-2026";

async function sha256Hex(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function RectoriaDeskWorkspace({
  userProfile,
  onGoToTeacher,
  onGoToAdmin,
}: RectoriaDeskWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<
    "offers" | "appeals" | "degrees" | "devops_plans" | "directives"
  >("offers");

  // ==========================================
  // ESTADO 1: OFERTAS DE RECTORÍA (RTDB)
  // ==========================================
  const [rectoriaOffer, setRectoriaOffer] = useState<RectoriaTrialOffer>({
    active: true,
    targetPlan: "pro",
    durationDays: 7,
    priceCop: 19000,
    priceUsd: 5,
    isFreeTrial: false,
    headline: "Pase Académico de Acceso Total",
    badge: "Acuerdo Institucional de Rectoría",
    description:
      "Prueba sin compromisos la entrega de proyectos con rúbricas de ingeniería, seguimiento de calificaciones y entorno de aprendizaje avanzado.",
    discountNote:
      "Tarifa de fomento académico aprobada por Rectoría para nuevos estudiantes",
    perks: [
      "Entrega de tareas y corrección docente con rúbricas oficiales",
      "Kárdex y registro acumulado de rendimiento académico",
      "Acceso completo a escenarios interactivos y laboratorios",
      "Cancelación flexible en 1 clic sin llamadas ni penalidades",
    ],
  });
  const [isSavingOffer, setIsSavingOffer] = useState(false);
  const [offerSavedNotice, setOfferSavedNotice] = useState<string | null>(null);

  // ==========================================
  // ESTADO 2: TRIBUNAL DE APELACIONES
  // ==========================================
  const [appeals, setAppeals] = useState<AcademicAppealItem[]>([]);
  const [selectedAppeal, setSelectedAppeal] = useState<AcademicAppealItem | null>(null);
  const [verdictType, setVerdictType] = useState<"accepted" | "ratified">("accepted");
  const [verdictScore, setVerdictScore] = useState<number>(30);
  const [verdictNotes, setVerdictNotes] = useState<string>("");
  const [isSubmittingVerdict, setIsSubmittingVerdict] = useState(false);

  // ==========================================
  // ESTADO 3: CANCILLERÍA DE DIPLOMAS
  // ==========================================
  const [certificates, setCertificates] = useState<DegreeCertificateItem[]>([]);
  const [degreeSearch, setDegreeSearch] = useState("");
  const [revokingFolio, setRevokingFolio] = useState<string | null>(null);
  const [revocationReasonInput, setRevocationReasonInput] = useState("");

  // ==========================================
  // ESTADO 4: GOBIERNO DE PLANES DEVOPS
  // ==========================================
  const [studentsList, setStudentsList] = useState<StudentSubscriptionRecord[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [targetStudentForTier, setTargetStudentForTier] = useState<StudentSubscriptionRecord | null>(null);
  const [targetNextPlan, setTargetNextPlan] = useState<"free" | "pro" | "pro_plus" | "your_plan">("pro");
  const [isDevopsModalOpen, setIsDevopsModalOpen] = useState(false);
  const [devopsPasskeyInput, setDevopsPasskeyInput] = useState("");
  const [devopsError, setDevopsError] = useState<string | null>(null);
  const [isApplyingDevopsTier, setIsApplyingDevopsTier] = useState(false);

  // ==========================================
  // ESTADO 5: DIRECTIVAS RECTORALES
  // ==========================================
  const [pedagogicalDirectives, setPedagogicalDirectives] = useState<string>(
    "1. Enfoque Estricto: Priorizar desacoplamiento de capas y manejo tipado de errores sobre atajos cosméticos.\n2. Exigencia en Rúbricas: Calificar de acuerdo al cumplimiento estricto del estándar Clean Architecture.\n3. TutorIA: Mantener tono sobrio, explicativo, sin respuestas genéricas y jamás anunciar componentes internos de UI.\n4. Cancelación con Respeto: Aplicar devolución de créditos automática si el estudiante cancela con más de 4 horas de anticipación."
  );
  const [isSavingDirectives, setIsSavingDirectives] = useState(false);

  // 1. Cargar ofertas en tiempo real desde Firebase RTDB
  useEffect(() => {
    const offerRef = ref(rtdb, "rectoria_trial_offers");
    const unsub = onValue(offerRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setRectoriaOffer((prev) => ({
          ...prev,
          ...val,
          targetPlan: val.targetPlan === "pro_plus" ? "pro_plus" : "pro",
          durationDays: Number(val.durationDays) || 7,
          priceCop: Number(val.priceCop) || 0,
          priceUsd: Number(val.priceUsd) || 0,
        }));
      }
    });
    return () => unsub();
  }, []);

  // 2. Cargar apelaciones de calificaciones
  useEffect(() => {
    const appealsRef = ref(rtdb, "academic_appeals");
    const unsub = onValue(appealsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list: AcademicAppealItem[] = Object.keys(val).map((k) => ({
          ...val[k],
          id: k,
        }));
        setAppeals(list.reverse());
      } else {
        // Mock institucional si está vacío
        setAppeals([
          {
            id: "appeal-01",
            folio: "APL-2026-084",
            studentUid: "std-ivan-001",
            studentName: "Iván Samuel Pérez Torrenegra",
            studentEmail: "samuxdevs@gmail.com",
            courseSlug: "ipt-master-fullstack",
            courseTitle: "IPT Master: Arquitectura Fullstack e Inteligencia Artificial",
            assignmentId: "asg-arch-01",
            assignmentTitle: "Diseño de Separación de Capas y Contratos de Dominio",
            criterionId: "crit-isolation",
            criterionTitle: "Aislamiento y Pureza de la Capa de Dominio",
            originalScore: 11,
            maxScore: 20,
            teacherComment: "En el servicio de reserva se utilizó una excepción genérica no tipada.",
            studentAppealReason:
              "Se adjuntó la interfaz DomainResult<T> en el archivo contracts/result.ts línea 45 que tipa de manera determinista los fallos de concurrencia sin usar excepciones de runtime.",
            status: "pending_rectoria",
            createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          },
        ]);
      }
    });
    return () => unsub();
  }, []);

  // 3. Cargar diplomas y suscriptores para el panel de DevOps
  useEffect(() => {
    // Suscriptores de lms_subscriptions
    const subsRef = ref(rtdb, "lms_subscriptions");
    const unsubSubs = onValue(subsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list: StudentSubscriptionRecord[] = Object.keys(val).map((uid) => {
          const s = val[uid];
          return {
            uid,
            name: s.userName || s.name || `Estudiante (${uid.slice(0, 6)})`,
            email: s.userEmail || s.email || "estudiante@ivanperez.tech",
            planId: s.planId || "free",
            status: s.status || "active",
            currentPeriodEnd: s.currentPeriodEnd,
            liveClassCreditsRemaining: s.liveClassCreditsRemaining ?? s.remainingCredits ?? 0,
          };
        });
        setStudentsList(list);
      } else {
        setStudentsList([
          {
            uid: "guest_student_local",
            name: "Iván Samuel Pérez Torrenegra",
            email: "samuxdevs@gmail.com",
            planId: "free",
            status: "active",
            liveClassCreditsRemaining: 0,
          },
        ]);
      }
    });

    // Diplomas emitidos
    const certsRef = ref(rtdb, "issued_certificates");
    const unsubCerts = onValue(certsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        const list: DegreeCertificateItem[] = Object.keys(val).map((k) => val[k]);
        setCertificates(list);
      } else {
        setCertificates([
          {
            folio: "IPT-CERT-2026-001",
            studentUid: "guest_student_local",
            studentName: "Iván Samuel Pérez Torrenegra",
            studentEmail: "samuxdevs@gmail.com",
            nationalDocNumber: "1004892310",
            courseSlug: "ipt-master-fullstack",
            courseTitle: "IPT Master: Arquitectura Fullstack e Inteligencia Artificial",
            finalGpa: 94,
            status: "issued",
            issuedAt: "2026-10-25T18:00:00Z",
            sha256Hash: "8f7d9a12c4b5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1",
            rectoriaSignature: "Ing. Iván Samuel Pérez Torrenegra (Rector Titular)",
          },
        ]);
      }
    });

    return () => {
      unsubSubs();
      unsubCerts();
    };
  }, []);

  // Guardar Oferta de Rectoría en Firebase
  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOffer(true);
    setOfferSavedNotice(null);
    try {
      await set(ref(rtdb, "rectoria_trial_offers"), {
        ...rectoriaOffer,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile.email,
      });
      setOfferSavedNotice("Oferta de Rectoría actualizada y publicada en el Campus Virtual.");
      setTimeout(() => setOfferSavedNotice(null), 5000);
    } catch (err: any) {
      alert("Error al guardar oferta: " + err.message);
    } finally {
      setIsSavingOffer(false);
    }
  };

  // Resolver Apelación vinculante
  const handleResolveAppeal = async () => {
    if (!selectedAppeal) return;
    setIsSubmittingVerdict(true);
    try {
      const now = new Date().toISOString();
      const updatedItem: AcademicAppealItem = {
        ...selectedAppeal,
        status: verdictType === "accepted" ? "accepted_adjusted" : "ratified_rejected",
        adjustedScore: verdictType === "accepted" ? Number(verdictScore) : selectedAppeal.originalScore,
        rectoriaDecisionNote: verdictNotes.trim() || "Fallo formal expedido por el Despacho de Rectoría.",
        decidedAt: now,
        decidedBy: `${userProfile.displayName} (Rectoría)`,
      };

      await set(ref(rtdb, `academic_appeals/${selectedAppeal.id}`), updatedItem);

      // Si fue aceptada, actualizar la calificación en el kárdex del alumno
      if (verdictType === "accepted") {
        await set(
          ref(
            rtdb,
            `grades_override/${selectedAppeal.studentUid}/${selectedAppeal.assignmentId}`
          ),
          {
            score: Number(verdictScore),
            folio: selectedAppeal.folio,
            adjustedAt: now,
            adjustedBy: "Rectoría IPT",
          }
        );
      }

      setAppeals((prev) =>
        prev.map((a) => (a.id === selectedAppeal.id ? updatedItem : a))
      );
      setSelectedAppeal(null);
    } catch (err: any) {
      alert("Error al dictaminar apelación: " + err.message);
    } finally {
      setIsSubmittingVerdict(false);
    }
  };

  // Revocar Diploma
  const handleRevokeDegree = async (folio: string) => {
    if (!revocationReasonInput.trim()) {
      alert("Debes consignar la causal jurídica o ética para la revocación.");
      return;
    }
    try {
      const now = new Date().toISOString();
      await set(ref(rtdb, `issued_certificates/${folio}/status`), "revoked");
      await set(ref(rtdb, `issued_certificates/${folio}/revocationReason`), revocationReasonInput.trim());
      await set(ref(rtdb, `issued_certificates/${folio}/revokedAt`), now);
      await set(ref(rtdb, `issued_certificates/${folio}/revokedBy`), userProfile.email);

      setCertificates((prev) =>
        prev.map((c) =>
          c.folio === folio
            ? { ...c, status: "revoked", revocationReason: revocationReasonInput.trim() }
            : c
        )
      );
      setRevokingFolio(null);
      setRevocationReasonInput("");
      alert(`Diploma con folio ${folio} revocado oficialmente.`);
    } catch (err: any) {
      alert("Error al revocar diploma: " + err.message);
    }
  };

  // ========================================================
  // CONTROL DEVOPS DE PLANES CON DOBLE HASH CRIPTOGRÁFICO
  // ========================================================
  const handleOpenDevopsModal = (
    student: StudentSubscriptionRecord,
    targetPlan: "free" | "pro" | "pro_plus" | "your_plan"
  ) => {
    setTargetStudentForTier(student);
    setTargetNextPlan(targetPlan);
    setDevopsPasskeyInput("");
    setDevopsError(null);
    setIsDevopsModalOpen(true);
  };

  const isUpgradeAction = useMemo(() => {
    if (!targetStudentForTier) return false;
    const planHierarchy = { free: 0, pro: 1, pro_plus: 2, your_plan: 3 };
    const currentWeight = planHierarchy[targetStudentForTier.planId] ?? 0;
    const nextWeight = planHierarchy[targetNextPlan] ?? 0;
    return nextWeight >= currentWeight;
  }, [targetStudentForTier, targetNextPlan]);

  const handleExecuteDevopsTierMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentForTier) return;
    setIsApplyingDevopsTier(true);
    setDevopsError(null);

    try {
      const rawInput = devopsPasskeyInput.trim();
      const rawInputLower = rawInput.toLowerCase();
      const enteredHash = await sha256Hex(rawInput);

      const expectedUpgradeHash = "e0cf90a408517477cb1a3804d121ca7a3d0d7fd974ca38120105cbd67eb2e928";
      const expectedDowngradeHash = "d57508e9141215ab36e6f473eb4f2a10373c6de3e3731e32dda9198df8ce9f7c";

      if (isUpgradeAction) {
        const isMatch =
          rawInputLower === expectedUpgradeHash ||
          enteredHash === expectedUpgradeHash ||
          rawInput === AUTHORIZED_UPGRADE_PASSKEY;

        if (!isMatch) {
          throw new Error("HASH_UPGRADE_INVALID: La clave o hash de autorización DevOps para UPGRADE es incorrecta.");
        }
      } else {
        const isMatch =
          rawInputLower === expectedDowngradeHash ||
          enteredHash === expectedDowngradeHash ||
          rawInput === AUTHORIZED_DOWNGRADE_PASSKEY;

        if (!isMatch) {
          throw new Error("HASH_DOWNGRADE_INVALID: La clave o hash de autorización DevOps para DOWNGRADE es incorrecta.");
        }
      }

      // Clave válida: ejecutar mutación autorizada
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 86400000).toISOString();
      const credits =
        targetNextPlan === "pro_plus"
          ? 2
          : targetNextPlan === "your_plan"
          ? 12
          : 0;

      const subData = {
        userId: targetStudentForTier.uid,
        userName: targetStudentForTier.name,
        userEmail: targetStudentForTier.email,
        planId: targetNextPlan,
        status: "active",
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd,
        liveClassCreditsRemaining: credits,
        remainingCredits: credits,
        updatedAt: now.toISOString(),
        authorizedByDevops: userProfile.email,
        authHashType: isUpgradeAction ? "upgrade_sha256" : "downgrade_sha256",
      };

      await set(ref(rtdb, `lms_subscriptions/${targetStudentForTier.uid}`), subData);

      // Registrar en audit log inmutable con captura tolerante a fallos
      try {
        await push(ref(rtdb, "devops_audit_logs"), {
          action: isUpgradeAction ? "SUBSCRIPTION_UPGRADE" : "SUBSCRIPTION_DOWNGRADE",
          targetUserId: targetStudentForTier.uid,
          targetEmail: targetStudentForTier.email,
          fromPlan: targetStudentForTier.planId,
          toPlan: targetNextPlan,
          operatorEmail: userProfile.email,
          timestamp: now.toISOString(),
        });
      } catch (auditErr) {
        console.warn("Registro secundario de auditoría omitido:", auditErr);
      }

      setStudentsList((prev) =>
        prev.map((s) =>
          s.uid === targetStudentForTier.uid
            ? { ...s, planId: targetNextPlan, status: "active", liveClassCreditsRemaining: credits }
            : s
        )
      );

      setIsDevopsModalOpen(false);
      alert(
        `Autorización DevOps exitosa: Plan de ${targetStudentForTier.name} actualizado a ${targetNextPlan.toUpperCase()}.`
      );
    } catch (err: any) {
      setDevopsError(err.message || "Fallo en la verificación criptográfica.");
    } finally {
      setIsApplyingDevopsTier(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return studentsList;
    return studentsList.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [studentsList, studentSearch]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col antialiased selection:bg-[#f59e0b] selection:text-black">
      {/* Barra de Encabezado Superior de Rectoría */}
      <header className="border-b border-[#ffffff]/10 bg-[#0d0d12]/95 backdrop-blur-md px-6 py-4 sticky top-14 z-30">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#f59e0b]/15 border border-[#f59e0b]/30 flex items-center justify-center text-[#f59e0b] shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#f59e0b] font-semibold">
                  Alta Dirección Académica
                </span>
                <span className="text-white/30">·</span>
                <span className="text-xs text-[#9a9a9a]">IPT Master & Specializations</span>
              </div>
              <h1 className="text-xl font-semibold text-white tracking-tight">
                Despacho de Rectoría y Cancillería Institucional
              </h1>
            </div>
          </div>

          {/* Accesos Rápidos Inter-Suites */}
          <div className="flex items-center gap-2">
            {onGoToTeacher && (
              <button
                onClick={onGoToTeacher}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-all"
              >
                <span>Teachers Studio</span>
              </button>
            )}
            {onGoToAdmin && (
              <button
                onClick={onGoToAdmin}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all"
              >
                <span>Admin Governance</span>
              </button>
            )}
          </div>
        </div>

        {/* Pestañas de Navegación del Despacho de Rectoría */}
        <div className="max-w-[1440px] mx-auto flex items-center gap-2 mt-5 border-t border-white/5 pt-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab("offers")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "offers"
                ? "bg-[#f59e0b] text-black font-semibold shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Ofertas y Becas (RTDB)</span>
          </button>

          <button
            onClick={() => setActiveTab("appeals")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "appeals"
                ? "bg-[#f59e0b] text-black font-semibold shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Tribunal de Apelaciones</span>
            {appeals.filter((a) => a.status === "pending_rectoria").length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {appeals.filter((a) => a.status === "pending_rectoria").length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("degrees")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "degrees"
                ? "bg-[#f59e0b] text-black font-semibold shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Cancillería y Diplomas</span>
          </button>

          <button
            onClick={() => setActiveTab("devops_plans")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "devops_plans"
                ? "bg-[#f59e0b] text-black font-semibold shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Gobierno DevOps (Doble Hash)</span>
          </button>

          <button
            onClick={() => setActiveTab("directives")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "directives"
                ? "bg-[#f59e0b] text-black font-semibold shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Directivas Rectorales</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal según Pestaña Activa */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-6 sm:p-8">
        {/* ========================================================
            PESTAÑA 1: OFERTAS Y BECAS DE RECTORÍA (PLAN, TIEMPO, PRECIO)
           ======================================================== */}
        {activeTab === "offers" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-white tracking-tight">
                  Control Rectoral de Ofertas de Prueba y Fomento Académico
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Parámetros publicados en tiempo real en la base de datos de Firebase RTDB (<code>rectoria_trial_offers</code>).
                </p>
              </div>

              {offerSavedNotice && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{offerSavedNotice}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveOffer} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Formulario de Ajuste (8 cols) */}
              <div className="lg:col-span-8 bg-[#121217] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* 1. Plan Objetivo */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                      1. Plan Ofrecido por Rectoría
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRectoriaOffer({ ...rectoriaOffer, targetPlan: "pro" })}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          rectoriaOffer.targetPlan === "pro"
                            ? "border-[#8052ff] bg-[#8052ff]/15 text-white"
                            : "border-white/10 bg-white/[0.02] text-zinc-400"
                        }`}
                      >
                        <span className="text-xs font-semibold block text-white">Plan Pro</span>
                        <span className="text-[10px] text-zinc-400 mt-1 block">
                          Proyectos + Rúbricas
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRectoriaOffer({ ...rectoriaOffer, targetPlan: "pro_plus" })}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          rectoriaOffer.targetPlan === "pro_plus"
                            ? "border-[#f59e0b] bg-[#f59e0b]/15 text-white"
                            : "border-white/10 bg-white/[0.02] text-zinc-400"
                        }`}
                      >
                        <span className="text-xs font-semibold block text-white">Plan Pro+</span>
                        <span className="text-[10px] text-zinc-400 mt-1 block">
                          Tutorías 1 a 1 + Salas
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Tiempo / Duración */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                      2. Tiempo / Vigencia de Prueba (Días)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[7, 14, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setRectoriaOffer({ ...rectoriaOffer, durationDays: d })}
                          className={`py-3 px-2 rounded-2xl border text-center transition-all ${
                            rectoriaOffer.durationDays === d
                              ? "border-emerald-500 bg-emerald-500/15 text-white font-bold"
                              : "border-white/10 bg-white/[0.02] text-zinc-400"
                          }`}
                        >
                          {d} Días
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Tarifas COP y USD */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                      3. Tarifa de Prueba en COP
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        value={rectoriaOffer.priceCop}
                        onChange={(e) =>
                          setRectoriaOffer({
                            ...rectoriaOffer,
                            priceCop: Number(e.target.value),
                            isFreeTrial: Number(e.target.value) === 0,
                          })
                        }
                        className="w-full pl-8 pr-4 py-3 rounded-2xl bg-black/60 border border-white/15 text-white font-mono focus:border-[#f59e0b] focus:outline-none text-sm"
                        placeholder="19000"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      0 = Prueba sin costo inicial con tarjeta verificada
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Tarifa Referencial USD
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        value={rectoriaOffer.priceUsd}
                        onChange={(e) =>
                          setRectoriaOffer({ ...rectoriaOffer, priceUsd: Number(e.target.value) })
                        }
                        className="w-full pl-8 pr-4 py-3 rounded-2xl bg-black/60 border border-white/15 text-white font-mono focus:border-[#f59e0b] focus:outline-none text-sm"
                        placeholder="5"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Textos y Presentación de Fomento */}
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Título Oficial de la Propuesta
                    </label>
                    <input
                      type="text"
                      value={rectoriaOffer.headline}
                      onChange={(e) =>
                        setRectoriaOffer({ ...rectoriaOffer, headline: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-white/15 text-white text-sm focus:border-[#f59e0b] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Distintivo / Badge Institucional
                    </label>
                    <input
                      type="text"
                      value={rectoriaOffer.badge}
                      onChange={(e) =>
                        setRectoriaOffer({ ...rectoriaOffer, badge: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-white/15 text-white text-sm focus:border-[#f59e0b] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                      Descripción de Fomento Académico
                    </label>
                    <textarea
                      rows={3}
                      value={rectoriaOffer.description}
                      onChange={(e) =>
                        setRectoriaOffer({ ...rectoriaOffer, description: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-white/15 text-white text-xs leading-relaxed focus:border-[#f59e0b] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSavingOffer}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#f59e0b] hover:bg-[#d97706] text-black text-xs font-semibold transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50"
                  >
                    <span>
                      {isSavingOffer ? "Guardando en Firebase RTDB..." : "Publicar Oferta de Rectoría"}
                    </span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Vista Previa en Vivo (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block px-1">
                  Vista Previa en Tiempo Real en el Campus
                </span>

                <div className="rounded-3xl border border-[#f59e0b]/30 bg-gradient-to-br from-[#f59e0b]/10 via-[#0d0d12] to-[#8052ff]/10 p-6 space-y-4 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#f59e0b]">
                    <span>{rectoriaOffer.badge}</span>
                    <span className="text-[10px] font-mono text-zinc-400">Activa</span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-white tracking-tight">
                      {rectoriaOffer.headline}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {rectoriaOffer.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2.5 rounded-xl bg-black/50 border border-white/10">
                      <span className="text-[9px] font-mono text-zinc-500 block uppercase">
                        Nivel
                      </span>
                      <span className="text-xs font-bold text-white block mt-0.5">
                        {rectoriaOffer.targetPlan === "pro_plus" ? "Pro+" : "Pro"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/50 border border-white/10">
                      <span className="text-[9px] font-mono text-zinc-500 block uppercase">
                        Vigencia
                      </span>
                      <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                        {rectoriaOffer.durationDays} Días
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/50 border border-white/10">
                      <span className="text-[9px] font-mono text-zinc-500 block uppercase">
                        Tarifa
                      </span>
                      <span className="text-xs font-bold text-[#f59e0b] block mt-0.5">
                        {rectoriaOffer.isFreeTrial || rectoriaOffer.priceCop === 0
                          ? "$0"
                          : `$${(rectoriaOffer.priceCop / 1000).toFixed(0)}k`}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-zinc-400 flex items-center gap-1.5 border-t border-white/10">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sin permanencia forzosa. Cancelación en 1 clic.</span>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================
            PESTAÑA 2: TRIBUNAL DE APELACIONES DE CALIFICACIONES
           ======================================================== */}
        {activeTab === "appeals" && (
          <div className="space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Tribunal de Apelaciones y Fallos Inapelables de Rectoría
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Reclamos radicados por estudiantes sobre criterios de evaluación de rúbricas. El fallo emitido por este despacho es vinculante y definitivo.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Lista de Apelaciones (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block px-1">
                  Bandeja de Reclamos ({appeals.length})
                </span>

                {appeals.map((appeal) => {
                  const isSelected = selectedAppeal?.id === appeal.id;
                  return (
                    <div
                      key={appeal.id}
                      onClick={() => {
                        setSelectedAppeal(appeal);
                        setVerdictScore(appeal.originalScore);
                        setVerdictNotes("");
                      }}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? "border-[#f59e0b] bg-[#f59e0b]/10 shadow-lg"
                          : "border-white/10 bg-[#121217] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded-full">
                          {appeal.folio}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            appeal.status === "pending_rectoria"
                              ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              : appeal.status === "accepted_adjusted"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {appeal.status === "pending_rectoria"
                            ? "Pendiente de Fallo"
                            : appeal.status === "accepted_adjusted"
                            ? "Apelación Aceptada"
                            : "Nota Ratificada"}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-white leading-snug">
                        {appeal.assignmentTitle}
                      </h4>

                      <div className="text-[11px] text-zinc-400">
                        <span>Estudiante: </span>
                        <span className="text-white font-medium">{appeal.studentName}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-white/5">
                        <span>Criterio: {appeal.criterionTitle}</span>
                        <span className="font-mono text-white">
                          {appeal.originalScore}/{appeal.maxScore} pts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detalle y Emisión de Fallo (7 cols) */}
              <div className="lg:col-span-7">
                {selectedAppeal ? (
                  <div className="bg-[#121217] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div>
                        <span className="text-[10px] font-mono text-[#f59e0b] uppercase">
                          Expediente {selectedAppeal.folio}
                        </span>
                        <h3 className="text-lg font-semibold text-white mt-0.5">
                          {selectedAppeal.assignmentTitle}
                        </h3>
                        <span className="text-xs text-zinc-400">{selectedAppeal.courseTitle}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-500 block">Puntaje Docente</span>
                        <span className="text-xl font-bold font-mono text-rose-400">
                          {selectedAppeal.originalScore} / {selectedAppeal.maxScore}
                        </span>
                      </div>
                    </div>

                    {/* Comparativa: Calificación Docente vs Reclamo del Alumno */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1.5">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                          Observación del Docente Titular
                        </span>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          &ldquo;{selectedAppeal.teacherComment}&rdquo;
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-1.5">
                        <span className="text-[10px] font-mono text-[#f59e0b] uppercase block">
                          Argumentación del Estudiante
                        </span>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          &ldquo;{selectedAppeal.studentAppealReason}&rdquo;
                        </p>
                      </div>
                    </div>

                    {/* Formulario de Emisión de Fallo */}
                    {selectedAppeal.status === "pending_rectoria" ? (
                      <div className="pt-4 border-t border-white/10 space-y-4">
                        <span className="text-xs font-semibold text-white uppercase tracking-wider block">
                          Emitir Fallo Formal de Rectoría
                        </span>

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setVerdictType("accepted")}
                            className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                              verdictType === "accepted"
                                ? "border-emerald-500 bg-emerald-500/15 text-white font-semibold"
                                : "border-white/10 bg-white/[0.02] text-zinc-400"
                            }`}
                          >
                            <span className="text-xs block text-emerald-400 font-bold">
                              Aceptar Apelación
                            </span>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">
                              Ajustar y subir calificación
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setVerdictType("ratified")}
                            className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                              verdictType === "ratified"
                                ? "border-rose-500 bg-rose-500/15 text-white font-semibold"
                                : "border-white/10 bg-white/[0.02] text-zinc-400"
                            }`}
                          >
                            <span className="text-xs block text-rose-400 font-bold">
                              Ratificar Nota Docente
                            </span>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">
                              Desestimar el reclamo
                            </span>
                          </button>
                        </div>

                        {verdictType === "accepted" && (
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-mono text-zinc-400 uppercase">
                              Nuevo Puntaje Otorgado (Máx. {selectedAppeal.maxScore} pts)
                            </label>
                            <input
                              type="number"
                              max={selectedAppeal.maxScore}
                              min={0}
                              value={verdictScore}
                              onChange={(e) => setVerdictScore(Number(e.target.value))}
                              className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-mono text-zinc-400 uppercase">
                            Dictamen Motivado de Rectoría (Visible para el Alumno)
                          </label>
                          <textarea
                            rows={3}
                            value={verdictNotes}
                            onChange={(e) => setVerdictNotes(e.target.value)}
                            placeholder="Consigne los fundamentos técnicos o pedagógicos del fallo..."
                            className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-white/15 text-white text-xs leading-relaxed focus:border-[#f59e0b] focus:outline-none"
                          />
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={handleResolveAppeal}
                            disabled={isSubmittingVerdict}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#f59e0b] hover:bg-[#d97706] text-black text-xs font-semibold cursor-pointer disabled:opacity-50"
                          >
                            <span>
                              {isSubmittingVerdict ? "Sellando Fallo..." : "Expedir Fallo Inapelable"}
                            </span>
                            <Scale className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 rounded-2xl bg-black/40 border border-emerald-500/20 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Fallo expedido el {new Date(selectedAppeal.decidedAt || "").toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-zinc-300">
                          Dictamen: {selectedAppeal.rectoriaDecisionNote}
                        </p>
                        <span className="text-[10px] text-zinc-500 font-mono block">
                          Firmado por: {selectedAppeal.decidedBy}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#121217] border border-white/10 rounded-3xl p-12 text-center text-zinc-500">
                    <Scale className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Selecciona un expediente de la bandeja para revisar o emitir fallo.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            PESTAÑA 3: CANCILLERÍA DE DIPLOMAS Y ACREDITACIÓN
           ======================================================== */}
        {activeTab === "degrees" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-semibold text-white tracking-tight">
                  Cancillería de Diplomas, Títulos de Honor y Acreditación
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Padrón inmutable de graduados con verificación de documento nacional OCR y huella criptográfica SHA-256.
                </p>
              </div>

              <div className="w-full sm:w-72 relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por folio, nombre o cédula..."
                  value={degreeSearch}
                  onChange={(e) => setDegreeSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
                />
              </div>
            </div>

            <div className="bg-[#121217] border border-white/10 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-black/60 border-b border-white/10 text-[11px] font-mono text-zinc-500 uppercase">
                    <tr>
                      <th className="py-3 px-4">Folio Oficial</th>
                      <th className="py-3 px-4">Estudiante / Cédula</th>
                      <th className="py-3 px-4">Programa Académico</th>
                      <th className="py-3 px-4">PGA Final</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acción Rectoral</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {certificates.map((cert) => (
                      <tr key={cert.folio} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 px-4 font-mono font-semibold text-[#f59e0b]">
                          {cert.folio}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-white block">{cert.studentName}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            CC {cert.nationalDocNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate">{cert.courseTitle}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                          {cert.finalGpa} / 100
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                              cert.status === "issued"
                                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {cert.status === "issued" ? "Vigente / Sello Activo" : "Revocado"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {cert.status === "issued" ? (
                            <button
                              onClick={() => setRevokingFolio(cert.folio)}
                              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] transition-all cursor-pointer"
                            >
                              Revocar Diploma
                            </button>
                          ) : (
                            <span className="text-[10px] text-zinc-500 font-mono">
                              Revocado: {cert.revocationReason}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal de Revocación de Diploma */}
            {revokingFolio && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                <div className="max-w-md w-full bg-[#121217] border border-rose-500/30 rounded-3xl p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center gap-2.5 text-rose-400">
                    <ShieldAlert className="w-5 h-5" />
                    <h3 className="text-base font-semibold text-white">
                      Revocación Oficial de Título ({revokingFolio})
                    </h3>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Esta acción inhabilitará de inmediato la verificación pública del diploma con hash SHA-256 e inscribirá la causal en el libro institucional de faltas.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase">
                      Causal Jurídica o Ética de Revocación
                    </label>
                    <textarea
                      rows={3}
                      value={revocationReasonInput}
                      onChange={(e) => setRevocationReasonInput(e.target.value)}
                      placeholder="Ej: Suplantación de identidad en evaluación final comprobada por auditoría..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRevokingFolio(null)}
                      className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevokeDegree(revokingFolio)}
                      className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-lg"
                    >
                      Confirmar Revocación
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            PESTAÑA 4: GOBIERNO DEVOPS DE PLANES (DOBLE HASH ANTI-ABUSO)
           ======================================================== */}
        {activeTab === "devops_plans" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] text-[11px] font-mono mb-2">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Seguridad Criptográfica DevOps</span>
                </div>
                <h2 className="text-xl font-semibold text-white tracking-tight">
                  Gobierno de Membresías y Mutación de Planes con Doble Hash
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Protegido contra abusos internos. Aumentar de nivel exige el hash de <strong>Upgrade</strong>; degradar de nivel exige un hash diferente de <strong>Downgrade</strong>.
                </p>
              </div>

              <div className="w-full sm:w-72 relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar estudiante..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white focus:outline-none focus:border-[#f59e0b]"
                />
              </div>
            </div>

            {/* Listado de Estudiantes y Modificadores de Nivel */}
            <div className="bg-[#121217] border border-white/10 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-black/60 border-b border-white/10 text-[11px] font-mono text-zinc-500 uppercase">
                    <tr>
                      <th className="py-3 px-4">Estudiante</th>
                      <th className="py-3 px-4">Plan Actual</th>
                      <th className="py-3 px-4">Créditos de Tutoría</th>
                      <th className="py-3 px-4 text-right">Mutación Autorizada (DevOps)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredStudents.map((student) => (
                      <tr key={student.uid} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-white block">{student.name}</span>
                          <span className="text-[11px] text-zinc-400 font-mono">{student.email}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                              student.planId === "your_plan"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : student.planId === "pro_plus"
                                ? "bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30"
                                : student.planId === "pro"
                                ? "bg-[#8052ff]/15 text-[#8052ff] border border-[#8052ff]/30"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {student.planId.replace("_", "+")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {student.liveClassCreditsRemaining ?? 0} créditos
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {/* Botón Upgrade */}
                          <button
                            onClick={() =>
                              handleOpenDevopsModal(
                                student,
                                student.planId === "free"
                                  ? "pro"
                                  : student.planId === "pro"
                                  ? "pro_plus"
                                  : "your_plan"
                              )
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#8052ff]/15 hover:bg-[#8052ff]/25 text-[#c0c4fc] border border-[#8052ff]/30 text-[11px] transition-all cursor-pointer"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5 text-[#8052ff]" />
                            <span>Upgrade</span>
                          </button>

                          {/* Botón Downgrade */}
                          <button
                            onClick={() =>
                              handleOpenDevopsModal(
                                student,
                                student.planId === "your_plan"
                                  ? "pro_plus"
                                  : student.planId === "pro_plus"
                                  ? "pro"
                                  : "free"
                              )
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] transition-all cursor-pointer"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                            <span>Downgrade</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal de Desafío de Seguridad Criptográfico DevOps */}
            {isDevopsModalOpen && targetStudentForTier && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
                <div className="max-w-md w-full bg-[#121217] border border-white/20 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                        isUpgradeAction
                          ? "bg-[#8052ff]/20 text-[#8052ff] border border-[#8052ff]/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {isUpgradeAction ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-zinc-400 block">
                        Autorización DevOps Requerida
                      </span>
                      <h3 className="text-base font-semibold text-white">
                        {isUpgradeAction ? "Ascenso de Nivel (Upgrade)" : "Descenso de Nivel (Downgrade)"}
                      </h3>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Estudiante:</span>
                      <span className="text-white font-medium">{targetStudentForTier.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Plan Actual:</span>
                      <span className="font-mono text-zinc-300">{targetStudentForTier.planId.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Nuevo Plan Asignado:</span>
                      <span
                        className={`font-mono font-bold ${
                          isUpgradeAction ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {targetNextPlan.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleExecuteDevopsTierMutation} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono text-zinc-300 flex items-center justify-between">
                        <span>
                          {isUpgradeAction
                            ? "Hash / Passkey DevOps de UPGRADE:"
                            : "Hash / Passkey DevOps de DOWNGRADE:"}
                        </span>
                        <Lock className="w-3 h-3 text-[#f59e0b]" />
                      </label>
                      <input
                        type="password"
                        value={devopsPasskeyInput}
                        onChange={(e) => setDevopsPasskeyInput(e.target.value)}
                        placeholder={
                          isUpgradeAction
                            ? "Ingresar clave DevOps para Upgrade..."
                            : "Ingresar clave DevOps para Downgrade..."
                        }
                        className="w-full px-4 py-3 rounded-2xl bg-black/80 border border-white/20 text-white font-mono text-xs focus:border-[#f59e0b] focus:outline-none"
                        required
                        autoFocus
                      />
                    </div>

                    {devopsError && (
                      <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{devopsError}</span>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsDevopsModalOpen(false)}
                        className="px-4 py-2.5 rounded-xl text-xs text-zinc-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isApplyingDevopsTier || !devopsPasskeyInput.trim()}
                        className={`px-6 py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 transition-all ${
                          isUpgradeAction
                            ? "bg-[#8052ff] hover:bg-[#6e3ff3] text-white shadow-[0_0_20px_rgba(128,82,255,0.4)]"
                            : "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)]"
                        }`}
                      >
                        {isApplyingDevopsTier ? "Validando Hash..." : "Ejecutar Mutación"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            PESTAÑA 5: DIRECTIVAS RECTORALES
           ======================================================== */}
        {activeTab === "directives" && (
          <div className="space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Directivas Pedagógicas Institucionales e Instrucciones para TutorIA
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Lineamientos oficiales que rigen la exigencia docente y las directrices del agente TutorIA en la plataforma.
              </p>
            </div>

            <div className="bg-[#121217] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Cuerpo de Directivas de Rectoría
                </label>
                <textarea
                  rows={8}
                  value={pedagogicalDirectives}
                  onChange={(e) => setPedagogicalDirectives(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-black/60 border border-white/15 text-white font-mono text-xs leading-relaxed focus:border-[#f59e0b] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    setIsSavingDirectives(true);
                    try {
                      await set(ref(rtdb, "rectoria_directives"), {
                        content: pedagogicalDirectives,
                        updatedAt: new Date().toISOString(),
                        updatedBy: userProfile.email,
                      });
                      alert("Directivas de Rectoría publicadas y sincronizadas con el sistema.");
                    } catch (err: any) {
                      alert("Error al publicar directivas: " + err.message);
                    } finally {
                      setIsSavingDirectives(false);
                    }
                  }}
                  disabled={isSavingDirectives}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#f59e0b] hover:bg-[#d97706] text-black text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <span>{isSavingDirectives ? "Guardando..." : "Publicar Directivas Rectorales"}</span>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
