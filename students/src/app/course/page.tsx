'use client';

import React, { Suspense } from 'react';
import FreeTierClassViewer from '@/components/course/FreeTierClassViewer';

export default function CoursePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-white/50 text-sm font-mono">
          Cargando aula virtual...
        </div>
      }
    >
      <FreeTierClassViewer />
    </Suspense>
  );
}
