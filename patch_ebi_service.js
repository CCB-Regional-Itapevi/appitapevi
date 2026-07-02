const fs = require('fs');
let p = 'js/services/ebi.service.js';
let c = fs.readFileSync(p, 'utf8');

const targetCacheVars = "var SUPABASE_URL = 'https://sqamxlhfazulrisiptud.supabase.co';";
const replacementCacheVars = "var recitativosCache = {};\n        var alunosCache = { data: null, time: 0 };\n        var monitoresCache = { data: null, time: 0 };\n\n        function clearEbiCache() {\n            recitativosCache = {};\n            alunosCache = { data: null, time: 0 };\n            monitoresCache = { data: null, time: 0 };\n        }\n\n        " + targetCacheVars;

c = c.replace(targetCacheVars, replacementCacheVars);

const targetGetRec = `function getRecitativos() {
            var deferred = $q.defer();
            AuthService.applyDataScopeToQuery(
                supabase.from('ebi_atividades').select('*'),
                EBI_ATIVIDADES_SCOPE
            ).order('data_reuniao', { ascending: false })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(
                        AuthService.filterCollectionByDataScope(
                            (response.data || []).map(normalizeAtividadeRecord),
                            EBI_ATIVIDADES_SCOPE
                        )
                    );
                });
            return deferred.promise;
        }`;

const replaceGetRec = `function getRecitativos(filters) {
            var deferred = $q.defer();
            var mesFiltro = (filters && filters.mes) ? String(filters.mes) : 'all';
            
            if (recitativosCache[mesFiltro] && (Date.now() - recitativosCache[mesFiltro].time < 300000)) {
                deferred.resolve(recitativosCache[mesFiltro].data);
                return deferred.promise;
            }

            var query = supabase.from('ebi_atividades').select('*');
            
            if (filters && filters.mes && filters.mes !== 'Todos os meses') {
                var meses = ['Janeiro', 'Fevereiro', 'Mar\\u00e7o', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                var monthIndex = meses.indexOf(filters.mes);
                if (monthIndex !== -1) {
                    var currentYear = new Date().getFullYear();
                    var pad = function(n) { return n < 10 ? '0' + n : n; };
                    var d1 = new Date(currentYear, monthIndex, 1);
                    var d2 = new Date(currentYear, monthIndex + 1, 0);
                    var d1Str = d1.getFullYear() + '-' + pad(d1.getMonth() + 1) + '-' + pad(d1.getDate());
                    var d2Str = d2.getFullYear() + '-' + pad(d2.getMonth() + 1) + '-' + pad(d2.getDate());
                    query = query.gte('data_reuniao', d1Str).lte('data_reuniao', d2Str);
                }
            }
            
            AuthService.applyDataScopeToQuery(query, EBI_ATIVIDADES_SCOPE)
                .order('data_reuniao', { ascending: false })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else {
                        var result = AuthService.filterCollectionByDataScope(
                            (response.data || []).map(normalizeAtividadeRecord),
                            EBI_ATIVIDADES_SCOPE
                        );
                        recitativosCache[mesFiltro] = { data: result, time: Date.now() };
                        deferred.resolve(result);
                    }
                });
            return deferred.promise;
        }`;

c = c.replace(targetGetRec, replaceGetRec);

c = c.replace(/return supabase\.from\('ebi_atividades'\)\.insert\(\[currentPayload\]\);\n            }, payload, deferred\);\n            deferred\.promise\.then\(function \(result\) {/g, "return supabase.from('ebi_atividades').insert([currentPayload]);\n            }, payload, deferred);\n            deferred.promise.then(function (result) {\n                clearEbiCache();");
c = c.replace(/return AuthService\.applyDataScopeToQuery\(\n                    supabase\.from\('ebi_atividades'\)\.update\(currentPayload\)\.eq\('id', data\.id\),\n                    EBI_ATIVIDADES_SCOPE\n                \);\n            }, updateData, deferred\);\n            deferred\.promise\.then\(function \(\) {/g, "return AuthService.applyDataScopeToQuery(\n                    supabase.from('ebi_atividades').update(currentPayload).eq('id', data.id),\n                    EBI_ATIVIDADES_SCOPE\n                );\n            }, updateData, deferred);\n            deferred.promise.then(function () {\n                clearEbiCache();");
c = c.replace(/supabase\.from\('ebi_atividades'\)\.delete\(\)\.eq\('id', id\),\n                EBI_ATIVIDADES_SCOPE\n            \)\n                \.then\(function \(response\) {\n                    if \(response\.error\) deferred\.reject\(response\.error\);\n                    else {/g, "supabase.from('ebi_atividades').delete().eq('id', id),\n                EBI_ATIVIDADES_SCOPE\n            )\n                .then(function (response) {\n                    if (response.error) deferred.reject(response.error);\n                    else {\n                        clearEbiCache();");

fs.writeFileSync(p, c);
console.log('ebi.service.js patched!');
