const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('EBI loads more than 1000 records and sees external submissions on reload', async () => {
    let factory;
    const rows = Array.from({ length: 1580 }, (_, id) => ({ id: String(id), data_reuniao: '2026-09-21' }));
    const calls = [];
    const client = { from() { return {
        select() { return this; }, order() { return this; },
        range(start, end) { calls.push([start, end]); return Promise.resolve({ data: rows.slice(start, end + 1) }); }
    }; } };
    const angular = {
        module() { return { factory(name, fn) { factory = fn; } }; },
        copy(value) { return JSON.parse(JSON.stringify(value)); }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/services/ebi.service.js'), 'utf8'), {
        angular, window: { getAppSupabaseClient: () => client }
    });
    const $q = { defer() {
        const result = {};
        result.promise = new Promise((resolve, reject) => { result.resolve = resolve; result.reject = reject; });
        return result;
    } };
    const service = factory($q, { applyDataScopeToQuery: q => q, filterCollectionByDataScope: rows => rows });
    assert.equal((await service.getRecitativos()).length, 1580);
    rows.unshift({ id: 'new', data_reuniao: '2026-10-06' });
    const refreshed = await service.getRecitativos();
    assert.equal(refreshed.length, 1581);
    assert.equal(refreshed[0].id, 'new');
    assert.deepEqual(calls, [[0, 999], [1000, 1999], [0, 999], [1000, 1999]]);
});

test('EBI does not report deletion success when RLS removes zero rows', async () => {
    let factory;
    let deleted = [];
    const query = { delete() { return this; }, eq() { return this; }, select() { return this; },
        then(fn) { return Promise.resolve({ data: deleted }).then(fn); } };
    const angular = { module() { return { factory(name, fn) { factory = fn; } }; } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/services/ebi.service.js'), 'utf8'), {
        angular, window: { getAppSupabaseClient: () => ({ from: () => query }) }
    });
    const $q = { defer() { const d = {}; d.promise = new Promise((resolve, reject) => {
        d.resolve = resolve; d.reject = reject;
    }); return d; } };
    const service = factory($q, { applyDataScopeToQuery: q => q });
    await assert.rejects(service.deleteAtividade('test'), error => /confirmou/.test(error.message));
    deleted = [{ id: 'test' }];
    assert.equal((await service.deleteAtividade('test'))[0].id, 'test');
});
