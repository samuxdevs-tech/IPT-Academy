'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ref, get, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Course } from '@/types';
import { normalizeCourse, cleanForFirebase } from '@/lib/courseUtils';
import WelcomeStudioView from '@/components/WelcomeStudioView';
import CourseSpreadsheetManager from '@/components/CourseSpreadsheetManager';
import CreateCourseModal from '@/components/CreateCourseModal';
import AdvancedAdminToolsModal from '@/components/AdvancedAdminToolsModal';

function AdminStudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentView = searchParams?.get('view');
  const requestedCourse = searchParams?.get('course') || undefined;
  const legacyStep = searchParams?.get('step');

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [isAdminToolsModalOpen, setIsAdminToolsModalOpen] = useState(false);

  // Cargar cursos desde Firebase Realtime Database
  const loadCourses = async () => {
    try {
      const snap = await get(ref(db, 'courses'));
      if (snap.exists()) {
        const data = snap.val();
        const coursesArray = Object.keys(data).map((key) =>
          normalizeCourse({
            ...data[key],
            slug: data[key].slug || key,
          })
        );
        setCourses(coursesArray);
      } else {
        setCourses([]);
      }
    } catch (e) {
      console.warn('Error cargando cursos:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // Actualizar curso completo en Firebase
  const handleUpdateCourse = async (updated: Course) => {
    const normalized = normalizeCourse(updated);
    const cleanData = cleanForFirebase(normalized);
    await set(ref(db, `courses/${normalized.slug}`), cleanData);
    setCourses((prev) =>
      prev.map((c) => (c.slug === normalized.slug ? normalized : c))
    );
  };

  // Crear nuevo curso en Firebase
  const handleCreateCourse = async (newCourse: Course) => {
    const normalized = normalizeCourse(newCourse);
    const cleanData = cleanForFirebase(normalized);
    await set(ref(db, `courses/${normalized.slug}`), cleanData);
    setCourses((prev) => [...prev, normalized]);
    // Redirigir a la vista de cursos para editarlo de inmediato
    router.push(`/?view=courses&course=${normalized.slug}`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-[#8e8e93]">Sincronizando campus...</span>
      </div>
    );
  }

  const isSpreadsheetView = currentView === 'courses' || !!legacyStep;

  return (
    <>
      <CreateCourseModal
        isOpen={isCreateCourseModalOpen}
        onClose={() => setIsCreateCourseModalOpen(false)}
        onCreateCourse={handleCreateCourse}
      />

      <AdvancedAdminToolsModal
        isOpen={isAdminToolsModalOpen}
        onClose={() => setIsAdminToolsModalOpen(false)}
        courses={courses}
        assignments={[]}
      />

      {isSpreadsheetView ? (
        <CourseSpreadsheetManager
          courses={courses}
          initialCourseSlug={requestedCourse}
          onUpdateCourse={handleUpdateCourse}
          onOpenCreateCourse={() => setIsCreateCourseModalOpen(true)}
        />
      ) : (
        <WelcomeStudioView
          onOpenCreateCourse={() => setIsCreateCourseModalOpen(true)}
          onOpenAdminTools={() => setIsAdminToolsModalOpen(true)}
        />
      )}
    </>
  );
}

export default function AdminStudioWorkspace() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] space-y-3">
          <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-[#8e8e93]">Abriendo IPT Course Studio...</span>
        </div>
      }
    >
      <AdminStudioContent />
    </Suspense>
  );
}
