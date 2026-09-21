const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf-8');

// 1. Add import for FinancePanel
content = content.replace(
  "import WeeklyReportsPanel from './WeeklyReportsPanel';",
  "import WeeklyReportsPanel from './WeeklyReportsPanel';\nimport FinancePanel from './FinancePanel';"
);

// 2. Add 'finance' to valid tab values where necessary
content = content.replace(
  /\{activeTab === 'reports' && "Laporan Mingguan"\}/,
  "{activeTab === 'reports' && \"Laporan Mingguan\"}\n                  {activeTab === 'finance' && \"Manajemen Keuangan\"}"
);

// 3. Render FinancePanel
content = content.replace(
  /\{activeTab === 'reports' && \(\s*<WeeklyReportsPanel \/>\s*\)\}/,
  "{activeTab === 'reports' && (\n            <WeeklyReportsPanel />\n          )}\n\n          {activeTab === 'finance' && (\n            <FinancePanel />\n          )}"
);

// 4. Add the Sidebar button
content = content.replace(
  /<button \n\s*onClick=\{\(\) => handleTabClick\("reports"\)\}\n\s*className=\{\`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none \$\{activeTab === 'reports' \? 'bg-white\/10 text-white font-medium opacity-100' : 'opacity-60 hover:opacity-100'\}\`\}\n\s*>\n\s*\{activeTab === 'reports' \? <span className="w-2 h-2 rounded-full bg-blue-400"><\/span> : <UserCheck className="w-4 h-4" \/>\}\n\s*Data Kebaktian\n\s*<\/button>/,
  `
      <button 
        onClick={() => handleTabClick("reports")}
        className={\`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none \${activeTab === 'reports' ? 'bg-white/10 text-white font-medium opacity-100' : 'opacity-60 hover:opacity-100'}\`}
      >
        {activeTab === 'reports' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <UserCheck className="w-4 h-4" />}
        Data Kebaktian
      </button>
      <button 
        onClick={() => handleTabClick("finance")}
        className={\`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none \${activeTab === 'finance' ? 'bg-white/10 text-white font-medium opacity-100' : 'opacity-60 hover:opacity-100'}\`}
      >
        {activeTab === 'finance' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        Keuangan
      </button>
  `.trim()
);

fs.writeFileSync('src/components/Dashboard.tsx', content);

