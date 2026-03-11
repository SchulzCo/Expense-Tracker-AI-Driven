"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getToken, API_URL } from "@/lib/auth";

interface Category {
  id: string;
  name: string;
}

export default function ScanPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [ocrText, setOcrText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({ amount: "", description: "", categoryId: "", date: "" });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function init() {
      const token = await getToken();
      if (!token) return;
      fetch(`${API_URL}/categories/`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then((r) => r.json()).then(setCategories);
    }
    init();
  }, []);

  const processFile = useCallback(async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setProcessing(true);
    setOcrText("");
    setSaved(false);
    setError("");

    try {
      const token = await getToken();
      if (!token) return;
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/expenses/parse`, { 
        method: "POST", 
        headers: { "Authorization": `Bearer ${token}` },
        body: formData 
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al procesar");
        return;
      }

      setOcrText(data.ocrText || "");
      setImageUrl(data.imageUrl || null);

      const catMatch = categories.find((c) => c.name === data.category);

      setForm({
        amount: data.amount ? String(data.amount) : "",
        description: data.description || "Recibo escaneado",
        categoryId: catMatch?.id || "",
        date: data.date || new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      console.error(err);
      setError("Error al conectar con el servidor");
    } finally {
      setProcessing(false);
    }
  }, [categories]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processFile(file);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);

    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/expenses/`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ ...form, ocr_text: ocrText, receipt: imageUrl }),
        });
        if (res.ok) {
          setSaved(true);
          setForm({ amount: "", description: "", categoryId: "", date: "" });
          setOcrText("");
          setPreview(null);
          setImageUrl(null);
        }
      } finally {
        setSaving(false);
      }
    }, 500);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
          <span className="text-gradient">Escanear Recibo</span>
        </h1>
        <div className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
          Powered by GPT-4o Vision
        </div>
      </div>

      <div className="premium-card p-10 rounded-[3rem] shadow-2xl shadow-indigo-500/10">
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-4 border-dashed rounded-[2rem] p-16 text-center cursor-pointer transition-all duration-500 group ${
            dragging
              ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/40 scale-102"
              : "border-gray-100 dark:border-gray-700 hover:border-indigo-300 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10"
          }`}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
          ) : (
            <div className="space-y-4">
              <div className="w-24 h-24 premium-gradient-indigo rounded-[2rem] flex items-center justify-center mx-auto text-white text-4xl shadow-2xl shadow-indigo-500/40 group-hover:animate-float">
                📸
              </div>
              <div className="space-y-2">
                <p className="text-xl font-black text-gray-800 dark:text-gray-200">
                  {dragging ? "Suelta la imagen aquí" : "Selecciona tu recibo"}
                </p>
                <p className="text-sm text-gray-400 font-medium">Arrastra una imagen o haz clic para explorar</p>
              </div>
              <div className="flex justify-center gap-4 pt-4">
                <span className="px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg text-[10px] font-bold text-gray-400 border border-gray-100 dark:border-gray-700">JPG</span>
                <span className="px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg text-[10px] font-bold text-gray-400 border border-gray-100 dark:border-gray-700">PNG</span>
              </div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

        {processing && (
          <div className="mt-4 flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Analizando imagen con IA...</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>
        )}
      </div>

      {ocrText && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="premium-card p-8 rounded-[2.5rem] shadow-xl">
            <h2 className="text-lg font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">📝</span>
              Texto Detectado
            </h2>
            <pre className="text-sm font-medium bg-gray-50/50 dark:bg-gray-900/50 p-6 rounded-2xl whitespace-pre-wrap max-h-[400px] overflow-auto border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 scrollbar-hide">
              {ocrText}
            </pre>
          </div>

          <div className="premium-card p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <h2 className="text-lg font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600">✨</span>
              Crear Facturación
            </h2>
            {saved ? (
              <div className="text-green-600 dark:text-green-400 font-medium p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                Facturación guardada correctamente!
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Monto (detectado por IA)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descripcion</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Categoria (sugerida por IA)</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                    required
                  >
                    <option value="">Seleccionar</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Fecha</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
                <button type="submit" disabled={saving} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
                  {saving ? "Guardando..." : "Guardar Facturación"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
