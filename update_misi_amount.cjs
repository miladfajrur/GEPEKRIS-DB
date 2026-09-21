const fs = require('fs');
let content = fs.readFileSync('src/components/MisiKaltaraFinancePanel.tsx', 'utf-8');

// Add parseRupiah and formatRupiah at the top level
if (!content.includes('const parseRupiah =')) {
  content = content.replace(
    /import \{ useToast \} from "\.\.\/ToastContext";/,
    `import { useToast } from "../ToastContext";

const parseRupiah = (value: string) => {
  const numberString = value.replace(/[^,\\d]/g, '');
  return numberString ? Number(numberString) : 0;
};
const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID").format(angka);
};`
  );
}

// Add state for formAmount inside component
if (!content.includes('const [formAmount, setFormAmount]')) {
  content = content.replace(
    /const \[formDate, setFormDate\] = useState\(""\);/,
    `const [formDate, setFormDate] = useState("");
  const [formAmount, setFormAmount] = useState<number>(0);`
  );
}

// Update the click handler for Edit to set formAmount
content = content.replace(
  /onClick=\{\(\) => \{\n\s*setSelectedItem\(item\);\n\s*setFormDate\(item\.date\);\n\s*setIsModalOpen\(true\);\n\s*\}\}/g,
  `onClick={() => {
                              setSelectedItem(item);
                              setFormDate(item.date);
                              setFormAmount(item.amount);
                              setIsModalOpen(true);
                            }}`
);

// Update the click handler for Add to reset formAmount
content = content.replace(
  /onClick=\{\(\) => \{\n\s*setSelectedItem\(null\);\n\s*setFormDate\(new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]\);\n\s*setIsModalOpen\(true\);\n\s*\}\}/,
  `onClick={() => {
            setSelectedItem(null);
            setFormDate(new Date().toISOString().split('T')[0]);
            setFormAmount(0);
            setIsModalOpen(true);
          }}`
);

// Replace the number input with the Rupiah formatted input
content = content.replace(
  /<input required type="number" min="0" step="1" name="amount" defaultValue=\{selectedItem\?\.amount\} placeholder="100000" className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" \/>/,
  `<div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-slate-500 sm:text-sm">Rp</span>
                    </div>
                    <input 
                      type="text" 
                      required 
                      name="amount_text" 
                      value={formAmount !== undefined ? formatRupiah(formAmount) : ''}
                      onChange={(e) => setFormAmount(parseRupiah(e.target.value))}
                      placeholder="100.000" 
                      className="w-full border dark:border-slate-600 rounded-lg py-2 pl-10 pr-3 dark:bg-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" 
                    />
                    <input type="hidden" name="amount" value={formAmount} />
                  </div>`
);

fs.writeFileSync('src/components/MisiKaltaraFinancePanel.tsx', content);

