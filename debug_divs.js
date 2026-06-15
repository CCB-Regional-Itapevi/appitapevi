const fs = require('fs');
const html = fs.readFileSync('views/musica_exames.html', 'utf8');
const lines = html.split('\n');
let depth = 0;
lines.forEach((l, i) => {
    const opens = (l.match(/<div/g) || []).length;
    const closes = (l.match(/<\/div/g) || []).length;
    depth += opens - closes;
    console.log(`${i+1}: d=${depth} | ${l.trim()}`);
});
