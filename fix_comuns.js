/**
 * Fix simples: substitui cada entrada no array "comuns" pelo nome correto do "comunsCatalog"
 * (matched por código BR), e aplica correções adicionais de acento.
 */
const fs = require('fs');

let content = fs.readFileSync('./js/cadastromusic-data.js', 'utf8');

// ---- 1. Extrair comunsCatalog do arquivo ----
const catalogMatch = content.match(/comunsCatalog:\s*\[([\s\S]*?)\]\s*\}/);
if (!catalogMatch) { console.error('Não encontrou comunsCatalog'); process.exit(1); }

const catalogRaw = catalogMatch[1];
const catalogEntries = [];
const entryRegex = /\{\s*nome:\s*"([^"]+)"\s*,\s*cidade:\s*"([^"]+)"\s*\}/g;
let m;
while ((m = entryRegex.exec(catalogRaw)) !== null) {
  catalogEntries.push({ nome: m[1], cidade: m[2] });
}

console.log(`Encontradas ${catalogEntries.length} entradas no comunsCatalog`);

// Mapa: código BR → nome correto
const catalogByCode = {};
catalogEntries.forEach(item => {
  const match = item.nome.match(/^(BR-\d{2}-\d{4})/);
  if (match) catalogByCode[match[1]] = item.nome;
});

// ---- 2. Extrair array comuns ----
const comunsStart = content.indexOf('comuns: [');
const comunsEnd = content.indexOf('],', comunsStart) + 2;
const comunsSection = content.substring(comunsStart, comunsEnd);

// Extrair as strings do array
const stringRegex = /"([^"]+)"/g;
const originalComuns = [];
let sm;
while ((sm = stringRegex.exec(comunsSection)) !== null) {
  originalComuns.push(sm[1]);
}

console.log(`Encontradas ${originalComuns.length} entradas no array comuns`);

// ---- 3. Corrigir cada entrada ----
const MANUAL_FIXES = {
  'CIDADE SAO PEDRO':    'CIDADE SÃO PEDRO',
  'SITIO DO ROSARIO':    'SÍTIO DO ROSÁRIO',
  'SITIO JOSE TEIXEIRA': 'SÍTIO JOSÉ TEIXEIRA',
  'CHACARA RECANTO VERDE':'CHÁCARA RECANTO VERDE',
  'SITIO TABULEIRO':     'SÍTIO TABULEIRO',
  'SITIO TAQUARAL':      'SÍTIO TAQUARAL',
  'SITIO JULINHO':       'SÍTIO JULINHO',
  'SITIO GUARAPIRANGA':  'SÍTIO GUARAPIRANGA',
  'SITIO LAJEADO':       'SÍTIO LAJEADO',
  'NOVA PIRAPORA':       'NOVA PIRAPORA',
  'SAGRADO CORA':        'SAGRADO CORAÇÃO',
};

let fixedCount = 0;
const fixedComuns = originalComuns.map(comum => {
  // Tentar match por código BR
  const brMatch = comum.match(/^(BR-\d{2}-\d{4})/);
  if (brMatch && catalogByCode[brMatch[1]]) {
    const catalogName = catalogByCode[brMatch[1]];
    if (catalogName !== comum) {
      console.log(`  [CATALOG] "${comum}"\n           → "${catalogName}"`);
      fixedCount++;
      return catalogName;
    }
    return comum;
  }

  // Tentar correções manuais
  let result = comum;
  for (const [from, to] of Object.entries(MANUAL_FIXES)) {
    if (result.includes(from) && !result.includes(to)) {
      result = result.replace(from, to);
      console.log(`  [MANUAL] "${comum}" → "${result}"`);
      fixedCount++;
      break;
    }
  }
  return result;
});

console.log(`\nTotal de entradas corrigidas: ${fixedCount}`);

// ---- 4. Reconstruir o array comuns no arquivo ----
const newComunsArray = 'comuns: [\n' +
  fixedComuns.map(c => `    "${c}"`).join(',\n') +
  '\n  ]';

const newContent =
  content.substring(0, comunsStart) +
  newComunsArray +
  content.substring(comunsEnd);

fs.writeFileSync('./js/cadastromusic-data.js', newContent, 'utf8');
console.log('\n✅ Arquivo cadastromusic-data.js atualizado!');

// Verificação rápida
const verify = fs.readFileSync('./js/cadastromusic-data.js', 'utf8');
const stillBad = (verify.match(/CIDADE SAO PEDRO/g) || []).length;
console.log(`Verificação - "CIDADE SAO PEDRO" restantes: ${stillBad}`);
const goodCount = (verify.match(/CIDADE SÃO PEDRO/g) || []).length;
console.log(`Verificação - "CIDADE SÃO PEDRO" corretos: ${goodCount}`);
