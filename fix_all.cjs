const fs = require('fs');
let content = fs.readFileSync('src/components/WeeklyReportModal.tsx', 'utf-8');

// The output shows that `fix_divs2.cjs` missed the replace because of whitespace.
content = content.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* Catatan Lainnya \*\/\}/, '</div>\n               </div>\n            </div>\n\n            {/* Catatan Lainnya */}');

fs.writeFileSync('src/components/WeeklyReportModal.tsx', content);

