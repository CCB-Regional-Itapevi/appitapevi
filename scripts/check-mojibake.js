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
const SUSPICIOUS_PATTERN = /(?:Ã[\u0080-\u00BFƒ]|Â[\u0080-\u00BF]|ï¿½|\uFFFD)/g;

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

const files = [];
for (const target of TARGETS) {
  collectFiles(target, files);
}

const findings = [];

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (SUSPICIOUS_PATTERN.test(line)) {
      findings.push(`${path.relative(ROOT, filePath)}:${index + 1}:${line.trim()}`);
    }
    SUSPICIOUS_PATTERN.lastIndex = 0;
  });
}

if (!findings.length) {
  console.log('Nenhum padrão suspeito de mojibake encontrado.');
  process.exit(0);
}

console.log('Padrões suspeitos encontrados:');
for (const finding of findings) {
  console.log(finding);
}
process.exit(1);
