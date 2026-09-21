import React, { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  onSnapshot, 
  query, 
  setDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp, 
  where,
  getDocs
} from "firebase/firestore";
import { 
  UserCheck, 
  ShieldCheck, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Key, 
  Lock, 
  Unlock, 
  Check, 
  X, 
  Shield, 
  Eye, 
  EyeOff, 
  UserPlus, 
  Users, 
  AlertCircle, 
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { AppAccount, UserRole, UserPermissions } from "../types";
import { 
  ALL_TABS, 
  ROLE_PRESETS, 
  DEFAULT_SUPERADMIN_PERMISSIONS, 
  INITIAL_BOOTSTRAP_ACCOUNTS 
} from "../lib/permissions";

export default function UserManagementPanel() {
  const { user: currentUser, isDirectAccessMode, setDirectAccessMode } = useAuth();
  const { addToast } = useToast();

  const [accounts, setAccounts] = useState<AppAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isCleaning, setIsCleaning] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    username: string;
    password: string;
    displayName: string;
    role: UserRole;
    permissions: UserPermissions;
    isActive: boolean;
    notes: string;
  }>({
    username: "",
    password: "",
    displayName: "",
    role: "pengurus",
    permissions: { ...ROLE_PRESETS.pengurus.permissions },
    isActive: true,
    notes: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmAccount, setDeleteConfirmAccount] = useState<AppAccount | null>(null);

  // 1. Subscribe to app_users
  useEffect(() => {
    setIsLoading(true);
    const q = query(
      collection(db, "app_users"),
      where("tenantId", "==", "gpstiaa")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: AppAccount[] = [];
      snapshot.forEach((docSnap) => {
        docs.push({ id: docSnap.id, ...docSnap.data() } as AppAccount);
      });
      // Sort in-memory: superadmin first, then by username
      docs.sort((a, b) => {
        if (a.role === 'superadmin' && b.role !== 'superadmin') return -1;
        if (b.role === 'superadmin' && a.role !== 'superadmin') return 1;
        return a.username.localeCompare(b.username);
      });
      setAccounts(docs);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "app_users");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Initialize default accounts if collection is empty
  const handleBootstrapAccounts = async () => {
    try {
      setIsSaving(true);
      for (const acc of INITIAL_BOOTSTRAP_ACCOUNTS) {
        const docRef = doc(collection(db, "app_users"));
        await setDoc(docRef, {
          ...acc,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      addToast("Akun bawaan sistem berhasil diinisialisasi!", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "app_users");
      addToast("Gagal menginisialisasi akun bawaan", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      username: "",
      password: "",
      displayName: "",
      role: "pengurus",
      permissions: { ...ROLE_PRESETS.pengurus.permissions },
      isActive: true,
      notes: ""
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (account: AppAccount) => {
    setIsEditing(true);
    setEditingId(account.id || null);
    setFormData({
      username: account.username,
      password: "", // Leave blank if not changing
      displayName: account.displayName || account.username,
      role: account.role || "custom",
      permissions: account.permissions || { ...DEFAULT_SUPERADMIN_PERMISSIONS },
      isActive: account.isActive !== false,
      notes: account.notes || ""
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Handle Role Selection (Auto updates permissions preset)
  const handleRoleChange = (newRole: UserRole) => {
    if (newRole !== 'custom') {
      const preset = ROLE_PRESETS[newRole];
      setFormData(prev => ({
        ...prev,
        role: newRole,
        permissions: { ...preset.permissions }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        role: 'custom'
      }));
    }
  };

  // Toggle Allowed Tab
  const toggleAllowedTab = (tabId: string) => {
    setFormData(prev => {
      const currentTabs = prev.permissions.allowedTabs || [];
      const hasTab = currentTabs.includes(tabId);
      const newTabs = hasTab ? currentTabs.filter(t => t !== tabId) : [...currentTabs, tabId];
      return {
        ...prev,
        role: 'custom',
        permissions: {
          ...prev.permissions,
          allowedTabs: newTabs
        }
      };
    });
  };

  // Toggle Action Permission
  const toggleActionPermission = (permKey: keyof Omit<UserPermissions, 'allowedTabs'>) => {
    setFormData(prev => ({
      ...prev,
      role: 'custom',
      permissions: {
        ...prev.permissions,
        [permKey]: !prev.permissions[permKey]
      }
    }));
  };

  // Quick Select/Deselect All Tabs
  const setAllTabs = (select: boolean) => {
    setFormData(prev => ({
      ...prev,
      role: 'custom',
      permissions: {
        ...prev.permissions,
        allowedTabs: select ? ALL_TABS.map(t => t.id) : ['overview']
      }
    }));
  };

  // Submit Form (Create / Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = formData.username.trim().toLowerCase().replace(/\s+/g, "");
    
    if (!cleanUsername) {
      addToast("Username tidak boleh kosong", "error");
      return;
    }
    if (!isEditing && !formData.password.trim()) {
      addToast("Password wajib diisi untuk akun baru", "error");
      return;
    }
    if (!formData.displayName.trim()) {
      addToast("Nama lengkap pengguna wajib diisi", "error");
      return;
    }

    // Check duplicate username if adding or changing
    const duplicate = accounts.find(a => 
      a.username.toLowerCase() === cleanUsername && a.id !== editingId
    );
    if (duplicate) {
      addToast(`Username "${cleanUsername}" sudah digunakan oleh akun lain`, "error");
      return;
    }

    try {
      setIsSaving(true);
      if (isEditing && editingId) {
        const updatePayload: any = {
          username: cleanUsername,
          displayName: formData.displayName.trim(),
          role: formData.role,
          permissions: formData.permissions,
          isActive: formData.isActive,
          notes: formData.notes.trim(),
          updatedAt: serverTimestamp()
        };
        if (formData.password.trim()) {
          updatePayload.password = formData.password.trim();
        }
        await setDoc(doc(db, "app_users", editingId), updatePayload, { merge: true });
        addToast(`Akun "${cleanUsername}" berhasil diperbarui!`, "success");
      } else {
        const newDocRef = doc(collection(db, "app_users"));
        await setDoc(newDocRef, {
          username: cleanUsername,
          password: formData.password.trim(),
          displayName: formData.displayName.trim(),
          role: formData.role,
          permissions: formData.permissions,
          isActive: formData.isActive,
          notes: formData.notes.trim(),
          tenantId: "gpstiaa",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        addToast(`Akun baru "${cleanUsername}" berhasil ditambahkan!`, "success");
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, "app_users");
      addToast("Gagal menyimpan akun pengguna", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (account: AppAccount) => {
    if (account.username === 'gpsttiaa') {
      addToast("Akun Administrator Utama tidak boleh dinonaktifkan", "error");
      return;
    }
    try {
      if (!account.id) return;
      const nextState = !account.isActive;
      await setDoc(doc(db, "app_users", account.id), {
        isActive: nextState,
        updatedAt: serverTimestamp()
      }, { merge: true });
      addToast(`Akun ${account.username} ${nextState ? 'diaktifkan' : 'dinonaktifkan'}`, "info");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "app_users");
      addToast("Gagal mengubah status akun", "error");
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    if (!deleteConfirmAccount || !deleteConfirmAccount.id) return;
    if (deleteConfirmAccount.username === 'gpsttiaa') {
      addToast("Akun Administrator Pusat tidak dapat dihapus", "error");
      setDeleteConfirmAccount(null);
      return;
    }
    try {
      await deleteDoc(doc(db, "app_users", deleteConfirmAccount.id));
      addToast(`Akun ${deleteConfirmAccount.username} berhasil dihapus`, "success");
      setDeleteConfirmAccount(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "app_users");
      addToast("Gagal menghapus akun", "error");
    }
  };

  // Bersihkan akun demo / pengurus lama
  const handleCleanDemoAccounts = async () => {
    setIsCleaning(true);
    try {
      const demoUsernames = ['fajrur', 'anabk', 'bem', 'demo', 'test'];
      let count = 0;
      for (const acc of accounts) {
        if (acc.id && demoUsernames.includes(acc.username.toLowerCase())) {
          await deleteDoc(doc(db, "app_users", acc.id));
          count++;
        }
      }
      if (count > 0) {
        addToast(`${count} akun demo/lama berhasil dihapus permanen`, "success");
      } else {
        addToast("Tidak ada akun demo yang terdeteksi di database", "info");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "app_users");
      addToast("Gagal membersihkan akun demo", "error");
    } finally {
      setIsCleaning(false);
    }
  };

  // Hapus semua akun dan aktifkan Mode Akses Langsung (Tanpa Akun)
  const handlePurgeAllAccounts = async () => {
    if (!window.confirm("PENTING: Apakah Anda ingin MENGHAPUS SEMUA AKUN dan mengaktifkan Mode Akses Langsung (Tanpa Akun)? Semua orang akan langsung masuk ke Dashboard tanpa login.")) {
      return;
    }
    setIsCleaning(true);
    try {
      for (const acc of accounts) {
        if (acc.id) {
          await deleteDoc(doc(db, "app_users", acc.id));
        }
      }
      setDirectAccessMode(true);
      addToast("Semua akun dihapus! Mode Akses Langsung (Tanpa Akun) diberlakukan.", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "app_users");
      addToast("Gagal menghapus akun", "error");
    } finally {
      setIsCleaning(false);
    }
  };

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const matchSearch = 
        acc.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (acc.displayName && acc.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (acc.notes && acc.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchRole = roleFilter === 'ALL' || acc.role === roleFilter;
      const matchStatus = 
        statusFilter === 'ALL' || 
        (statusFilter === 'ACTIVE' && acc.isActive !== false) ||
        (statusFilter === 'INACTIVE' && acc.isActive === false);
      return matchSearch && matchRole && matchStatus;
    });
  }, [accounts, searchTerm, roleFilter, statusFilter]);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'superadmin':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">👑 Super Admin</span>;
      case 'admin':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">🛡️ Administrator</span>;
      case 'pengurus':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">📋 Pengurus</span>;
      case 'keuangan':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">💰 Bendahara</span>;
      case 'viewer':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">👁️ Viewer</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">⚙️ Kustom</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4" />
            Keamanan & Hak Akses Pengguna
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Manajemen Akun & Batasan Akses
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Tambahkan akun pengguna yang berhak mengakses sistem gereja dan tentukan batas akses modul (Jemaat, Keuangan, Laporan, Statistik) serta hak aksi operasionalnya.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {accounts.some(a => ['fajrur', 'anabk', 'bem', 'demo', 'test'].includes(a.username.toLowerCase())) && (
            <button
              onClick={handleCleanDemoAccounts}
              disabled={isCleaning}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold rounded-xl text-xs transition-all focus:outline-none cursor-pointer"
              title="Hapus akun demo (Fajrur, anabk, BEM) dari database"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Bersihkan Akun Demo
            </button>
          )}

          {accounts.length > 0 && (
            <button
              onClick={handlePurgeAllAccounts}
              disabled={isCleaning}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 font-bold rounded-xl text-xs transition-all focus:outline-none cursor-pointer"
              title="Hapus semua akun dan masuk bebas tanpa login"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus Semua Akun (Mode Bebas)
            </button>
          )}

          {accounts.length === 0 && !isLoading && (
            <button
              onClick={handleBootstrapAccounts}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm transition-all focus:outline-none"
            >
              <RefreshCw className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              Inisialisasi Akun Standar
            </button>
          )}

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-500/20 transition-all focus:outline-none cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Akun Baru
          </button>
        </div>
      </div>

      {/* Quick Role Presets Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(Object.keys(ROLE_PRESETS) as UserRole[]).filter(r => r !== 'custom').map((roleKey) => {
          const preset = ROLE_PRESETS[roleKey];
          const count = accounts.filter(a => a.role === roleKey).length;
          return (
            <div 
              key={roleKey}
              className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{preset.name}</div>
                <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{count} <span className="text-xs font-normal text-slate-400">akun</span></div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                {preset.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari username, nama pengguna..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">Semua Peran</option>
            <option value="superadmin">👑 Super Administrator</option>
            <option value="admin">🛡️ Administrator</option>
            <option value="pengurus">📋 Pengurus</option>
            <option value="keuangan">💰 Bendahara</option>
            <option value="viewer">👁️ Viewer</option>
            <option value="custom">⚙️ Kustom</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Account List Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Memuat data akun pengguna...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Belum Ada Akun Ditemukan</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm ? "Tidak ada akun yang sesuai dengan kata kunci pencarian Anda." : "Inisialisasi akun bawaan atau klik tombol 'Tambah Akun Baru' untuk menambahkan akun pengguna."}
            </p>
            {!searchTerm && accounts.length === 0 && (
              <button
                onClick={handleBootstrapAccounts}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Inisialisasi Akun Standar Sekarang
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="py-3.5 px-4 sm:px-6">Pengguna & Username</th>
                  <th className="py-3.5 px-4">Peran</th>
                  <th className="py-3.5 px-4">Modul yang Diizinkan</th>
                  <th className="py-3.5 px-4">Hak Aksi</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredAccounts.map((account) => {
                  const allowedTabs = account.permissions?.allowedTabs || [];
                  const isCurrent = currentUser?.username === account.username;
                  const isSuperAdmin = account.username === 'gpsttiaa';

                  return (
                    <tr 
                      key={account.id || account.username}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      {/* User Info */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                            account.isActive !== false ? 'bg-blue-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-500'
                          }`}>
                            {account.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {account.displayName || account.username}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-extrabold px-1.5 py-0.5 rounded">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              @{account.username}
                            </div>
                            {account.notes && (
                              <p className="text-[11px] text-slate-400 italic mt-0.5 max-w-xs truncate">
                                {account.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        {getRoleBadge(account.role)}
                      </td>

                      {/* Allowed Modules Badges */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {allowedTabs.length === ALL_TABS.length ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              Semua Modul ({ALL_TABS.length})
                            </span>
                          ) : (
                            <>
                              {allowedTabs.slice(0, 3).map(tabId => {
                                const tabInfo = ALL_TABS.find(t => t.id === tabId);
                                return (
                                  <span key={tabId} className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {tabInfo?.label.split(' ')[0] || tabId}
                                  </span>
                                );
                              })}
                              {allowedTabs.length > 3 && (
                                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  +{allowedTabs.length - 3} lagi
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* Action Permissions Summary */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span 
                            title={account.permissions?.canCreateMember ? "Boleh tambah jemaat" : "Tidak boleh tambah"}
                            className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${account.permissions?.canCreateMember ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'}`}
                          >
                            +Jemaat
                          </span>
                          <span 
                            title={account.permissions?.canEditMember ? "Boleh edit jemaat" : "Tidak boleh edit"}
                            className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${account.permissions?.canEditMember ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'}`}
                          >
                            Edit
                          </span>
                          <span 
                            title={account.permissions?.canDeleteMember ? "Boleh hapus jemaat" : "Tidak boleh hapus"}
                            className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${account.permissions?.canDeleteMember ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'}`}
                          >
                            Hapus
                          </span>
                          <span 
                            title={account.permissions?.canManageFinance ? "Boleh akses keuangan" : "Tidak boleh akses keuangan"}
                            className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${account.permissions?.canManageFinance ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'}`}
                          >
                            Kas
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(account)}
                          disabled={isSuperAdmin}
                          title={isSuperAdmin ? "Akun master tidak dapat dinonaktifkan" : (account.isActive !== false ? "Klik untuk nonaktifkan" : "Klik untuk aktifkan")}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                            account.isActive !== false 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 hover:opacity-80' 
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 hover:opacity-80'
                          } ${isSuperAdmin ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                        >
                          {account.isActive !== false ? (
                            <><CheckCircle2 className="w-3.5 h-3.5" /> Aktif</>
                          ) : (
                            <><XCircle className="w-3.5 h-3.5" /> Nonaktif</>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(account)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Ubah Hak Akses & Akun"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          {!isSuperAdmin && (
                            <button
                              onClick={() => setDeleteConfirmAccount(account)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Hapus Akun"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Tambah / Edit Akun */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  {isEditing ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {isEditing ? `Ubah Akun: @${formData.username}` : "Tambah Akun Pengguna Baru"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Konfigurasikan informasi login dan batasan akses modul
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* Bagian 1: Kredensial & Info Pengguna */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-1">
                  1. Informasi Akun & Kredensial Login
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                      placeholder="contoh: bendahara_jemaat"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Gunakan huruf kecil tanpa spasi.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Password {isEditing ? <span className="text-slate-400 font-normal">(Kosongkan jika tidak diubah)</span> : <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required={!isEditing}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder={isEditing ? "••••••••" : "Masukkan password aman"}
                        className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nama Lengkap / Jabatan <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="contoh: Ibu Maria - Bendahara"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Catatan Tambahan (Opsional)
                    </label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="contoh: Masa tugas periode 2025-2027"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActiveCheck" className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Akun ini aktif dan diizinkan masuk ke aplikasi
                  </label>
                </div>
              </div>

              {/* Bagian 2: Pilihan Template Peran */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    2. Pilihan Template Peran
                  </h4>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    Pilih preset untuk mengisi batasan otomatis
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(Object.keys(ROLE_PRESETS) as UserRole[]).map((rKey) => {
                    const preset = ROLE_PRESETS[rKey];
                    const isSelected = formData.role === rKey;
                    return (
                      <button
                        key={rKey}
                        type="button"
                        onClick={() => handleRoleChange(rKey)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected 
                            ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-900/30 text-blue-950 dark:text-blue-200 shadow-sm ring-1 ring-blue-500' 
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>{preset.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {preset.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bagian 3: Batasan Akses Modul / Tab */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    3. Batasan Akses Modul & Halaman ({(formData.permissions.allowedTabs || []).length} / {ALL_TABS.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAllTabs(true)}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setAllTabs(false)}
                      className="text-[11px] text-slate-500 hover:underline font-medium"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-100 dark:border-slate-700 rounded-xl">
                  {ALL_TABS.map((tab) => {
                    const isChecked = (formData.permissions.allowedTabs || []).includes(tab.id);
                    return (
                      <label
                        key={tab.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isChecked 
                            ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/80 text-slate-900 dark:text-white' 
                            : 'bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-700/60 text-slate-500 opacity-70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAllowedTab(tab.id)}
                          className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-tight">{tab.label}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{tab.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Bagian 4: Batasan Izin Aksi */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-1">
                  4. Batasan Izin Aksi & Operasional
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canCreateMember}
                      onChange={() => toggleActionPermission('canCreateMember')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Boleh Menambah Data Jemaat Baru
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canEditMember}
                      onChange={() => toggleActionPermission('canEditMember')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Boleh Mengubah / Edit Data Jemaat
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canDeleteMember}
                      onChange={() => toggleActionPermission('canDeleteMember')}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-red-700 dark:text-red-400">
                      Boleh Menghapus Data Jemaat
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canViewMemberProfile}
                      onChange={() => toggleActionPermission('canViewMemberProfile')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Boleh Melihat Detail Profil Jemaat
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canManageFinance}
                      onChange={() => toggleActionPermission('canManageFinance')}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                    />
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Boleh Menginput & Mengubah Keuangan Kas
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canExportData}
                      onChange={() => toggleActionPermission('canExportData')}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Boleh Ekspor Data ke Excel & PDF
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canImportData}
                      onChange={() => toggleActionPermission('canImportData')}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Boleh Impor Data (CSV / Excel Massal)
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canManageUsers}
                      onChange={() => toggleActionPermission('canManageUsers')}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-purple-700 dark:text-purple-400">
                      Boleh Menambah & Mengatur Akun Pengguna
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : (isEditing ? "Simpan Perubahan" : "Buat Akun Baru")}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Akun */}
      {deleteConfirmAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Hapus Akun Pengguna?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Apakah Anda yakin ingin menghapus akun <span className="font-bold text-slate-800 dark:text-slate-200">@{deleteConfirmAccount.username}</span> ({deleteConfirmAccount.displayName})? Pengguna tidak akan dapat mengakses aplikasi lagi.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmAccount(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-all"
              >
                Ya, Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
