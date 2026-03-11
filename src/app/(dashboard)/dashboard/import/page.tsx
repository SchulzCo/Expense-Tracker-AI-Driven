"use client";

import { useState } from "react";
import { getToken, API_URL } from "@/lib/auth";
import { useRouter } from "next/navigation";

type ImportStep = "idle" | "uploading" | "analyzing" | "validating" | "saving" | "completed";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<ImportStep>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  async function handleUpload() {
    if (!file) return;
    setMessage(null);
    setStep("uploading");
    setProgress(10);

    const token = await getToken();
    if (!token) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Step 2: Simulated analysis phase (frontend feedback)
      setTimeout(() => { setStep("analyzing"); setProgress(30); }, 800);
      
      const res = await fetch(`${API_URL}/expenses/import`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      // Step 3: Validating phase
      setStep("validating");
      setProgress(60);
      await new Promise(r => setTimeout(r, 600));

      // Step 4: Saving phase
      setStep("saving");
      setProgress(90);

      if (res.ok) {
        const data = await res.json();
        setProgress(100);
        setStep("completed");
        setMessage({ type: "success", text: data.message });
        setFile(null);
        setTimeout(() => router.push("/dashboard/expenses"), 2000);
      } else {
        const error = await res.json();
        setStep("idle");
        setProgress(0);
        setMessage({ type: "error", text: error.detail || "Error al importar el archivo." });
      }
    } catch (err) {
      setStep("idle");
      setProgress(0);
      setMessage({ type: "error", text: "Error de conexión con el servidor." });
    }
  }

  const getStepText = () => {
    switch(step) {
      case "uploading": return "Subiendo archivo...";
      case "analyzing": return "Analizando estructura...";
      case "validating": return "Validando datos...";
      case "saving": return "Guardando en base de datos...";
      case "completed": return "¡Importación completada!";
      default: return "";
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
        <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
          <span className="text-gradient">Importar Facturaciones</span>
        </h1>
        <p className="text-gray-500 font-medium mt-1 uppercase text-[10px] tracking-[0.2em] opacity-70">Carga masiva de datos multi-formato</p>
      </div>

      <div className="premium-card p-12 rounded-[3rem] border-dashed border-2 border-indigo-200 dark:border-indigo-900/50 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl shadow-indigo-500/5">
        {/* Animated Background Pulse when active */}
        {step !== "idle" && step !== "completed" && (
          <div className="absolute inset-0 bg-indigo-500/5 animate-pulse"></div>
        )}
        
        <div className="relative z-10 w-full flex flex-col items-center space-y-6">
          <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 ${step !== "idle" ? "bg-slate-700 text-white scale-110 shadow-2xl shadow-slate-500/40" : "bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-500 dark:text-slate-400 border-t border-white/80 dark:border-slate-700 shadow-[5px_5px_15px_rgba(0,0,0,0.1),-5px_-5px_15px_rgba(255,255,255,0.8)] dark:shadow-[5px_5px_15px_rgba(0,0,0,0.4),-2px_-2px_10px_rgba(255,255,255,0.05)]"}`}>
            {step === "completed" ? (
              <svg className="w-10 h-10 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : step === "idle" ? (
              <svg className="w-10 h-10 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            ) : (
              <svg className="w-10 h-10 animate-spin drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          
          {step === "idle" ? (
            !file ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">Selecciona tu archivo de Excel, CSV o Texto</p>
                  <p className="text-sm text-gray-500 mt-1">Soporta formatos .xlsx, .xls, .csv y .txt</p>
                </div>
                <label className="inline-block px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold cursor-pointer hover:bg-indigo-700 hover:scale-105 transition-all shadow-lg shadow-indigo-500/20">
                  Elegir Archivo
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".xlsx, .xls, .csv, .txt"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-6 w-full max-w-sm">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl flex items-center gap-4 border border-indigo-100 dark:border-indigo-800">
                  <span className="text-2xl">📄</span>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="font-bold text-gray-900 dark:text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button 
                    onClick={() => setFile(null)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    ✕
                  </button>
                </div>
                
                <button
                  onClick={handleUpload}
                  className="w-full py-4 premium-gradient-indigo text-white rounded-2xl font-black shadow-xl shadow-indigo-500/30 hover:scale-105 transition-all flex items-center justify-center gap-3"
                >
                  Subir e Importar Ahora
                </button>
              </div>
            )
          ) : (
            <div className="w-full max-w-md space-y-6 py-4">
              <div className="flex justify-between items-end mb-2">
                <p className="text-lg font-black text-gray-900 dark:text-white animate-pulse">{getStepText()}</p>
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{progress}%</p>
              </div>
              
              <div className="w-full h-4 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
                      (progress >= i * 25) ? "bg-indigo-500" : "bg-gray-200 dark:bg-gray-800"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-6 rounded-2xl border flex items-start gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          message.type === "success" 
            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400"
            : "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-800 dark:text-red-400"
        }`}>
          <span className="text-2xl">{message.type === "success" ? "✅" : "❌"}</span>
          <div>
            <p className="font-black uppercase tracking-widest text-[10px] mb-1">
              {message.type === "success" ? "Operación Exitosa" : "Carga Fallida"}
            </p>
            <p className="font-bold">{message.text}</p>
          </div>
        </div>
      )}

      <div className="glass bg-white/40 dark:bg-gray-800/20 p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-700/50 backdrop-blur-xl transition-all hover:shadow-2xl hover:shadow-indigo-500/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl premium-gradient-indigo flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <span className="text-lg">📖</span>
          </div>
          <div>
            <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-sm">Guía de Formato Pro</h3>
            <p className="text-xs text-gray-500 font-medium">Sigue estas reglas para una carga perfecta</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative group">
            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-2 pl-1">Estructura de Columnas (Separador: ;)</p>
            <div className="p-5 bg-gray-900/5 dark:bg-black/40 rounded-2xl border border-gray-200 dark:border-gray-800 font-mono text-[10px] text-gray-600 dark:text-gray-300 overflow-x-auto whitespace-nowrap scrollbar-hide">
              <span className="text-indigo-500">FechaEmision</span>;FechaVencimiento;Comprobante;<span className="text-emerald-500">Proveedor</span>;Descripcion;<span className="text-amber-500">MontoNeto</span>;IVA;OtrosImpuestos;<span className="font-bold text-gray-900 dark:text-white underline">MontoTotal</span>;FormaPago;Estado;Categoria
            </div>
            <div className="absolute -right-2 -top-2 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">📋</div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 p-5 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30">
            <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-[0.2em] mb-2">Ejemplo de Registro</p>
            <div className="font-mono text-[11px] text-gray-500 dark:text-gray-400 overflow-x-auto whitespace-nowrap leading-relaxed">
              2024-03-10;2024-03-10;TICKET-1234;Supermercado La Paz;Compras Supermercado;12008,40;3192,10;0;15200,50;Tarjeta;Pagado;Comida
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: "📅", tag: "Fecha", desc: "AAAA-MM-DD", color: "from-blue-500/10" },
              { icon: "🏢", tag: "Proveedor", desc: "Razón Social", color: "from-emerald-500/10" },
              { icon: "💰", tag: "Monto", desc: "Usa coma ( , )", color: "from-amber-500/10" },
              { icon: "🏷️", tag: "Categoría", desc: "Ej: Comida", color: "from-purple-500/10" },
            ].map(col => (
              <div key={col.tag} className={`bg-gradient-to-b ${col.color} to-transparent dark:to-transparent p-4 rounded-2xl border border-gray-100 dark:border-gray-800/50 group hover:border-indigo-300 transition-all cursor-default`}>
                <div className="text-xl mb-2 group-hover:scale-125 transition-transform duration-300">{col.icon}</div>
                <p className="font-bold text-gray-900 dark:text-white text-[10px] uppercase tracking-tight">{col.tag}</p>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 font-medium font-mono mt-0.5">{col.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
