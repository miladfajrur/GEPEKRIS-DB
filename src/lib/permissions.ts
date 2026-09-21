import { AuthUser, UserPermissions, UserRole, AppAccount } from "../types";

export const ALL_TABS = [
  { id: 'overview', label: 'Dashboard Utama', category: 'Utama', desc: 'Ringkasan data, grafik jemaat dan statistik umum' },
  { id: 'members', label: 'Data Anggota Jemaat', category: 'Jemaat', desc: 'Daftar buku induk jemaat, cari, tambah, ubah, dan hapus' },
  { id: 'birthdays', label: 'Ulang Tahun Anggota', category: 'Jemaat', desc: 'Jadwal hari ulang tahun jemaat mingguan dan bulanan' },
  { id: 'reports_umum', label: 'Kebaktian Umum', category: 'Ibadah', desc: 'Laporan kehadiran & persembahan Ibadah Raya Umum' },
  { id: 'reports_remaja', label: 'Kebaktian Remaja', category: 'Ibadah', desc: 'Laporan kehadiran & persembahan Ibadah Remaja/Pemuda' },
  { id: 'reports_anak', label: 'Kebaktian Anak (Sekolah Minggu)', category: 'Ibadah', desc: 'Laporan kehadiran & persembahan Sekolah Minggu' },
  { id: 'reports', label: 'Ringkasan Terpadu', category: 'Ibadah', desc: 'Kompilasi ringkasan statistik semua kategori kebaktian' },
  { id: 'finance', label: 'Manajemen Keuangan', category: 'Keuangan', desc: 'Buku kas, transaksi penerimaan, pengeluaran & neraca' },
  { id: 'map', label: 'Pemetaan Jemaat', category: 'Jemaat', desc: 'Peta sebaran wilayah domisili dan alamat jemaat' },
  { id: 'stats', label: 'Statistik Jemaat', category: 'Jemaat', desc: 'Diagram demografi usia, jenis kelamin, dan statistik' },
  { id: 'worship', label: 'Tema Ibadah', category: 'Ibadah', desc: 'Jadwal tema firman, liturgi, dan pengkhotbah' },
  { id: 'users', label: 'Manajemen Akun & Akses', category: 'Pengaturan', desc: 'Kelola akun pengguna, reset password, dan batasan hak akses' },
  { id: 'settings', label: 'Pengaturan Sistem', category: 'Pengaturan', desc: 'Pengaturan data gereja, kuota database, dan preferensi sistem' }
] as const;

export const DEFAULT_SUPERADMIN_PERMISSIONS: UserPermissions = {
  allowedTabs: ALL_TABS.map(t => t.id),
  canCreateMember: true,
  canEditMember: true,
  canDeleteMember: true,
  canViewMemberProfile: true,
  canManageFinance: true,
  canManageUsers: true,
  canExportData: true,
  canImportData: true,
};

export const ROLE_PRESETS: Record<UserRole, { name: string; description: string; permissions: UserPermissions }> = {
  superadmin: {
    name: 'Super Administrator',
    description: 'Akses penuh tanpa batas ke seluruh modul, keuangan, dan manajemen akun pengguna',
    permissions: {
      allowedTabs: ALL_TABS.map(t => t.id),
      canCreateMember: true,
      canEditMember: true,
      canDeleteMember: true,
      canViewMemberProfile: true,
      canManageFinance: true,
      canManageUsers: true,
      canExportData: true,
      canImportData: true,
    }
  },
  admin: {
    name: 'Administrator',
    description: 'Akses penuh ke data jemaat, laporan ibadah, dan pengaturan sistem tanpa manajemen akun sensitif',
    permissions: {
      allowedTabs: ['overview', 'members', 'birthdays', 'reports_umum', 'reports_remaja', 'reports_anak', 'reports', 'map', 'stats', 'worship', 'settings'],
      canCreateMember: true,
      canEditMember: true,
      canDeleteMember: true,
      canViewMemberProfile: true,
      canManageFinance: false,
      canManageUsers: false,
      canExportData: true,
      canImportData: true,
    }
  },
  pengurus: {
    name: 'Pengurus / Majelis Jemaat',
    description: 'Akses operasional jemaat, tema ibadah, laporan kebaktian, dan data ulang tahun',
    permissions: {
      allowedTabs: ['overview', 'members', 'birthdays', 'reports_umum', 'reports_remaja', 'reports_anak', 'reports', 'map', 'stats', 'worship'],
      canCreateMember: true,
      canEditMember: true,
      canDeleteMember: false,
      canViewMemberProfile: true,
      canManageFinance: false,
      canManageUsers: false,
      canExportData: true,
      canImportData: false,
    }
  },
  keuangan: {
    name: 'Bendahara / Keuangan',
    description: 'Akses khusus manajemen kas keuangan, persembahan kebaktian, dan ekspor laporan keuangan',
    permissions: {
      allowedTabs: ['overview', 'finance', 'reports', 'reports_umum', 'reports_remaja', 'reports_anak'],
      canCreateMember: false,
      canEditMember: false,
      canDeleteMember: false,
      canViewMemberProfile: false,
      canManageFinance: true,
      canManageUsers: false,
      canExportData: true,
      canImportData: false,
    }
  },
  viewer: {
    name: 'Petugas / Pembaca Data (Viewer)',
    description: 'Hanya dapat melihat data jemaat, ulang tahun, dan jadwal ibadah tanpa hak mengubah',
    permissions: {
      allowedTabs: ['overview', 'members', 'birthdays', 'worship', 'stats'],
      canCreateMember: false,
      canEditMember: false,
      canDeleteMember: false,
      canViewMemberProfile: true,
      canManageFinance: false,
      canManageUsers: false,
      canExportData: false,
      canImportData: false,
    }
  },
  custom: {
    name: 'Kustom (Atur Manual)',
    description: 'Konfigurasi batasan modul dan hak aksi secara terperinci sesuai kebutuhan',
    permissions: {
      allowedTabs: ['overview', 'members', 'birthdays'],
      canCreateMember: false,
      canEditMember: false,
      canDeleteMember: false,
      canViewMemberProfile: true,
      canManageFinance: false,
      canManageUsers: false,
      canExportData: false,
      canImportData: false,
    }
  }
};

export function hasTabAccess(user: AuthUser | null, tabId: string): boolean {
  if (!user) return false;
  // Superadmin username bypass
  if (user.username === 'gpsttiaa' || user.role === 'superadmin') return true;
  if (!user.permissions || !user.permissions.allowedTabs) {
    // Default fallback for legacy accounts
    if (user.username === 'admin') return true;
    if (user.username === 'fajrur' || user.username === 'anabk') {
      return tabId !== 'finance' && tabId !== 'users';
    }
    if (user.username === 'BEM') {
      return tabId !== 'finance' && tabId !== 'users';
    }
    return tabId === 'overview' || tabId === 'members';
  }
  return user.permissions.allowedTabs.includes(tabId);
}

export function hasPermission(
  user: AuthUser | null,
  permissionKey: keyof Omit<UserPermissions, 'allowedTabs'>
): boolean {
  if (!user) return false;
  if (user.username === 'gpsttiaa' || user.role === 'superadmin') return true;
  if (!user.permissions) {
    if (user.username === 'admin') return true;
    if (permissionKey === 'canManageUsers' || permissionKey === 'canManageFinance') return false;
    if (permissionKey === 'canDeleteMember') return user.username === 'admin';
    return true;
  }
  return !!user.permissions[permissionKey];
}

// Initial bootstrap accounts for administrator access
export const INITIAL_BOOTSTRAP_ACCOUNTS: Omit<AppAccount, 'id'>[] = [
  {
    username: 'gpsttiaa',
    password: 'password123',
    displayName: 'Administrator GEPEKRIS TRETES',
    role: 'superadmin',
    permissions: DEFAULT_SUPERADMIN_PERMISSIONS,
    isActive: true,
    notes: 'Akun Administrator Pusat (Akses Penuh)',
    tenantId: 'gpstiaa'
  }
];
