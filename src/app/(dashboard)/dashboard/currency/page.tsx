"use client";

import { useEffect, useState, useMemo } from "react";
import { getToken, API_URL } from "@/lib/auth";

interface CurrencyData {
  base_code: string;
  rates: Record<string, number>;
  time_last_update_utc: string;
  argentine?: {
    oficial?: { value_avg: number };
    blue?: { value_avg: number };
    mep?: { value_avg: number };
    ccl?: { value_avg: number };
    last_update: string;
  };
}

export default function CurrencyPage() {
  const [data, setData] = useState<CurrencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<string>("100");
  const [fromCurr, setFromCurr] = useState("USD");
  const [toCurr, setToCurr] = useState("ARS");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);

  useEffect(() => {
    async function fetchRates() {
      const token = await getToken();
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/currency/latest`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          console.log("Currency Data Received:", json);
          setData(json);
        } else {
          console.error("Failed to fetch currency rates", res.status);
        }
      } catch (err) {
        console.error("Error fetching rates:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRates();
  }, []);

  const currencies = useMemo(() => {
    if (!data) return [];
    return Object.keys(data.rates).sort();
  }, [data]);

  const filteredCurrencies = useMemo(() => {
    return currencies.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [currencies, searchTerm]);

  const result = useMemo(() => {
    if (!data || !amount) return null;
    const rateFrom = data.rates[fromCurr];
    const rateTo = data.rates[toCurr];
    if (rateFrom && rateTo) {
      return (parseFloat(amount) / rateFrom) * rateTo;
    }
    return null;
  }, [amount, fromCurr, toCurr, data]);

  const handleSwap = () => {
    setIsSwapping(true);
    const temp = fromCurr;
    setFromCurr(toCurr);
    setToCurr(temp);
    setTimeout(() => setIsSwapping(false), 500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-black uppercase text-indigo-600">Cotizando</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white">
            Conversor <span className="text-gradient">Inteligente</span>
          </h1>
          <p className="text-gray-500 font-medium text-lg mt-2">Tasas internacionales y mercado local en tiempo real.</p>
        </div>
        <div className="premium-card px-6 py-3 rounded-2xl flex items-center gap-4">
          <div className="flex -space-x-2">
            <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-gray-800">🇺🇸</span>
            <span className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-gray-800">🇪🇺</span>
            <span className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-gray-800">🇦🇷</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">Sync Global</p>
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">Activo hace {data ? "1m" : "---"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Converter */}
        <div className="lg:col-span-2 space-y-6">
          <div className="premium-card p-8 rounded-[2.5rem] relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -mr-48 -mt-48 transition-all duration-1000 ${isSwapping ? "scale-150 rotate-180" : ""}`}></div>
            
            <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center relative z-10">
              {/* From */}
              <div className="md:col-span-11 lg:col-span-5 space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">De Moneda</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={fromCurr}
                      onChange={(e) => setFromCurr(e.target.value)}
                      className="w-full pl-4 pr-10 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-lg appearance-none"
                    >
                      {currencies.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Swap Button */}
              <div className="md:col-span-11 lg:col-span-1 flex justify-center pt-6">
                <button
                  onClick={handleSwap}
                  className={`p-3 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 hover:scale-110 active:rotate-180 transition-all duration-500 ${isSwapping ? "rotate-180" : ""}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
              </div>

              {/* To */}
              <div className="md:col-span-11 lg:col-span-5 space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">A Moneda</label>
                <select
                  value={toCurr}
                  onChange={(e) => setToCurr(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-lg appearance-none"
                >
                  {currencies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Monto a Convertir</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-indigo-500">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-14 pr-8 py-8 bg-gray-50 dark:bg-gray-900 border-none rounded-[2rem] outline-none focus:ring-8 focus:ring-indigo-500/5 transition-all text-5xl font-black"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex flex-col items-center py-8 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-[2.5rem] mt-8 border border-indigo-100/50 dark:border-indigo-800/20">
                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-4">Monto Convertido</p>
                <div className="flex items-baseline gap-4">
                  <span className="text-6xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tighter">
                    {result?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-2xl font-black text-indigo-500 uppercase">{toCurr}</span>
                </div>
                <div className="mt-6 px-6 py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm text-sm font-bold border border-indigo-50 dark:border-indigo-900/30">
                  <span className="text-gray-400">Tasa:</span> 1 {fromCurr} = <span className="text-indigo-600 dark:text-indigo-400">{(data?.rates[toCurr]! / data?.rates[fromCurr]!).toFixed(4)}</span> {toCurr}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Market Sidebar (Argentine Rates) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pl-2">
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Mercado Local 🇦🇷</h2>
            <div className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-black">BLUE</div>
          </div>
          
          <div className="space-y-4">
            {[
              { label: "Dólar Blue", val: data?.argentine?.blue?.value_avg, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50/50 dark:bg-indigo-900/20" },
              { label: "Dólar Oficial", val: data?.argentine?.oficial?.value_avg, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50/50 dark:bg-emerald-900/20" },
              { label: "Dólar MEP", val: data?.argentine?.mep?.value_avg, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50/50 dark:bg-amber-900/20" },
              { label: "Dólar CCL", val: data?.argentine?.ccl?.value_avg, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50/50 dark:bg-purple-900/20" },
            ].map((rate, i) => (
              <div key={i} className={`p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm ${rate.bg} transition-all hover:scale-[1.02]`}>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">{rate.label}</p>
                <div className="flex items-end justify-between">
                  <span className={`text-4xl font-black ${rate.color}`}>${rate.val?.toFixed(2)}</span>
                  <span className="text-xs font-bold text-gray-400">ARS</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-4">
            Cotizaciones informativas sujetas a mercado.
          </p>
        </div>
      </div>

      {/* Quick Search Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">Explorar Divisas</h2>
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Buscar moneda (USD, EUR...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {filteredCurrencies.slice(0, 32).map((c) => (
            <button
              key={c}
              onClick={() => { setToCurr(c); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={`p-4 rounded-2xl border transition-all text-center group ${toCurr === c ? "bg-indigo-600 border-indigo-500 text-white shadow-lg" : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-300"}`}
            >
              <p className="text-lg font-black">{c}</p>
              <p className={`text-[10px] font-bold uppercase transition-colors ${toCurr === c ? "text-indigo-200" : "text-gray-400"}`}>{(data?.rates[c]!).toFixed(2)}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
