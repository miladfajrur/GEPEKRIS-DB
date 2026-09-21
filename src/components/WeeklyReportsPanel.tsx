import React, { useState, useEffect, useRef, useMemo } from "react";
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, serverTimestamp, orderBy, where } from "firebase/firestore";
import { 
  Plus, Edit2, Trash2, Download, Printer, Upload, Sparkles, Users, Church, Layers, 
  Calendar, Search, Filter, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, 
  PieChart as PieChartIcon, BarChart3, RefreshCw, ChevronRight, X, TableProperties,
  CheckCircle2, Info, Eye, LayoutGrid, Table, ChevronDown, ChevronUp, Clock, Check
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, BarChart, Bar, Cell 
} from "recharts";
import { db } from "../lib/firebase";
import { WeeklyReport, WorshipCategory } from "../types";
import WeeklyReportModal from "./WeeklyReportModal";
import BulkReportModal from "./BulkReportModal";
import MultiServiceReportModal from "./MultiServiceReportModal";
import DateInputMask from "./DateInputMask";
import MonthYearInputMask from "./MonthYearInputMask";
import * as XLSX from "xlsx";
import { useToast } from "../ToastContext";
import { formatDateDDMMYYYY, formatDateDDMMYYYY_WithMonthName, getWorshipCategory } from "../lib/utils";

interface WeeklyReportsPanelProps {
  initialCategory?: "Semua" | WorshipCategory;
  onCategoryChange?: (category: "Semua" | WorshipCategory) => void;
}

export default function WeeklyReportsPanel({ initialCategory = "Semua", onCategoryChange }: WeeklyReportsPanelProps) {
  const { addToast } = useToast();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [activeCategory, setActiveCategory] = useState<"Semua" | WorshipCategory>(initialCategory);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [ibadahFilter, setIbadahFilter] = useState<string>("Semua");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isMultiServiceModalOpen, setIsMultiServiceModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | undefined>(undefined);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [viewDetailReport, setViewDetailReport] = useState<WeeklyReport | null>(null);

  // View presentation mode: 'table' vs 'cards'
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);

  // Collapsible panels for max vertical space
  const [showKpiCards, setShowKpiCards] = useState<boolean>(true);
  const [showCharts, setShowCharts] = useState<boolean>(false);
  const [chartView, setChartView] = useState<"attendance" | "finance" | "offerings">("attendance");

  // Date filters
  const [dateFilterMode, setDateFilterMode] = useState<string>("Semua");
  const [monthYearFilter, setMonthYearFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Sync initialCategory prop change
  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory]);

  const handleCategorySwitch = (cat: "Semua" | WorshipCategory) => {
    setActiveCategory(cat);
    setIbadahFilter("Semua");
    setCurrentPage(1);
    if (onCategoryChange) {
      onCategoryChange(cat);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, "weekly_reports"),
      where("tenantId", "==", "gpstiaa"),
      orderBy("tanggal_ibadah", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: WeeklyReport[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as WeeklyReport);
      });
      setReports(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Category counts for badges
  const categoryCounts = useMemo(() => {
    const counts = { Semua: reports.length, Umum: 0, Remaja: 0, Anak: 0, Lainnya: 0 };
    reports.forEach(r => {
      const cat = getWorshipCategory(r);
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [reports]);

  // Filter reports by Category, Search, and Date
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const rCat = getWorshipCategory(r);
      if (activeCategory !== "Semua" && rCat !== activeCategory) {
        return false;
      }

      const matchesIbadah = ibadahFilter === "Semua" ? true : r.nama_ibadah === ibadahFilter;
      if (!matchesIbadah) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const namaMatch = (r.nama_ibadah || "").toLowerCase().includes(searchLower);
        const ketMatch = (r.keterangan || "").toLowerCase().includes(searchLower);
        const tglMatch = (r.tanggal_ibadah || "").toLowerCase().includes(searchLower);
        if (!namaMatch && !ketMatch && !tglMatch) return false;
      }

      if (dateFilterMode === "Semua") return true;

      const reportDate = new Date(r.tanggal_ibadah);
      const now = new Date();

      if (dateFilterMode === "Bulan Ini") {
        return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
      }

      if (dateFilterMode === "Bulan Lalu") {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return reportDate.getMonth() === lastMonth.getMonth() && reportDate.getFullYear() === lastMonth.getFullYear();
      }

      if (dateFilterMode === "Tahun Ini") {
        return reportDate.getFullYear() === now.getFullYear();
      }

      if (dateFilterMode === "Bulan") {
        if (!monthYearFilter) return true;
        const parts = monthYearFilter.split('-');
        if (parts.length === 2 && parts[0].length === 4) {
          return reportDate.getMonth() + 1 === parseInt(parts[1], 10) && reportDate.getFullYear() === parseInt(parts[0], 10);
        }
        return false;
      }

      if (dateFilterMode === "Kustom") {
        let matchesStart = true;
        let matchesEnd = true;
        if (startDate) {
          const sDate = new Date(startDate);
          sDate.setHours(0, 0, 0, 0);
          matchesStart = reportDate >= sDate;
        }
        if (endDate) {
          const eDate = new Date(endDate);
          eDate.setHours(23, 59, 59, 999);
          matchesEnd = reportDate <= eDate;
        }
        return matchesStart && matchesEnd;
      }

      return true;
    });
  }, [reports, activeCategory, ibadahFilter, searchTerm, dateFilterMode, monthYearFilter, startDate, endDate]);

  // Extract unique names for dropdown
  const uniqueNamaIbadah = useMemo(() => {
    return Array.from(
      new Set(
        reports
          .filter(r => activeCategory === "Semua" || getWorshipCategory(r) === activeCategory)
          .map(r => r.nama_ibadah)
          .filter(Boolean)
      )
    );
  }, [reports, activeCategory]);

  // Aggregation calculations
  const totalAllPemasukan = useMemo(() => {
    return filteredReports.reduce((acc, r) => {
      return acc + (r.total_pemasukan !== undefined ? r.total_pemasukan : ((r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0)));
    }, 0);
  }, [filteredReports]);

  const totalAllPengeluaran = useMemo(() => {
    return filteredReports.reduce((acc, r) => acc + (r.pengeluaran || 0), 0);
  }, [filteredReports]);

  const totalAllHadirDewasa = useMemo(() => filteredReports.reduce((acc, r) => acc + (r.kehadiran_dewasa || 0), 0), [filteredReports]);
  const totalAllHadirPemuda = useMemo(() => filteredReports.reduce((acc, r) => acc + (r.kehadiran_pemuda || 0), 0), [filteredReports]);
  const totalAllHadirAnak = useMemo(() => filteredReports.reduce((acc, r) => acc + (r.kehadiran_anak || 0), 0), [filteredReports]);
  const grandTotalHadir = totalAllHadirDewasa + totalAllHadirPemuda + totalAllHadirAnak;
  const avgKehadiran = filteredReports.length > 0 ? Math.round(grandTotalHadir / filteredReports.length) : 0;

  // Breakdown by Category
  const hadirByUmum = useMemo(() => filteredReports.filter(r => getWorshipCategory(r) === "Umum").reduce((acc, r) => acc + (r.kehadiran_dewasa || 0) + (r.kehadiran_pemuda || 0) + (r.kehadiran_anak || 0), 0), [filteredReports]);
  const hadirByRemaja = useMemo(() => filteredReports.filter(r => getWorshipCategory(r) === "Remaja").reduce((acc, r) => acc + (r.kehadiran_dewasa || 0) + (r.kehadiran_pemuda || 0) + (r.kehadiran_anak || 0), 0), [filteredReports]);
  const hadirByAnak = useMemo(() => filteredReports.filter(r => getWorshipCategory(r) === "Anak").reduce((acc, r) => acc + (r.kehadiran_dewasa || 0) + (r.kehadiran_pemuda || 0) + (r.kehadiran_anak || 0), 0), [filteredReports]);

  // Paginated records
  const paginatedReports = useMemo(() => {
    if (itemsPerPage === 0) return filteredReports;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (itemsPerPage === 0) return 1;
    return Math.ceil(filteredReports.length / itemsPerPage) || 1;
  }, [filteredReports, itemsPerPage]);

  const handleSaveReport = async (reportData: Partial<WeeklyReport>) => {
    try {
      if (selectedReport && selectedReport.id) {
        const docRef = doc(db, "weekly_reports", selectedReport.id);
        const submitData = { ...reportData, updatedAt: serverTimestamp() };
        delete submitData.id;
        await setDoc(docRef, submitData, { merge: true });
        addToast("Laporan kebaktian berhasil diperbarui.", "success");
      } else {
        const docRef = doc(collection(db, "weekly_reports"));
        await setDoc(docRef, {
          ...reportData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        addToast("Laporan kebaktian berhasil ditambahkan.", "success");
      }
    } catch (error) {
      console.error(error);
      addToast("Terjadi kesalahan saat menyimpan laporan.", "error");
      throw error;
    }
  };

  const confirmDelete = async () => {
    if (reportToDelete) {
      try {
        await deleteDoc(doc(db, "weekly_reports", reportToDelete));
        setReportToDelete(null);
        if (viewDetailReport?.id === reportToDelete) {
          setViewDetailReport(null);
        }
        addToast("Laporan berhasil dihapus.", "success");
      } catch (error) {
        console.error("Error deleting report: ", error);
        addToast("Gagal menghapus laporan.", "error");
      }
    }
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const formatDate = (dateString: string) => {
    return formatDateDDMMYYYY(dateString);
  };

  const formatFullDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    } catch {
      return dateString;
    }
  };

  const handleDownloadTemplateExcel = () => {
    const templateData = [{
      "Tanggal Ibadah": "2024-01-07",
      "Kategori Ibadah": "Umum",
      "Nama Ibadah": "Ibadah Raya Minggu",
      "Kehadiran Dewasa": 120,
      "Kehadiran Pemuda": 45,
      "Kehadiran Anak": 30,
      "Persembahan Umum": 1500000,
      "Perpuluhan": 5000000,
      "Diakonia": 500000,
      "Pemasukan Lainnya": 0,
      "Pengeluaran": 250000,
      "Keterangan": "Ibadah berjalan lancar"
    }];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "Template_Impor_Laporan_Kebaktian.xlsx");
  };

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet);
        
        let importedCount = 0;
        
        for (const row of rows) {
          const tanggal_ibadah = (row["Tanggal Ibadah"] || "").toString().trim();
          const nama_ibadah = (row["Nama Ibadah"] || "").toString().trim();
          
          if (!tanggal_ibadah || !nama_ibadah) continue;
          
          const rawCat = (row["Kategori Ibadah"] || "").toString().trim();
          let cat: WorshipCategory = "Umum";
          if (["Umum", "Remaja", "Anak", "Lainnya"].includes(rawCat)) {
            cat = rawCat as WorshipCategory;
          } else {
            cat = getWorshipCategory({ nama_ibadah });
          }

          const perUmum = Number(row["Persembahan Umum"]) || 0;
          const perPuluhan = Number(row["Perpuluhan"]) || 0;
          const diakonia = Number(row["Diakonia"]) || 0;
          const perLainnya = Number(row["Pemasukan Lainnya"]) || 0;
          const totalPem = perUmum + perPuluhan + diakonia + perLainnya;
          
          const docRef = doc(collection(db, "weekly_reports"));
          await setDoc(docRef, {
            tanggal_ibadah,
            nama_ibadah,
            kategori_ibadah: cat,
            kehadiran_dewasa: Number(row["Kehadiran Dewasa"]) || 0,
            kehadiran_pemuda: Number(row["Kehadiran Pemuda"]) || 0,
            kehadiran_anak: Number(row["Kehadiran Anak"]) || 0,
            persembahan_umum: perUmum,
            persembahan_anak: cat === "Anak" ? perUmum : 0,
            persembahan_remaja: cat === "Remaja" ? perUmum : 0,
            perpuluhan: perPuluhan,
            diakonia: diakonia,
            pemasukan_lainnya: perLainnya,
            total_pemasukan: totalPem,
            pengeluaran: Number(row["Pengeluaran"]) || 0,
            keterangan: (row["Keterangan"] || "").toString(),
            tenantId: "gpstiaa",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          importedCount++;
        }
        
        addToast(`Berhasil mengimpor ${importedCount} data laporan mingguan.`, "success");
      } catch (error) {
        console.error("Error importing Excel:", error);
        addToast("Terjadi kesalahan saat memproses file Excel.", "error");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportExcel = () => {
    const excelData = filteredReports.map(r => {
      const cat = getWorshipCategory(r);
      const totalHadir = (r.kehadiran_dewasa || 0) + (r.kehadiran_pemuda || 0) + (r.kehadiran_anak || 0);
      const totalPem = r.total_pemasukan !== undefined ? r.total_pemasukan : ((r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0));

      return {
        "Tanggal Ibadah": r.tanggal_ibadah,
        "Kategori Ibadah": cat,
        "Nama Ibadah": r.nama_ibadah,
        "Kehadiran Dewasa": r.kehadiran_dewasa || 0,
        "Kehadiran Remaja/Pemuda": r.kehadiran_pemuda || 0,
        "Kehadiran Anak": r.kehadiran_anak || 0,
        "Total Kehadiran": totalHadir,
        "Persembahan Umum / Ibadah": r.persembahan_umum || 0,
        "Perpuluhan": r.perpuluhan || 0,
        "Diakonia": r.diakonia || 0,
        "Pemasukan Lainnya": r.pemasukan_lainnya || 0,
        "Total Pemasukan": totalPem,
        "Pengeluaran": r.pengeluaran || 0,
        "Keterangan": r.keterangan || ""
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Laporan_${activeCategory}`);
    XLSX.writeFile(workbook, `Laporan_Kebaktian_${activeCategory}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;

      const doc = new jsPDF("l", "pt", "a4");

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(`Laporan Kebaktian & Keuangan (${activeCategory === "Semua" ? "Ringkasan Terintegrasi Seluruh Ibadah" : `Kebaktian ${activeCategory}`}) - GEPEKRIS TRETES`, 40, 45);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Kategori: ${activeCategory}  |  Filter: ${ibadahFilter}  |  Tanggal Cetak: ${formatDateDDMMYYYY(new Date().toISOString())}`, 40, 65);
      doc.setTextColor(0, 0, 0);
      
      const tableColumns = ["Tanggal", "Kategori", "Nama Ibadah", "D/P/A", "T. Hadir", "Total Pemasukan", "Total Pengeluaran"];

      const tableRows = filteredReports.map(r => {
        const cat = getWorshipCategory(r);
        const hadirD = r.kehadiran_dewasa || 0;
        const hadirP = r.kehadiran_pemuda || 0;
        const hadirA = r.kehadiran_anak || 0;
        const totalHadir = hadirD + hadirP + hadirA;
        const totalPemasukan = r.total_pemasukan !== undefined ? r.total_pemasukan : ((r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0));

        return [
          formatDate(r.tanggal_ibadah),
          cat,
          r.nama_ibadah,
          `${hadirD}/${hadirP}/${hadirA}`,
          totalHadir,
          formatRupiah(totalPemasukan),
          formatRupiah(r.pengeluaran || 0)
        ];
      });

      autoTable(doc, {
        startY: 85,
        head: [tableColumns],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 8, cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.5 },
        columnStyles: {
          4: { halign: 'center', fontStyle: 'bold' },
          5: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] },
          6: { halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72] }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 80;

      // Summary Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(40, finalY + 15, 760, 80, 5, 5, 'FD');

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text("RINGKASAN TOTAL TERPADU", 55, finalY + 35);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(`Total Kehadiran Jemaat: ${grandTotalHadir} Orang (Dewasa: ${totalAllHadirDewasa}, Pemuda: ${totalAllHadirPemuda}, Anak: ${totalAllHadirAnak})`, 55, finalY + 55);
      
      doc.text(`Total Pemasukan: ${formatRupiah(totalAllPemasukan)}`, 55, finalY + 75);
      doc.text(`Total Pengeluaran: ${formatRupiah(totalAllPengeluaran)}`, 320, finalY + 75);
      doc.text(`Surplus/Saldo Bersih: ${formatRupiah(totalAllPemasukan - totalAllPengeluaran)}`, 580, finalY + 75);

      doc.save(`Laporan_Kebaktian_${activeCategory}_${new Date().toISOString().split('T')[0]}.pdf`);
      addToast("Laporan PDF berhasil diunduh.", "success");
    } catch (e) {
      console.error(e);
      addToast("Gagal mengunduh laporan PDF.", "error");
    }
  };

  const chartData = useMemo(() => {
    return [...filteredReports].reverse().map(r => ({
      name: formatDate(r.tanggal_ibadah).split(' ').slice(0, 2).join(' '),
      fullName: r.nama_ibadah,
      date: formatDate(r.tanggal_ibadah),
      Dewasa: r.kehadiran_dewasa || 0,
      Pemuda: r.kehadiran_pemuda || 0,
      Anak: r.kehadiran_anak || 0,
      Total: (r.kehadiran_dewasa || 0) + (r.kehadiran_pemuda || 0) + (r.kehadiran_anak || 0),
      PersembahanUmum: r.persembahan_umum || 0,
      Perpuluhan: r.perpuluhan || 0,
      Diakonia: r.diakonia || 0,
      TotalPemasukan: r.total_pemasukan !== undefined ? r.total_pemasukan : ((r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0)),
      TotalPengeluaran: r.pengeluaran || 0
    }));
  }, [filteredReports]);

  const categoryBadge = (cat: WorshipCategory) => {
    switch (cat) {
      case "Umum":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"><Church className="w-3 h-3"/> Umum</span>;
      case "Remaja":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60"><Users className="w-3 h-3"/> Remaja</span>;
      case "Anak":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"><Sparkles className="w-3 h-3"/> Anak (SM)</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600"><Layers className="w-3 h-3"/> Lainnya</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      
      {/* Top Header & Integrated Action Bar */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <Layers className="w-5 h-5" />
              </span>
              {activeCategory === "Semua" ? "Ringkasan Kebaktian Terpadu" : `Laporan Kebaktian ${activeCategory}`}
            </h2>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {filteredReports.length} Laporan Ibadah
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeCategory === "Semua"
              ? "Kelola, pantau, dan akses data kehadiran jemaat serta persembahan seluruh ibadah dengan nyaman"
              : `Kelola data kehadiran dan laporan persembahan khusus Kebaktian ${activeCategory}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          {/* Quick Combined Form Button */}
          <button
            onClick={() => setIsMultiServiceModalOpen(true)}
            className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm focus:outline-none shrink-0"
            title="Form Input Terpadu Sekaligus (Umum, Anak, Remaja)"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Input Sekaligus 3 Ibadah</span>
          </button>

          <button
            onClick={() => {
              setSelectedReport(undefined);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold transition-colors focus:outline-none flex items-center gap-2 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Laporan {activeCategory !== "Semua" ? activeCategory : ""}</span>
          </button>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2 focus:outline-none border border-slate-200 dark:border-slate-600 shrink-0"
            title="Input Massal Baris Grid"
          >
            <TableProperties className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Grid Massal</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative group shrink-0">
            <button
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2 focus:outline-none border border-slate-200 dark:border-slate-600"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Ekspor & Impor</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right scale-95 group-hover:scale-100 p-2">
              <div className="flex flex-col gap-1">
                <button
                  onClick={handleExportExcel}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" /> Unduh Excel ({activeCategory})
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" /> Unduh PDF Ringkasan
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                <button
                  onClick={handleDownloadTemplateExcel}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4 text-slate-400" /> Template Excel
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4 text-slate-400" /> Impor dari Excel
                </button>
              </div>
            </div>
          </div>

          <input
            type="file"
            accept=".xlsx, .xls"
            ref={fileInputRef}
            onChange={handleImportExcel}
            className="hidden"
          />
        </div>
      </div>

      {/* Category Tabs Switcher */}
      <div className="bg-slate-50/90 dark:bg-slate-900/40 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 overflow-x-auto shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">Kategori:</span>
          
          <button
            onClick={() => handleCategorySwitch("Semua")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeCategory === "Semua"
                ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Semua Terpadu</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeCategory === "Semua" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
              {categoryCounts.Semua}
            </span>
          </button>

          <button
            onClick={() => handleCategorySwitch("Umum")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeCategory === "Umum"
                ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Church className="w-3.5 h-3.5" />
            <span>Kebaktian Umum</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeCategory === "Umum" ? "bg-white/20 text-white" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300"}`}>
              {categoryCounts.Umum}
            </span>
          </button>

          <button
            onClick={() => handleCategorySwitch("Remaja")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeCategory === "Remaja"
                ? "bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/20"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Kebaktian Remaja</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeCategory === "Remaja" ? "bg-white/20 text-white" : "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300"}`}>
              {categoryCounts.Remaja}
            </span>
          </button>

          <button
            onClick={() => handleCategorySwitch("Anak")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeCategory === "Anak"
                ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/20"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kebaktian Anak (SM)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeCategory === "Anak" ? "bg-white/20 text-white" : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300"}`}>
              {categoryCounts.Anak}
            </span>
          </button>
        </div>

        {/* Toggle KPI Header */}
        <button
          onClick={() => setShowKpiCards(!showKpiCards)}
          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
          title="Sembunyikan/Tampilkan Kartu Ringkasan Metrik"
        >
          <span>{showKpiCards ? "Sembunyikan Metrik" : "Tampilkan Metrik"}</span>
          {showKpiCards ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Main KPI Summary Dashboard Cards (Collapsible for maximum bottom space) */}
      {reports.length > 0 && !isLoading && showKpiCards && (
        <div className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
            
            {/* Kehadiran Card */}
            <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {activeCategory === "Semua" ? "Total Seluruh Hadir" : `Total Hadir ${activeCategory}`}
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  {grandTotalHadir.toLocaleString("id-ID")}
                </span>
                <span className="text-xs text-slate-500 font-semibold">jiwa</span>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                {activeCategory === "Semua" ? (
                  <div className="flex gap-2 flex-wrap text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-blue-600">Umum: {hadirByUmum}</span>
                    <span>•</span>
                    <span className="font-bold text-purple-600">Remaja: {hadirByRemaja}</span>
                    <span>•</span>
                    <span className="font-bold text-amber-600">Anak: {hadirByAnak}</span>
                  </div>
                ) : (
                  <span className="text-slate-500">Rata-rata: <strong className="text-slate-700 dark:text-slate-200">{avgKehadiran}</strong> orang/ibadah</span>
                )}
              </div>
            </div>

            {/* Pemasukan Card */}
            <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Total Pemasukan
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-1.5">
                <span className="text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(totalAllPemasukan)}
                </span>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>Persembahan & Perpuluhan</span>
                <span className="font-bold text-emerald-600">{filteredReports.length} Ibadah</span>
              </div>
            </div>

            {/* Pengeluaran Card */}
            <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Total Pengeluaran
                </span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-1.5">
                <span className="text-lg sm:text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                  {formatRupiah(totalAllPengeluaran)}
                </span>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>Operasional Ibadah</span>
                <span className="text-rose-600 font-bold font-mono">TERPAKAI</span>
              </div>
            </div>

            {/* Saldo / Surplus Card */}
            <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Surplus / Saldo Bersih
                </span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${totalAllPemasukan - totalAllPengeluaran >= 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600'}`}>
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-1.5">
                <span className={`text-lg sm:text-xl font-black font-mono ${totalAllPemasukan - totalAllPengeluaran >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600'}`}>
                  {formatRupiah(totalAllPemasukan - totalAllPengeluaran)}
                </span>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>Hasil Bersih Ibadah</span>
                <span className={`font-bold ${totalAllPemasukan - totalAllPengeluaran >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {totalAllPemasukan - totalAllPengeluaran >= 0 ? 'Surplus (+)' : 'Defisit (-)'}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Main Content Area: Spacious & Large Bottom Service List & Cards */}
      <div className="flex-1 overflow-auto flex flex-col bg-slate-50/50 dark:bg-slate-900/20">
        
        {/* Toggleable Visual Charts Section */}
        {reports.length > 0 && !isLoading && showCharts && (
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 shrink-0 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>Visualisasi & Tren ({activeCategory})</span>
                </h3>
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600 text-xs">
                <button
                  onClick={() => setChartView("attendance")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${chartView === "attendance" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"}`}
                >
                  Tren Kehadiran
                </button>
                <button
                  onClick={() => setChartView("finance")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${chartView === "finance" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"}`}
                >
                  Tren Keuangan
                </button>
                <button
                  onClick={() => setChartView("offerings")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${chartView === "offerings" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"}`}
                >
                  Komposisi Persembahan
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === "attendance" ? (
                    <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
                      <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} stroke="#cbd5e1" />
                      <YAxis tick={{fontSize: 10, fill: '#64748b'}} stroke="#cbd5e1" />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Line type="monotone" name="Dewasa" dataKey="Dewasa" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" name="Pemuda/Remaja" dataKey="Pemuda" stroke="#9333ea" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" name="Anak-Anak" dataKey="Anak" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" name="Total Hadir" dataKey="Total" stroke="#10b981" strokeDasharray="4 4" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  ) : chartView === "finance" ? (
                    <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
                      <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} stroke="#cbd5e1" />
                      <YAxis tick={{fontSize: 10, fill: '#64748b'}} stroke="#cbd5e1" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                        formatter={(value: number) => formatRupiah(value)}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Line type="monotone" name="Pemasukan" dataKey="TotalPemasukan" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" name="Pengeluaran" dataKey="TotalPengeluaran" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
                      <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} stroke="#cbd5e1" />
                      <YAxis tick={{fontSize: 10, fill: '#64748b'}} stroke="#cbd5e1" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                        formatter={(value: number) => formatRupiah(value)}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar name="Persembahan Umum" dataKey="PersembahanUmum" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar name="Perpuluhan" dataKey="Perpuluhan" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar name="Diakonia" dataKey="Diakonia" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Filter Controls & View Switcher Toolbar */}
        {!isLoading && (
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-3.5 sm:p-4 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center shrink-0">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari ibadah, tanggal, catatan..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm font-medium"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filters & View Modes */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              
              {/* Preset Period Buttons */}
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden lg:inline">Periode:</label>
                <select
                  className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs sm:text-sm font-semibold shadow-sm cursor-pointer"
                  value={dateFilterMode}
                  onChange={(e) => {
                    setDateFilterMode(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="Semua">Semua Waktu</option>
                  <option value="Bulan Ini">Bulan Ini</option>
                  <option value="Bulan Lalu">Bulan Lalu</option>
                  <option value="Tahun Ini">Tahun Ini</option>
                  <option value="Bulan">Pilih Bulan</option>
                  <option value="Kustom">Rentang Tanggal</option>
                </select>
              </div>

              {dateFilterMode === "Bulan" && (
                <MonthYearInputMask
                  className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-28 text-xs sm:text-sm font-mono shadow-sm"
                  value={monthYearFilter}
                  onChange={(e) => {
                    setMonthYearFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              )}

              {dateFilterMode === "Kustom" && (
                <div className="flex items-center gap-1.5">
                  <DateInputMask
                    className="border border-slate-200 dark:border-slate-600 rounded-xl px-2.5 py-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-28 text-xs font-mono shadow-sm"
                    value={startDate}
                    name="startDate"
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="DD-MM-YYYY"
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <DateInputMask
                    className="border border-slate-200 dark:border-slate-600 rounded-xl px-2.5 py-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-28 text-xs font-mono shadow-sm"
                    value={endDate}
                    name="endDate"
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="DD-MM-YYYY"
                  />
                </div>
              )}

              {uniqueNamaIbadah.length > 0 && (
                <select
                  className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs sm:text-sm font-semibold shadow-sm max-w-[160px] truncate cursor-pointer"
                  value={ibadahFilter}
                  onChange={(e) => {
                    setIbadahFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="Semua">Semua Ibadah</option>
                  {uniqueNamaIbadah.map((nama, idx) => (
                    <option key={idx} value={nama}>{nama}</option>
                  ))}
                </select>
              )}

              {/* Chart Toggle */}
              <button
                onClick={() => setShowCharts(!showCharts)}
                className={`px-3 py-2 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm ${showCharts ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100'}`}
                title="Sembunyikan/Tampilkan Grafik"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">{showCharts ? 'Tutup Grafik' : 'Grafik'}</span>
              </button>

              {/* View Mode Toggle: Bento Grid vs Spacious Table */}
              <div className="flex bg-slate-100 dark:bg-slate-700/80 p-1 rounded-xl border border-slate-200 dark:border-slate-600 shrink-0">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "cards"
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                  title="Tampilan Kartu Visual Luas"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kartu Luas</span>
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "table"
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                  title="Tampilan Tabel Rinci"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tabel Luas</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Dynamic Display Area: Spacious Cards vs Spacious Table */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="py-20 text-center text-slate-500">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-bold text-slate-600 dark:text-slate-300 text-sm">Memuat data kebaktian...</span>
              </div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-20 text-center text-slate-500 bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-8 max-w-xl mx-auto my-6">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
                  <Info className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">Tidak ada data laporan kebaktian ditemukan</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                  Coba ubah kata kunci pencarian, pilih rentang tanggal lain, atau klik tombol "Tambah Laporan" untuk memasukkan data kebaktian baru.
                </p>
                <button
                  onClick={() => {
                    setSelectedReport(undefined);
                    setIsModalOpen(true);
                  }}
                  className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Laporan Ibadah</span>
                </button>
              </div>
            </div>
          ) : viewMode === "cards" ? (
            /* ========================================================================= */
            /* VIEW MODE 1: SPACIOUS BENTO CARDS (LARGE, CLEAR, EASY TO ACCESS)           */
            /* ========================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {paginatedReports.map((report) => {
                const cat = getWorshipCategory(report);
                const totalKehadiran = (report.kehadiran_dewasa || 0) + (report.kehadiran_pemuda || 0) + (report.kehadiran_anak || 0);
                const totalPemasukan = report.total_pemasukan !== undefined 
                  ? report.total_pemasukan 
                  : ((report.persembahan_umum || 0) + (report.perpuluhan || 0) + (report.diakonia || 0) + (report.pemasukan_lainnya || 0));
                const totalPengeluaran = report.pengeluaran || 0;
                const surplus = totalPemasukan - totalPengeluaran;

                return (
                  <div 
                    key={report.id} 
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col overflow-hidden group"
                  >
                    {/* Card Top Header */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/60 bg-gradient-to-r from-slate-50/70 to-white dark:from-slate-800/80 dark:to-slate-800 flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          {categoryBadge(cat)}
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatFullDate(report.tanggal_ibadah)}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {report.nama_ibadah}
                        </h3>
                      </div>
                    </div>

                    {/* Card Body: Attendance & Finances in Spacious Layout */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col gap-4">
                      
                      {/* Kehadiran Summary Section */}
                      <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3.5 border border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-blue-600" /> Total Kehadiran Jemaat
                          </span>
                          <span className="text-base font-black px-2.5 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-mono">
                            {totalKehadiran} Jiwa
                          </span>
                        </div>

                        {/* Breakdown pills */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 block font-medium">Dewasa</span>
                            <span className="font-extrabold font-mono text-slate-800 dark:text-slate-200">{report.kehadiran_dewasa || 0}</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 block font-medium">Remaja/Pemuda</span>
                            <span className="font-extrabold font-mono text-purple-600 dark:text-purple-400">{report.kehadiran_pemuda || 0}</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 block font-medium">Anak-anak</span>
                            <span className="font-extrabold font-mono text-amber-600 dark:text-amber-400">{report.kehadiran_anak || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Metrics in Spacious Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Pemasukan */}
                        <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl">
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                            Pemasukan
                          </span>
                          <span className="text-sm sm:text-base font-black font-mono text-emerald-700 dark:text-emerald-300 block mt-0.5">
                            {formatRupiah(totalPemasukan)}
                          </span>
                        </div>

                        {/* Pengeluaran */}
                        <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl">
                          <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                            Pengeluaran
                          </span>
                          <span className="text-sm sm:text-base font-black font-mono text-rose-700 dark:text-rose-300 block mt-0.5">
                            {formatRupiah(totalPengeluaran)}
                          </span>
                        </div>
                      </div>

                      {/* Surplus / Defisit Banner */}
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                        surplus >= 0 
                          ? 'bg-blue-50/60 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300' 
                          : 'bg-amber-50/60 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300'
                      }`}>
                        <span>Hasil Bersih Ibadah:</span>
                        <span className="font-mono text-sm font-black">
                          {surplus >= 0 ? '+' : ''}{formatRupiah(surplus)}
                        </span>
                      </div>

                      {/* Keterangan if available */}
                      {report.keterangan ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          "{report.keterangan}"
                        </p>
                      ) : null}

                    </div>

                    {/* Card Actions (Large & Touch-Friendly) */}
                    <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 mt-auto">
                      <button
                        onClick={() => setViewDetailReport(report)}
                        className="flex-1 py-2 px-3 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Rincian</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setIsModalOpen(true);
                        }}
                        className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        title="Sunting Laporan Ibadah"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Sunting</span>
                      </button>

                      <button
                        onClick={() => report.id && setReportToDelete(report.id)}
                        className="py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-bold transition-all flex items-center justify-center shadow-sm"
                        title="Hapus Laporan Ibadah"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            /* ========================================================================= */
            /* VIEW MODE 2: SPACIOUS TABLE (WIDE, ROOMY, CLEAR FONTS & SPACING)          */
            /* ========================================================================= */
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse whitespace-nowrap min-w-max">
                  <thead className="bg-slate-100/90 dark:bg-slate-700/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
                    <tr className="text-slate-600 dark:text-slate-300 uppercase font-bold text-xs">
                      <th className="py-4 px-5">Tanggal Ibadah</th>
                      {activeCategory === "Semua" && <th className="py-4 px-4">Kategori</th>}
                      <th className="py-4 px-5">Nama Ibadah & Keterangan</th>
                      <th className="py-4 px-4 text-center">
                        {activeCategory === "Anak" ? (
                          <>Kehadiran (Guru / Anak)</>
                        ) : activeCategory === "Remaja" ? (
                          <>Kehadiran (Pembina / Remaja)</>
                        ) : (
                          <>Kehadiran (D / P / A)</>
                        )}
                      </th>
                      <th className="py-4 px-4 text-center">Total Jiwa</th>
                      <th className="py-4 px-5 text-right">Pemasukan</th>
                      <th className="py-4 px-5 text-right">Pengeluaran</th>
                      <th className="py-4 px-5 text-right">Surplus/Net</th>
                      <th className="py-4 px-5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-800 dark:text-slate-200">
                    {paginatedReports.map((report) => {
                      const cat = getWorshipCategory(report);
                      const totalKehadiran = (report.kehadiran_dewasa || 0) + (report.kehadiran_pemuda || 0) + (report.kehadiran_anak || 0);
                      const totalPemasukan = report.total_pemasukan !== undefined 
                        ? report.total_pemasukan 
                        : ((report.persembahan_umum || 0) + (report.perpuluhan || 0) + (report.diakonia || 0) + (report.pemasukan_lainnya || 0));
                      const totalPengeluaran = report.pengeluaran || 0;
                      const surplus = totalPemasukan - totalPengeluaran;

                      return (
                        <tr key={report.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-700/40 transition-colors group">
                          <td className="py-4 px-5 font-bold text-slate-800 dark:text-slate-200">
                            {formatDate(report.tanggal_ibadah)}
                            <div className="text-[11px] font-medium text-slate-400">
                              {formatFullDate(report.tanggal_ibadah).split(',')[0]}
                            </div>
                          </td>
                          
                          {activeCategory === "Semua" && (
                            <td className="py-4 px-4">
                              {categoryBadge(cat)}
                            </td>
                          )}

                          <td className="py-4 px-5">
                            <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{report.nama_ibadah}</div>
                            {report.keterangan ? (
                              <div className="text-xs font-normal text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5" title={report.keterangan}>
                                {report.keterangan}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">-</span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-center">
                            {cat === "Anak" ? (
                              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                <span className="font-bold text-slate-800 dark:text-slate-100" title="Guru">{report.kehadiran_dewasa || 0}</span> Guru + <span className="font-bold text-amber-600 dark:text-amber-400" title="Anak">{report.kehadiran_anak || 0}</span> Anak
                              </div>
                            ) : cat === "Remaja" ? (
                              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                <span className="font-bold text-slate-800 dark:text-slate-100" title="Pembina">{report.kehadiran_dewasa || 0}</span> Pembina + <span className="font-bold text-purple-600 dark:text-purple-400" title="Remaja">{report.kehadiran_pemuda || 0}</span> Remaja
                              </div>
                            ) : (
                              <div className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5">
                                <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md font-mono font-bold" title="Dewasa">{report.kehadiran_dewasa || 0} D</span>
                                <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md font-mono font-bold" title="Pemuda">{report.kehadiran_pemuda || 0} P</span>
                                <span className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md font-mono font-bold" title="Anak">{report.kehadiran_anak || 0} A</span>
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className="inline-block px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono font-black text-sm">
                              {totalKehadiran}
                            </span>
                          </td>

                          <td className="py-4 px-5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            {formatRupiah(totalPemasukan)}
                          </td>

                          <td className="py-4 px-5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                            {formatRupiah(totalPengeluaran)}
                          </td>

                          <td className="py-4 px-5 text-right font-mono font-black text-sm">
                            <span className={surplus >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600'}>
                              {surplus >= 0 ? '+' : ''}{formatRupiah(surplus)}
                            </span>
                          </td>

                          <td className="py-4 px-5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setViewDetailReport(report)}
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-xl transition-all"
                                title="Lihat Rincian Lengkap"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedReport(report);
                                  setIsModalOpen(true);
                                }}
                                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl transition-all"
                                title="Sunting Laporan"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => report.id && setReportToDelete(report.id)}
                                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/40 rounded-xl transition-all"
                                title="Hapus Laporan"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {filteredReports.length > 0 && !isLoading && (
                    <tfoot className="bg-slate-100 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-600 shadow-sm z-10 sticky bottom-0 text-sm">
                      <tr>
                        <td colSpan={activeCategory === "Semua" ? 4 : 3} className="py-4 px-5 text-right font-black text-slate-700 dark:text-slate-200">
                          TOTAL ({filteredReports.length} LAPORAN):
                        </td>
                        <td className="py-4 px-4 text-center font-mono font-black text-base bg-blue-100/60 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200">
                          {grandTotalHadir}
                        </td>
                        <td className="py-4 px-5 text-right bg-emerald-100/60 dark:bg-emerald-900/50 font-mono text-emerald-700 dark:text-emerald-300 font-black text-base">
                          {formatRupiah(totalAllPemasukan)}
                        </td>
                        <td className="py-4 px-5 text-right bg-rose-100/60 dark:bg-rose-900/50 font-mono text-rose-700 dark:text-rose-300 font-black text-base">
                          {formatRupiah(totalAllPengeluaran)}
                        </td>
                        <td className="py-4 px-5 text-right font-mono font-black text-base text-blue-800 dark:text-blue-300">
                          {formatRupiah(totalAllPemasukan - totalAllPengeluaran)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Spacious Footer Pagination & Rows Selector */}
        {filteredReports.length > 0 && !isLoading && (
          <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 shadow-sm">
            <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
              <span>
                Menampilkan {itemsPerPage === 0 ? filteredReports.length : Math.min((currentPage - 1) * itemsPerPage + 1, filteredReports.length)} - {itemsPerPage === 0 ? filteredReports.length : Math.min(currentPage * itemsPerPage, filteredReports.length)} dari {filteredReports.length} data kebaktian
              </span>
              
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
                <label className="text-xs">Baris:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                >
                  <option value={12}>12 baris</option>
                  <option value={24}>24 baris</option>
                  <option value={48}>48 baris</option>
                  <option value={0}>Semua ({filteredReports.length})</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && itemsPerPage > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all shadow-sm"
                >
                  Sebelumnya
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 2 + i;
                      if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all shadow-sm"
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Interactive Detail Modal (Wide, comprehensive & accessible) */}
      {viewDetailReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {categoryBadge(getWorshipCategory(viewDetailReport))}
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatFullDate(viewDetailReport.tanggal_ibadah)}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {viewDetailReport.nama_ibadah}
                </h3>
              </div>
              <button
                onClick={() => setViewDetailReport(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              
              {/* Kehadiran Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" /> Rincian Kehadiran Jemaat
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 text-center">
                    <span className="text-xs text-blue-600 dark:text-blue-300 font-bold block">Total Jiwa</span>
                    <span className="text-2xl font-black font-mono text-blue-900 dark:text-blue-100">
                      {(viewDetailReport.kehadiran_dewasa || 0) + (viewDetailReport.kehadiran_pemuda || 0) + (viewDetailReport.kehadiran_anak || 0)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">Dewasa</span>
                    <span className="text-2xl font-black font-mono text-slate-800 dark:text-slate-200">
                      {viewDetailReport.kehadiran_dewasa || 0}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800/50 text-center">
                    <span className="text-xs text-purple-600 dark:text-purple-300 font-bold block">Remaja/Pemuda</span>
                    <span className="text-2xl font-black font-mono text-purple-900 dark:text-purple-100">
                      {viewDetailReport.kehadiran_pemuda || 0}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800/50 text-center">
                    <span className="text-xs text-amber-600 dark:text-amber-300 font-bold block">Anak-Anak</span>
                    <span className="text-2xl font-black font-mono text-amber-900 dark:text-amber-100">
                      {viewDetailReport.kehadiran_anak || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rincian Keuangan Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Rincian Persembahan & Pemasukan
                </h4>
                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2.5 text-sm">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Persembahan Umum / Ibadah:</span>
                    <span className="font-mono font-bold">{formatRupiah(viewDetailReport.persembahan_umum || 0)}</span>
                  </div>
                  {viewDetailReport.persembahan_anak ? (
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                      <span>Persembahan Sekolah Minggu:</span>
                      <span className="font-mono font-bold">{formatRupiah(viewDetailReport.persembahan_anak)}</span>
                    </div>
                  ) : null}
                  {viewDetailReport.persembahan_remaja ? (
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                      <span>Persembahan Remaja:</span>
                      <span className="font-mono font-bold">{formatRupiah(viewDetailReport.persembahan_remaja)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Perpuluhan Jemaat:</span>
                    <span className="font-mono font-bold">{formatRupiah(viewDetailReport.perpuluhan || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Diakonia / Kasih:</span>
                    <span className="font-mono font-bold">{formatRupiah(viewDetailReport.diakonia || 0)}</span>
                  </div>
                  {viewDetailReport.pemasukan_lainnya ? (
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                      <span>Pemasukan Lainnya:</span>
                      <span className="font-mono font-bold">{formatRupiah(viewDetailReport.pemasukan_lainnya)}</span>
                    </div>
                  ) : null}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-emerald-700 dark:text-emerald-400 font-extrabold text-base">
                    <span>Total Pemasukan:</span>
                    <span className="font-mono">{formatRupiah(viewDetailReport.total_pemasukan || ((viewDetailReport.persembahan_umum || 0) + (viewDetailReport.perpuluhan || 0) + (viewDetailReport.diakonia || 0) + (viewDetailReport.pemasukan_lainnya || 0)))}</span>
                  </div>
                </div>
              </div>

              {/* Rincian Pengeluaran Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" /> Rincian Pengeluaran Operasional
                </h4>
                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2 text-sm">
                  {viewDetailReport.pengeluaran_details && viewDetailReport.pengeluaran_details.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {viewDetailReport.pengeluaran_details.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-slate-600 dark:text-slate-300 text-xs">
                          <span>• {item.keterangan}</span>
                          <span className="font-mono font-bold">{formatRupiah(item.nominal)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-rose-700 dark:text-rose-400 font-extrabold text-base">
                    <span>Total Pengeluaran:</span>
                    <span className="font-mono">{formatRupiah(viewDetailReport.pengeluaran || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Catatan / Keterangan */}
              {viewDetailReport.keterangan ? (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Catatan Tambahan</h4>
                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                    {viewDetailReport.keterangan}
                  </div>
                </div>
              ) : null}

            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center gap-3">
              <button
                onClick={() => {
                  setSelectedReport(viewDetailReport);
                  setViewDetailReport(null);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                <span>Sunting Laporan</span>
              </button>

              <button
                onClick={() => setViewDetailReport(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Adaptive Report Modal */}
      <WeeklyReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={selectedReport}
        defaultCategory={activeCategory !== "Semua" ? activeCategory : "Umum"}
        onSave={handleSaveReport}
      />

      {/* Bulk Report Modal */}
      <BulkReportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={(count) => {
          addToast(`Input massal berhasil! ${count} laporan baru ditambahkan.`, "success");
        }}
      />

      {/* Multi-Service Unified Entry Modal */}
      <MultiServiceReportModal
        isOpen={isMultiServiceModalOpen}
        onClose={() => setIsMultiServiceModalOpen(false)}
        onSuccess={(count) => {
          addToast(`Berhasil menyimpan ${count} laporan ibadah secara terpadu!`, "success");
        }}
      />

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Konfirmasi Hapus Laporan</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Apakah Anda yakin ingin menghapus data laporan kebaktian ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3 w-full">
              <button
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors focus:outline-none"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors focus:outline-none shadow-sm"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
