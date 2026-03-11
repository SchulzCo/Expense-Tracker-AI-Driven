"use client";

import { useEffect, useState, useCallback } from "react";
import { getToken, API_URL } from "@/lib/auth";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Budget {
  id: string;
  amount: number;
  month: number;
  year: number;
  category: Category;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());
  const [form, setForm] = useState({ amount: "", category_id: "" });
  const [stats, setStats] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<"gestion" | "inteligencia">("gestion");
  const [intelligence, setIntelligence] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    
    fetch(`${API_URL}/categories/`, {
      headers: { "Authorization": `Bearer ${token}` }
    }).then((r) => r.json()).then((data) => setCategories(Array.isArray(data) ? data : []));
    
    fetch(`${API_URL}/budgets/?month=${month}&year=${year}`, {
      headers: { "Authorization": `Bearer ${token}` }
    }).then((r) => r.json()).then((data) => setBudgets(Array.isArray(data) ? data : []));
    
    fetch(`${API_URL}/expenses/stats?month=${month}&year=${year}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((s) => {
        const map: Record<string, number> = {};
        s.byCategory?.forEach((c: { name: string; total: number }) => { map[c.name] = c.total; });
        setStats(map);
      });

    fetch(`${API_URL}/budgets/intelligence`, {
      headers: { "Authorization": `Bearer ${token}` }
    }).then((r) => r.json()).then((data) => setIntelligence(Array.isArray(data) ? data : []));
  }, [month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = await getToken();
    if (!token) return;
    await fetch(`${API_URL}/budgets/`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount), month, year }),
    });
    setForm({ amount: "", category_id: "" });
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este presupuesto?")) return;
    const token = await getToken();
    if (!token) return;
    await fetch(`${API_URL}/budgets/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    loadData();
  }

  async function handleEdit(b: Budget) {
    setForm({ amount: b.amount.toString(), category_id: b.category.id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
          <span className="text-gradient">Presupuestos</span>
        </h1>
        <div className="flex bg-gray-100/50 dark:bg-gray-800/50 p-1.5 rounded-[1.25rem] backdrop-blur-md border border-gray-100 dark:border-gray-700/50 shadow-inner">
          <button 
            onClick={() => setActiveTab("gestion")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "gestion" ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600" : "text-gray-500"}`}
          >
            Gestión
          </button>
          <button 
            onClick={() => setActiveTab("inteligencia")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "inteligencia" ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600" : "text-gray-500"}`}
          >
            🤖 Análisis IA
          </button>
        </div>
      </div>

      {activeTab === "gestion" ? (
        <>
          <form onSubmit={handleSubmit} className="premium-card p-10 rounded-[3rem] shadow-xl flex flex-wrap gap-6 items-end relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full -ml-16 -mt-16 blur-3xl"></div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-bold block mb-1.5 opacity-70">CATEGORIA</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                required
              >
                <option value="">Seleccionar</option>
                {Array.isArray(categories) && categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-bold block mb-1.5 opacity-70">LIMITE MENSUAL</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                required
              />
            </div>
            <button type="submit" className="px-8 py-2.5 premium-gradient-indigo text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:scale-105 transition-all">
              Guardar Presupuesto
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-gray-800 p-12 rounded-2xl shadow-sm border dark:border-gray-700 text-center">
                <p className="text-gray-400 font-medium">No hay presupuestos configurados para este mes.</p>
              </div>
            ) : (
              budgets.map((b) => {
                const spent = stats[b.category?.name || ""] || 0;
                const pct = Math.min((spent / b.amount) * 100, 100);
                const over = spent > b.amount;
                return (
                  <div key={b.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: b.category?.color + "20", color: b.category?.color }}>
                          ●
                        </div>
                        <div>
                          <p className="font-black text-lg leading-none">{b.category?.name || "Cargando..."}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Presupuesto</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(b)}
                          className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          title="Editar"
                        >
                          ✎
                        </button>
                        <button 
                          onClick={() => handleDelete(b.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-end mb-2">
                      <span className={`text-2xl font-black ${over ? "text-red-500" : "text-gray-900 dark:text-gray-100"}`}>
                        ${spent.toFixed(0)}
                      </span>
                      <span className="text-sm font-bold text-gray-400">
                        de ${b.amount.toFixed(0)}
                      </span>
                    </div>

                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${over ? "bg-red-500" : pct >= 80 ? "bg-yellow-500" : "bg-emerald-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{Math.round(pct)}% utilizado</p>
                      {over && <p className="text-[10px] font-black uppercase tracking-wider text-red-500">Excedido</p>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="premium-card p-6 rounded-3xl border-indigo-100 dark:border-indigo-900/30 glow">
            <p className="text-sm text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <span><strong>Análisis Predictivo:</strong> Basado en tus facturaciones de los últimos 6 meses, aquí tienes recomendaciones para optimizar tu presupuesto.</span>
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {intelligence.length === 0 ? (
              <p className="col-span-full text-center p-12 text-gray-400 font-bold italic">Analizando patrones de gasto...</p>
            ) : (
              intelligence.map((item) => (
                <div key={item.category} className="premium-card p-8 rounded-[2.5rem] shadow-lg group hover:ring-2 hover:ring-indigo-500/20">
                  <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight mb-2">{item.category}</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Promedio 6m</p>
                      <p className="text-lg font-bold">${item.average_monthly}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Tendencia</p>
                      <p className={`text-lg font-bold flex items-center gap-1 ${item.trend_pct > 0 ? "text-red-500" : "text-emerald-500"}`}>
                        {item.trend_pct > 0 ? "↑" : "↓"} {Math.abs(item.trend_pct)}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t dark:border-gray-700">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Sugerencia IA (+10%)</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-gray-900 dark:text-gray-100">${item.suggested_budget}</span>
                      <button 
                        onClick={() => {
                          const catMatch = categories.find(c => c.name === item.category);
                          if (catMatch) {
                            setForm({ amount: item.suggested_budget.toString(), category_id: catMatch.id });
                            setActiveTab("gestion");
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        }}
                        className="text-[10px] font-black uppercase px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
