import React, { useEffect, useState } from "react";
import { Member } from "../types";
import { 
  X, 
  User, 
  Calendar, 
  MapPin, 
  Phone, 
  Edit2, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Gift, 
  ExternalLink, 
  Copy, 
  Check, 
  Church, 
  FileText,
  MessageCircle,
  AlertTriangle
} from "lucide-react";
import { 
  formatNameTitleCase, 
  formatDateDDMMYYYY, 
  formatDateDDMMYYYY_WithMonthName, 
  getDirectDriveLink, 
  getDaysToBirthday 
} from "../lib/utils";
import { useToast } from "../ToastContext";

interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onEdit?: (member: Member) => void;
  onViewCard?: (member: Member) => void;
  canEdit?: boolean;
  canViewCard?: boolean;
}

export default function MemberProfileModal({
  isOpen,
  onClose,
  member,
  onEdit,
  onViewCard,
  canEdit = true,
  canViewCard = true
}: MemberProfileModalProps) {
  const { addToast } = useToast();
  const [copiedNo, setCopiedNo] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !member) return null;

  const isActive = !member.tanggal_keluar;
  const daysToBirthday = member.tanggal_lahir ? getDaysToBirthday(member.tanggal_lahir) : null;
  const isBirthdayToday = daysToBirthday === 0;
  const isBirthdayUpcoming = daysToBirthday !== null && daysToBirthday > 0 && daysToBirthday <= 7;

  // Calculate age
  let currentAge: number | null = null;
  if (member.tanggal_lahir) {
    const birthDateObj = new Date(member.tanggal_lahir);
    if (!isNaN(birthDateObj.getTime())) {
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const nextBirthdayThisYear = new Date(todayDate.getFullYear(), birthDateObj.getMonth(), birthDateObj.getDate());
      const hasPassed = nextBirthdayThisYear.getTime() <= todayDate.getTime();
      let age = todayDate.getFullYear() - birthDateObj.getFullYear();
      if (!hasPassed) age -= 1;
      if (age >= 0) currentAge = age;
    }
  }

  const copyMemberNumber = () => {
    if (member.nomor_anggota) {
      navigator.clipboard.writeText(member.nomor_anggota);
      setCopiedNo(true);
      addToast(`Nomor anggota ${member.nomor_anggota} disalin ke clipboard`, "success");
      setTimeout(() => setCopiedNo(false), 2000);
    }
  };

  // Clean phone number for WhatsApp
  const cleanPhoneForWA = (phone?: string) => {
    if (!phone) return null;
    let p = phone.replace(/[^0-9]/g, "");
    if (p.startsWith("0")) {
      p = "62" + p.slice(1);
    }
    return p;
  };

  const waNumber = cleanPhoneForWA(member.no_telp);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-profile-modal-title"
    >
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-850 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col my-auto max-h-[92vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Cover Banner */}
        <div className="relative h-28 sm:h-36 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-600 overflow-hidden shrink-0">
          <div 
            className="absolute inset-0 opacity-15"
            style={{ 
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 2px, transparent 0)', 
              backgroundSize: '24px 24px' 
            }}
          />
          
          {/* Header Controls */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            {canViewCard && onViewCard && (
              <button
                onClick={() => {
                  onClose();
                  onViewCard(member);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold backdrop-blur-md transition-all shadow-sm cursor-pointer"
                title="Lihat / Cetak Kartu Jemaat"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kartu Jemaat</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition-colors backdrop-blur-md cursor-pointer focus:outline-none"
              title="Tutup (Esc)"
              aria-label="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase shadow-sm ${
              isActive 
                ? 'bg-emerald-500 text-white' 
                : 'bg-rose-600 text-white'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {isActive ? 'Jemaat Aktif' : 'Atestasi Keluar'}
            </span>
          </div>
        </div>

        {/* Profile Card Header Info */}
        <div className="px-5 sm:px-7 pb-4 pt-0 relative -mt-12 sm:-mt-14 shrink-0 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
            {/* Avatar / Photo */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 shadow-xl overflow-hidden relative shrink-0 flex items-center justify-center">
              <User className="w-12 h-12 text-slate-400 dark:text-slate-500" />
              {member.foto_url && (
                <img
                  src={getDirectDriveLink(member.foto_url)}
                  alt={member.nama_lengkap}
                  className="w-full h-full object-cover absolute inset-0 z-10"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>

            {/* Name and Member Number */}
            <div className="flex-1 min-w-0 pb-1">
              <h2 
                id="member-profile-modal-title"
                className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tight break-words"
              >
                {formatNameTitleCase(member.nama_lengkap)}
              </h2>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                {member.nomor_anggota && (
                  <button
                    onClick={copyMemberNumber}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer group"
                    title="Klik untuk salin Nomor Anggota"
                  >
                    <span>No. {member.nomor_anggota}</span>
                    {copiedNo ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                    )}
                  </button>
                )}

                {member.jenis_kelamin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800/40">
                    <User className="w-3 h-3" />
                    {member.jenis_kelamin}
                  </span>
                )}

                {currentAge !== null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700">
                    {currentAge} Tahun
                  </span>
                )}
              </div>

              {/* Birthday Notice */}
              {isBirthdayToday && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold animate-pulse border border-amber-300 dark:border-amber-700">
                  <Gift className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Ulang Tahun Hari Ini! 🎉🎂</span>
                </div>
              )}

              {isBirthdayUpcoming && daysToBirthday !== null && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                  <Gift className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Ulang Tahun dalam {daysToBirthday} hari lagi</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body: Scrollable Information Sections */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Grid Layout for Personal and Spiritual Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Section 1: Data Pribadi & Kontak */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Data Pribadi & Kontak
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">Tempat, Tanggal Lahir</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      {member.tempat_lahir || "-"}, {member.tanggal_lahir ? formatDateDDMMYYYY_WithMonthName(member.tanggal_lahir) : "-"}
                    </span>
                  </p>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">Usia Saat Ini</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                    {currentAge !== null ? `${currentAge} Tahun` : "-"}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">Nomor Telepon / WhatsApp</span>
                  {member.no_telp ? (
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <a
                        href={`tel:${member.no_telp}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                        title="Panggil nomor"
                      >
                        <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        {member.no_telp}
                      </a>

                      {waNumber && (
                        <a
                          href={`https://wa.me/${waNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                          title="Chat via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Chat WA
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="font-semibold text-slate-400 italic">-</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Data Rohani & Gerejawi */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                <Church className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Data Rohani & Gerejawi
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">Jenis Sakramen Baptis / Sidi</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {member.jenis_baptis ? (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                        member.jenis_baptis === "SIDI"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                          : member.jenis_baptis === "Baptis Dewasa"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {member.jenis_baptis}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Belum ada data baptis</span>
                    )}
                  </div>
                  {member.keterangan_baptis && (
                    <p className="text-slate-600 dark:text-slate-300 mt-1.5 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                      {member.keterangan_baptis}
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">Tanggal Masuk Jemaat</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{member.tanggal_masuk ? formatDateDDMMYYYY_WithMonthName(member.tanggal_masuk) : "-"}</span>
                  </p>
                </div>

                {member.tanggal_keluar && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/50">
                    <span className="text-rose-700 dark:text-rose-300 block mb-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Tanggal Keluar / Atestasi
                    </span>
                    <p className="font-bold text-rose-800 dark:text-rose-200 text-sm">
                      {formatDateDDMMYYYY_WithMonthName(member.tanggal_keluar)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Alamat & Domisili */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Alamat Domisili & Asal
                </h3>
              </div>
              {member.alamat_asal && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${member.alamat_asal} ${member.provinsi || ""}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Buka di Google Maps
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">Alamat Lengkap</span>
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">
                  {member.alamat_asal || "-"}
                </p>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">Provinsi</span>
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                  {member.provinsi || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Foto & Tautan Berkas Dokumen */}
          {member.foto_url && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Foto Resmi Anggota Jemaat
                </span>
              </div>
              <a
                href={member.foto_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-600 font-semibold transition-colors w-fit"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka Tautan Google Drive Foto
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {canViewCard && onViewCard && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewCard(member);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Cetak / Lihat Kartu Jemaat
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(member);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Data Jemaat
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
