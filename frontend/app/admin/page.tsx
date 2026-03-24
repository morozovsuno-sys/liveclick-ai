"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdminSidebar } from "@/components/AdminSidebar";
import { 
  Users, 
  CreditCard, 
  Activity, 
  ShieldAlert, 
  Search,
  UserPlus,
  MoreVertical,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchData();
  }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, logsRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get(`/admin/users?offset=${page * 50}&search=${searchTerm}`),
        api.get("/admin/logs?limit=5")
      ]);

      setStats(statsRes);
      setUsers(usersRes.users);
      setLogs(logsRes);
    } catch (error) {
      toast.error("Ошибка при загрузке данных админки");
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPremium = async (userId: string) => {
    const days = prompt("На сколько дней выдать PREMIUM?", "30");
    if (!days) return;

    try {
      await api.post(`/admin/users/${userId}/premium?days=${days}`);
      toast.success("Премиум успешно выдан!");
      fetchData(); // Refresh
    } catch (error) {
      toast.error("Не удалось выдать премиум");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <AdminSidebar active="dashboard" />
      
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Панель управления</h1>
            <p className="text-gray-400">Обзор состояния LiveClick AI</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Поиск пользователей..." 
                className="bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Server Online
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Пользователи", value: stats?.total_users || 0, icon: Users, color: "text-blue-400" },
            { label: "Выручка (₽)", value: stats?.total_revenue_rub?.toLocaleString() || 0, icon: CreditCard, color: "text-emerald-400" },
            { label: "Активные задачи", value: stats?.active_jobs || 0, icon: Activity, color: "text-purple-400" },
            { label: "Действия админа", value: logs?.length || 0, icon: ShieldAlert, color: "text-orange-400" },
          ].map((card, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-gray-800 ${card.color}`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <MoreVertical className="text-gray-600 w-4 h-4 cursor-pointer" />
              </div>
              <p className="text-gray-400 text-sm mb-1">{card.label}</p>
              <h3 className="text-2xl font-bold">{card.value}</h3>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                Недавние пользователи
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  className="p-1 hover:bg-gray-800 rounded transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setPage(p => p + 1)}
                  className="p-1 hover:bg-gray-800 rounded transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-wider">
                    <th className="px-6 py-4 font-semibold">Пользователь</th>
                    <th className="px-6 py-4 font-semibold">План</th>
                    <th className="px-6 py-4 font-semibold">Регистрация</th>
                    <th className="px-6 py-4 font-semibold">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-800/30 transition">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{user.email}</span>
                          <span className="text-[10px] text-gray-500">{user.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          user.plan === 'pro' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          user.plan === 'studio' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {format(new Date(user.created_at), 'dd MMM yyyy', { locale: ru })}
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleGrantPremium(user.id)}
                          className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition text-xs font-medium"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Grant Pro
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="font-bold flex items-center gap-2 mb-6">
              <ShieldAlert className="w-5 h-5 text-orange-400" />
              Логи действий
            </h2>
            <div className="space-y-6">
              {logs.map((log) => (
                <div key={log.id} className="relative pl-6 border-l-2 border-gray-800">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-gray-800 border-2 border-gray-900" />
                  <p className="text-xs text-gray-500 mb-1">
                    {format(new Date(log.created_at), 'HH:mm • dd MMM', { locale: ru })}
                  </p>
                  <p className="text-sm">
                    <span className="text-blue-400 font-medium">{log.profiles?.email}</span>
                    {" "}{log.action === 'grant_premium_manual' ? 'выдал PREMIUM' : log.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
