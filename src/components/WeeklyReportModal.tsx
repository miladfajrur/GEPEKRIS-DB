import React, { useState, useEffect } from "react";
import { X, Calendar, FileText, Users, ArrowUpRight, Edit3, Trash2, Plus, Church, CheckCircle2 } from "lucide-react";
import { WeeklyReport, WorshipCategory } from "../types";
import DateInputMask from "./DateInputMask";
import { useToast } from "../ToastContext";
import { getWorshipCategory } from "../lib/utils";

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: WeeklyReport;
  defaultCategory?: WorshipCategory;
  onSave: (data: Partial<WeeklyReport>) => Promise<void>;
}

const formatRupiah = (value: number | string) => {
  const numberString = value.toString().replace(/[^,\d]/g, '');
  if (!numberString) return '';
  return new Intl.NumberFormat('id-ID').format(Number(numberString));
};

const parseRupiah = (value: string | number) => {
  if (typeof value === 'number') return value;
  const numberString = value.replace(/[^,\d]/g, '');
  return numberString ? Number(numberString) : 0;
};

export default function WeeklyReportModal({ isOpen, onClose, initialData, defaultCategory = "Umum", onSave }: WeeklyReportModalProps) {
  const { addToast } = useToast();
  const [formData, setFormData] = useState<Partial<WeeklyReport>>({
    tanggal_ibadah: "",
    nama_ibadah: "",
    kategori_ibadah: "Umum",
    kehadiran_dewasa: 0,
    kehadiran_pemuda: 0,
    kehadiran_anak: 0,
    persembahan_umum: 0,
    persembahan_anak: 0,
    persembahan_remaja: 0,
    perpuluhan: 0,
    diakonia: 0,
    pemasukan_lainnya: 0,
    pengeluaran: 0,
    pengeluaran_details: [],
    keterangan: "",
    tenantId: "gpstiaa"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      const category = initialData.kategori_ibadah || getWorshipCategory(initialData);
      setFormData({
        ...initialData,
        kategori_ibadah: category,
      });
    } else {
      const cat = defaultCategory || "Umum";
      let defaultName = "Ibadah Raya Umum";
      if (cat === "Anak") defaultName = "Kebaktian Anak (Sekolah Minggu)";
      else if (cat === "Remaja") defaultName = "Kebaktian Remaja & Pemuda";
      else if (cat === "Lainnya") defaultName = "Pemahaman Alkitab / Ibadah Doa";

      setFormData({
        tanggal_ibadah: new Date().toISOString().split('T')[0],
        nama_ibadah: defaultName,
        kategori_ibadah: cat,
        kehadiran_dewasa: 0,
        kehadiran_pemuda: 0,
        kehadiran_anak: 0,
        persembahan_umum: 0,
        persembahan_anak: 0,
        persembahan_remaja: 0,
        perpuluhan: 0,
        diakonia: 0,
        pemasukan_lainnya: 0,
        pengeluaran: 0,
        pengeluaran_details: [],
        keterangan: "",
        tenantId: "gpstiaa"
      });
    }
  }, [initialData, isOpen, defaultCategory]);

  const currentCategory: WorshipCategory = formData.kategori_ibadah || "Umum";

  const handleCategoryChange = (newCat: WorshipCategory) => {
    let suggestedName = formData.nama_ibadah || "";
    if (!initialData) {
      if (newCat === "Umum") suggestedName = "Ibadah Raya Umum";
      else if (newCat === "Anak") suggestedName = "Kebaktian Anak (Sekolah Minggu)";
      else if (newCat === "Remaja") suggestedName = "Kebaktian Remaja & Pemuda";
      else if (newCat === "Lainnya") suggestedName = "Ibadah Doa / PA";
    }

    setFormData(prev => ({
      ...prev,
      kategori_ibadah: newCat,
      nama_ibadah: suggestedName,
      // If switching to Anak, reset youth
      kehadiran_pemuda: newCat === "Anak" ? 0 : prev.kehadiran_pemuda,
      // If switching to Remaja, reset child
      kehadiran_anak: newCat === "Remaja" ? 0 : prev.kehadiran_anak,
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRupiahChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseRupiah(value) }));
  };

  const addPengeluaranDetail = () => {
    const defaultSumber = currentCategory === "Anak" || currentCategory === "Remaja" 
      ? "Seksi Pemuda / Anak" 
      : "Kas Umum";

    setFormData(prev => ({
      ...prev,
      pengeluaran_details: [
        ...(prev.pengeluaran_details || []),
        { id: Date.now().toString(), keterangan: "", jumlah: 0, sumber: defaultSumber }
      ]
    }));
  };

  const removePengeluaranDetail = (id: string) => {
    setFormData(prev => {
      const newDetails = (prev.pengeluaran_details || []).filter(item => item.id !== id);
      const totalPengeluaran = newDetails.reduce((sum, item) => sum + item.jumlah, 0);
      return { ...prev, pengeluaran_details: newDetails, pengeluaran: totalPengeluaran };
    });
  };

  const handlePengeluaranChange = (id: string, field: "keterangan" | "jumlah" | "sumber", value: string | number) => {
    setFormData(prev => {
      const newDetails = (prev.pengeluaran_details || []).map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      });
      const totalPengeluaran = newDetails.reduce((sum, item) => sum + item.jumlah, 0);
      return { ...prev, pengeluaran_details: newDetails, pengeluaran: totalPengeluaran };
    });
  };

  // Calculate live total pemasukan
  const calculatedTotalPemasukan = () => {
    if (currentCategory === "Anak") {
      const pAnak = Number(formData.persembahan_anak) || Number(formData.persembahan_umum) || 0;
      const pLain = Number(formData.pemasukan_lainnya) || 0;
      return pAnak + pLain;
    }
    if (currentCategory === "Remaja") {
      const pRemaja = Number(formData.persembahan_remaja) || Number(formData.persembahan_umum) || 0;
      const pLain = Number(formData.pemasukan_lainnya) || 0;
      return pRemaja + pLain;
    }
    // Umum / Lainnya
    return (Number(formData.persembahan_umum) || 0) +
      (Number(formData.perpuluhan) || 0) +
      (Number(formData.diakonia) || 0) +
      (Number(formData.pemasukan_lainnya) || 0);
  };

  // Calculate live total kehadiran
  const calculatedTotalKehadiran = () => {
    if (currentCategory === "Anak") {
      return (Number(formData.kehadiran_anak) || 0) + (Number(formData.kehadiran_dewasa) || 0);
    }
    if (currentCategory === "Remaja") {
      return (Number(formData.kehadiran_pemuda) || 0) + (Number(formData.kehadiran_dewasa) || 0);
    }
    return (Number(formData.kehadiran_dewasa) || 0) +
      (Number(formData.kehadiran_pemuda) || 0) +
      (Number(formData.kehadiran_anak) || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const totalPem = calculatedTotalPemasukan();
      
      const payload: Partial<WeeklyReport> = {
        ...formData,
        kategori_ibadah: currentCategory,
        total_pemasukan: totalPem,
        // Normalise offering
        persembahan_umum: currentCategory === "Anak" 
          ? (Number(formData.persembahan_anak) || Number(formData.persembahan_umum) || 0)
          : currentCategory === "Remaja"
          ? (Number(formData.persembahan_remaja) || Number(formData.persembahan_umum) || 0)
          : (Number(formData.persembahan_umum) || 0),
        kehadiran_pemuda: currentCategory === "Anak" ? 0 : (Number(formData.kehadiran_pemuda) || 0),
        kehadiran_anak: currentCategory === "Remaja" ? 0 : (Number(formData.kehadiran_anak) || 0),
        tenantId: "gpstiaa",
      };

      await onSave(payload);
      onClose();
    } catch (error) {
      console.error("Error saving report: ", error);
      addToast("Gagal menyimpan data.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto pt-6 pb-6">
      <div className="flex w-full max-w-4xl flex-col rounded-2xl bg-slate-50 dark:bg-slate-900 shadow-2xl relative my-auto border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              currentCategory === "Anak" 
                ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                : currentCategory === "Remaja"
                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                : "bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
            }`}>
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {initialData ? "Edit Laporan Kebaktian" : "Tambah Laporan Kebaktian"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formulir pencatatan kehadiran jemaat dan keuangan ibadah mingguan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Category Tabs */}
          <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Pilih Jenis / Kategori Kebaktian:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleCategoryChange("Umum")}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  currentCategory === "Umum"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                }`}
              >
                <Church className="w-3.5 h-3.5" /> Kebaktian Umum
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange("Anak")}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  currentCategory === "Anak"
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                }`}
              >
                🎈 Kebaktian Anak (SM)
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange("Remaja")}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  currentCategory === "Remaja"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                }`}
              >
                🎸 Remaja & Pemuda
              </button>

              <button
                type="button"
                onClick={() => handleCategoryChange("Lainnya")}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  currentCategory === "Lainnya"
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                }`}
              >
                📖 Ibadah Lainnya (PA/Doa)
              </button>
            </div>
          </div>

          <form id="report-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Informasi Jadwal & Nama Ibadah */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2.5">
                  <Calendar className="w-4 h-4 text-blue-500" /> Informasi Jadwal
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Tanggal Ibadah
                    </label>
                    <DateInputMask
                      name="tanggal_ibadah"
                      required
                      value={formData.tanggal_ibadah || ""}
                      onChange={handleChange}
                      placeholder="DD-MM-YYYY"
                      className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Nama / Keterangan Ibadah
                    </label>
                    <input
                      type="text"
                      name="nama_ibadah"
                      required
                      value={formData.nama_ibadah || ""}
                      onChange={handleChange}
                      placeholder="Nama ibadah..."
                      className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* STATISTIK KEHADIRAN (BERADAPTASI SESUAI KATEGORI) */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" /> Daftar Hadir Jemaat
                  </h3>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    Total Hadir: {calculatedTotalKehadiran()} orang
                  </span>
                </div>

                {/* TAMPILAN KEHADIRAN KHUSUS ANAK (SEKOLAH MINGGU): HANYA ANAK & GURU/DEWASA (TANPA REMAJA) */}
                {currentCategory === "Anak" ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs text-amber-800 dark:text-amber-300 font-medium">
                      🎈 Kebaktian Anak hanya mencatat kehadiran Anak dan Guru/Pendamping Dewasa.
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-1.5">
                          Anak (Sekolah Minggu)
                        </label>
                        <input
                          type="number"
                          name="kehadiran_anak"
                          min="0"
                          required
                          value={formData.kehadiran_anak !== undefined ? formData.kehadiran_anak : ""}
                          onChange={handleChange}
                          className="block w-full rounded-lg border-2 border-amber-300 dark:border-amber-700 px-3 py-2.5 text-base font-bold text-center text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                          Guru / Pendamping (Dewasa)
                        </label>
                        <input
                          type="number"
                          name="kehadiran_dewasa"
                          min="0"
                          required
                          value={formData.kehadiran_dewasa !== undefined ? formData.kehadiran_dewasa : ""}
                          onChange={handleChange}
                          className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-base font-bold text-center text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-amber-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ) : currentCategory === "Remaja" ? (
                  /* TAMPILAN KEHADIRAN KHUSUS REMAJA: REMAJA & PEMBINA DEWASA */
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                      🎸 Kebaktian Remaja & Pemuda mencatat kehadiran anggota Remaja dan Pembina.
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">
                          Remaja / Pemuda
                        </label>
                        <input
                          type="number"
                          name="kehadiran_pemuda"
                          min="0"
                          required
                          value={formData.kehadiran_pemuda !== undefined ? formData.kehadiran_pemuda : ""}
                          onChange={handleChange}
                          className="block w-full rounded-lg border-2 border-emerald-300 dark:border-emerald-700 px-3 py-2.5 text-base font-bold text-center text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                          Pembina / Dewasa
                        </label>
                        <input
                          type="number"
                          name="kehadiran_dewasa"
                          min="0"
                          required
                          value={formData.kehadiran_dewasa !== undefined ? formData.kehadiran_dewasa : ""}
                          onChange={handleChange}
                          className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-base font-bold text-center text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-emerald-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* TAMPILAN KEHADIRAN UMUM / STANDAR (DEWASA, PEMUDA, ANAK) */
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        Umum / Dewasa
                      </label>
                      <input
                        type="number"
                        name="kehadiran_dewasa"
                        min="0"
                        required
                        value={formData.kehadiran_dewasa !== undefined ? formData.kehadiran_dewasa : ""}
                        onChange={handleChange}
                        className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm font-bold text-center text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        Pemuda
                      </label>
                      <input
                        type="number"
                        name="kehadiran_pemuda"
                        min="0"
                        required
                        value={formData.kehadiran_pemuda !== undefined ? formData.kehadiran_pemuda : ""}
                        onChange={handleChange}
                        className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm font-bold text-center text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        Anak
                      </label>
                      <input
                        type="number"
                        name="kehadiran_anak"
                        min="0"
                        required
                        value={formData.kehadiran_anak !== undefined ? formData.kehadiran_anak : ""}
                        onChange={handleChange}
                        className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm font-bold text-center text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none shadow-inner"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SEKSI KEUANGAN & PERSEMBAHAN */}
            <div className="bg-emerald-50/40 dark:bg-emerald-900/10 rounded-xl shadow-sm border border-emerald-200/70 dark:border-emerald-800/40 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/60 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" /> Pos Persembahan & Keuangan (Rp)
                </h3>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                  Total Pemasukan: Rp {formatRupiah(calculatedTotalPemasukan())}
                </div>
              </div>

              {/* JIKA KEBAKTIAN ANAK */}
              {currentCategory === "Anak" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1.5">
                      Persembahan Sekolah Minggu / Anak
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-emerald-600 text-sm font-semibold">Rp</span>
                      </div>
                      <input
                        type="text"
                        name="persembahan_anak"
                        required
                        value={formatRupiah(formData.persembahan_anak !== undefined && formData.persembahan_anak > 0 ? formData.persembahan_anak : (formData.persembahan_umum || 0))}
                        onChange={(e) => {
                          const val = parseRupiah(e.target.value);
                          setFormData(prev => ({ ...prev, persembahan_anak: val, persembahan_umum: val }));
                        }}
                        className="block w-full rounded-lg border-2 border-emerald-300 dark:border-emerald-700 pl-10 pr-3 py-2.5 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1.5">
                      Pemasukan Lainnya (Sekolah Minggu)
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-emerald-600 text-sm font-semibold">Rp</span>
                      </div>
                      <input
                        type="text"
                        name="pemasukan_lainnya"
                        value={formatRupiah(formData.pemasukan_lainnya || 0)}
                        onChange={handleRupiahChange}
                        className="block w-full rounded-lg border border-emerald-200 dark:border-emerald-800/50 pl-10 pr-3 py-2.5 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ) : currentCategory === "Remaja" ? (
                /* JIKA KEBAKTIAN REMAJA */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1.5">
                      Persembahan Remaja & Pemuda
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-emerald-600 text-sm font-semibold">Rp</span>
                      </div>
                      <input
                        type="text"
                        name="persembahan_remaja"
                        required
                        value={formatRupiah(formData.persembahan_remaja !== undefined && formData.persembahan_remaja > 0 ? formData.persembahan_remaja : (formData.persembahan_umum || 0))}
                        onChange={(e) => {
                          const val = parseRupiah(e.target.value);
                          setFormData(prev => ({ ...prev, persembahan_remaja: val, persembahan_umum: val }));
                        }}
                        className="block w-full rounded-lg border-2 border-emerald-300 dark:border-emerald-700 pl-10 pr-3 py-2.5 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1.5">
                      Pemasukan Lainnya (Remaja)
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-emerald-600 text-sm font-semibold">Rp</span>
                      </div>
                      <input
                        type="text"
                        name="pemasukan_lainnya"
                        value={formatRupiah(formData.pemasukan_lainnya || 0)}
                        onChange={handleRupiahChange}
                        className="block w-full rounded-lg border border-emerald-200 dark:border-emerald-800/50 pl-10 pr-3 py-2.5 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* JIKA KEBAKTIAN UMUM / LAINNYA */
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                      Persembahan Umum
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-slate-400">Rp</span>
                      <input
                        type="text"
                        name="persembahan_umum"
                        value={formatRupiah(formData.persembahan_umum || 0)}
                        onChange={handleRupiahChange}
                        className="w-full pl-8 pr-2 py-2 text-right font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                      Perpuluhan
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-slate-400">Rp</span>
                      <input
                        type="text"
                        name="perpuluhan"
                        value={formatRupiah(formData.perpuluhan || 0)}
                        onChange={handleRupiahChange}
                        className="w-full pl-8 pr-2 py-2 text-right font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                      Diakonia
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-slate-400">Rp</span>
                      <input
                        type="text"
                        name="diakonia"
                        value={formatRupiah(formData.diakonia || 0)}
                        onChange={handleRupiahChange}
                        className="w-full pl-8 pr-2 py-2 text-right font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                      Lainnya
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-slate-400">Rp</span>
                      <input
                        type="text"
                        name="pemasukan_lainnya"
                        value={formatRupiah(formData.pemasukan_lainnya || 0)}
                        onChange={handleRupiahChange}
                        className="w-full pl-8 pr-2 py-2 text-right font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Rincian Pengeluaran */}
              <div className="pt-3 border-t border-emerald-200/50 dark:border-emerald-800/50">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                    Rincian Pengeluaran (Bila Ada)
                  </label>
                  <button
                    type="button"
                    onClick={addPengeluaranDetail}
                    className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Pengeluaran
                  </button>
                </div>

                {(formData.pengeluaran_details || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Belum ada rincian pengeluaran untuk ibadah ini.</p>
                ) : (
                  <div className="space-y-2.5">
                    {(formData.pengeluaran_details || []).map((item) => (
                      <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/30">
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            placeholder="Keterangan pengeluaran..."
                            required
                            value={item.keterangan}
                            onChange={(e) => handlePengeluaranChange(item.id, 'keterangan', e.target.value)}
                            className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 focus:ring-1 focus:ring-rose-500 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-3 relative">
                          <span className="text-slate-400 text-xs absolute left-2.5 top-1.5">Rp</span>
                          <input
                            type="text"
                            required
                            value={formatRupiah(item.jumlah)}
                            onChange={(e) => handlePengeluaranChange(item.id, 'jumlah', parseRupiah(e.target.value))}
                            className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 pl-8 pr-2 py-1.5 text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-slate-50 dark:bg-slate-800 text-right focus:ring-1 focus:ring-rose-500 outline-none"
                            placeholder="0"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <select
                            value={item.sumber}
                            onChange={(e) => handlePengeluaranChange(item.id, 'sumber', e.target.value)}
                            className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 focus:ring-1 focus:ring-rose-500 outline-none"
                          >
                            <option value="Kas Umum">Kas Umum</option>
                            <option value="Seksi Pemuda / Anak">Seksi Pemuda / Anak</option>
                            <option value="Seksi Diakonia">Seksi Diakonia</option>
                            <option value="Seksi Pembangunan">Seksi Pembangunan</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                        </div>
                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removePengeluaranDetail(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end items-center gap-3 pr-1">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Total Pengeluaran:</span>
                      <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                        Rp {formatRupiah(formData.pengeluaran || 0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Catatan Tambahan */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2.5">
                <Edit3 className="w-4 h-4 text-amber-500" /> Catatan Tambahan / Pengkhotbah / Pembicara
              </h3>
              <textarea
                name="keterangan"
                rows={2}
                value={formData.keterangan || ''}
                onChange={handleChange}
                placeholder="Tuliskan catatan tambahan, nama pengkhotbah/guru, tema khotbah, atau rincian lainnya..."
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none shadow-inner"
              />
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 px-6 py-4 shrink-0">
          <div className="hidden sm:flex items-center gap-4 text-xs">
            <span className="text-slate-500">Kategori: <strong className="text-slate-800 dark:text-slate-200">{currentCategory}</strong></span>
            <span className="text-slate-500">Kehadiran: <strong className="text-indigo-600">{calculatedTotalKehadiran()} orang</strong></span>
            <span className="text-slate-500">Pemasukan: <strong className="text-emerald-600 font-mono">Rp {formatRupiah(calculatedTotalPemasukan())}</strong></span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              form="report-form"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Simpan Laporan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
