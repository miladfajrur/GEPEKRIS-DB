const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf-8');

if (!content.includes('FinanceTransaction')) {
  content += `
export interface FinanceTransaction {
  id?: string;
  tenantId: string;
  date: string; // YYYY-MM-DD
  type: "Pemasukan" | "Pengeluaran";
  category: string;
  amount: number;
  description: string;
  source?: string; // e.g. "Ibadah Umum", "Kas Umum", "Donasi"
  createdAt?: any;
  updatedAt?: any;
}
`;
  fs.writeFileSync('src/types.ts', content);
}
