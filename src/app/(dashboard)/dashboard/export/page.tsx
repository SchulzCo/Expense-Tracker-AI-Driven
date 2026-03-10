"use client";

import { useState } from "react";
import { getToken, API_URL } from "@/lib/auth";

export default function ExportPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/expenses/export?month=${month}&year=${year}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gastos_${year}_${month}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert("Error al exportar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Exportar Reportes</h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700 space-y-4 max-w-md">
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Exporta tus gastos en formato CSV para declaraciones fiscales o analisis personal.
        </p>
        <div className="flex gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Mes</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleString("es", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Anio</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={loading}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? "Exportando..." : "Descargar CSV"}
        </button>
      </div>
    </div>
  );
}
