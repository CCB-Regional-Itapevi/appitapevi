const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_PATHS = [
    'index.html', 'version.json', 'favicon.ico', 'favicons.ico', 'app.js',
    'css', 'fonts', 'font-awesome', 'img', 'js', 'views', 'email_templates'
];
const ACTIVE_SERVICES = ['auth.service.js', 'ebi.service.js', 'visitas.service.js'];
const EXCLUDED_SCRIPTS = [
    'controllers_musica.js', 'controllers_darpe.js',
    'musica-public.config.js', 'cadastromusic-data.js'
];

function isPublicPath(filePath) {
    const relative = path.relative(ROOT, filePath);
    if (path.isAbsolute(relative)) return false;
    const parts = relative.split(/[/\\]/);
    if (parts.some(part => part.startsWith('.')) || !PUBLIC_PATHS.includes(parts[0])) return false;
    if (parts[0] === 'js' && parts[1] === 'services' && parts.length > 2) {
        return parts.length === 3 && ACTIVE_SERVICES.includes(parts[2]);
    }
    if (parts[0] === 'js' && EXCLUDED_SCRIPTS.includes(parts[1])) return false;
    if (parts[0] === 'views' && (/^(?:rjm|darpe|musicalizacao|musica|music|gem)(?:_|\.|$)/.test(parts[1] || '')
        || /^admin_santa_ceia(?:_|\.)/.test(parts[1] || ''))) return false;
    return true;
}

function loadLocalEnv() {
    const envPath = path.join(ROOT, '.env.local');
    if (fs.existsSync(envPath)) {
        if (typeof process.loadEnvFile !== 'function') {
            throw new Error('Use Node.js 22 ou superior para carregar .env.local.');
        }
        try {
            process.loadEnvFile(envPath);
        } catch (err) {
            throw new Error('Nao foi possivel carregar .env.local. Verifique o formato do arquivo.');
        }
    }
}

function getPublicConfig(env = process.env) {
    const rawUrl = String(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const publishableKey = String(env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    if (!rawUrl || !publishableKey) {
        throw new Error('Preencha SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em .env.local ou nas variaveis da Vercel.');
    }

    let url;
    try {
        url = new URL(rawUrl);
    } catch (err) {
        throw new Error('SUPABASE_URL deve ser a URL HTTPS do projeto Supabase.');
    }
    if (url.protocol !== 'https:' || url.username || url.password
        || url.pathname !== '/' || url.search || url.hash) {
        throw new Error('SUPABASE_URL deve ser a URL HTTPS do projeto Supabase, sem credenciais ou caminhos adicionais.');
    }

    // Only an explicitly public key may reach the browser. Never serialize process.env.
    let isPublicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey);
    if (!isPublicKey && publishableKey.split('.').length === 3) {
        try {
            const payload = JSON.parse(Buffer.from(publishableKey.split('.')[1], 'base64url').toString('utf8'));
            isPublicKey = payload.role === 'anon';
            if (isPublicKey && payload.ref && url.hostname.endsWith('.supabase.co')
                && payload.ref !== url.hostname.split('.')[0]) {
                throw new Error('A chave anon pertence a outro projeto Supabase.');
            }
        } catch (err) {
            if (err.message === 'A chave anon pertence a outro projeto Supabase.') throw err;
            isPublicKey = false;
        }
    }
    if (!isPublicKey) {
        throw new Error('SUPABASE_PUBLISHABLE_KEY deve conter uma chave publica sb_publishable_ ou anon. Chaves secretas e service_role sao proibidas no frontend.');
    }

    return {
        url: url.origin,
        publishableKey,
        storageKey: 'sb-' + url.hostname.split('.')[0] + '-auth-token'
    };
}

function renderPublicConfig(config) {
    const safeConfig = {
        url: config.url,
        publishableKey: config.publishableKey,
        storageKey: config.storageKey
    };
    const json = JSON.stringify(safeConfig).replace(/</g, '\\u003c');
    return '// Configuracao publica. Nenhuma chave administrativa deve aparecer aqui.\n'
        + 'window.APP_SUPABASE_CONFIG = Object.freeze(' + json + ');\n';
}

module.exports = { ROOT, PUBLIC_PATHS, ACTIVE_SERVICES, isPublicPath, loadLocalEnv, getPublicConfig, renderPublicConfig };
