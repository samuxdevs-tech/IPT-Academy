import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#ffffff] flex flex-col items-center justify-center p-6 text-center font-sans text-[#0f0f0f]">
      <div className="max-w-md w-full space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-[#f2f2f2] flex items-center justify-center mx-auto">
          <img src="/favicon.png" alt="IPT Academy" className="w-9 h-9 object-contain" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-widest text-[#cc0000]">
            Error 404
          </p>
          <h1 className="text-2xl font-extrabold text-[#0f0f0f]">
            Esta página no está disponible
          </h1>
          <p className="text-sm text-[#606060] leading-relaxed">
            La dirección que escribiste no existe en este sitio o no se encuentra habilitada.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#0f0f0f] hover:bg-[#272727] text-white text-xs font-bold transition-colors"
          >
            Volver al inicio de IPT Academy
          </Link>
        </div>
      </div>
    </div>
  );
}
