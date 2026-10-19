import React from 'react';
import fs from 'fs';
import path from 'path';
import CertificateClientView from '@/components/CertificateClientView';

const DEFAULT_SLUGS = [
  'datagan-master-pro',
  'datagan-360-certificacion-maestra',
  'arquitectura-software-ia-ipt',
  'general',
  'ingenieria-software-ipt',
  'diseno-sistemas-ia',
];

export function generateStaticParams() {
  const slugs = new Set<string>(DEFAULT_SLUGS);

  try {
    const candidateFiles = [
      path.resolve(process.cwd(), 'database_seed.json'),
      path.resolve(process.cwd(), '../database_seed.json'),
      path.resolve(process.cwd(), 'curso-demo-visuales.json'),
      path.resolve(process.cwd(), '../curso-demo-visuales.json'),
    ];

    for (const filePath of candidateFiles) {
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(raw);
          if (data.courses && typeof data.courses === 'object') {
            Object.keys(data.courses).forEach((slug) => {
              if (slug && typeof slug === 'string') slugs.add(slug);
            });
          }
          if (data.slug && typeof data.slug === 'string') {
            slugs.add(data.slug);
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn('generateStaticParams: no se pudieron cargar cursos desde archivos locales:', err);
  }

  return Array.from(slugs).map((slug) => ({ slug }));
}

export default async function CertificateSlugPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CertificateClientView courseSlug={slug} />;
}
