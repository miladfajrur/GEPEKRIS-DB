const fs = require('fs');
let content = fs.readFileSync('src/components/FinancePanel.tsx', 'utf-8');

content = content.replace(
  '                </div>\n                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100"\n                />',
  '                </div>'
);

fs.writeFileSync('src/components/FinancePanel.tsx', content);

