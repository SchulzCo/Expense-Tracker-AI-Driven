"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";
import { getToken, API_URL } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/expenses", label: "Facturaciones" },
  { href: "/dashboard/scan", label: "Escanear" },
  { href: "/dashboard/budgets", label: "Presupuestos" },
  { href: "/dashboard/categories", label: "Categorias" },
  { href: "/dashboard/currency", label: "Conversor" },
  { href: "/dashboard/import", label: "Importar" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const token = await getToken();
      if (!token) {
        setAuthError("No se encontró token de sesión.");
        router.push("/login");
        return;
      }
      
      try {
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data) setUser(data);
          else {
            setAuthError("No se pudo obtener datos del usuario.");
            router.push("/login");
          }
        } else {
          setAuthError(`Error del servidor: ${res.status}`);
          router.push("/login");
        }
      } catch (err) {
        console.error("Auth error:", err);
        setAuthError(`Error de conexión al API: ${err instanceof Error ? err.message : String(err)}`);
        // router.push("/login"); // Comentado para ver el error
      }
    }
    checkAuth();
  }, [router]);

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="animate-pulse text-gray-400">Cargando...</div>
        {authError && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm max-w-md text-center">
            {authError}
            <br />
            <button onClick={() => router.push("/login")} className="underline mt-2">Ir al Login</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-gray-900 dark:text-gray-100">
      <nav className="glass bg-white/70 dark:bg-gray-800/70 sticky top-0 z-30 border-b border-gray-200/50 dark:border-gray-700/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl premium-gradient-indigo flex items-center justify-center text-white shadow-indigo-500/20 shadow-lg group-hover:rotate-12 transition-transform">
                <span className="font-bold">$</span>
              </div>
              <span className="font-black text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                ExpenseTracker
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-xl text-sm font-black transition-all duration-300 relative group overflow-hidden ${
                    pathname === item.href
                      ? "text-white"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <span className="relative z-10">{item.label}</span>
                  {pathname === item.href && (
                    <div className="absolute inset-0 premium-gradient-indigo z-0 animate-in fade-in fill-mode-both duration-500" />
                  )}
                  {pathname !== item.href && (
                    <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700/50 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-0" />
                  )}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggle}
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:scale-110 transition-transform border border-transparent dark:border-gray-700"
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            >
              {theme === "dark" ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
              )}
            </button>
            <div className="relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 pl-4 pr-3 py-2 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 rounded-2xl transition-all duration-300 group shadow-sm hover:shadow-indigo-500/10"
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-black text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {user.name}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl premium-gradient-indigo flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                  {user.name.charAt(0)}
                </div>
                <svg 
                  className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-gray-800 rounded-[1.5rem] shadow-2xl shadow-indigo-500/20 border border-gray-100 dark:border-gray-700 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl">
                    <Link 
                      href="/dashboard/profile" 
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center px-5 py-2.5 text-sm font-black text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition mx-2 rounded-xl"
                    >
                      Perfil
                    </Link>
                    <div className="h-px bg-gray-100 dark:bg-gray-700/50 my-2 mx-4" />
                    <button 
                      onClick={() => { handleLogout(); setUserMenuOpen(false); }}
                      className="w-[calc(100%-1rem)] flex items-center px-5 py-2.5 text-sm font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition mx-2 rounded-xl"
                    >
                      Salir
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 bg-gray-100 dark:bg-gray-800 rounded-xl"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t dark:border-gray-700 px-4 py-4 space-y-2 bg-white dark:bg-gray-800">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-bold transition ${
                  pathname === item.href
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
      <main key={pathname} className="max-w-7xl mx-auto px-4 py-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {children}
      </main>
    </div>
  );
}
