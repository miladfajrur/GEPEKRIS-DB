const fs = require('fs');
let content = fs.readFileSync('src/components/FinancePanel.tsx', 'utf-8');

// 1. Fix the import
content = content.replace("import { db } from '../App';", "import { db } from '../lib/firebase';");

// 2. Fix the escaped backticks and dollar signs
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync('src/components/FinancePanel.tsx', content);

