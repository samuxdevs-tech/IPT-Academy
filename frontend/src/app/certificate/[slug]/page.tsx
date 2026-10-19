import React from 'react';
import CertificateClientView from '@/components/CertificateClientView';

export function generateStaticParams() {
  return [
    { slug: 'datagan-master-pro' }
  ];
}

export default async function CertificateSlugPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CertificateClientView courseSlug={slug} />;
}
