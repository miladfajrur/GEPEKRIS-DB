const fs = require('fs');
let content = fs.readFileSync('src/components/WeeklyReportModal.tsx', 'utf-8');

// The `</div>` for `<div className="mt-2">` was deleted!
// Look at line 232: `<div className="mt-2">`
// Let's add the closing div at the end of the Pemasukan & Pengeluaran section.
content = content.replace(
  /<\/div>\s*<\/div>\s*\{\/\* Catatan Lainnya \*\/\}/g,
  '</div>\n               </div>\n            </div>\n\n            {/* Catatan Lainnya */}'
);

fs.writeFileSync('src/components/WeeklyReportModal.tsx', content);
