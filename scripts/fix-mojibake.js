const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGETS = ['js', 'views', 'index.html', 'app'];
const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'angular',
  'plugins',
  'font-awesome',
  'fonts',
  'img',
  'images',
  'vendor',
  'dist',
  'build',
  'coverage',
  '.next',
  '.vercel',
  'css'
]);
const TEXT_EXTENSIONS = new Set([
  '.js',
  '.html',
  '.htm',
  '.json',
  '.md',
  '.sql',
  '.txt',
  '.css'
]);

const REPLACEMENTS = [
  ['ÃƒÂ¡', 'á'],
  ['ÃƒÂ¢', 'â'],
  ['ÃƒÂ£', 'ã'],
  ['ÃƒÂ ', 'à'],
  ['ÃƒÂ¤', 'ä'],
  ['ÃƒÂ©', 'é'],
  ['ÃƒÂª', 'ê'],
  ['ÃƒÂ­', 'í'],
  ['ÃƒÂ³', 'ó'],
  ['ÃƒÂ´', 'ô'],
  ['ÃƒÂµ', 'õ'],
  ['ÃƒÂº', 'ú'],
  ['ÃƒÂ¼', 'ü'],
  ['ÃƒÂ§', 'ç'],
  ['ÃƒÂ', 'Á'],
  ['ÃƒÂ‚', 'Â'],
  ['ÃƒÂƒ', 'Ã'],
  ['ÃƒÂ€', 'À'],
  ['ÃƒÂ‰', 'É'],
  ['ÃƒÂŠ', 'Ê'],
  ['ÃƒÂ', 'Í'],
  ['ÃƒÂ“', 'Ó'],
  ['ÃƒÂ”', 'Ô'],
  ['ÃƒÂ•', 'Õ'],
  ['ÃƒÂš', 'Ú'],
  ['ÃƒÂœ', 'Ü'],
  ['Ãƒâ€¡', 'Ç'],
  ['Ã‚Âº', 'º'],
  ['Ã‚Âª', 'ª'],
  ['Ã‚Â°', '°'],
  ['Ã‚Â', ''],
  ['Ã', 'Á'],
  ['Ã‚', 'Â'],
  ['Ãƒ', 'Ã'],
  ['Ã€', 'À'],
  ['Ã‡', 'Ç'],
  ['Ã‰', 'É'],
  ['ÃŠ', 'Ê'],
  ['Ã', 'Í'],
  ['Ã“', 'Ó'],
  ['Ã”', 'Ô'],
  ['Ã•', 'Õ'],
  ['Ãš', 'Ú'],
  ['Ãœ', 'Ü'],
  ['Ã¡', 'á'],
  ['Ã¢', 'â'],
  ['Ã£', 'ã'],
  ['Ã¤', 'ä'],
  ['Ã ', 'à'],
  ['Ã§', 'ç'],
  ['Ã¨', 'è'],
  ['Ã©', 'é'],
  ['Ãª', 'ê'],
  ['Ã­', 'í'],
  ['Ã³', 'ó'],
  ['Ã´', 'ô'],
  ['Ãµ', 'õ'],
  ['Ãº', 'ú'],
  ['Ã¼', 'ü'],
  ['â€“', '–'],
  ['â€”', '—'],
  ['â€˜', '‘'],
  ['â€™', '’'],
  ['â€œ', '“'],
  ['â€', '”'],
  ['â€¢', '•'],
  ['â€¦', '…'],
  ['Â ', ' '],
  ['Â:', ':'],
  ['Â;', ';'],
  ['Â,', ','],
  ['Â.', '.'],
  ['Â)', ')'],
  ['Â(', '('],
  ['Â]', ']'],
  ['Â[', '['],
  ['Â/', '/']
];

function shouldSkipFile(filePath) {
  const basename = path.basename(filePath).toLowerCase();
  const ext = path.extname(filePath).toLowerCase();

  if (basename.endsWith('.min.js')) {
    return true;
  }

  if (!TEXT_EXTENSIONS.has(ext) && basename !== 'index.html') {
    return true;
  }

  return false;
}

function collectFiles(entryPath, bucket) {
  const absolutePath = path.join(ROOT, entryPath);
  if (!fs.existsSync(absolutePath)) {
    return;
  }

  const stats = fs.statSync(absolutePath);
  if (stats.isFile()) {
    if (!shouldSkipFile(absolutePath)) {
      bucket.push(absolutePath);
    }
    return;
  }

  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) {
      continue;
    }

    collectFiles(path.join(entryPath, entry.name), bucket);
  }
}

function fixContent(content) {
  let current = content;

  for (let i = 0; i < 4; i += 1) {
    let next = current;
    for (const [wrong, right] of REPLACEMENTS) {
      if (next.includes(wrong)) {
        next = next.split(wrong).join(right);
      }
    }

    if (next === current) {
      break;
    }

    current = next;
  }

  return current;
}

const files = [];
for (const target of TARGETS) {
  collectFiles(target, files);
}

const changedFiles = [];

for (const filePath of files) {
  const original = fs.readFileSync(filePath, 'utf8');
  const fixed = fixContent(original);

  if (fixed !== original) {
    fs.writeFileSync(filePath, fixed, 'utf8');
    changedFiles.push(path.relative(ROOT, filePath));
  }
}

if (!changedFiles.length) {
  console.log('Nenhum arquivo alterado.');
  process.exit(0);
}

console.log(`Arquivos corrigidos: ${changedFiles.length}`);
for (const file of changedFiles) {
  console.log(file);
}
