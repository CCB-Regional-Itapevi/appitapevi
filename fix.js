const fs = require('fs');
let code = fs.readFileSync('c:/Users/Usuário/OneDrive/APLICATIVOS REGIONAL/APP_GLOBAL/js/controllers_v130.js', 'utf8');

// Clear my previous injection
code = code.replace(/    var str = String\(text \|\| ''\);[\s\S]*?    text = str;/g, '');

code = code.replace(/function repairEbiText\(text\) \{/g, `function repairEbiText(text) {
    var str = String(text || '');
    // SAFELY match uFFFD and ï¿½ and replace with unicode escapes
    str = str.replace(/([0-9]\\s*)(?:\\uFFFD|\\u00EF\\u00BF\\u00BD)/g, '$1\\u00BA');
    str = str.replace(/s(?:\\uFFFD|\\u00EF\\u00BF\\u00BD)bado/gi, 's\\u00E1bado');
    str = str.replace(/reuni(?:\\uFFFD|\\u00EF\\u00BF\\u00BD)o?/gi, 'reuni\\u00E3o');
    str = str.replace(/pr(?:\\uFFFD|\\u00EF\\u00BF\\u00BD)ximo/gi, 'pr\\u00F3ximo');
    text = str;`);

fs.writeFileSync('c:/Users/Usuário/OneDrive/APLICATIVOS REGIONAL/APP_GLOBAL/js/controllers_v130.js', code, 'utf8');
console.log('Done 2');
