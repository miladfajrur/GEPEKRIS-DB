const fs = require('fs');
let content = fs.readFileSync('src/components/WeeklyReportsPanel.tsx', 'utf-8');

// Function to generate pengeluaran table code
const pengeluaranTableCode = `
      // Tabel Rincian Pengeluaran
      const allPengeluaran = filteredReports.flatMap(r => (r.pengeluaran_details || []).map(p => ({ ...p, tanggal_ibadah: r.tanggal_ibadah, nama_ibadah: r.nama_ibadah })));
      
      if (allPengeluaran.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("RINCIAN PENGELUARAN", 40, 48);
        
        const expenseColumns = ["Tanggal", "Ibadah", "Keterangan", "Sumber Dana", "Jumlah (Rp)"];
        const expenseRows = allPengeluaran.map(p => [
          formatDateDDMMYYYY(p.tanggal_ibadah),
          p.nama_ibadah,
          p.keterangan,
          p.sumber,
          formatRupiah(p.jumlah)
        ]);

        autoTable(doc, {
          startY: 68,
          head: [expenseColumns],
          body: expenseRows,
          theme: 'striped',
          headStyles: { fillColor: [225, 29, 72] }, // rose-600
          styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
          columnStyles: {
            4: { halign: 'right', fontStyle: 'bold' }
          }
        });
      }
`;

// Insert into exportFilteredToPDF (Bulanan)
content = content.replace(
  /doc\.save\(\`Laporan_Kebaktian_Bulanan_\$\{monthName \? monthName\.replace\(' ',\s*'_'\)\s*:\s*new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]\}\.pdf\`\);/,
  pengeluaranTableCode + "\n      doc.save(`Laporan_Kebaktian_Bulanan_${monthName ? monthName.replace(' ', '_') : new Date().toISOString().split('T')[0]}.pdf`);"
);

// Insert into handleExportPDF (Mingguan)
content = content.replace(
  /doc\.save\(\`Laporan_Kebaktian_\$\{new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]\}\.pdf\`\);/,
  pengeluaranTableCode + "\n    doc.save(`Laporan_Kebaktian_${new Date().toISOString().split('T')[0]}.pdf`);"
);

fs.writeFileSync('src/components/WeeklyReportsPanel.tsx', content);
