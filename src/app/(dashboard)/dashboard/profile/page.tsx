"use client";

import { useEffect, useState } from "react";
import { getToken, API_URL } from "@/lib/auth";

export default function ProfilePage() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = await getToken();
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          setUser(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  if (loading) return <div className="p-10 animate-pulse text-gray-400">Cargando perfil...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Avatar & Basic Info */}
        <div className="w-full md:w-1/3 space-y-6">
          <div className="glass bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 flex flex-col items-center text-center shadow-xl shadow-indigo-500/5">
            <div className="w-24 h-24 rounded-3xl premium-gradient-indigo flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-500/30 mb-4">
              {user?.name.charAt(0)}
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">{user?.name}</h2>
            <p className="text-sm text-gray-500 font-medium mb-6">{user?.email}</p>
            <div className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest">
              Pro Account
            </div>
          </div>
        </div>

        {/* Details & Settings Placeholder */}
        <div className="w-full md:w-2/3 space-y-6">
          <div className="glass bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 shadow-xl shadow-indigo-500/5">
            <h3 className="text-lg font-black uppercase tracking-wider mb-6 text-gray-400">Detalles de la Cuenta</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre Completo</p>
                <p className="font-bold text-gray-900 dark:text-white">{user?.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Correo Electrónico</p>
                <p className="font-bold text-gray-900 dark:text-white">{user?.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Suscripción</p>
                <p className="font-bold text-indigo-600">Premium Anual</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Miembro desde</p>
                <p className="font-bold text-gray-900 dark:text-white">Marzo 2024</p>
              </div>
            </div>
          </div>

          <div className="glass bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border dark:border-gray-700 opacity-50 cursor-not-allowed">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black uppercase tracking-wider text-gray-400">Configuración Avanzada</h3>
              <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">Próximamente</span>
            </div>
            <p className="text-sm text-gray-500">La gestión de seguridad, notificaciones y preferencias de moneda se habilitará en la siguiente actualización.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
