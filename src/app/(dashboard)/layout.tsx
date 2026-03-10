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
  { href: "/dashboard/expenses", label: "Gastos" },
  { href: "/dashboard/scan", label: "Escanear" },
  { href: "/dashboard/budgets", label: "Presupuestos" },
  { href: "/dashboard/categories", label: "Categorias" },
  { href: "/dashboard/export", label: "Exportar" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">
              $ ExpenseTracker
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    pathname === item.href
                      ? "bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            >
              {theme === "dark" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">{user.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
            >
              Salir
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t dark:border-gray-700 px-4 py-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === item.href
                    ? "bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
