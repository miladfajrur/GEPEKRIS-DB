const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

content = content.replace(
  'import WeeklyReportsPanel from "./WeeklyReportsPanel";',
  'import WeeklyReportsPanel from "./WeeklyReportsPanel";\nimport FinancePanel from "./FinancePanel";'
);

fs.writeFileSync('src/components/Dashboard.tsx', content);
