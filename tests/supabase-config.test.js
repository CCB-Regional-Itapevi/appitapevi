const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { ROOT, PUBLIC_PATHS, isPublicPath, getPublicConfig, renderPublicConfig } = require('../scripts/supabase-config');

const publicEnv = {
    SUPABASE_URL: 'https://example-project.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only'
};

function legacyKey(role, ref = 'example-project') {
    return 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ role, ref })).toString('base64url') + '.test';
}

test('missing configuration fails without falling back to the previous project', () => {
    assert.throws(() => getPublicConfig({}), /Preencha SUPABASE_URL/);
});

test('secret and service_role keys cannot be used as public configuration', () => {
    for (const key of ['sb_secret_test_only', legacyKey('service_role')]) {
        assert.throws(() => getPublicConfig({ ...publicEnv, SUPABASE_PUBLISHABLE_KEY: key }), /proibidas no frontend/);
    }
});

test('public keys work and legacy anon keys must match the project', () => {
    const config = getPublicConfig(publicEnv);
    assert.equal(config.storageKey, 'sb-example-project-auth-token');
    assert.equal(getPublicConfig({ ...publicEnv, SUPABASE_PUBLISHABLE_KEY: legacyKey('anon') }).url, publicEnv.SUPABASE_URL);
    assert.throws(() => getPublicConfig({ ...publicEnv, SUPABASE_PUBLISHABLE_KEY: legacyKey('anon', 'different-project') }), /outro projeto/);
});

test('invalid URLs and URLs containing credentials are rejected', () => {
    for (const url of ['not-a-url', 'http://example.com', 'https://user:password@example.com', 'https://example.com/path']) {
        assert.throws(() => getPublicConfig({ ...publicEnv, SUPABASE_URL: url }), /URL HTTPS/);
    }
});

test('browser configuration serializes only the public fields', () => {
    const secret = 'sb_secret_never_publish_this_sentinel';
    const config = getPublicConfig({ ...publicEnv, SUPABASE_SECRET_KEY: secret });
    const source = renderPublicConfig({ ...config, secret, environment: { SUPABASE_SECRET_KEY: secret } });
    const window = {};
    vm.runInNewContext(source, { window });
    assert.deepEqual(Object.keys(window.APP_SUPABASE_CONFIG).sort(), ['publishableKey', 'storageKey', 'url']);
    assert.equal(source.includes(secret), false);
    assert.equal(Object.isFrozen(window.APP_SUPABASE_CONFIG), true);
});

test('all services can share one client and the project-specific auth storage key', () => {
    const config = getPublicConfig(publicEnv);
    let calls = 0;
    const client = {};
    const window = {
        APP_SUPABASE_CONFIG: config,
        supabase: {
            createClient(url, key, options) {
                calls++;
                assert.equal(url, config.url);
                assert.equal(key, config.publishableKey);
                assert.equal(options.auth.storageKey, config.storageKey);
                return client;
            }
        }
    };
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', 'supabase-client.js'), 'utf8'), { window });
    assert.equal(window.getAppSupabaseClient(), client);
    assert.equal(window.getAppSupabaseClient(), client);
    assert.equal(calls, 1);
});

test('build publishes assets and public configuration, excluding local secrets and private files', () => {
    const tempRoot = path.resolve(ROOT, '.tmp');
    fs.mkdirSync(tempRoot, { recursive: true });
    const fixture = fs.mkdtempSync(path.join(tempRoot, 'supabase-test-'));
    try {
        fs.mkdirSync(path.join(fixture, 'scripts'));
        fs.mkdirSync(path.join(fixture, 'js'));
        fs.mkdirSync(path.join(fixture, 'js', 'services'));
        for (const name of ['build.js', 'supabase-config.js']) {
            fs.copyFileSync(path.join(ROOT, 'scripts', name), path.join(fixture, 'scripts', name));
        }
        const secret = 'sb_secret_build_sentinel_never_publish';
        fs.writeFileSync(path.join(fixture, '.env.local'), 'SUPABASE_SECRET_KEY=' + secret + '\n');
        fs.writeFileSync(path.join(fixture, 'js', '.env'), 'PRIVATE=' + secret);
        fs.writeFileSync(path.join(fixture, 'index.html'), '<html>test</html>');
        fs.writeFileSync(path.join(fixture, 'js', 'app.js'), '// public asset');
        fs.writeFileSync(path.join(fixture, 'js', 'services', 'ebi.service.js'), '// active service');
        fs.writeFileSync(path.join(fixture, 'js', 'services', 'visitas.service.js'), '// active service');
        fs.writeFileSync(path.join(fixture, 'js', 'services', 'rjm.service.js'), '// external service');
        fs.writeFileSync(path.join(fixture, 'js', 'controllers_musica.js'), '// external controller');
        fs.writeFileSync(path.join(fixture, 'private.txt'), secret);
        const env = { ...process.env, ...publicEnv, SUPABASE_SECRET_KEY: secret };
        execFileSync(process.execPath, ['scripts/build.js'], { cwd: fixture, env, stdio: 'pipe' });
        const output = path.join(fixture, 'dist');
        const source = fs.readFileSync(path.join(output, 'js', 'supabase-config.js'), 'utf8');
        assert.equal(source.includes(secret), false);
        assert.equal(fs.existsSync(path.join(output, '.env.local')), false);
        assert.equal(fs.existsSync(path.join(output, 'js', '.env')), false);
        assert.equal(fs.existsSync(path.join(output, 'private.txt')), false);
        assert.equal(fs.existsSync(path.join(output, 'scripts')), false);
        assert.equal(fs.existsSync(path.join(output, 'js', 'app.js')), true);
        assert.equal(fs.existsSync(path.join(output, 'js', 'services', 'ebi.service.js')), true);
        assert.equal(fs.existsSync(path.join(output, 'js', 'services', 'visitas.service.js')), true);
        assert.equal(fs.existsSync(path.join(output, 'js', 'services', 'rjm.service.js')), false);
        assert.equal(fs.existsSync(path.join(output, 'js', 'controllers_musica.js')), false);
        assert.equal(fs.existsSync(path.join(output, 'index.html')), true);
        const window = {};
        vm.runInNewContext(source, { window });
        assert.equal(window.APP_SUPABASE_CONFIG.url, publicEnv.SUPABASE_URL);
        // A second build must remove obsolete assets from the output.
        fs.writeFileSync(path.join(output, 'obsolete.txt'), 'old output');
        execFileSync(process.execPath, ['scripts/build.js'], { cwd: fixture, env, stdio: 'pipe' });
        assert.equal(fs.existsSync(path.join(output, 'obsolete.txt')), false);
    } finally {
        if (path.dirname(fixture) !== tempRoot || fs.lstatSync(fixture).isSymbolicLink()) {
            throw new Error('Invalid test cleanup path');
        }
        fs.rmSync(fixture, { recursive: true, force: true });
    }
});

test('local server serves the public config and rejects environment and server source requests', () => {
    let handler;
    const config = getPublicConfig(publicEnv);
    const context = {
        require(id) {
            if (id === 'http') return { createServer(fn) { handler = fn; return { listen() {} }; } };
            if (id === './scripts/supabase-config') return {
                ROOT, PUBLIC_PATHS, isPublicPath, loadLocalEnv() {}, getPublicConfig: () => config, renderPublicConfig
            };
            return require(id);
        },
        console: { log() {}, error() {} },
        process: { exit() { throw new Error('Server failed to start'); } }
    };
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'serve-local.js'), 'utf8'), context);
    for (const [url, expectedStatus] of [
        ['/js/supabase-config.js', 200], ['/.env.local', 403], ['/%2eenv.local', 403],
        ['/.git/config', 403], ['/js/../../.env.local', 403], ['/scripts/supabase-config.js', 404],
        ['/serve-local.js', 404], ['/%zz', 400],
        ['/js/services/rjm.service.js', 404], ['/js/services/darpe.service.js', 404],
        ['/js/services/musicalizacao.service.js', 404], ['/js/services/musica.service.js', 404],
        ['/js/services/gem.service.js', 404], ['/js/services/santa_ceia.service.js', 404],
        ['/js/musica-public.config.js', 404], ['/views/admin_santa_ceia.html', 404]
    ]) {
        let status;
        let body;
        let headers;
        handler({ url }, { writeHead(code, values) { status = code; headers = values; }, end(value) { body = value; } });
        assert.equal(status, expectedStatus, url);
        if (status === 200) {
            assert.equal(headers['Content-Type'], 'application/javascript; charset=utf-8');
            assert.equal(headers['Cache-Control'], 'no-store, max-age=0');
            const window = {};
            vm.runInNewContext(body, { window });
            assert.equal(window.APP_SUPABASE_CONFIG.url, config.url);
        }
    }
});

test('registered routes and controllers keep EBI and visits and exclude external modules', () => {
    const routes = new Map();
    const controllerNames = [];
    const module = {
        config() { return this; }, run() { return this; },
        service() { return this; },
        controller(name) { controllerNames.push(name); return this; }
    };
    const angular = { module: () => module };
    const routeContext = { angular };
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8'), routeContext);
    const stateProvider = { state(name, options) { routes.set(name, options); return this; } };
    routeContext.config(stateProvider, { otherwise() {} }, { config() {} }, { idle() {}, timeout() {} }, {});
    assert.equal(routes.has('ebi.dashboard'), true);
    assert.equal(routes.has('visitas.dashboard'), true);
    assert.equal(routes.has('login'), true);
    assert.equal(routes.has('admin.usuarios'), true);
    for (const name of routes.keys()) {
        assert.equal(/^(?:rjm|darpe|musicalizacao|music|gem)(?:\.|$)|^admin\.santa_ceia$/.test(name), false, name);
    }
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', 'controllers_v130.js'), 'utf8'), { angular });
    assert.equal(controllerNames.includes('ebiRecitativosCtrl'), true);
    assert.equal(controllerNames.includes('visitasDashboardCtrl'), true);
    assert.equal(controllerNames.includes('loginCtrl'), true);
    assert.equal(controllerNames.some(name => /^(rjm|darpe|musicalizacao|musica|gem|santaCeia)/.test(name)), false);
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const services = Array.from(html.matchAll(/src="js\/services\/([^"?]+)/g), match => match[1]).sort();
    assert.deepEqual(services, ['auth.service.js', 'ebi.service.js', 'visitas.service.js']);
});
