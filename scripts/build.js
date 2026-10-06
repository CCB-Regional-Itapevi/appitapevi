const fs = require('fs');
const path = require('path');
const { ROOT, PUBLIC_PATHS, isPublicPath, loadLocalEnv, getPublicConfig, renderPublicConfig } = require('./supabase-config');

function build() {
    loadLocalEnv();
    // Validate before replacing the output. An invalid or secret key must stop the build.
    const configSource = renderPublicConfig(getPublicConfig());
    const output = path.resolve(ROOT, 'dist');
    if (path.dirname(output) !== ROOT || path.basename(output) !== 'dist'
        || (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink())) {
        throw new Error('Diretorio de publicacao invalido.');
    }
    fs.rmSync(output, { recursive: true, force: true });
    fs.mkdirSync(output, { recursive: true });
    for (const entry of PUBLIC_PATHS) {
        const source = path.join(ROOT, entry);
        if (fs.existsSync(source)) {
            fs.cpSync(source, path.join(output, entry), {
                recursive: true,
                filter(filePath) {
                    return isPublicPath(filePath)
                        && !fs.lstatSync(filePath).isSymbolicLink();
                }
            });
        }
    }
    fs.writeFileSync(path.join(output, 'js', 'supabase-config.js'), configSource, 'utf8');
    console.log('Build concluido em dist/. Somente a URL e a chave publica do Supabase foram incluidas.');
}

try {
    build();
} catch (err) {
    console.error('Falha no build: ' + err.message);
    process.exitCode = 1;
}
