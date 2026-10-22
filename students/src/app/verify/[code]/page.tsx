import React, { Suspense } from 'react';
import fs from 'fs';
import path from 'path';
import { VerifyView } from '@/app/verify/page';

const DEFAULT_CODES: string[] = ['IPT-VERIFY'];

export function generateStaticParams() {
  const codes = new Set<string>(DEFAULT_CODES);

  try {
    const candidateFiles = [
      path.resolve(process.cwd(), 'src/data/localMockDatabase.json'),
      path.resolve(process.cwd(), 'database_seed.json'),
      path.resolve(process.cwd(), '../database_seed.json'),
    ];

    for (const filePath of candidateFiles) {
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(raw);
          if (Array.isArray(data.certificates)) {
            data.certificates.forEach((c: any) => {
              if (c && c.id) codes.add(String(c.id));
              if (c && c.verificationHash) codes.add(String(c.verificationHash));
            });
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn('generateStaticParams verify/[code]:', err);
  }

  return Array.from(codes).map((code) => ({ code }));
}

interface VerifyCodePageProps {
  params: Promise<{ code: string }>;
}

export default async function VerifyCodePage({ params }: VerifyCodePageProps) {
  const { code } = await params;

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-[#606060]">
          Verificando credencial oficial IPT Course...
        </div>
      }
    >
      <VerifyView forcedCode={code} />
    </Suspense>
  );
}
