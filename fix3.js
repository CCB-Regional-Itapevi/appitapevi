const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuário/OneDrive/APLICATIVOS REGIONAL/APP_GLOBAL/js/controllers_v130.js', 'utf8');

// Clear my previous injections completely
code = code.replace(/    var str = String\(text \|\| ''\);[\s\S]*?    text = str;/g, '');

const safeRegexFix = `    var str = String(text || '');
    // SAFELY match ANY non-ASCII non-Portuguese character
    str = str.replace(/([0-9]\\s*)[^\\x00-\\x7F\\u00E1\\u00E0\\u00E2\\u00E3\\u00E9\\u00EA\\u00ED\\u00F3\\u00F4\\u00F5\\u00FA\\u00E7\\u00C1\\u00C0\\u00C2\\u00C3\\u00C9\\u00CA\\u00CD\\u00D3\\u00D4\\u00D5\\u00DA\\u00C7\\u00BA\\u00AA]+/g, '$1\\u00BA');
    str = str.replace(/s[^\\x00-\\x7F\\u00E1\\u00E0\\u00E2\\u00E3\\u00E9\\u00EA\\u00ED\\u00F3\\u00F4\\u00F5\\u00FA\\u00E7\\u00C1\\u00C0\\u00C2\\u00C3\\u00C9\\u00CA\\u00CD\\u00D3\\u00D4\\u00D5\\u00DA\\u00C7\\u00BA\\u00AA]+bado/gi, 's\\u00E1bado');
    str = str.replace(/reuni[^\\x00-\\x7F\\u00E1\\u00E0\\u00E2\\u00E3\\u00E9\\u00EA\\u00ED\\u00F3\\u00F4\\u00F5\\u00FA\\u00E7\\u00C1\\u00C0\\u00C2\\u00C3\\u00C9\\u00CA\\u00CD\\u00D3\\u00D4\\u00D5\\u00DA\\u00C7\\u00BA\\u00AA]+o?/gi, 'reuni\\u00E3o');
    str = str.replace(/pr[^\\x00-\\x7F\\u00E1\\u00E0\\u00E2\\u00E3\\u00E9\\u00EA\\u00ED\\u00F3\\u00F4\\u00F5\\u00FA\\u00E7\\u00C1\\u00C0\\u00C2\\u00C3\\u00C9\\u00CA\\u00CD\\u00D3\\u00D4\\u00D5\\u00DA\\u00C7\\u00BA\\u00AA]+ximo/gi, 'pr\\u00F3ximo');
    text = str;`;

code = code.replace(/function repairEbiText\(text\) \{/g, `function repairEbiText(text) {\n${safeRegexFix}`);

fs.writeFileSync('c:/Users/Usuário/OneDrive/APLICATIVOS REGIONAL/APP_GLOBAL/js/controllers_v130.js', code, 'utf8');
console.log('Done 3');
