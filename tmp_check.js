const fs = require('fs');
const path = 'd:/Stock-management/Stock_tenancy_bnd/src/app/pages/expenses/ExpensesListPage.tsx';
const s = fs.readFileSync(path, 'utf8');
const counts = {
  backticks: (s.match(/`/g) || []).length,
  singleQuotes: (s.match(/'/g) || []).length,
  doubleQuotes: (s.match(/"/g) || []).length,
  openParen: (s.match(/\(/g) || []).length,
  closeParen: (s.match(/\)/g) || []).length,
  openBrace: (s.match(/\{/g) || []).length,
  closeBrace: (s.match(/\}/g) || []).length,
  lt: (s.match(/</g) || []).length,
  gt: (s.match(/>/g) || []).length,
};
console.log(counts);
