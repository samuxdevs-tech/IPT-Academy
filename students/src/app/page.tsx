'use client';

import React, { useMemo } from 'react';
import { useLms } from '@/context/LmsContext';
import DalaQuantumGridBackground from '@/components/home/DalaQuantumGridBackground';
import DalaHeader from '@/components/home/DalaHeader';
import DalaHero from '@/components/home/DalaHero';
import DalaMissionVision from '@/components/home/DalaMissionVision';
import DalaPricing from '@/components/home/DalaPricing';
import DalaCertificateVerifier from '@/components/home/DalaCertificateVerifier';
import DalaFooter from '@/components/home/DalaFooter';

export default function HomePage() {
  const { courses } = useLms();

  // Find the course unlocked for free trial access
  const freeCourse = useMemo(() => {
    if (!courses || courses.length === 0) return null;
    return (
      courses.find(
        (c) =>
          c.isFreePublic === true ||
          c.slug === 'introduccion-ingenieria-ipt' ||
          (!c.courseModality && !c.isDynamic)
      ) || courses[0]
    );
  }, [courses]);

  return (
    <div className="relative min-h-screen bg-[#000000] text-[#ffffff] font-sans selection:bg-[#8052ff] selection:text-white overflow-x-hidden">
      {/* Malla Topológica de Grid Cuántico (Estilo Linear / Vercel Deep Tech) */}
      <DalaQuantumGridBackground />

      {/* Main Structural Flow */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <DalaHeader />

        <main className="flex-1">
          <DalaHero freeCourse={freeCourse} />
          <DalaMissionVision />
          <DalaPricing />
          <DalaCertificateVerifier />
        </main>

        <DalaFooter />
      </div>
    </div>
  );
}
