"use client";

import { useEffect, useState } from "react";
import { getToken, API_URL } from "@/lib/auth";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Expense {
  id: string;
  amount: number;
  tax_amount: number;
  vendor?: string;
  receipt_number?: string;
  payment_method?: string;
  status?: string;
  description: string;
  date: string;
  receipt: string | null;
  category: Category;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    amount: "",
    tax_amount: "",
    net_amount: "",
    other_taxes: "",
    vendor: "",
    receipt_number: "",
    payment_method: "",
    status: "Pagado",
    description: "",
    date: "",
    due_date: "",
    category_id: ""
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | "txt">("csv");
  const [filters, setFilters] = useState({
    vendor: "",
    receipt_number: "",
    category_id: "",
    start_date: "",
    end_date: "",
    due_start_date: "",
    due_end_date: "",
    status: "",
    payment_method: "",
    description: "",
    min_amount: "",
    max_amount: "",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    async function init() {
      const token = await getToken();
      if (!token) return;
      fetch(`${API_URL}/categories/`, {
        headers: { "Authorization": `Bearer ${token}` }
      }).then((r) => r.json()).then((data) => setCategories(Array.isArray(data) ? data : []));
      loadExpenses();
    }
    init();
  }, []);

  useEffect(() => {
    setPage(0);
    loadExpenses(0, pageSize);
  }, [filters, pageSize]);

  async function loadExpenses(targetPage = page, targetSize = pageSize) {
    const token = await getToken();
    if (!token) return;
    const params = new URLSearchParams();
    if (filters.category_id) params.set("category_id", filters.category_id);
    if (filters.vendor) params.set("vendor", filters.vendor);
    if (filters.receipt_number) params.set("receipt_number", filters.receipt_number);
    if (filters.start_date) params.set("start_date", filters.start_date);
    if (filters.end_date) params.set("end_date", filters.end_date);
    if (filters.due_start_date) params.set("due_start_date", filters.due_start_date);
    if (filters.due_end_date) params.set("due_end_date", filters.due_end_date);
    if (filters.status) params.set("status", filters.status);
    if (filters.payment_method) params.set("payment_method", filters.payment_method);
    if (filters.description) params.set("description", filters.description);
    if (filters.min_amount) params.set("min_amount", filters.min_amount);
    if (filters.max_amount) params.set("max_amount", filters.max_amount);

    params.set("skip", (targetPage * targetSize).toString());
    params.set("limit", targetSize.toString());

    console.log("Loading expenses with params:", params.toString());
    fetch(`${API_URL}/expenses?${params.toString()}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        console.log("Expenses received:", data.length);
        setExpenses(data);
        setHasMore(data.length === targetSize);
      });
  }

  async function handleExport() {
    const token = await getToken();
    if (!token) return;
    const params = new URLSearchParams();
    params.set("format", exportFormat);
    if (filters.category_id) params.set("category_id", filters.category_id);
    if (filters.vendor) params.set("vendor", filters.vendor);
    if (filters.receipt_number) params.set("receipt_number", filters.receipt_number);
    if (filters.start_date) params.set("start_date", new Date(filters.start_date).toISOString());
    if (filters.end_date) params.set("end_date", new Date(filters.end_date).toISOString());
    if (filters.status) params.set("status", filters.status);

    // Using window.open for direct download
    window.open(`${API_URL}/expenses/export?${params.toString()}&token=${token}`, "_blank");
    // Note: Since we use Bearer token in headers normally, we might need a workaround for window.open 
    // or use fetch + blob. Let's use fetch + blob for reliability with Auth.
  }

  async function handleExportSecure() {
    const token = await getToken();
    if (!token) return;
    const params = new URLSearchParams();
    params.set("format", exportFormat);
    if (filters.category_id) params.set("category_id", filters.category_id);
    if (filters.vendor) params.set("vendor", filters.vendor);
    if (filters.receipt_number) params.set("receipt_number", filters.receipt_number);
    if (filters.start_date) params.set("start_date", new Date(filters.start_date).toISOString());
    if (filters.end_date) params.set("end_date", new Date(filters.end_date).toISOString());
    if (filters.due_start_date) params.set("due_start_date", new Date(filters.due_start_date).toISOString());
    if (filters.due_end_date) params.set("due_end_date", new Date(filters.due_end_date).toISOString());
    if (filters.status) params.set("status", filters.status);
    if (filters.payment_method) params.set("payment_method", filters.payment_method);
    if (filters.description) params.set("description", filters.description);
    if (filters.min_amount) params.set("min_amount", filters.min_amount);
    if (filters.max_amount) params.set("max_amount", filters.max_amount);

    const res = await fetch(`${API_URL}/expenses/export?${params.toString()}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_gastos.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const submissionData = {
        ...form,
        amount: parseFloat(form.amount || "0"),
        tax_amount: parseFloat(form.tax_amount || "0"),
        net_amount: parseFloat(form.net_amount || "0"),
        other_taxes: parseFloat(form.other_taxes || "0"),
        date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      };

      if (editId) {
        await fetch(`${API_URL}/expenses/${editId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(submissionData),
        });
        setEditId(null);
      } else {
        await fetch(`${API_URL}/expenses/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(submissionData),
        });
      }
      setForm({
        amount: "",
        tax_amount: "",
        net_amount: "",
        other_taxes: "",
        vendor: "",
        receipt_number: "",
        payment_method: "",
        status: "Pagado",
        description: "",
        date: "",
        due_date: "",
        category_id: ""
      });
      loadExpenses();
    } finally {
      setLoading(false);
    }
  }

  async function deleteOne(id: string) {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/expenses/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Error al eliminar");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta facturación?")) return;
    try {
      await deleteOne(id);
      loadExpenses();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.length} facturaciones seleccionadas?`)) return;

    setLoading(true);
    try {
      console.log("Iniciando borrado por lote...", selectedIds);
      const token = await getToken();
      if (!token) {
        alert("Error: No se encontró token de autenticación");
        return;
      }

      console.log("Enviando petición a:", `${API_URL}/expenses/batch-delete`);
      const res = await fetch(`${API_URL}/expenses/batch-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedIds }),
      });

      console.log("Respuesta recibida, status:", res.status);
      const text = await res.text();
      console.log("Contenido respuesta:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { detail: text };
      }

      if (res.ok) {
        alert(data.message || "Eliminación completada");
        setSelectedIds([]);
        loadExpenses();
      } else {
        alert(`Error ${res.status}: ${data.detail || text || "No se pudo eliminar"}`);
      }
    } catch (error) {
      console.error("Error en handleBatchDelete:", error);
      alert("Error de conexión al intentar eliminar. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === expenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(expenses.map(e => e.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  function handleEdit(exp: Expense) {
    setEditId(exp.id);
    setForm({
      amount: String(exp.amount),
      tax_amount: String(exp.tax_amount || 0),
      net_amount: String((exp as any).net_amount || 0),
      other_taxes: String((exp as any).other_taxes || 0),
      vendor: exp.vendor || "",
      receipt_number: exp.receipt_number || "",
      payment_method: exp.payment_method || "",
      status: exp.status || "Pagado",
      description: exp.description,
      date: exp.date.split("T")[0],
      due_date: (exp as any).due_date ? (exp as any).due_date.split("T")[0] : "",
      category_id: exp.category.id,
    });
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
          <span className="text-gradient">Facturaciones</span>
        </h1>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          Sistema de Gestión Pro
        </div>
      </div>

      {/* Export Section (Promoted to Top) */}
      <div className="premium-card p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Formato de Exportación</label>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {(["csv", "xlsx", "txt"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setExportFormat(fmt)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase ${exportFormat === fmt ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleExportSecure}
          className="w-full md:w-auto px-8 py-3 premium-gradient-indigo text-white rounded-xl font-black shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          📥 Exportar Reporte Filtrado
        </button>
      </div>

      <form onSubmit={handleSubmit} className="premium-card p-8 rounded-[2.5rem] space-y-6">
        <h2 className="font-semibold">{editId ? "Editar Facturación" : "Nueva Facturación"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Descripción</label>
            <input
              type="text"
              placeholder="Ej: Almuerzo Cliente"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Categoría</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
              required
            >
              <option value="">Seleccionar...</option>
              {Array.isArray(categories) && categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Fecha Emisión</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Vencimiento</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Monto Neto</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.net_amount}
              onChange={(e) => setForm({ ...form, net_amount: e.target.value })}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">IVA</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.tax_amount}
              onChange={(e) => setForm({ ...form, tax_amount: e.target.value })}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Otros Impuestos</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.other_taxes}
              onChange={(e) => setForm({ ...form, other_taxes: e.target.value })}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-indigo-500 ml-1 font-bold">Monto Total</label>
            <input
              type="number"
              step="0.01"
              placeholder="Total"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-4 py-2 border-2 border-indigo-100 dark:border-indigo-900 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100 font-bold"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Proveedor</label>
            <input
              type="text"
              placeholder="Ej: Supermercado..."
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Comprobante</label>
            <input
              type="text"
              placeholder="Nro Factura"
              value={form.receipt_number}
              onChange={(e) => setForm({ ...form, receipt_number: e.target.value })}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Forma de Pago</label>
            <input
              type="text"
              placeholder="Ej: Tarjeta, Efectivo"
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Estado</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="Pagado">Pagado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Anulado">Anulado</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button type="submit" disabled={loading} className="px-8 py-2.5 premium-gradient-indigo text-white rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20">
            {editId ? "Actualizar Facturación" : "Guardar Facturación"}
          </button>

          <button
            type="button"
            disabled={categorizing || !form.description}
            onClick={async () => {
              setCategorizing(true);
              try {
                const token = await getToken();
                if (!token) return;
                const res = await fetch(`${API_URL}/expenses/categorize`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                  },
                  body: JSON.stringify({ description: form.description, amount: form.amount }),
                });
                const data = await res.json();
                const catMatch = categories.find((c) => c.name === data.category);
                if (catMatch) setForm((f) => ({ ...f, category_id: catMatch.id }));
              } finally {
                setCategorizing(false);
              }
            }}
            className="px-6 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-xl font-bold hover:bg-emerald-100 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {categorizing ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full" />
                Analizando...
              </>
            ) : (
              "IA Categorizar"
            )}
          </button>

          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm({ amount: "", tax_amount: "", net_amount: "", other_taxes: "", vendor: "", receipt_number: "", payment_method: "", status: "Pagado", description: "", date: "", due_date: "", category_id: "" }); }} className="px-8 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 transition-all">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="premium-card rounded-[2.5rem] overflow-hidden">
        <div className="p-6 border-b dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Lista de Facturaciones</h2>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
            >
              {showAdvanced ? "↑ Ocultar Filtros" : "↓ Filtros Avanzados"}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedIds([]);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isSelectionMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              {isSelectionMode ? '✕ Cancelar' : '🔍 Seleccionar'}
            </button>
            {selectedIds.length > 0 && (
              <button
                onClick={handleBatchDelete}
                className="px-4 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2"
              >
                🗑️ Eliminar ({selectedIds.length})
              </button>
            )}
            <select
              value={filters.category_id}
              onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
              className="text-sm px-3 py-1.5 border dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">Todas las categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {(Object.values(filters).some(v => v !== "")) && (
              <button
                onClick={() => setFilters({
                  vendor: "",
                  receipt_number: "",
                  category_id: "",
                  start_date: "",
                  end_date: "",
                  due_start_date: "",
                  due_end_date: "",
                  status: "",
                  payment_method: "",
                  description: "",
                  min_amount: "",
                  max_amount: "",
                })}
                className="text-xs font-black uppercase tracking-widest text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                ✕ Limpiar Filtros
              </button>
            )}
          </div>
        </div>

        {showAdvanced && (
          <div className="p-6 bg-gray-50 dark:bg-gray-900/30 border-b dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">Proveedor</label>
              <input
                type="text"
                placeholder="Buscar..."
                value={filters.vendor}
                onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
                className="w-full text-sm px-3 py-1.5 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">Comprobante</label>
              <input
                type="text"
                placeholder="Nro..."
                value={filters.receipt_number}
                onChange={(e) => setFilters({ ...filters, receipt_number: e.target.value })}
                className="w-full text-sm px-3 py-1.5 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">Desde</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                className="w-full text-sm px-3 py-1.5 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">Hasta</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                className="w-full text-sm px-3 py-1.5 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">Desde (Venc)</label>
              <input
                type="date"
                value={filters.due_start_date}
                onChange={(e) => setFilters({ ...filters, due_start_date: e.target.value })}
                className="w-full text-sm px-3 py-1.5 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">Hasta (Venc)</label>
              <input
                type="date"
                value={filters.due_end_date}
                onChange={(e) => setFilters({ ...filters, due_end_date: e.target.value })}
                className="w-full text-sm px-3 py-1.5 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">Monto Mín</label>
              <input
                type="number"
                placeholder="0.00"
                value={filters.min_amount}
                onChange={(e) => setFilters({ ...filters, min_amount: e.target.value })}
                className="w-full text-sm px-3 py-1.5 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">Monto Máx</label>
              <input
                type="number"
                placeholder="Total..."
                value={filters.max_amount}
                onChange={(e) => setFilters({ ...filters, max_amount: e.target.value })}
                className="w-full text-sm px-3 py-1.5 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">Descripción</label>
              <input
                type="text"
                placeholder="Filtro texto..."
                value={filters.description}
                onChange={(e) => setFilters({ ...filters, description: e.target.value })}
                className="w-full text-sm px-3 py-1.5 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">Forma Pago</label>
              <input
                type="text"
                placeholder="Tarjeta, etc..."
                value={filters.payment_method}
                onChange={(e) => setFilters({ ...filters, payment_method: e.target.value })}
                className="w-full text-sm px-3 py-1.5 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400">Estado Pago</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full text-sm px-3 py-1.5 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">Todos</option>
                <option value="Pagado">Pagado</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </div>
          </div>
        )}
        {expenses.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">No hay facturaciones registradas</p>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {isSelectionMode && (
              <div className="bg-gray-50/50 dark:bg-gray-800/30 p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <input
                  type="checkbox"
                  checked={expenses.length > 0 && selectedIds.length === expenses.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Seleccionar Todo</span>
              </div>
            )}
            {expenses.map((exp) => (
              <div key={exp.id} className={`p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedIds.includes(exp.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                <div className="flex items-center gap-4">
                  {isSelectionMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(exp.id)}
                      onChange={() => toggleSelect(exp.id)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer animate-in zoom-in-50 duration-200"
                    />
                  )}
                  <div className="flex items-center gap-3">
                    {exp.receipt ? (
                      <a href={exp.receipt} target="_blank" rel="noopener noreferrer">
                        <img src={exp.receipt} alt="Recibo" className="w-10 h-10 rounded object-cover border dark:border-gray-600 hover:opacity-80" />
                      </a>
                    ) : (
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: exp.category?.color || "#6366f1" }} />
                    )}
                    <div>
                      <p className="font-medium">{exp.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-0.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {exp.category?.name || "Cargando..."} - {new Date(exp.date).toLocaleDateString("es")}
                        </p>
                        {exp.vendor && (
                          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            🏢 {exp.vendor}
                          </p>
                        )}
                        {exp.receipt_number && (
                          <p className="text-xs text-gray-400">
                            #️⃣ {exp.receipt_number}
                          </p>
                        )}
                      </div>

                      {/* Detalles Pro Row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {(exp as any).due_date && (
                          <span>📅 Venc: {new Date((exp as any).due_date).toLocaleDateString("es")}</span>
                        )}
                        {exp.payment_method && (
                          <span>💳 {exp.payment_method}</span>
                        )}
                        {exp.status && (
                          <span className={exp.status === "Pagado" ? "text-emerald-500" : "text-amber-500"}>
                            ● {exp.status}
                          </span>
                        )}
                        {(exp as any).net_amount > 0 && (
                          <span>Neto: ${(exp as any).net_amount.toFixed(2)}</span>
                        )}
                        {(exp as any).other_taxes > 0 && (
                          <span>Otros Imp: ${(exp as any).other_taxes.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-lg leading-none">${exp.amount.toFixed(2)}</span>
                    {exp.tax_amount > 0 && (
                      <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">IVA: ${exp.tax_amount.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleEdit(exp)} className="text-sm font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 uppercase tracking-widest transition-colors">Editar</button>
                    {!isSelectionMode && (
                      <button 
                        onClick={() => handleDelete(exp.id)} 
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {/* Pagination Controls */}
            <div className="p-6 border-t dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-gray-400">Mostrar</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="text-xs font-bold px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 outline-none"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-[10px] font-black uppercase text-gray-400">por página</span>
              </div>

              <div className="flex items-center gap-4">
                <button
                  disabled={page === 0}
                  onClick={() => {
                    const newPage = page - 1;
                    setPage(newPage);
                    loadExpenses(newPage, pageSize);
                  }}
                  className="px-4 py-2 text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl disabled:opacity-30 transition-all border border-transparent hover:border-indigo-100"
                >
                  ← Anterior
                </button>
                <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter">Página {page + 1}</span>
                <button
                  disabled={!hasMore}
                  onClick={() => {
                    const newPage = page + 1;
                    setPage(newPage);
                    loadExpenses(newPage, pageSize);
                  }}
                  className="px-4 py-2 text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl disabled:opacity-30 transition-all border border-transparent hover:border-indigo-100"
                >
                  Siguiente →
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
