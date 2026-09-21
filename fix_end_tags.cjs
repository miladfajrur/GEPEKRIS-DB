const fs = require('fs');
let content = fs.readFileSync('src/components/WeeklyReportModal.tsx', 'utf-8');

// There are extra div and missing elements at the end
// lines 330 onwards
// Let's replace the whole footer correctly
const correctEnding = `
            {/* Catatan Lainnya */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4">
               <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                 <Edit3 className="w-4 h-4 text-amber-500" /> Catatan Tambahan (Bila Ada)
               </h3>
               <div className="mt-2">
                 <textarea
                   name="keterangan"
                   rows={3}
                   value={formData.keterangan || ''}
                   onChange={handleChange}
                   placeholder="Tuliskan catatan tambahan, nama pengkhotbah, kesaksian, atau rincian lainnya..."
                   className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all shadow-inner placeholder-slate-400 dark:placeholder-slate-500 resize-none"
                 />
               </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none"
          >
            Batal
          </button>
          <button
            type="submit"
            form="report-form"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
          >
            {isSubmitting ? (
               <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Menyimpan...</>
            ) : "Simpan Laporan"}
          </button>
        </div>
      </div>
    </div>
  );
}
`;

content = content.replace(/\{\/\* Catatan Lainnya \*\/\}[\s\S]*$/, correctEnding);

fs.writeFileSync('src/components/WeeklyReportModal.tsx', content);
