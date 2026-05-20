const fs = require('fs');
const c = fs.readFileSync('./js/cadastromusic-data.js', 'utf8');
const comunsStart = c.indexOf('comuns: [');
const comunsEnd = c.indexOf('],', comunsStart) + 2;
const section = c.substring(comunsStart, comunsEnd);

// Check entries that still have literal ? (ascii 63) where they shouldn't
const lines = section.split('\n');
let badCount = 0;
lines.forEach(line => {
  if (line.includes('"') && line.includes('?')) {
    console.log('BAD:', line.trim().substring(0, 80));
    badCount++;
  }
});
console.log('Total entradas com ? no comuns:', badCount);

// Also check SÃO, JOÃO counts
const sao = (section.match(/SÃO/g) || []).length;
const joao = (section.match(/JOÃO/g) || []).length;
console.log('SÃO:', sao, '  JOÃO:', joao);
