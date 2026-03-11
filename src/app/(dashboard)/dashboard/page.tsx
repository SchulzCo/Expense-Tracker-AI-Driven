"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
  CartesianGrid, Legend,
} from "recharts";
import { getToken, API_URL } from "@/lib/auth";

interface RecentExpense {
  id: string;
  amount: number;
  description: string;
  date: string;
  receipt: string | null;
  category: { name: string; color: string };
}

interface Stats {
  total: number;
  prevTotal: number;
  totalBudget: number;
  count: number;
  byCategory: { name: string; color: string; total: number; budget: number; count: number }[];
  dailyTotals: { date: string; amount: number; cumulative: number }[];
  weeklyTotals: { week: string; amount: number }[];
  alerts: { category: string; budget: number; spent: number; percentage: number }[];
  recentExpenses: RecentExpense[];
  topExpense: { amount: number; description: string; category: string } | null;
  allTimeRecent: RecentExpense[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    async function loadStats() {
      const token = await getToken();
      if (!token) return;
      
      const res = await fetch(`${API_URL}/expenses/stats?month=${month}&year=${year}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      setStats(data);
    }
    loadStats();
  }, [month, year]);

  if (!stats) return <div className="animate-pulse text-gray-400 p-8">Cargando estadisticas...</div>;

  const monthDiff = stats.prevTotal > 0
    ? Math.round(((stats.total - stats.prevTotal) / stats.prevTotal) * 100)
    : null;

  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700 pb-20">
      {/* Header with month selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
          <span className="text-gradient">Dashboard</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (month === 1) { setMonth(12); setYear(year - 1); }
              else setMonth(month - 1);
            }}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            &larr;
          </button>
          <span className="text-sm font-medium px-3 py-1.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg min-w-[120px] text-center">
            {monthNames[month - 1]} {year}
          </span>
          <button
            onClick={() => {
              if (month === 12) { setMonth(1); setYear(year + 1); }
              else setMonth(month + 1);
            }}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            &rarr;
          </button>
        </div>
      </div>

      {/* Budget alerts */}
      {stats.alerts.length > 0 && (
        <div className="space-y-2">
          {stats.alerts.map((a) => (
            <div
              key={a.category}
              className={`p-3 rounded-lg text-sm font-medium ${
                a.percentage >= 100
                  ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                  : "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800"
              }`}
            >
              {a.percentage >= 100 ? "Excedido" : "Alerta"}: {a.category} - Gastado ${a.spent.toFixed(2)} de ${a.budget.toFixed(2)} ({a.percentage}%)
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="premium-gradient-indigo p-5 rounded-2xl shadow-lg border border-white/10 text-white transform hover:scale-[1.02] transition-transform duration-200">
          <p className="text-sm font-medium opacity-80 uppercase tracking-wider">Total Gastado</p>
          <p className="text-4xl font-extrabold mt-1">${stats.total.toFixed(2)}</p>
          {monthDiff !== null && (
            <p className={`text-sm mt-2 font-semibold px-2 py-0.5 rounded-full inline-block ${monthDiff > 0 ? "bg-red-500/30 text-red-100" : "bg-green-500/30 text-green-100"}`}>
              {monthDiff > 0 ? "↑" : "↓"} {Math.abs(monthDiff)}% vs mes anterior
            </p>
          )}
        </div>
        
        <div className="premium-gradient-emerald p-5 rounded-2xl shadow-lg border border-white/10 text-white transform hover:scale-[1.02] transition-transform duration-200">
          <p className="text-sm font-medium opacity-80 uppercase tracking-wider">Presupuesto</p>
          <p className="text-4xl font-extrabold mt-1">${stats.totalBudget.toFixed(2)}</p>
          <div className="w-full bg-white/20 h-2 rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ease-out ${stats.total > stats.totalBudget ? "bg-red-400" : "bg-white"}`}
              style={{ width: `${Math.min((stats.total / (stats.totalBudget || 1)) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs mt-1.5 font-medium opacity-90">
            {Math.round((stats.total / (stats.totalBudget || 1)) * 100)}% consumido
          </p>
        </div>

        <div className="premium-card p-6 rounded-[2.5rem] shadow-sm transform hover:scale-[1.02] transition-transform duration-200">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1">Transacciones</p>
          <p className="text-4xl font-extrabold text-gray-900 dark:text-white">{stats.count}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-tight">
              {stats.byCategory.length} categorias activas
            </p>
          </div>
        </div>

        <div className="premium-gradient-orange p-5 rounded-2xl shadow-lg border border-white/10 text-white transform hover:scale-[1.02] transition-transform duration-200">
          <p className="text-sm font-medium opacity-80 uppercase tracking-wider">Facturación Top</p>
          {stats.topExpense ? (
            <>
              <p className="text-4xl font-extrabold mt-1">${stats.topExpense.amount.toFixed(2)}</p>
              <p className="text-xs mt-2 font-semibold bg-white/20 px-2 py-1 rounded truncate">
                {stats.topExpense.description}
              </p>
            </>
          ) : (
            <p className="text-4xl font-extrabold mt-1 text-white/50">-</p>
          )}
        </div>
      </div>

      {/* Charts row 1: Cumulative area + Daily bar */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
        <div className="lg:col-span-4 premium-card p-8 rounded-[3rem] shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-lg">Facturación Acumulada</h2>
            <span className="text-xs font-semibold px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              Tendencia Mensual
            </span>
          </div>
          {stats.dailyTotals.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats.dailyTotals} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 500 }} 
                  tickFormatter={(v) => v.slice(8)} 
                  stroke="currentColor" 
                  opacity={0.5} 
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 500 }} 
                  stroke="currentColor" 
                  opacity={0.5} 
                />
                <Tooltip
                  cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                  formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name === "cumulative" ? "Acumulado" : "Dia"]}
                  labelFormatter={(l) => `Dia ${String(l).slice(8)}`}
                  contentStyle={{ 
                    backgroundColor: "rgba(255, 255, 255, 0.8)", 
                    backdropFilter: "blur(8px)",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)"
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  fill="url(#colorCumulative)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400 italic">No hay datos este mes</div>
          )}
        </div>

        <div className="lg:col-span-3 premium-card p-8 rounded-[3rem] shadow-xl">
          <h2 className="font-bold text-lg mb-6">Facturaciones por Día</h2>
          {stats.dailyTotals.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.dailyTotals} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 500 }} 
                  tickFormatter={(v) => v.slice(8)} 
                  stroke="currentColor" 
                  opacity={0.5} 
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 500 }} 
                  stroke="currentColor" 
                  opacity={0.5} 
                />
                <Tooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                  formatter={(v) => [`$${Number(v).toFixed(2)}`, "Monto"]}
                  labelFormatter={(l) => `Dia ${String(l).slice(8)}`}
                  contentStyle={{ 
                    backgroundColor: "rgba(255, 255, 255, 0.8)", 
                    backdropFilter: "blur(8px)",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)"
                  }}
                />
                <Bar dataKey="amount" fill="#8b5cf6" radius={[6, 6, 0, 0]} animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400 italic">Esperando transacciones...</div>
          )}
        </div>
      </div>

      {/* Charts row 2: Pie + Horizontal bars by category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="premium-card p-8 rounded-[3rem] shadow-xl">
          <h2 className="font-bold text-lg mb-6">Distribucion por Categoria</h2>
          {stats.byCategory.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative w-full md:w-1/2 flex justify-center">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart padding={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={stats.byCategory}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={65}
                      strokeWidth={3}
                      stroke="#fff"
                      animationBegin={200}
                      animationDuration={1500}
                    >
                      {stats.byCategory.map((c) => (
                        <Cell key={c.name} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(v) => [`$${Number(v).toFixed(2)}`]}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-gray-400 text-xs font-bold uppercase">Total</span>
                  <span className="text-2xl font-black">${stats.total.toFixed(0)}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 flex-1 w-full">
                {stats.byCategory.map((c) => {
                  const pct = stats.total > 0 ? Math.round((c.total / stats.total) * 100) : 0;
                  return (
                    <div key={c.name} className="flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-colors">
                      <div className="w-4 h-4 rounded-lg shrink-0" style={{ backgroundColor: c.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{c.name}</p>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full mt-1">
                          <div className="h-full rounded-full" style={{ backgroundColor: c.color, width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold tabular-nums">${c.total.toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{pct}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-gray-400 italic">Calculando proporciones...</div>
          )}
        </div>

        <div className="premium-card p-8 rounded-[3rem] shadow-xl">
          <h2 className="font-bold text-lg mb-6 text-gray-900 dark:text-white uppercase tracking-tight">Presupuesto vs Realidad</h2>
          {stats.byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart 
                data={stats.byCategory} 
                layout="vertical" 
                margin={{ left: 10, right: 30, top: 0, bottom: 0 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" opacity={0.05} />
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 700 }} 
                  width={90} 
                  stroke="currentColor" 
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name === "total" ? "Gastado" : "Presupuesto"]}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend 
                  iconType="circle" 
                  verticalAlign="top" 
                  align="right" 
                  wrapperStyle={{ paddingTop: 0, paddingBottom: 20, fontSize: '11px', fontWeight: 600 }} 
                />
                <Bar dataKey="budget" name="Presupuesto" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={10} animationDuration={1000} />
                <Bar dataKey="total" name="Gastado" radius={[0, 4, 4, 0]} barSize={16} animationDuration={1500}>
                  {stats.byCategory.map((c) => (
                    <Cell key={c.name} fill={c.total > c.budget && c.budget > 0 ? "#ef4444" : c.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-gray-400 italic">No hay limites configurados</div>
          )}
        </div>
      </div>

      {/* Weekly comparison */}
      {stats.weeklyTotals.some((w) => w.amount > 0) && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
          <h2 className="font-semibold mb-4">Facturaciones por Semana</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.weeklyTotals}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
              <Tooltip
                formatter={(v) => [`$${Number(v).toFixed(2)}`, "Total"]}
                contentStyle={{ backgroundColor: "var(--tooltip-bg, #fff)", border: "1px solid var(--tooltip-border, #e5e7eb)", borderRadius: "8px" }}
              />
              <Legend />
              <Bar dataKey="amount" name="Facturación semanal" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent expenses */}
      {(() => {
        const expensesToShow = stats.recentExpenses.length > 0
          ? stats.recentExpenses
          : stats.allTimeRecent;
        const isAllTime = stats.recentExpenses.length === 0 && stats.allTimeRecent.length > 0;

        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700">
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold">
                {isAllTime ? "Últimas Facturaciones (todos los meses)" : "Facturaciones del Mes"}
              </h2>
              {isAllTime && (
                <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded">
                  No hay facturaciones en {monthNames[month - 1]} {year}
                </span>
              )}
            </div>
            {expensesToShow.length === 0 ? (
              <p className="p-6 text-gray-400 text-sm">No hay facturaciones registradas. Ve a Facturaciones o Escanear para agregar.</p>
            ) : (
              <div className="divide-y dark:divide-gray-700">
                {expensesToShow.map((exp) => (
                  <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center gap-3">
                      {exp.receipt ? (
                        <a href={exp.receipt} target="_blank" rel="noopener noreferrer">
                          <img src={exp.receipt} alt="Recibo" className="w-9 h-9 rounded object-cover border dark:border-gray-600" />
                        </a>
                      ) : (
                        <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: exp.category.color + "20" }}>
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: exp.category.color }} />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{exp.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {exp.category.name} - {new Date(exp.date).toLocaleDateString("es")}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold">${exp.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
