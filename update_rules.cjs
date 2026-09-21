const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf-8');

if (!content.includes('finance_transactions')) {
  content = content.replace(
    '  match /databases/{database}/documents {',
    `  match /databases/{database}/documents {
    match /finance_transactions/{txId} {
      allow read: if true;
      allow create: if incoming().tenantId == 'gpstiaa';
      allow update: if incoming().tenantId == 'gpstiaa';
      allow delete: if true;
    }
`
  );
  fs.writeFileSync('firestore.rules', content);
}
