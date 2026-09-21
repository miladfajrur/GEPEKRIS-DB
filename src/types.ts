export interface Member {
  id?: string;
  nomor_anggota: string;
  nama_lengkap: string;
  jenis_kelamin: "Pria" | "Wanita" | "";
  tempat_lahir: string;
  tanggal_lahir: string;
  alamat_asal: string;
  provinsi?: string;
  no_telp?: string;
  jenis_baptis: string;
  keterangan_baptis: string;
  tanggal_masuk: string;
  tanggal_keluar: string;
  foto_url: string;
  tenantId: string;
  createdAt?: any;
  updatedAt?: any;
}

export type UserRole = 'superadmin' | 'admin' | 'pengurus' | 'keuangan' | 'viewer' | 'custom';

export interface UserPermissions {
  allowedTabs: string[]; // ['overview', 'members', 'birthdays', 'reports_umum', 'reports_remaja', 'reports_anak', 'reports', 'finance', 'map', 'stats', 'worship', 'users', 'settings']
  canCreateMember: boolean;
  canEditMember: boolean;
  canDeleteMember: boolean;
  canViewMemberProfile: boolean;
  canManageFinance: boolean;
  canManageUsers: boolean;
  canExportData: boolean;
  canImportData: boolean;
}

export interface AppAccount {
  id?: string;
  username: string;
  password?: string;
  displayName: string;
  role: UserRole;
  permissions: UserPermissions;
  isActive: boolean;
  notes?: string;
  tenantId: string;
  createdAt?: any;
  updatedAt?: any;
}

export type AuthUser = {
  id?: string;
  username: string;
  displayName?: string;
  role?: UserRole;
  permissions?: UserPermissions;
};

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}


export interface PengeluaranDetail {
  id: string;
  keterangan: string;
  jumlah: number;
  sumber: string;
}

export type WorshipCategory = "Umum" | "Remaja" | "Anak" | "Lainnya";

export interface WeeklyReport {
  id?: string;
  tenantId: string;
  tanggal_ibadah: string;
  nama_ibadah: string;
  kategori_ibadah?: WorshipCategory;
  kehadiran_dewasa: number;
  kehadiran_pemuda: number;
  kehadiran_anak: number;
  persembahan_umum: number;
  persembahan_anak?: number;
  persembahan_remaja?: number;
  perpuluhan: number;
  diakonia: number;
  pemasukan_lainnya: number;
  total_pemasukan?: number;
  pengeluaran: number;
  pengeluaran_details?: PengeluaranDetail[];
  keterangan: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface MediaRepo {
  id?: string;
  tenantId: string;
  title: string;
  category?: string;
  bulan: string; // YYYY-MM
  driveLink: string;
  description: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface DocumentItem {
  id?: string;
  tenantId: string;
  title: string;
  letterNumber?: string;
  sourceOrDest?: string;
  category: "Masuk" | "Keluar";
  date: string;
  driveLink: string;
  description: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface WorshipTheme {
  id?: string;
  tenantId: string;
  type: "Ibadah Umum" | "Sekolah Minggu" | "Pemahaman Alkitab";
  date: string;
  theme: string;
  verse?: string;
  description?: string;
  speaker: string;
  hasHolyCommunion?: boolean;
  liturgyLink?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface MisiRepo {
  id?: string;
  tenantId: string;
  title: string;
  bulan: string; // YYYY-MM
  driveLink: string;
  description: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface MisiFinance {
  id?: string;
  tenantId: string;
  date: string; // YYYY-MM-DD
  type: "Pemasukan" | "Pengeluaran";
  category: string;
  amount: number;
  description: string;
  createdAt?: any;
  updatedAt?: any;
}




export interface FinanceTransaction {
  id?: string;
  tenantId: string;
  date: string; // YYYY-MM-DD
  type: "Pemasukan" | "Pengeluaran";
  category: string;
  amount: number;
  description: string;
  source?: string; // e.g. "Ibadah Umum", "Kas Umum", "Donasi"
  createdAt?: any;
  updatedAt?: any;
}
