const fs = require('fs');

// Update WeeklyReportModal.tsx
let weekly = fs.readFileSync('src/components/WeeklyReportModal.tsx', 'utf-8');

// Fix handleChange
weekly = weekly.replace(
  /if \(type === 'number'\) \{\s*setFormData\(prev => \(\{ \.\.\.prev, \[name\]: Number\(value\) \}\)\);\s*\}/,
  `if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
    }`
);

// Fix attendance inputs
weekly = weekly.replace(/value=\{formData\.kehadiran_dewasa \|\| ''\}/, 'value={formData.kehadiran_dewasa !== undefined ? formData.kehadiran_dewasa : \'\'}');
weekly = weekly.replace(/value=\{formData\.kehadiran_pemuda \|\| ''\}/, 'value={formData.kehadiran_pemuda !== undefined ? formData.kehadiran_pemuda : \'\'}');
weekly = weekly.replace(/value=\{formData\.kehadiran_anak \|\| ''\}/, 'value={formData.kehadiran_anak !== undefined ? formData.kehadiran_anak : \'\'}');

fs.writeFileSync('src/components/WeeklyReportModal.tsx', weekly);

// Update FinancePanel.tsx
let finance = fs.readFileSync('src/components/FinancePanel.tsx', 'utf-8');

// Add formatRupiah and parseRupiah at the top of the file
if (!finance.includes('const parseRupiah')) {
  finance = finance.replace(
    /const formatRupiah = \(angka: number\) => \{/,
    `const parseRupiah = (value: string) => {
    const numberString = value.replace(/[^,\\d]/g, '');
    return numberString ? Number(numberString) : 0;
  };

  const formatRupiah = (angka: number) => {`
  );
}

// Replace type="number" with text input for Rupiah
finance = finance.replace(
  /<input\s*type="number"\s*required\s*min="0"\s*value=\{formData\.amount\}\s*onChange=\{e => setFormData\(\{ \.\.\.formData, amount: Number\(e\.target\.value\) \}\)\}/,
  `<div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-slate-500 font-medium sm:text-sm">Rp</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.amount !== undefined ? new Intl.NumberFormat('id-ID').format(formData.amount) : ''}
                    onChange={e => setFormData({ ...formData, amount: parseRupiah(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-3 py-2 text-slate-900 dark:text-slate-100"
                  />
                </div>`
);

fs.writeFileSync('src/components/FinancePanel.tsx', finance);
