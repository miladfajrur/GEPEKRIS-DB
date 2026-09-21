import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Plus, Edit, Trash2, ArrowUpRight, ArrowDownRight, FileText, Download, 
  DollarSign, Wallet, TrendingUp, Filter, Search, Calendar, BarChart3, 
  Layers, CheckCircle, Info, RefreshCw, X, Printer, Sparkles, Building2, Globe
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, Legend 
} from 'recharts';
import { useToast } from '../ToastContext';
import { FinanceTransaction, WeeklyReport, MisiFinance } from '../types';
import * as XLSX from 'xlsx';
import DateInputMask from './DateInputMask';
import MonthYearInputMask from './MonthYearInputMask';
import { formatDateDDMMYYYY } from '../lib/utils';

// Unified ledger item
interface UnifiedTransaction {
  id: string;
  sourceId: string;
  sourceType: 'finance_transactions' | 'weekly_reports' | 'misi_finance' | 'misi_finance_pembangunan';
  date: Date;
  dateStr: string;
  type: 'Pemasukan' | 'Pengeluaran';
  category: string;
  amount: number;
  description: string;
  originalData?: any;
}

export default function FinancePanel() {
  const { addToast } = useToast();
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('Semua');
  const [typeFilter, setTypeFilter] = useState<string>('Semua');
  const [dateFilterMode, setDateFilterMode] = useState<string>('Semua');
  const [monthYearFilter, setMonthYearFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Chart view toggle
  const [showChart, setShowChart] = useState(true);

  // States for Generic Finance form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<UnifiedTransaction | null>(null);
  const [formData, setFormData] = useState<Partial<FinanceTransaction>>({
    tenantId: 'gpstiaa',
    date: new Date().toISOString().split('T')[0],
    type: 'Pemasukan',
    category: 'Kas Umum',
    amount: 0,
    description: '',
  });

  const fetchAllData = () => {
    setIsLoading(true);
    const tenantId = 'gpstiaa';

    let allTrans: UnifiedTransaction[] = [];
    let count = 0;
    const checkDone = () => {
      count++;
      if (count === 4) {
        // sort by date desc
        allTrans.sort((a, b) => b.date.getTime() - a.date.getTime());
        setTransactions(allTrans);
        setIsLoading(false);
      }
    };

    const unsubGen = onSnapshot(query(collection(db, 'finance_transactions'), where('tenantId', '==', tenantId)), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as FinanceTransaction));
      allTrans = allTrans.filter(t => t.sourceType !== 'finance_transactions');
      docs.forEach(d => {
        const dObj = new Date(d.date);
        allTrans.push({
          id: `gen-${d.id}`,
          sourceId: d.id!,
          sourceType: 'finance_transactions',
          date: isNaN(dObj.getTime()) ? new Date() : dObj,
          dateStr: d.date,
          type: d.type,
          category: d.category || 'Kas Umum',
          amount: Number(d.amount) || 0,
          description: d.description || '',
          originalData: d
        });
      });
      checkDone();
    }, (e) => { console.error(e); checkDone(); });

    const unsubMisi = onSnapshot(query(collection(db, 'misi_finance'), where('tenantId', '==', tenantId)), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as MisiFinance));
      allTrans = allTrans.filter(t => t.sourceType !== 'misi_finance');
      docs.forEach(d => {
        const dObj = new Date(d.date);
        allTrans.push({
          id: `misi-${d.id}`,
          sourceId: d.id!,
          sourceType: 'misi_finance',
          date: isNaN(dObj.getTime()) ? new Date() : dObj,
          dateStr: d.date,
          type: d.type,
          category: `Misi: ${d.category}`,
          amount: Number(d.amount) || 0,
          description: d.description || 'Kas Misi Kaltara',
          originalData: d
        });
      });
      checkDone();
    }, (e) => { console.error(e); checkDone(); });

    const unsubPembangunan = onSnapshot(query(collection(db, 'misi_finance_pembangunan'), where('tenantId', '==', tenantId)), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as MisiFinance));
      allTrans = allTrans.filter(t => t.sourceType !== 'misi_finance_pembangunan');
      docs.forEach(d => {
        const dObj = new Date(d.date);
        allTrans.push({
          id: `pem-${d.id}`,
          sourceId: d.id!,
          sourceType: 'misi_finance_pembangunan',
          date: isNaN(dObj.getTime()) ? new Date() : dObj,
          dateStr: d.date,
          type: d.type,
          category: `Pembangunan: ${d.category}`,
          amount: Number(d.amount) || 0,
          description: d.description || 'Kas Pembangunan',
          originalData: d
        });
      });
      checkDone();
    }, (e) => { console.error(e); checkDone(); });

    const unsubWeekly = onSnapshot(query(collection(db, 'weekly_reports'), where('tenantId', '==', tenantId)), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as WeeklyReport));
      allTrans = allTrans.filter(t => t.sourceType !== 'weekly_reports');
      docs.forEach(w => {
        const dateRaw = w.tanggal_ibadah || '';
        const d = dateRaw.includes('-') && dateRaw.split('-')[0].length === 4 
          ? new Date(dateRaw) 
          : new Date(dateRaw.split('-').reverse().join('-'));
        
        const validDate = isNaN(d.getTime()) ? new Date() : d;

        // Pemasukan Ibadah
        const totalPem = w.total_pemasukan !== undefined 
          ? w.total_pemasukan 
          : ((w.persembahan_umum || 0) + (w.perpuluhan || 0) + (w.diakonia || 0) + (w.pemasukan_lainnya || 0));
        
        if (totalPem > 0) {
          allTrans.push({
            id: `wk-in-${w.id}`,
            sourceId: w.id!,
            sourceType: 'weekly_reports',
            date: validDate,
            dateStr: w.tanggal_ibadah,
            type: 'Pemasukan',
            category: `Ibadah: ${w.nama_ibadah}`,
            amount: totalPem,
            description: `Persembahan Kebaktian (${w.nama_ibadah})`,
            originalData: w
          });
        }

        // Pengeluaran Ibadah
        if (w.pengeluaran_details && w.pengeluaran_details.length > 0) {
          w.pengeluaran_details.forEach((exp, idx) => {
            allTrans.push({
              id: `wk-out-${w.id}-${exp.id || idx}`,
              sourceId: w.id!,
              sourceType: 'weekly_reports',
              date: validDate,
              dateStr: w.tanggal_ibadah,
              type: 'Pengeluaran',
              category: exp.sumber ? `Ibadah: ${exp.sumber}` : `Pengeluaran ${w.nama_ibadah}`,
              amount: Number(exp.jumlah) || 0,
              description: exp.keterangan || `Pengeluaran ${w.nama_ibadah}`,
              originalData: w
            });
          });
        } else if (w.pengeluaran && w.pengeluaran > 0) {
          allTrans.push({
            id: `wk-out-${w.id}-legacy`,
            sourceId: w.id!,
            sourceType: 'weekly_reports',
            date: validDate,
            dateStr: w.tanggal_ibadah,
            type: 'Pengeluaran',
            category: `Pengeluaran: ${w.nama_ibadah}`,
            amount: Number(w.pengeluaran) || 0,
            description: w.keterangan || `Operasional Ibadah ${w.nama_ibadah}`,
            originalData: w
          });
        }
      });
      checkDone();
    }, (e) => { console.error(e); checkDone(); });

    return () => {
      unsubGen(); unsubMisi(); unsubPembangunan(); unsubWeekly();
    };
  };

  useEffect(() => {
    const unsub = fetchAllData();
    return () => unsub();
  }, []);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(angka);
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Source filter
      if (sourceFilter !== 'Semua') {
        if (sourceFilter === 'Kas Umum' && t.sourceType !== 'finance_transactions') return false;
        if (sourceFilter === 'Ibadah Mingguan' && t.sourceType !== 'weekly_reports') return false;
        if (sourceFilter === 'Misi Kaltara' && t.sourceType !== 'misi_finance') return false;
        if (sourceFilter === 'Pembangunan' && t.sourceType !== 'misi_finance_pembangunan') return false;
      }

      // Type filter
      if (typeFilter !== 'Semua' && t.type !== typeFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const catMatch = (t.category || '').toLowerCase().includes(q);
        const descMatch = (t.description || '').toLowerCase().includes(q);
        const dateMatch = (formatDateDDMMYYYY(t.dateStr)).toLowerCase().includes(q);
        if (!catMatch && !descMatch && !dateMatch) return false;
      }

      // Date filtering
      if (dateFilterMode === 'Semua') return true;

      const reportDate = t.date;
      const now = new Date();

      if (dateFilterMode === 'Bulan Ini') {
        return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
      }

      if (dateFilterMode === 'Bulan Lalu') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return reportDate.getMonth() === lastMonth.getMonth() && reportDate.getFullYear() === lastMonth.getFullYear();
      }

      if (dateFilterMode === 'Tahun Ini') {
        return reportDate.getFullYear() === now.getFullYear();
      }

      if (dateFilterMode === 'Bulan') {
        if (!monthYearFilter) return true;
        const parts = monthYearFilter.split('-');
        if (parts.length === 2 && parts[0].length === 4) {
          return reportDate.getMonth() + 1 === parseInt(parts[1], 10) && reportDate.getFullYear() === parseInt(parts[0], 10);
        }
        return false;
      }

      if (dateFilterMode === 'Kustom') {
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
  }, [transactions, sourceFilter, typeFilter, searchTerm, dateFilterMode, monthYearFilter, startDate, endDate]);

  // Aggregated totals for the active view
  const totalPemasukan = useMemo(() => filteredTransactions.filter(t => t.type === 'Pemasukan').reduce((a, b) => a + b.amount, 0), [filteredTransactions]);
  const totalPengeluaran = useMemo(() => filteredTransactions.filter(t => t.type === 'Pengeluaran').reduce((a, b) => a + b.amount, 0), [filteredTransactions]);
  const saldo = totalPemasukan - totalPengeluaran;

  // Breakdown by Source
  const incomeByIbadah = useMemo(() => filteredTransactions.filter(t => t.sourceType === 'weekly_reports' && t.type === 'Pemasukan').reduce((a, b) => a + b.amount, 0), [filteredTransactions]);
  const incomeByKasUmum = useMemo(() => filteredTransactions.filter(t => t.sourceType === 'finance_transactions' && t.type === 'Pemasukan').reduce((a, b) => a + b.amount, 0), [filteredTransactions]);
  const incomeByMisi = useMemo(() => filteredTransactions.filter(t => (t.sourceType === 'misi_finance' || t.sourceType === 'misi_finance_pembangunan') && t.type === 'Pemasukan').reduce((a, b) => a + b.amount, 0), [filteredTransactions]);

  // Monthly aggregated chart data
  const chartMonthlyData = useMemo(() => {
    const monthlyMap: { [key: string]: { monthName: string; rawDate: Date; Pemasukan: number; Pengeluaran: number; Saldo: number } } = {};
    
    filteredTransactions.forEach(t => {
      const year = t.date.getFullYear();
      const month = t.date.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      if (!monthlyMap[key]) {
        const monthLabel = t.date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        monthlyMap[key] = {
          monthName: monthLabel,
          rawDate: new Date(year, month, 1),
          Pemasukan: 0,
          Pengeluaran: 0,
          Saldo: 0
        };
      }

      if (t.type === 'Pemasukan') {
        monthlyMap[key].Pemasukan += t.amount;
      } else {
        monthlyMap[key].Pengeluaran += t.amount;
      }
    });

    const result = Object.values(monthlyMap).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    result.forEach(item => {
      item.Saldo = item.Pemasukan - item.Pengeluaran;
    });
    return result;
  }, [filteredTransactions]);

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      addToast("Jumlah nominal harus lebih dari 0.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (formData.id) {
        const docRef = doc(db, 'finance_transactions', formData.id);
        await updateDoc(docRef, {
          ...formData,
          amount: Number(formData.amount),
          updatedAt: serverTimestamp()
        });
        addToast("Transaksi berhasil diperbarui.", "success");
      } else {
        await addDoc(collection(db, 'finance_transactions'), {
          ...formData,
          amount: Number(formData.amount),
          tenantId: 'gpstiaa',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        addToast("Transaksi kas umum berhasil ditambahkan.", "success");
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      addToast("Gagal menyimpan transaksi.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await deleteDoc(doc(db, 'finance_transactions', transactionToDelete.sourceId));
      addToast("Transaksi berhasil dihapus.", "success");
      setTransactionToDelete(null);
    } catch (error) {
      console.error(error);
      addToast("Gagal menghapus transaksi.", "error");
    }
  };

  const handleEdit = (t: UnifiedTransaction) => {
    if (t.sourceType !== 'finance_transactions') {
      addToast("Data ini berasal dari modul laporan kebaktian / misi. Silakan edit langsung pada modul sumber.", "info");
      return;
    }
    setFormData({
      id: t.sourceId,
      ...(t.originalData as FinanceTransaction)
    });
    setIsModalOpen(true);
  };

  const handleExportExcel = () => {
    const excelData = filteredTransactions.map(t => {
      const sourceName = t.sourceType === 'finance_transactions' ? 'Kas Umum' :
        t.sourceType === 'weekly_reports' ? 'Laporan Kebaktian' :
        t.sourceType === 'misi_finance' ? 'Misi Kaltara' : 'Pembangunan';

      return {
        "Tanggal": formatDateDDMMYYYY(t.dateStr),
        "Sumber": sourceName,
        "Kategori": t.category,
        "Tipe": t.type,
        "Keterangan": t.description || "-",
        "Pemasukan (Rp)": t.type === 'Pemasukan' ? t.amount : 0,
        "Pengeluaran (Rp)": t.type === 'Pengeluaran' ? t.amount : 0,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Keuangan");
    XLSX.writeFile(workbook, `Laporan_Keuangan_Terintegrasi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;

      const doc = new jsPDF("p", "pt", "a4");
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Laporan Keuangan Terintegrasi - GEPEKRIS TRETES", 40, 45);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Sumber: ${sourceFilter}  |  Tipe: ${typeFilter}  |  Tanggal Cetak: ${formatDateDDMMYYYY(new Date().toISOString())}`, 40, 65);
      doc.setTextColor(0, 0, 0);

      const tableColumns = ["Tanggal", "Sumber", "Kategori & Keterangan", "Pemasukan", "Pengeluaran"];
      const tableRows = filteredTransactions.map(t => {
        const src = t.sourceType === 'finance_transactions' ? 'Kas Umum' :
          t.sourceType === 'weekly_reports' ? 'Kebaktian' :
          t.sourceType === 'misi_finance' ? 'Misi' : 'Pembangunan';

        return [
          formatDateDDMMYYYY(t.dateStr),
          src,
          `${t.category} ${t.description ? `(${t.description})` : ''}`,
          t.type === 'Pemasukan' ? formatRupiah(t.amount) : '-',
          t.type === 'Pengeluaran' ? formatRupiah(t.amount) : '-'
        ];
      });

      autoTable(doc, {
        startY: 85,
        head: [tableColumns],
        body: tableRows,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          3: { halign: 'right', textColor: [16, 185, 129], fontStyle: 'bold' },
          4: { halign: 'right', textColor: [225, 29, 72], fontStyle: 'bold' }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 80;

      // Summary Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(40, finalY + 15, 515, 65, 5, 5, 'FD');

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text("RINGKASAN TOTAL BUKU KAS", 55, finalY + 35);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(`Total Pemasukan: ${formatRupiah(totalPemasukan)}`, 55, finalY + 55);
      doc.text(`Total Pengeluaran: ${formatRupiah(totalPengeluaran)}`, 220, finalY + 55);
      doc.setFont("helvetica", "bold");
      doc.text(`Saldo Akhir: ${formatRupiah(saldo)}`, 380, finalY + 55);

      doc.save(`Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.pdf`);
      addToast("Laporan PDF berhasil diunduh.", "success");
    } catch (e) {
      console.error(e);
      addToast("Gagal export PDF.", "error");
    }
  };

  const getSourceBadge = (sourceType: UnifiedTransaction['sourceType']) => {
    switch (sourceType) {
      case 'finance_transactions':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">Kas Umum</span>;
      case 'weekly_reports':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">Ibadah Mingguan</span>;
      case 'misi_finance':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">Misi Kaltara</span>;
      case 'misi_finance_pembangunan':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">Pembangunan</span>;
    }
  };

  return (
    <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col min-h-0 overflow-hidden">
      
      {/* Top Header */}
      <div className="p-4 md:p-5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Manajemen Keuangan Terintegrasi
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              {filteredTransactions.length} Transaksi
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Buku kas terpadu menggabungkan otomatis persembahan kebaktian, kas umum, misi, dan pembangunan.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          <button
            onClick={() => {
              setFormData({ 
                tenantId: 'gpstiaa', 
                date: new Date().toISOString().split('T')[0], 
                type: 'Pemasukan', 
                category: 'Kas Umum', 
                amount: 0, 
                description: '' 
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-all focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Transaksi Kas Umum</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors shadow-sm focus:outline-none"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors shadow-sm focus:outline-none"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Main KPI Summary Dashboard */}
      <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* Total Pemasukan Card */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Total Pemasukan
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {formatRupiah(totalPemasukan)}
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
              <span className="truncate" title={`Ibadah: ${formatRupiah(incomeByIbadah)}`}>
                Ibadah: {formatRupiah(incomeByIbadah)}
              </span>
              <span className="font-semibold text-emerald-600">IN</span>
            </div>
          </div>

          {/* Total Pengeluaran Card */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Total Pengeluaran
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
                {formatRupiah(totalPengeluaran)}
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Operasional & Layanan</span>
              <span className="font-semibold text-rose-600 font-mono">OUT</span>
            </div>
          </div>

          {/* Saldo Kas Akhir Card */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Saldo Kas Bersih
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${saldo >= 0 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600'}`}>
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-xl font-extrabold font-mono ${saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600'}`}>
                {formatRupiah(saldo)}
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Status Likuiditas</span>
              <span className={`font-bold ${saldo >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {saldo >= 0 ? 'Surplus' : 'Defisit'}
              </span>
            </div>
          </div>

          {/* Sync Sources Info Card */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Integrasi Sumber
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex flex-col gap-1 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span>Kas Umum & Donasi:</span>
                <span className="font-semibold font-mono">{formatRupiah(incomeByKasUmum)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span>Misi & Pembangunan:</span>
                <span className="font-semibold font-mono">{formatRupiah(incomeByMisi)}</span>
              </div>
            </div>
            <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Sinkronisasi Otomatis</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto flex flex-col">
        
        {/* Toggleable Visual Chart Section */}
        {!isLoading && chartMonthlyData.length > 0 && showChart && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 shrink-0">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span>Tren Arus Kas Bulanan (Pemasukan vs Pengeluaran)</span>
              </h3>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartMonthlyData} margin={{ top: 10, right: 20, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
                    <XAxis dataKey="monthName" tick={{fontSize: 10, fill: '#64748b'}} stroke="#cbd5e1" />
                    <YAxis tick={{fontSize: 10, fill: '#64748b'}} stroke="#cbd5e1" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                      formatter={(val: number) => formatRupiah(val)}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar name="Pemasukan" dataKey="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar name="Pengeluaran" dataKey="Pengeluaran" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Source Tabs & Filters Toolbar */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-3.5 flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center text-xs shrink-0">
          
          {/* Source Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {['Semua', 'Kas Umum', 'Ibadah Mingguan', 'Misi Kaltara', 'Pembangunan'].map(src => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${sourceFilter === src ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
              >
                {src === 'Semua' ? 'Semua Sumber' : src}
              </button>
            ))}
          </div>

          {/* Filters & Search Row */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Type Selector */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              <option value="Semua">Semua Tipe</option>
              <option value="Pemasukan">Pemasukan (+)</option>
              <option value="Pengeluaran">Pengeluaran (-)</option>
            </select>

            {/* Period Selector */}
            <select
              value={dateFilterMode}
              onChange={(e) => setDateFilterMode(e.target.value)}
              className="border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              <option value="Semua">Semua Waktu</option>
              <option value="Bulan Ini">Bulan Ini</option>
              <option value="Bulan Lalu">Bulan Lalu</option>
              <option value="Tahun Ini">Tahun Ini</option>
              <option value="Bulan">Pilih Bulan</option>
              <option value="Kustom">Rentang Tanggal</option>
            </select>

            {dateFilterMode === "Bulan" && (
              <MonthYearInputMask
                className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 w-24 text-xs font-mono"
                value={monthYearFilter}
                onChange={(e) => setMonthYearFilter(e.target.value)}
              />
            )}

            {dateFilterMode === "Kustom" && (
              <div className="flex items-center gap-1.5">
                <DateInputMask
                  className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 w-24 text-xs font-mono"
                  value={startDate}
                  name="startDate"
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="DD-MM-YYYY"
                />
                <span>-</span>
                <DateInputMask
                  className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 w-24 text-xs font-mono"
                  value={endDate}
                  name="endDate"
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="DD-MM-YYYY"
                />
              </div>
            )}

            <button
              onClick={() => setShowChart(!showChart)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${showChart ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'}`}
              title="Sembunyikan/Tampilkan Grafik"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{showChart ? 'Tutup Grafik' : 'Buka Grafik'}</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-xs text-left border-collapse whitespace-nowrap min-w-max">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700/80 backdrop-blur-sm shadow-sm z-10">
              <tr className="text-slate-600 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-3">Sumber & Kategori</th>
                <th className="py-3 px-4">Keterangan Transaksi</th>
                <th className="py-3 px-4 text-right">Pemasukan (Rp)</th>
                <th className="py-3 px-4 text-right">Pengeluaran (Rp)</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-800 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Memuat data buku kas terintegrasi...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Info className="w-8 h-8 text-slate-400" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada transaksi ditemukan</p>
                      <p className="text-xs text-slate-500">Coba sesuaikan kata kunci pencarian atau filter sumber.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group">
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {formatDateDDMMYYYY(t.dateStr)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {getSourceBadge(t.sourceType)}
                      </div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {t.category}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={t.description}>
                      {t.description || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {t.type === 'Pemasukan' ? formatRupiah(t.amount) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {t.type === 'Pengeluaran' ? formatRupiah(t.amount) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {t.sourceType === 'finance_transactions' ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(t)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Edit Transaksi Kas Umum"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setTransactionToDelete(t)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700" title="Data disinkronkan otomatis dari modul asal">
                          Tersinkron
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredTransactions.length > 0 && !isLoading && (
              <tfoot className="bg-slate-100 dark:bg-slate-700/90 font-bold border-t-2 border-slate-300 dark:border-slate-600 shadow-sm z-10 sticky bottom-0 text-xs">
                <tr>
                  <td colSpan={3} className="py-3.5 px-4 text-right font-bold text-slate-700 dark:text-slate-200">
                    TOTAL TRANSAKSI TERFILTER ({filteredTransactions.length} DATA):
                  </td>
                  <td className="py-3 px-4 text-right bg-emerald-100/50 dark:bg-emerald-900/40 font-mono text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                    {formatRupiah(totalPemasukan)}
                  </td>
                  <td className="py-3 px-4 text-right bg-rose-100/50 dark:bg-rose-900/40 font-mono text-rose-700 dark:text-rose-300 font-bold text-sm">
                    {formatRupiah(totalPengeluaran)}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-sm text-blue-800 dark:text-blue-300">
                    {formatRupiah(saldo)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

      </div>

      {/* Manual Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto pt-10 pb-10 animate-in fade-in duration-200">
          <div className="flex w-full max-w-md flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-2xl relative my-auto border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <span>{formData.id ? 'Edit Transaksi Kas Umum' : 'Tambah Transaksi Kas Umum'}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="p-6 flex flex-col gap-4 text-xs">
              
              {/* Type Selection */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">Tipe Transaksi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'Pemasukan' })}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 ${formData.type === 'Pemasukan' ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                  >
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                    <span>Pemasukan (Kas Masuk)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'Pengeluaran' })}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-1.5 ${formData.type === 'Pengeluaran' ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                    <span>Pengeluaran (Kas Keluar)</span>
                  </button>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">Tanggal Transaksi</label>
                <input
                  type="date"
                  required
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">Kategori Transaksi</label>
                <input
                  type="text"
                  required
                  list="category-suggestions"
                  placeholder="cth. Kas Umum, Donasi, Pemeliharaan, Listrik..."
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <datalist id="category-suggestions">
                  <option value="Kas Umum" />
                  <option value="Donasi / Persembahan Khusus" />
                  <option value="Diakonia Sosial" />
                  <option value="Operasional Gereja" />
                  <option value="Listrik & Air (PLN/PDAM)" />
                  <option value="Pemeliharaan Gedung / Sarana" />
                  <option value="Honorarium / Transport Pelayan" />
                  <option value="Multimedia & Sound System" />
                  <option value="Konsumsi Acara / Rapat" />
                  <option value="Lainnya" />
                </datalist>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">Nominal (Rp)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                  <input
                    type="text"
                    required
                    value={formData.amount ? Number(formData.amount).toLocaleString('id-ID') : ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, amount: val ? Number(val) : 0 });
                    }}
                    placeholder="0"
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">Keterangan Transaksi</label>
                <textarea
                  rows={2}
                  placeholder="Tuliskan rincian atau catatan..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 mt-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {transactionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Hapus Transaksi Kas</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">
              Apakah Anda yakin ingin menghapus transaksi <strong>{transactionToDelete.category}</strong> senilai <strong>{formatRupiah(transactionToDelete.amount)}</strong>?
            </p>
            <div className="flex justify-end gap-3 w-full">
              <button
                onClick={() => setTransactionToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm"
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
