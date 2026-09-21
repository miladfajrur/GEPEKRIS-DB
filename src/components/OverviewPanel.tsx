import React, { useMemo } from 'react';
import { 
  Users, Gift, UserCheck, MapPin, PieChart, BookOpen, Settings, 
  ArrowRight, Church, Sparkles, Layers, Wallet, ChevronRight, LayoutGrid, ShieldCheck 
} from 'lucide-react';
import { Member } from '../types';
import { getDirectDriveLink } from '../lib/utils';
import { hasTabAccess } from '../lib/permissions';

interface OverviewPanelProps {
  members: Member[];
  onNavigate: (tabId: string) => void;
  user: any;
}

export default function OverviewPanel({ members, onNavigate, user }: OverviewPanelProps) {
  const activeMembers = useMemo(() => members.filter(m => !m.tanggal_keluar).length, [members]);
  const totalMembers = members.length;

  // Let's get nearest birthdays list (in 7 days)
  const { birthdaysToday, birthdaysThisWeek } = useMemo(() => {
    const todayList: Member[] = [];
    const thisWeekList: Member[] = [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Sort all relevant members by birthday
    const upcoming = members.filter(m => {
      if (!m.tanggal_lahir || m.tanggal_keluar) return false;
      const bDate = new Date(m.tanggal_lahir);
      if (isNaN(bDate.getTime())) return false;
      return true;
    }).map(m => {
      const bDate = new Date(m.tanggal_lahir!);
      let currentAge = today.getFullYear() - bDate.getFullYear();
      let nextBday = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
      if (nextBday.getTime() < today.getTime()) {
        nextBday.setFullYear(today.getFullYear() + 1);
        currentAge++; // they will turn this age next year
      }
      return { member: m, nextBday, currentAge };
    });

    upcoming.sort((a, b) => a.nextBday.getTime() - b.nextBday.getTime());

    upcoming.forEach(({ member, nextBday, currentAge }) => {
      if (nextBday.getTime() === today.getTime()) {
        todayList.push({ ...member, _tempAge: currentAge } as any); // attach age briefly
      } else if (nextBday.getTime() > today.getTime() && nextBday.getTime() <= nextWeek.getTime()) {
        thisWeekList.push({ ...member, _tempAge: currentAge } as any);
      }
    });

    return { birthdaysToday: todayList, birthdaysThisWeek: thisWeekList };
  }, [members]);

  const validationIssuesCount = useMemo(() => {
    let issues = 0;
    const nomorMap = new Map<string, number>();
    members.forEach(m => {
      const num = m.nomor_anggota?.toLowerCase().trim();
      if (num) {
        nomorMap.set(num, (nomorMap.get(num) || 0) + 1);
      }
    });

    members.forEach(m => {
      const num = m.nomor_anggota?.toLowerCase().trim();
      if (num && nomorMap.get(num)! > 1) issues++;
      else if (!m.nomor_anggota || m.nomor_anggota.trim() === '') issues++;
      else if (!m.nama_lengkap || m.nama_lengkap.trim() === '') issues++;
      else if (!m.tanggal_lahir || m.tanggal_lahir.trim() === '') issues++;
      // check format
      else if (m.tanggal_lahir.split('-').length !== 3) issues++;
      else if (!m.jenis_kelamin || (m.jenis_kelamin !== 'Pria' && m.jenis_kelamin !== 'Wanita')) issues++;
    });
    return issues;
  }, [members]);

  const nearestBirthdays = birthdaysToday.length + birthdaysThisWeek.length;

  const stats = [
    { label: 'Total Jemaat Aktif', value: activeMembers, total: totalMembers },
    { label: 'Ulang Tahun Terdekat', value: nearestBirthdays, badge: nearestBirthdays > 0 ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500' },
    { label: 'Isu Data Terdeteksi', value: validationIssuesCount, badge: validationIssuesCount > 0 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' }
  ];

  const menuItems = [
    { 
      id: 'members', 
      label: 'Data Anggota Jemaat', 
      tag: 'Buku Induk',
      icon: <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />, 
      desc: 'Kelola database anggota jemaat, cetak kartu jemaat, tambah, sunting, dan cari data.', 
      bgClass: 'hover:border-blue-400 dark:hover:border-blue-500 bg-gradient-to-b from-blue-50/70 to-white dark:from-blue-950/20 dark:to-slate-800 border-blue-200/80 dark:border-blue-900/60',
      btnClass: 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
    },
    { 
      id: 'reports', 
      label: 'Ringkasan Kebaktian Terpadu', 
      tag: 'Semua Ibadah',
      icon: <Layers className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />, 
      desc: 'Pantau laporan gabungan kehadiran jemaat & rekap total persembahan seluruh ibadah.', 
      bgClass: 'hover:border-indigo-400 dark:hover:border-indigo-500 bg-gradient-to-b from-indigo-50/70 to-white dark:from-indigo-950/20 dark:to-slate-800 border-indigo-200/80 dark:border-indigo-900/60',
      btnClass: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'
    },
    { 
      id: 'reports_umum', 
      label: 'Kebaktian Umum', 
      tag: 'Ibadah Raya',
      icon: <Church className="w-7 h-7 text-sky-600 dark:text-sky-400" />, 
      desc: 'Data kehadiran jemaat dewasa, persembahan umum, dan perpuluhan ibadah minggu.', 
      bgClass: 'hover:border-sky-400 dark:hover:border-sky-500 bg-gradient-to-b from-sky-50/70 to-white dark:from-sky-950/20 dark:to-slate-800 border-sky-200/80 dark:border-sky-900/60',
      btnClass: 'bg-sky-600 text-white hover:bg-sky-700 shadow-sky-500/20'
    },
    { 
      id: 'reports_remaja', 
      label: 'Kebaktian Remaja & Pemuda', 
      tag: 'Komisi Pemuda',
      icon: <Users className="w-7 h-7 text-purple-600 dark:text-purple-400" />, 
      desc: 'Laporan kehadiran pemuda/remaja dan persembahan kebaktian komisi remaja.', 
      bgClass: 'hover:border-purple-400 dark:hover:border-purple-500 bg-gradient-to-b from-purple-50/70 to-white dark:from-purple-950/20 dark:to-slate-800 border-purple-200/80 dark:border-purple-900/60',
      btnClass: 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/20'
    },
    { 
      id: 'reports_anak', 
      label: 'Kebaktian Anak (Sekolah Minggu)', 
      tag: 'Sekolah Minggu',
      icon: <Sparkles className="w-7 h-7 text-amber-600 dark:text-amber-400" />, 
      desc: 'Laporan kehadiran anak-anak dan pencatatan persembahan kebaktian sekolah minggu.', 
      bgClass: 'hover:border-amber-400 dark:hover:border-amber-500 bg-gradient-to-b from-amber-50/70 to-white dark:from-amber-950/20 dark:to-slate-800 border-amber-200/80 dark:border-amber-900/60',
      btnClass: 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-500/20'
    },
    { 
      id: 'finance', 
      label: 'Manajemen Keuangan Kas', 
      tag: 'Buku Kas',
      icon: <Wallet className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />, 
      desc: 'Buku kas penerimaan, pengeluaran operasional, rincian saldo, dan ekspor keuangan.', 
      bgClass: 'hover:border-emerald-400 dark:hover:border-emerald-500 bg-gradient-to-b from-emerald-50/70 to-white dark:from-emerald-950/20 dark:to-slate-800 border-emerald-200/80 dark:border-emerald-900/60',
      btnClass: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
    },
    { 
      id: 'birthdays', 
      label: 'Jadwal Ulang Tahun Jemaat', 
      tag: 'Kalender HUT',
      icon: <Gift className="w-7 h-7 text-rose-600 dark:text-rose-400" />, 
      desc: 'Daftar jemaat yang berulang tahun minggu ini, bulan ini, serta kartu ucapan HUT.', 
      bgClass: 'hover:border-rose-400 dark:hover:border-rose-500 bg-gradient-to-b from-rose-50/70 to-white dark:from-rose-950/20 dark:to-slate-800 border-rose-200/80 dark:border-rose-900/60',
      btnClass: 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20'
    },
    { 
      id: 'stats', 
      label: 'Statistik & Demografi Jemaat', 
      tag: 'Visual Grafik',
      icon: <PieChart className="w-7 h-7 text-violet-600 dark:text-violet-400" />, 
      desc: 'Analisis demografi jemaat berdasarkan kelompok usia, jenis kelamin, dan pekerjaan.', 
      bgClass: 'hover:border-violet-400 dark:hover:border-violet-500 bg-gradient-to-b from-violet-50/70 to-white dark:from-violet-950/20 dark:to-slate-800 border-violet-200/80 dark:border-violet-900/60',
      btnClass: 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-500/20'
    },
    { 
      id: 'map', 
      label: 'Pemetaan Wilayah Jemaat', 
      tag: 'Peta & Rayon',
      icon: <MapPin className="w-7 h-7 text-teal-600 dark:text-teal-400" />, 
      desc: 'Peta persebaran domisili jemaat, per rayon wilayah, dan daftar alamat jemaat.', 
      bgClass: 'hover:border-teal-400 dark:hover:border-teal-500 bg-gradient-to-b from-teal-50/70 to-white dark:from-teal-950/20 dark:to-slate-800 border-teal-200/80 dark:border-teal-900/60',
      btnClass: 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-500/20'
    },
    { 
      id: 'worship', 
      label: 'Jadwal & Tema Ibadah', 
      tag: 'Liturgi',
      icon: <BookOpen className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />, 
      desc: 'Rencana tema firman, petugas pelayan ibadah, liturgis, dan pengkhotbah.', 
      bgClass: 'hover:border-cyan-400 dark:hover:border-cyan-500 bg-gradient-to-b from-cyan-50/70 to-white dark:from-cyan-950/20 dark:to-slate-800 border-cyan-200/80 dark:border-cyan-900/60',
      btnClass: 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-cyan-500/20'
    },
    { 
      id: 'users', 
      label: 'Manajemen Akun & Hak Akses', 
      tag: 'Keamanan',
      icon: <ShieldCheck className="w-7 h-7 text-purple-600 dark:text-purple-400" />, 
      desc: 'Kelola akun siapa saja yang dapat mengakses sistem beserta batasan hak akses modulnya.', 
      bgClass: 'hover:border-purple-400 dark:hover:border-purple-500 bg-gradient-to-b from-purple-50/70 to-white dark:from-purple-950/20 dark:to-slate-800 border-purple-200/80 dark:border-purple-900/60',
      btnClass: 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/20'
    },
    { 
      id: 'settings', 
      label: 'Pengaturan & Akun', 
      tag: 'Konfigurasi',
      icon: <Settings className="w-7 h-7 text-slate-600 dark:text-slate-400" />, 
      desc: 'Pengaturan pengguna, hak akses, kuota database, dan backup pemulihan data.', 
      bgClass: 'hover:border-slate-400 dark:hover:border-slate-500 bg-gradient-to-b from-slate-100/70 to-white dark:from-slate-800/80 dark:to-slate-850 border-slate-200 dark:border-slate-700',
      btnClass: 'bg-slate-700 text-white hover:bg-slate-800 shadow-slate-500/20'
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/20 w-full min-h-0">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Top Welcome Card */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Selamat Datang, {user?.displayName || (user?.username === 'anabk' ? 'Pengurus Jemaat' : (user?.username === 'fajrur' ? 'Fajrur' : (user?.username === 'BEM' ? 'Pengurus' : (user?.username === 'gpsttiaa' ? 'Administrator Pusat' : user?.username || 'Administrator'))))}! 👋
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-medium">
              Sistem Informasi Manajemen & Laporan Terpadu GEPEKRIS TRETES.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {stats.map((stat, i) => (
              <div key={i} className="flex-1 md:flex-none px-4 py-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700 shrink-0 min-w-[120px]">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{stat.label}</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className={`text-xl sm:text-2xl font-black ${stat.badge ? 'px-2 py-0.5 rounded-lg text-sm font-bold ' + stat.badge : 'text-slate-900 dark:text-slate-100'}`}>
                    {stat.value}
                  </span>
                  {stat.total !== undefined && (
                    <span className="text-xs font-semibold text-slate-400">/ {stat.total}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Birthday Banner Section */}
        {(birthdaysToday.length > 0 || birthdaysThisWeek.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            {birthdaysToday.length > 0 && (
              <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-900/20 dark:to-orange-900/10 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Gift className="w-28 h-28 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md">
                        <Gift className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-rose-950 dark:text-rose-100">Ulang Tahun Hari Ini</h2>
                        <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300 font-semibold">{birthdaysToday.length} Jemaat merayakan HUT hari ini</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onNavigate('birthdays')}
                      className="text-xs font-bold px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 shadow-sm transition-colors cursor-pointer"
                    >
                      Lihat Semua
                    </button>
                  </div>
                  <div className="space-y-3 mt-4">
                    {birthdaysToday.map((m: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 bg-white dark:bg-slate-900/60 p-3.5 rounded-xl border border-rose-200/80 dark:border-rose-800/40 shadow-xs">
                        {m.foto_url ? (
                          <img src={getDirectDriveLink(m.foto_url)} alt={m.nama_lengkap} className="w-12 h-12 rounded-xl object-cover shadow-sm bg-white shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-700 dark:text-rose-300 font-black text-lg shadow-xs shrink-0">
                            {m.nama_lengkap?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-base truncate">{m.nama_lengkap}</p>
                          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-0.5">Ulang tahun ke-{m._tempAge} tahun 🎉</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {birthdaysThisWeek.length > 0 && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                      <Gift className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">Ulang Tahun Minggu Ini</h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">Dalam 7 hari ke depan ({birthdaysThisWeek.length} Jemaat)</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onNavigate('birthdays')}
                    className="text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 shadow-sm transition-colors cursor-pointer"
                  >
                    Lihat Semua
                  </button>
                </div>
                <div className="space-y-2.5 mt-2 max-h-[280px] overflow-y-auto pr-1.5 custom-scrollbar">
                  {birthdaysThisWeek.map((m: any, i: number) => {
                    const bDate = new Date(m.tanggal_lahir);
                    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                    const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
                    
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const nextBday = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
                    if (nextBday.getTime() < today.getTime()) {
                      nextBday.setFullYear(today.getFullYear() + 1);
                    }
                    
                    const dateStr = `${hari[nextBday.getDay()]}, ${bDate.getDate()} ${bulan[bDate.getMonth()]}`;
                    
                    return (
                      <div key={i} className="flex items-center gap-3.5 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/80">
                        {m.foto_url ? (
                          <img src={getDirectDriveLink(m.foto_url)} alt={m.nama_lengkap} className="w-10 h-10 rounded-lg object-cover shadow-xs bg-white shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold shadow-xs shrink-0">
                            {m.nama_lengkap?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{m.nama_lengkap}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Ke-{m._tempAge} Tahun • <span className="text-blue-600 dark:text-blue-400 font-semibold">{dateStr}</span></p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Spacious & Wide Quick Access Cards */}
        <div className="space-y-5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                <LayoutGrid className="w-6 h-6 text-blue-600" />
                Menu Akses Cepat & Modul Utama
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Pilih modul gereja di bawah ini untuk membuka data dan formulir terkait
              </p>
            </div>
          </div>

          {/* Wide, High-Breathability 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {menuItems.map((item) => {
              // Hide tabs if the user does not have permission
              if (!hasTabAccess(user, item.id)) return null;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`group text-left p-5 sm:p-6 rounded-2xl border-2 ${item.bgClass} hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-500/20 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative overflow-hidden`}
                >
                  <div className="flex items-start sm:items-center gap-4 sm:gap-5 flex-1 min-w-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center border border-slate-200/80 dark:border-slate-700 shrink-0 group-hover:scale-105 transition-transform">
                      {item.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <h3 className="font-black text-slate-900 dark:text-white text-lg sm:text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {item.label}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs">
                          {item.tag}
                        </span>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/60 shrink-0">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 sm:hidden">Buka Modul</span>
                    <div className={`w-10 h-10 rounded-xl ${item.btnClass} flex items-center justify-center shadow-sm group-hover:translate-x-1 transition-transform`}>
                      <ChevronRight className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

