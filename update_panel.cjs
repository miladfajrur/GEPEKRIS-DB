const fs = require('fs');
let content = fs.readFileSync('src/components/WeeklyReportsPanel.tsx', 'utf-8');

// Replace table columns in PDF Bulanan
content = content.replace(
  /const tableColumns = \[\s*"Tanggal", "Nama Ibadah", "D\/P\/A", "T\. Hadir", "Persembahan", "Perpuluhan", "Diakonia", "Lainnya", "Pemasukan", "Pengeluaran"\s*\];/,
  'const tableColumns = ["Tanggal", "Nama Ibadah", "D/P/A", "T. Hadir", "Total Pemasukan", "Total Pengeluaran"];'
);

// Replace table columns in PDF Mingguan
content = content.replace(
  /const tableColumns = \[\s*"Tanggal", "Nama Ibadah", "D\/P\/A", "T\. Hadir", "Persembahan", "Perpuluhan", "Diakonia", "Lainnya", "Pemasukan", "Pengeluaran"\s*\];/,
  'const tableColumns = ["Tanggal", "Nama Ibadah", "D/P/A", "T. Hadir", "Total Pemasukan", "Total Pengeluaran"];'
);

// Replace mapping for PDF Bulanan rows
content = content.replace(
  /const totalPemasukan = \(r\.persembahan_umum \|\| 0\) \+ \(r\.perpuluhan \|\| 0\) \+ \(r\.diakonia \|\| 0\) \+ \(r\.pemasukan_lainnya \|\| 0\);\s*return \[\s*formatDateDDMMYYYY\(r\.tanggal_ibadah\),\s*r\.nama_ibadah,\s*\`\$\{hadirD\}\/\$\{hadirP\}\/\$\{hadirA\}\`,\s*totalHadir\.toString\(\),\s*formatRupiah\(r\.persembahan_umum \|\| 0\),\s*formatRupiah\(r\.perpuluhan \|\| 0\),\s*formatRupiah\(r\.diakonia \|\| 0\),\s*formatRupiah\(r\.pemasukan_lainnya \|\| 0\),\s*formatRupiah\(totalPemasukan\),\s*formatRupiah\(r\.pengeluaran \|\| 0\)\s*\];/g,
  `const totalPemasukan = r.total_pemasukan !== undefined ? r.total_pemasukan : (r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0);
        return [
          formatDateDDMMYYYY(r.tanggal_ibadah),
          r.nama_ibadah,
          \`\${hadirD}/\${hadirP}/\${hadirA}\`,
          totalHadir.toString(),
          formatRupiah(totalPemasukan),
          formatRupiah(r.pengeluaran || 0)
        ];`
);

// Fix autoTable alignment for Bulanan
content = content.replace(
  /4: \{ halign: 'right' \},\s*5: \{ halign: 'right' \},\s*6: \{ halign: 'right' \},\s*7: \{ halign: 'right' \},\s*8: \{ halign: 'right', fontStyle: 'bold', textColor: \[16, 185, 129\] \},\s*9: \{ halign: 'right', fontStyle: 'bold', textColor: \[225, 29, 72\] \}/g,
  `4: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] },
        5: { halign: 'right', fontStyle: 'bold', textColor: [225, 29, 72] }`
);

// Update 'totalAllPemasukan' calculation (two occurrences usually, one for export, one for UI)
content = content.replace(
  /filteredReports\.reduce\(\(acc, r\) => acc \+ \(r\.persembahan_umum \|\| 0\) \+ \(r\.perpuluhan \|\| 0\) \+ \(r\.diakonia \|\| 0\) \+ \(r\.pemasukan_lainnya \|\| 0\), 0\)/g,
  `filteredReports.reduce((acc, r) => acc + (r.total_pemasukan !== undefined ? r.total_pemasukan : ((r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0))), 0)`
);

// Also need to update the UI Table in render
content = content.replace(
  /TotalPemasukan: \(r\.persembahan_umum \|\| 0\) \+ \(r\.perpuluhan \|\| 0\) \+ \(r\.diakonia \|\| 0\) \+ \(r\.pemasukan_lainnya \|\| 0\),/g,
  `TotalPemasukan: r.total_pemasukan !== undefined ? r.total_pemasukan : ((r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0)),`
);

content = content.replace(
  /const totalPemasukan = \(report\.persembahan_umum \|\| 0\) \+ \(report\.perpuluhan \|\| 0\) \+ \(report\.diakonia \|\| 0\) \+ \(report\.pemasukan_lainnya \|\| 0\);/g,
  `const totalPemasukan = report.total_pemasukan !== undefined ? report.total_pemasukan : ((report.persembahan_umum || 0) + (report.perpuluhan || 0) + (report.diakonia || 0) + (report.pemasukan_lainnya || 0));`
);

// Update BulkReportModal.tsx export (Excel bulk output logic if any)
// We'll leave Bulk as is since it imports generic keys, or just update Bulk to use total_pemasukan
fs.writeFileSync('src/components/WeeklyReportsPanel.tsx', content);

