import React, { useState } from "react";
import { X, Calendar, Users, ArrowUpRight, Plus, Trash2, CheckCircle2, Church, Sparkles, AlertCircle } from "lucide-react";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { WeeklyReport, PengeluaranDetail } from "../types";
import DateInputMask from "./DateInputMask";
import { useToast } from "../ToastContext";

interface MultiServiceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

const formatRupiah = (value: number | string) => {
  const numberString = value.toString().replace(/[^,\d]/g, "");
  if (!numberString) return "";
  return new Intl.NumberFormat("id-ID").format(Number(numberString));
};

const parseRupiah = (value: string | number) => {
  if (typeof value === "number") return value;
  const numberString = value.replace(/[^,\d]/g, "");
  return numberString ? Number(numberString) : 0;
};

export default function MultiServiceReportModal({ isOpen, onClose, onSuccess }: MultiServiceReportModalProps) {
  const { addToast } = useToast();
  const [tanggalIbadah, setTanggalIbadah] = useState(() => new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle Services to input
  const [includeUmum, setIncludeUmum] = useState(true);
  const [includeAnak, setIncludeAnak] = useState(true);
  const [includeRemaja, setIncludeRemaja] = useState(false);

  // State Kebaktian Umum
  const [umumData, setUmumData] = useState({
    nama_ibadah: "Ibadah Raya Umum",
    kehadiran_dewasa: 0,
    kehadiran_pemuda: 0,
    kehadiran_anak: 0,
    persembahan_umum: 0,
    perpuluhan: 0,
    diakonia: 0,
    pemasukan_lainnya: 0,
    pengeluaran: 0,
    pengeluaran_details: [] as PengeluaranDetail[],
    keterangan: "",
  });

  // State Kebaktian Anak (Sekolah Minggu) - HANYA Dewasa & Anak, tanpa Remaja
  const [anakData, setAnakData] = useState({
    nama_ibadah: "Kebaktian Anak (Sekolah Minggu)",
    kehadiran_anak: 0,
    kehadiran_dewasa: 0, // Guru / Pendamping Dewasa
    persembahan_anak: 0,
    pemasukan_lainnya: 0,
    pengeluaran: 0,
    pengeluaran_details: [] as PengeluaranDetail[],
    keterangan: "",
  });

  // State Kebaktian Remaja / Pemuda
  const [remajaData, setRemajaData] = useState({
    nama_ibadah: "Kebaktian Remaja & Pemuda",
    kehadiran_pemuda: 0, // Remaja / Pemuda
    kehadiran_dewasa: 0, // Pembina Dewasa
    persembahan_remaja: 0,
    pemasukan_lainnya: 0,
    pengeluaran: 0,
    pengeluaran_details: [] as PengeluaranDetail[],
    keterangan: "",
  });

  if (!isOpen) return null;

  // Calculate Totals Live
  const totalHadirDewasa = (includeUmum ? Number(umumData.kehadiran_dewasa) || 0 : 0) +
    (includeAnak ? Number(anakData.kehadiran_dewasa) || 0 : 0) +
    (includeRemaja ? Number(remajaData.kehadiran_dewasa) || 0 : 0);

  const totalHadirPemuda = (includeUmum ? Number(umumData.kehadiran_pemuda) || 0 : 0) +
    (includeRemaja ? Number(remajaData.kehadiran_pemuda) || 0 : 0);

  const totalHadirAnak = (includeUmum ? Number(umumData.kehadiran_anak) || 0 : 0) +
    (includeAnak ? Number(anakData.kehadiran_anak) || 0 : 0);

  const grandTotalHadir = totalHadirDewasa + totalHadirPemuda + totalHadirAnak;

  const totalPemasukanUmum = (Number(umumData.persembahan_umum) || 0) +
    (Number(umumData.perpuluhan) || 0) +
    (Number(umumData.diakonia) || 0) +
    (Number(umumData.pemasukan_lainnya) || 0);

  const totalPemasukanAnak = (Number(anakData.persembahan_anak) || 0) +
    (Number(anakData.pemasukan_lainnya) || 0);

  const totalPemasukanRemaja = (Number(remajaData.persembahan_remaja) || 0) +
    (Number(remajaData.pemasukan_lainnya) || 0);

  const grandTotalPemasukan = (includeUmum ? totalPemasukanUmum : 0) +
    (includeAnak ? totalPemasukanAnak : 0) +
    (includeRemaja ? totalPemasukanRemaja : 0);

  const grandTotalPengeluaran = (includeUmum ? Number(umumData.pengeluaran) || 0 : 0) +
    (includeAnak ? Number(anakData.pengeluaran) || 0 : 0) +
    (includeRemaja ? Number(remajaData.pengeluaran) || 0 : 0);

  // Handlers for Pengeluaran
  const addPengeluaran = (target: "umum" | "anak" | "remaja") => {
    const newDetail: PengeluaranDetail = {
      id: Date.now().toString(),
      keterangan: "",
      jumlah: 0,
      sumber: target === "anak" ? "Seksi Pemuda / Anak" : target === "remaja" ? "Seksi Pemuda / Anak" : "Kas Umum",
    };

    if (target === "umum") {
      setUmumData(prev => ({
        ...prev,
        pengeluaran_details: [...prev.pengeluaran_details, newDetail]
      }));
    } else if (target === "anak") {
      setAnakData(prev => ({
        ...prev,
        pengeluaran_details: [...prev.pengeluaran_details, newDetail]
      }));
    } else {
      setRemajaData(prev => ({
        ...prev,
        pengeluaran_details: [...prev.pengeluaran_details, newDetail]
      }));
    }
  };

  const removePengeluaran = (target: "umum" | "anak" | "remaja", id: string) => {
    if (target === "umum") {
      setUmumData(prev => {
        const details = prev.pengeluaran_details.filter(d => d.id !== id);
        const sum = details.reduce((acc, curr) => acc + curr.jumlah, 0);
        return { ...prev, pengeluaran_details: details, pengeluaran: sum };
      });
    } else if (target === "anak") {
      setAnakData(prev => {
        const details = prev.pengeluaran_details.filter(d => d.id !== id);
        const sum = details.reduce((acc, curr) => acc + curr.jumlah, 0);
        return { ...prev, pengeluaran_details: details, pengeluaran: sum };
      });
    } else {
      setRemajaData(prev => {
        const details = prev.pengeluaran_details.filter(d => d.id !== id);
        const sum = details.reduce((acc, curr) => acc + curr.jumlah, 0);
        return { ...prev, pengeluaran_details: details, pengeluaran: sum };
      });
    }
  };

  const updatePengeluaran = (target: "umum" | "anak" | "remaja", id: string, field: "keterangan" | "jumlah" | "sumber", val: any) => {
    if (target === "umum") {
      setUmumData(prev => {
        const details = prev.pengeluaran_details.map(d => d.id === id ? { ...d, [field]: val } : d);
        const sum = details.reduce((acc, curr) => acc + curr.jumlah, 0);
        return { ...prev, pengeluaran_details: details, pengeluaran: sum };
      });
    } else if (target === "anak") {
      setAnakData(prev => {
        const details = prev.pengeluaran_details.map(d => d.id === id ? { ...d, [field]: val } : d);
        const sum = details.reduce((acc, curr) => acc + curr.jumlah, 0);
        return { ...prev, pengeluaran_details: details, pengeluaran: sum };
      });
    } else {
      setRemajaData(prev => {
        const details = prev.pengeluaran_details.map(d => d.id === id ? { ...d, [field]: val } : d);
        const sum = details.reduce((acc, curr) => acc + curr.jumlah, 0);
        return { ...prev, pengeluaran_details: details, pengeluaran: sum };
      });
    }
  };

  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tanggalIbadah) {
      addToast("Silakan isi tanggal ibadah terlebih dahulu.", "error");
      return;
    }

    if (!includeUmum && !includeAnak && !includeRemaja) {
      addToast("Pilih minimal satu jenis kebaktian untuk disimpan.", "error");
      return;
    }

    setIsSubmitting(true);
    let count = 0;

    try {
      // 1. Save Kebaktian Umum if checked
      if (includeUmum) {
        const docRef = doc(collection(db, "weekly_reports"));
        const reportData: WeeklyReport = {
          tenantId: "gpstiaa",
          tanggal_ibadah: tanggalIbadah,
          nama_ibadah: umumData.nama_ibadah.trim() || "Ibadah Raya Umum",
          kategori_ibadah: "Umum",
          kehadiran_dewasa: Number(umumData.kehadiran_dewasa) || 0,
          kehadiran_pemuda: Number(umumData.kehadiran_pemuda) || 0,
          kehadiran_anak: Number(umumData.kehadiran_anak) || 0,
          persembahan_umum: Number(umumData.persembahan_umum) || 0,
          perpuluhan: Number(umumData.perpuluhan) || 0,
          diakonia: Number(umumData.diakonia) || 0,
          pemasukan_lainnya: Number(umumData.pemasukan_lainnya) || 0,
          total_pemasukan: totalPemasukanUmum,
          pengeluaran: Number(umumData.pengeluaran) || 0,
          pengeluaran_details: umumData.pengeluaran_details,
          keterangan: umumData.keterangan.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(docRef, reportData);
        count++;
      }

      // 2. Save Kebaktian Anak if checked (HANYA Dewasa Guru & Anak, tanpa Remaja)
      if (includeAnak) {
        const docRef = doc(collection(db, "weekly_reports"));
        const reportData: WeeklyReport = {
          tenantId: "gpstiaa",
          tanggal_ibadah: tanggalIbadah,
          nama_ibadah: anakData.nama_ibadah.trim() || "Kebaktian Anak (Sekolah Minggu)",
          kategori_ibadah: "Anak",
          kehadiran_dewasa: Number(anakData.kehadiran_dewasa) || 0, // Guru SM
          kehadiran_pemuda: 0, // Tidak perlu remaja
          kehadiran_anak: Number(anakData.kehadiran_anak) || 0,
          persembahan_umum: Number(anakData.persembahan_anak) || 0,
          persembahan_anak: Number(anakData.persembahan_anak) || 0,
          perpuluhan: 0,
          diakonia: 0,
          pemasukan_lainnya: Number(anakData.pemasukan_lainnya) || 0,
          total_pemasukan: totalPemasukanAnak,
          pengeluaran: Number(anakData.pengeluaran) || 0,
          pengeluaran_details: anakData.pengeluaran_details,
          keterangan: anakData.keterangan.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(docRef, reportData);
        count++;
      }

      // 3. Save Kebaktian Remaja if checked
      if (includeRemaja) {
        const docRef = doc(collection(db, "weekly_reports"));
        const reportData: WeeklyReport = {
          tenantId: "gpstiaa",
          tanggal_ibadah: tanggalIbadah,
          nama_ibadah: remajaData.nama_ibadah.trim() || "Kebaktian Remaja & Pemuda",
          kategori_ibadah: "Remaja",
          kehadiran_dewasa: Number(remajaData.kehadiran_dewasa) || 0, // Pembina Dewasa
          kehadiran_pemuda: Number(remajaData.kehadiran_pemuda) || 0,
          kehadiran_anak: 0,
          persembahan_umum: Number(remajaData.persembahan_remaja) || 0,
          persembahan_remaja: Number(remajaData.persembahan_remaja) || 0,
          perpuluhan: 0,
          diakonia: 0,
          pemasukan_lainnya: Number(remajaData.pemasukan_lainnya) || 0,
          total_pemasukan: totalPemasukanRemaja,
          pengeluaran: Number(remajaData.pengeluaran) || 0,
          pengeluaran_details: remajaData.pengeluaran_details,
          keterangan: remajaData.keterangan.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(docRef, reportData);
        count++;
      }

      onSuccess(count);
      onClose();
    } catch (error) {
      console.error("Error saving multi-service reports:", error);
      addToast("Gagal menyimpan data kebaktian terpadu.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto pt-6 pb-6">
      <div className="flex w-full max-w-5xl flex-col rounded-2xl bg-slate-50 dark:bg-slate-900 shadow-2xl relative my-auto border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Church className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Input Daftar Hadir & Persembahan Terpadu
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Input kebaktian Umum, Anak (Sekolah Minggu), dan Remaja dalam satu form tanggal yang sama
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Tanggal & Pilihan Kebaktian yang Aktif */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-500" /> Tanggal Ibadah (Minggu)
                </label>
                <DateInputMask
                  name="tanggal_ibadah"
                  required
                  value={tanggalIbadah}
                  onChange={(e) => setTanggalIbadah(e.target.value)}
                  placeholder="DD-MM-YYYY"
                  className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-inner"
                />
              </div>

              <div className="md:col-span-8">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Pilih Kebaktian yang Diinput pada Tanggal Ini:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setIncludeUmum(!includeUmum)}
                    className={`px-3 py-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-2 ${includeUmum ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300" : "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-700"}`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${includeUmum ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"}`}>
                      {includeUmum && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </span>
                    Kebaktian Umum
                  </button>

                  <button
                    type="button"
                    onClick={() => setIncludeAnak(!includeAnak)}
                    className={`px-3 py-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-2 ${includeAnak ? "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300" : "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-700"}`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${includeAnak ? "bg-amber-600 border-amber-600 text-white" : "border-slate-300"}`}>
                      {includeAnak && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </span>
                    Kebaktian Anak (SM)
                  </button>

                  <button
                    type="button"
                    onClick={() => setIncludeRemaja(!includeRemaja)}
                    className={`px-3 py-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-2 ${includeRemaja ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300" : "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-700"}`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${includeRemaja ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300"}`}>
                      {includeRemaja && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </span>
                    Kebaktian Remaja
                  </button>
                </div>
              </div>
            </div>
          </div>

          <form id="multi-report-form" onSubmit={handleSubmitAll} className="space-y-6">
            {/* SEKSI 1: KEBAKTIAN UMUM */}
            {includeUmum && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 border-blue-200 dark:border-blue-900/50 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/40 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-bold">1</span>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      Kebaktian Umum (Dewasa / Raya)
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    Pemasukan: Rp {formatRupiah(totalPemasukanUmum)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kehadiran Umum */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-500" /> Daftar Hadir Jemaat Umum
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Dewasa</label>
                        <input
                          type="number"
                          min="0"
                          value={umumData.kehadiran_dewasa || ""}
                          onChange={(e) => setUmumData({ ...umumData, kehadiran_dewasa: Number(e.target.value) || 0 })}
                          className="w-full text-center font-bold px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Pemuda</label>
                        <input
                          type="number"
                          min="0"
                          value={umumData.kehadiran_pemuda || ""}
                          onChange={(e) => setUmumData({ ...umumData, kehadiran_pemuda: Number(e.target.value) || 0 })}
                          className="w-full text-center font-bold px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Anak (di Umum)</label>
                        <input
                          type="number"
                          min="0"
                          value={umumData.kehadiran_anak || ""}
                          onChange={(e) => setUmumData({ ...umumData, kehadiran_anak: Number(e.target.value) || 0 })}
                          className="w-full text-center font-bold px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 pt-1">
                      Total Hadir di Umum: <span className="font-bold text-blue-600 dark:text-blue-400">{(Number(umumData.kehadiran_dewasa) || 0) + (Number(umumData.kehadiran_pemuda) || 0) + (Number(umumData.kehadiran_anak) || 0)}</span> orang
                    </div>
                  </div>

                  {/* Persembahan Umum */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> Pos Persembahan Kebaktian Umum
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Persembahan Umum</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={formatRupiah(umumData.persembahan_umum)}
                            onChange={(e) => setUmumData({ ...umumData, persembahan_umum: parseRupiah(e.target.value) })}
                            className="w-full pl-7 pr-2 py-1.5 text-right font-mono font-bold text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Perpuluhan</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={formatRupiah(umumData.perpuluhan)}
                            onChange={(e) => setUmumData({ ...umumData, perpuluhan: parseRupiah(e.target.value) })}
                            className="w-full pl-7 pr-2 py-1.5 text-right font-mono font-bold text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Diakonia</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={formatRupiah(umumData.diakonia)}
                            onChange={(e) => setUmumData({ ...umumData, diakonia: parseRupiah(e.target.value) })}
                            className="w-full pl-7 pr-2 py-1.5 text-right font-mono font-bold text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Pemasukan Lainnya</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={formatRupiah(umumData.pemasukan_lainnya)}
                            onChange={(e) => setUmumData({ ...umumData, pemasukan_lainnya: parseRupiah(e.target.value) })}
                            className="w-full pl-7 pr-2 py-1.5 text-right font-mono font-bold text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pengeluaran / Keterangan Umum */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                        Rincian Pengeluaran Ibadah Umum
                      </label>
                      <button
                        type="button"
                        onClick={() => addPengeluaran("umum")}
                        className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded hover:bg-rose-100 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Tambah
                      </button>
                    </div>
                    {umumData.pengeluaran_details.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Tidak ada pengeluaran khusus ibadah umum.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {umumData.pengeluaran_details.map((item) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Keterangan..."
                              value={item.keterangan}
                              onChange={(e) => updatePengeluaran("umum", item.id, "keterangan", e.target.value)}
                              className="flex-1 px-2 py-1 text-xs border rounded bg-white dark:bg-slate-800 dark:border-slate-700"
                            />
                            <input
                              type="text"
                              placeholder="Rp"
                              value={formatRupiah(item.jumlah)}
                              onChange={(e) => updatePengeluaran("umum", item.id, "jumlah", parseRupiah(e.target.value))}
                              className="w-24 px-2 py-1 text-right text-xs font-mono border rounded bg-white dark:bg-slate-800 dark:border-slate-700"
                            />
                            <button
                              type="button"
                              onClick={() => removePengeluaran("umum", item.id)}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Catatan / Pengkhotbah Umum
                    </label>
                    <input
                      type="text"
                      value={umumData.keterangan}
                      onChange={(e) => setUmumData({ ...umumData, keterangan: e.target.value })}
                      placeholder="Tema khotbah, nama pelayan firman..."
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SEKSI 2: KEBAKTIAN ANAK (SEKOLAH MINGGU) - HANYA DEWASA GURU & ANAK */}
            {includeAnak && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 border-amber-200 dark:border-amber-900/50 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-amber-100 dark:border-amber-900/40 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-amber-500 text-white text-xs font-bold">2</span>
                    <div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        Kebaktian Anak (Sekolah Minggu)
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Khusus jemaat anak & guru pendamping (tanpa remaja)
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Pemasukan: Rp {formatRupiah(totalPemasukanAnak)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kehadiran Anak & Guru */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-3">
                    <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-500" /> Daftar Hadir Sekolah Minggu
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Anak (Sekolah Minggu)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={anakData.kehadiran_anak || ""}
                          onChange={(e) => setAnakData({ ...anakData, kehadiran_anak: Number(e.target.value) || 0 })}
                          className="w-full text-center font-bold px-3 py-2 text-sm bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Guru / Pendamping (Dewasa)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={anakData.kehadiran_dewasa || ""}
                          onChange={(e) => setAnakData({ ...anakData, kehadiran_dewasa: Number(e.target.value) || 0 })}
                          className="w-full text-center font-bold px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 pt-1">
                      Total Hadir di SM: <span className="font-bold text-amber-600 dark:text-amber-400">{(Number(anakData.kehadiran_anak) || 0) + (Number(anakData.kehadiran_dewasa) || 0)}</span> orang
                    </div>
                  </div>

                  {/* Persembahan Anak */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-3">
                    <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> Persembahan Sekolah Minggu
                    </label>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                          Persembahan Anak (Sekolah Minggu)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={formatRupiah(anakData.persembahan_anak)}
                            onChange={(e) => setAnakData({ ...anakData, persembahan_anak: parseRupiah(e.target.value) })}
                            className="w-full pl-8 pr-3 py-2 text-right font-mono font-bold text-sm bg-white dark:bg-slate-800 border-2 border-emerald-300 dark:border-emerald-700/60 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                          Pemasukan Lainnya (SM)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={formatRupiah(anakData.pemasukan_lainnya)}
                            onChange={(e) => setAnakData({ ...anakData, pemasukan_lainnya: parseRupiah(e.target.value) })}
                            className="w-full pl-8 pr-3 py-2 text-right font-mono font-bold text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-amber-500 outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Catatan Kebaktian Anak */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Catatan / Materi Cerita Sekolah Minggu
                  </label>
                  <input
                    type="text"
                    value={anakData.keterangan}
                    onChange={(e) => setAnakData({ ...anakData, keterangan: e.target.value })}
                    placeholder="Materi cerita, kelas batita/pratama/madya, nama guru bertugas..."
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* SEKSI 3: KEBAKTIAN REMAJA / PEMUDA (OPSIONAL / JIKA DICENTANG) */}
            {includeRemaja && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 border-emerald-200 dark:border-emerald-900/50 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/40 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs font-bold">3</span>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      Kebaktian Remaja & Pemuda
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Pemasukan: Rp {formatRupiah(totalPemasukanRemaja)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kehadiran Remaja & Pembina */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-3">
                    <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-500" /> Daftar Hadir Remaja & Pemuda
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Remaja / Pemuda
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={remajaData.kehadiran_pemuda || ""}
                          onChange={(e) => setRemajaData({ ...remajaData, kehadiran_pemuda: Number(e.target.value) || 0 })}
                          className="w-full text-center font-bold px-3 py-2 text-sm bg-white dark:bg-slate-800 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Pembina / Dewasa
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={remajaData.kehadiran_dewasa || ""}
                          onChange={(e) => setRemajaData({ ...remajaData, kehadiran_dewasa: Number(e.target.value) || 0 })}
                          className="w-full text-center font-bold px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Persembahan Remaja */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-3">
                    <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> Persembahan Remaja & Pemuda
                    </label>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                          Persembahan Remaja
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={formatRupiah(remajaData.persembahan_remaja)}
                            onChange={(e) => setRemajaData({ ...remajaData, persembahan_remaja: parseRupiah(e.target.value) })}
                            className="w-full pl-8 pr-3 py-2 text-right font-mono font-bold text-sm bg-white dark:bg-slate-800 border-2 border-emerald-300 dark:border-emerald-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                          Pemasukan Lainnya (Remaja)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={formatRupiah(remajaData.pemasukan_lainnya)}
                            onChange={(e) => setRemajaData({ ...remajaData, pemasukan_lainnya: parseRupiah(e.target.value) })}
                            className="w-full pl-8 pr-3 py-2 text-right font-mono font-bold text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-emerald-500 outline-none"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Catatan Kebaktian Remaja */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Catatan / Tema Kebaktian Remaja
                  </label>
                  <input
                    type="text"
                    value={remajaData.keterangan}
                    onChange={(e) => setRemajaData({ ...remajaData, keterangan: e.target.value })}
                    placeholder="Tema ibadah remaja, pembicara, fellowship..."
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Sticky Grand Total Bar & Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-6 py-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800">
              <span className="text-slate-500 dark:text-slate-400">Total Hadir Seluruh Jemaat:</span>
              <span className="font-bold text-sm text-blue-700 dark:text-blue-300">{grandTotalHadir}</span>
              <span className="text-[10px] text-slate-400">(Dewasa: {totalHadirDewasa}, Pemuda: {totalHadirPemuda}, Anak: {totalHadirAnak})</span>
            </div>

            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800">
              <span className="text-slate-500 dark:text-slate-400">Total Persembahan:</span>
              <span className="font-bold text-sm font-mono text-emerald-700 dark:text-emerald-300">Rp {formatRupiah(grandTotalPemasukan)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              form="multi-report-form"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Menyimpan Semua...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Simpan Semua Data Kebaktian
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
