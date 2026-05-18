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

// Find first mismatch position for parens and braces
const content = require('fs').readFileSync(path, 'utf8');
function findMismatch() {
  const stack = [];
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '(' || ch === '{') stack.push({ ch, i });
    else if (ch === ')') {
      const top = stack[stack.length - 1];
      if (!top || top.ch !== '(') return { pos: i, expected: '(', found: ')' };
      stack.pop();
    } else if (ch === '}') {
      const top = stack[stack.length - 1];
      if (!top || top.ch !== '{') return { pos: i, expected: '{', found: '}' };
      stack.pop();
    }
  }
  return { remaining: stack };
}

const res = findMismatch();
if (res.pos !== undefined) {
  console.log('Mismatch at index', res.pos, 'expected', res.expected, 'found', res.found);
} else {
  console.log('Remaining stack length', res.remaining.length);
  if (res.remaining.length) console.log(res.remaining.slice(-5));
}

function idxToLineCol(idx) {
  const before = content.slice(0, idx);
  const lines = before.split('\n');
  const line = lines.length;
  const col = lines[lines.length-1].length + 1;
  return { line, col };
}

if (res.remaining && res.remaining.length) {
  res.remaining.forEach(item => {
    const pos = idxToLineCol(item.i);
    console.log('Unclosed', item.ch, 'at index', item.i, 'line', pos.line, 'col', pos.col);
    const start = Math.max(0, item.i - 80);
    const end = Math.min(content.length, item.i + 80);
    console.log('Context:\n' + content.slice(start, end));
  });
}
