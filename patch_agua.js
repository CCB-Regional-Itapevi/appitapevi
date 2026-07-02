const fs = require('fs');
let p = 'js/controllers_v130.js';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  ".replace(/[^A-Z0-9]*GUA\\s+ESPRAIADA/gi, '\\u00c1GUA ESPRAIADA')",
  ".replace(/(^|[\\s\\-])[^A-Z0-9\\s\\-]*GUA\\s+ESPRAIADA/gi, '$1\\u00C1GUA ESPRAIADA')"
);

fs.writeFileSync(p, c);
console.log('Fixed AGUA ESPRAIADA hyphen');
