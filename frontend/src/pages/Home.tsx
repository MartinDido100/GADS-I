import { Users, FileCheck, CheckCircle, XCircle, Clock, ArrowRight, ShieldCheck, BarChart3 } from 'lucide-react';
import { empleados, cierresMensuales } from '../data/mockData';
import { Link } from 'react-router-dom';

function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function getMonthLabel(periodo: string) {
  const [year, month] = periodo.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

const features = [
  {
    icon: Clock,
    title: 'Registro de fichadas',
    description: 'Controlá entradas y salidas en tiempo real mediante biométrico, QR o carga manual.',
  },
  {
    icon: ShieldCheck,
    title: 'Gestión de novedades',
    description: 'Tardanzas, ausencias y horas extra detectadas automáticamente por el motor de reglas.',
  },
  {
    icon: BarChart3,
    title: 'Cierre mensual',
    description: 'Exportá el resumen para el contador en formato CSV listo para liquidar sueldos.',
  },
];

export function Home() {
  const totalActivos = empleados.filter((e) => e.activo).length;
  const currentPeriod = getCurrentPeriod();
  const cierreActual = cierresMensuales.find((c) => c.periodo === currentPeriod);
  const liquidacionDisponible = cierreActual?.estado === 'C';
  const mesLabel = getMonthLabel(currentPeriod);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc' }}>

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-30" style={{ background: '#0f172a', borderBottom: '1px solid #1e293b' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#dc2626' }}>
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-base tracking-tight">DigitalCheck</span>
          </div>
          <Link
            to="/app/empleados"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ background: '#dc2626' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#b91c1c')}
            onMouseLeave={e => (e.currentTarget.style.background = '#dc2626')}
          >
            Iniciar sesión
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
          paddingTop: '80px',
          paddingBottom: '100px',
        }}
      >
        {/* decorative grid */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* red glow */}
        <div
          className="absolute rounded-full blur-3xl opacity-20"
          style={{ width: 400, height: 400, background: '#dc2626', top: -100, left: -100 }}
        />

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <span
            className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(220,38,38,0.15)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.3)' }}
          >
            Sistema de gestión laboral para pymes
          </span>
          <h1 className="text-white font-black leading-tight mb-5" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', letterSpacing: '-0.03em' }}>
            Asistencias, novedades y<br />
            <span style={{ color: '#f87171' }}>liquidaciones en un solo lugar</span>
          </h1>
          <p className="mx-auto mb-12 leading-relaxed" style={{ color: '#94a3b8', fontSize: 18, maxWidth: 520 }}>
            Eliminá las planillas de Excel y los mensajes de WhatsApp. DigitalCheck centraliza toda la información laboral de tu equipo.
          </p>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-xl mx-auto">
            {/* Empleados activos */}
            <div
              className="rounded-2xl p-6 text-left"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.2)' }}>
                  <Users className="w-5 h-5" style={{ color: '#f87171' }} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                  Empleados
                </span>
              </div>
              <p className="font-black text-white mb-1" style={{ fontSize: 48, lineHeight: 1 }}>{totalActivos}</p>
              <p className="text-sm" style={{ color: '#64748b' }}>activos en la empresa</p>
            </div>

            {/* Liquidación */}
            <div
              className="rounded-2xl p-6 text-left"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.2)' }}>
                  <FileCheck className="w-5 h-5" style={{ color: '#f87171' }} />
                </div>
                {liquidacionDisponible ? (
                  <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#86efac' }}>
                    <CheckCircle className="w-3 h-3" /> Disponible
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(234,179,8,0.15)', color: '#fde047' }}>
                    <XCircle className="w-3 h-3" /> No disponible
                  </span>
                )}
              </div>
              <p className="font-black text-white mb-1 capitalize" style={{ fontSize: 24, lineHeight: 1.2 }}>{mesLabel}</p>
              <p className="text-sm" style={{ color: '#64748b' }}>
                {liquidacionDisponible ? 'Listo para descargar' : 'Cierre pendiente'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#dc2626' }}>Funcionalidades</p>
            <h2 className="font-black text-3xl" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>
              Todo lo que necesitás para gestionar tu equipo
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl p-6" style={{ border: '1px solid #e2e8f0' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#fca5a5')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: '#fef2f2' }}>
                  <Icon className="w-5 h-5" style={{ color: '#dc2626' }} />
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: '#0f172a' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16" style={{ background: '#0f172a' }}>
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="font-black text-2xl text-white mb-3" style={{ letterSpacing: '-0.02em' }}>
            ¿Listo para ordenar la gestión de tu empresa?
          </h2>
          <p className="mb-7" style={{ color: '#64748b' }}>Accedé al sistema y comenzá a trabajar con datos confiables.</p>
          <Link
            to="/app/empleados"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm transition-colors"
            style={{ background: '#dc2626' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#b91c1c')}
            onMouseLeave={e => (e.currentTarget.style.background = '#dc2626')}
          >
            Entrar al sistema
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-5" style={{ background: '#0f172a', borderTop: '1px solid #1e293b' }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-sm" style={{ color: '#334155' }}>DigitalCheck © {new Date().getFullYear()}</span>
          <span className="text-xs" style={{ color: '#1e293b' }}>GADS — UNLaM Ingeniería en Informática</span>
        </div>
      </footer>
    </div>
  );
}
