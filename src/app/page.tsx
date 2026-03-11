import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0f172a] text-white relative overflow-hidden">
      {/* Decorative blurred blobs */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse delay-700"></div>

      <div className="text-center space-y-10 px-4 relative z-10 max-w-4xl animate-in fade-in slide-in-from-bottom-5 duration-1000">
        <div className="w-24 h-24 premium-gradient-indigo rounded-[2.5rem] flex items-center justify-center text-5xl shadow-2xl shadow-indigo-500/40 mx-auto animate-float">
          $
        </div>
        
        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter">
            <span className="text-gradient">Facturaciones</span> Pro
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed">
            Escanea recibos con <span className="text-white font-bold">OCR</span>, categoriza con <span className="text-white font-bold">IA</span> y toma el control total de tu facturación profesional.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-4">
          <Link
            href="/login"
            className="w-64 py-5 bg-white text-indigo-950 rounded-[2rem] font-black hover:scale-105 transition-all shadow-xl shadow-white/5 uppercase tracking-widest text-sm"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/register"
            className="w-64 py-5 bg-indigo-500/10 text-white rounded-[2rem] font-black hover:bg-indigo-500/20 transition-all border border-indigo-500/30 uppercase tracking-widest text-sm backdrop-blur-md"
          >
            Registrarse
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-16">
          {[
            { title: "OCR Scan", desc: "Escanea tickets y facturas", icon: "📸" },
            { title: "Auto-Categorías", desc: "Clasificación automática", icon: "🤖" },
            { title: "Presupuestos", desc: "Alertas al límite", icon: "⚖️" },
            { title: "Facturaciones Top", desc: "Exporta para impuestos", icon: "📊" },
          ].map((feature) => (
            <div key={feature.title} className="premium-card p-6 rounded-[2rem] text-left group hover:scale-105 transition-all duration-500">
              <div className="text-3xl mb-3 group-hover:rotate-12 transition-transform">{feature.icon}</div>
              <h3 className="font-black text-sm uppercase tracking-wider text-gray-200">{feature.title}</h3>
              <p className="text-xs text-gray-500 mt-2 font-medium leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
