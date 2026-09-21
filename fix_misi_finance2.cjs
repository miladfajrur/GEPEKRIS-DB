const fs = require('fs');

let content = fs.readFileSync('src/components/MisiKaltaraFinancePanel.tsx', 'utf-8');

// 1. Add parseRupiah if not present
if (!content.includes('const parseRupiah')) {
  content = content.replace(
    'const rp = (num: number) =>',
    `const parseRupiah = (value: string) => {
    const numberString = value.replace(/[^,\\d]/g, '');
    return numberString ? Number(numberString) : 0;
  };
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID").format(angka);
  };
  const rp = (num: number) =>`
  );
}

// 2. We need to handle amount input in the form.
// In MisiKaltaraFinancePanel, the form is uncontrolled (using FormData).
// We should either make the amount input controlled or just format it.
// Actually, it's easier to make the amount input controlled.
// Let's check how the form is structured.
