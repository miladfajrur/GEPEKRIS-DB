const fs = require('fs');
let content = fs.readFileSync('src/components/WeeklyReportModal.tsx', 'utf-8');

// I will just replace `</div></div>\n                 </div>\n                 <div className="col-span-1 sm:col-span-2 mt-4 pt-4`
// Wait, looking at line 248: `</div></div>` and line 249: `</div>`.
// And line 232: `<div className="mt-2">`, line 233: `<div>`.
// It should be:
// 232: <div className="mt-2">
// 233:   <div> ... </div>
// 249: </div>
// But we also have the Rincian Pengeluaran block which was originally INSIDE the `<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">` which we replaced with `<div className="mt-2">`.
// The original code was:
// <div className="grid ...">
//   <div>Persembahan Umum</div>
//   <div>Perpuluhan</div>
//   <div>Diakonia</div>
//   <div>Pemasukan Lainnya</div>
//   <div>Total Pengeluaran</div>
// </div>
// 
// So the Rincian pengeluaran block was added after, but in my sed replace I did:
// `modalContent.replace(/<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">[\s\S]*?(?=<\/div>\s*<\/div>\s*<div className="col-span-1 sm:col-span-2 mt-4 pt-4)/m, ...)`
// This might have messed up. Let's just fix the unbalanced tags.

content = content.replace(/<\/div><\/div>\s*<\/div>\s*<div className="col-span-1 sm:col-span-2 mt-4 pt-4/g, '</div>\n                 <div className="col-span-1 sm:col-span-2 mt-4 pt-4');

fs.writeFileSync('src/components/WeeklyReportModal.tsx', content);

