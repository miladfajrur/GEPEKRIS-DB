const fs = require('fs');

// 1. Update types.ts to include total_pemasukan (optional for backward compatibility)
let typesContent = fs.readFileSync('src/types.ts', 'utf-8');
if (!typesContent.includes('total_pemasukan?: number;')) {
  typesContent = typesContent.replace('pemasukan_lainnya: number;', 'pemasukan_lainnya: number;\n  total_pemasukan?: number;');
  fs.writeFileSync('src/types.ts', typesContent);
}

// 2. Update WeeklyReportModal.tsx to only show one Pemasukan field
let modalContent = fs.readFileSync('src/components/WeeklyReportModal.tsx', 'utf-8');
modalContent = modalContent.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">[\s\S]*?(?=<\/div>\s*<\/div>\s*<div className="col-span-1 sm:col-span-2 mt-4 pt-4)/m,
  `<div className="mt-2">
                 <div>
                   <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1.5">Total Pemasukan Ibadah</label>
                   <div className="relative rounded-md shadow-sm">
                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                       <span className="text-emerald-600 dark:text-emerald-500 font-medium sm:text-sm">Rp</span>
                     </div>
                     <input
                       type="text"
                       name="total_pemasukan"
                       required
                       value={formatRupiah(formData.total_pemasukan !== undefined ? formData.total_pemasukan : ((formData.persembahan_umum || 0) + (formData.perpuluhan || 0) + (formData.diakonia || 0) + (formData.pemasukan_lainnya || 0)))}
                       onChange={handleRupiahChange}
                       className="block w-full rounded-lg border border-emerald-200 dark:border-emerald-800/50 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                     />
                   </div>
                 </div>`
);

// update parts in expense
modalContent = modalContent.replace(
  /<option value="Kas Umum \(Persembahan\)">Kas Umum \(Persembahan\)<\/option>\s*<option value="Perpuluhan">Perpuluhan<\/option>\s*<option value="Diakonia">Diakonia<\/option>\s*<option value="Pemasukan Lainnya">Pemasukan Lainnya<\/option>/g,
  `<option value="Kas Umum">Kas Umum</option>
   <option value="Seksi Pembangunan">Seksi Pembangunan</option>
   <option value="Seksi Diakonia">Seksi Diakonia</option>
   <option value="Seksi Pemuda / Anak">Seksi Pemuda / Anak</option>
   <option value="Seksi Kaum Ibu/Bapak">Seksi Kaum Ibu/Bapak</option>
   <option value="Lainnya">Lainnya</option>`
);

fs.writeFileSync('src/components/WeeklyReportModal.tsx', modalContent);

