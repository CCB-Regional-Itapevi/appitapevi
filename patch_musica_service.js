const fs = require('fs');
let p = 'js/services/musicalizacao.service.js';
let c = fs.readFileSync(p, 'utf8');

const targetCacheVars = "var SUPABASE_URL = 'https://sqamxlhfazulrisiptud.supabase.co';";
const replacementCacheVars = "var aulasCache = {};\n\n        function clearMusicalizacaoCache() {\n            aulasCache = {};\n        }\n\n        " + targetCacheVars;

c = c.replace(targetCacheVars, replacementCacheVars);

const targetGetAulas = `function getAulas() {
            var deferred = $q.defer();
            AuthService.applyDataScopeToQuery(
                supabase.from('musicalizacao_aulas').select('*'),
                MUSICALIZACAO_AULAS_SCOPE
            ).order('data_aula', { ascending: false })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(AuthService.filterCollectionByDataScope(response.data || [], MUSICALIZACAO_AULAS_SCOPE));
                });
            return deferred.promise;
        }`;

const replaceGetAulas = `function getAulas(filters) {
            var deferred = $q.defer();
            var mesFiltro = (filters && filters.mes) ? String(filters.mes) : 'all';
            
            if (aulasCache[mesFiltro] && (Date.now() - aulasCache[mesFiltro].time < 300000)) {
                deferred.resolve(aulasCache[mesFiltro].data);
                return deferred.promise;
            }

            var query = supabase.from('musicalizacao_aulas').select('*');
            
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
                    query = query.gte('data_aula', d1Str).lte('data_aula', d2Str);
                }
            }
            
            AuthService.applyDataScopeToQuery(query, MUSICALIZACAO_AULAS_SCOPE)
                .order('data_aula', { ascending: false })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else {
                        var result = AuthService.filterCollectionByDataScope(response.data || [], MUSICALIZACAO_AULAS_SCOPE);
                        aulasCache[mesFiltro] = { data: result, time: Date.now() };
                        deferred.resolve(result);
                    }
                });
            return deferred.promise;
        }`;

c = c.replace(targetGetAulas, replaceGetAulas);

c = c.replace(/return supabase\.from\('musicalizacao_aulas'\)\.insert\(\[currentPayload\]\);\n            }, payload, deferred\);\n            deferred\.promise\.then\(function \(result\) {/g, "return supabase.from('musicalizacao_aulas').insert([currentPayload]);\n            }, payload, deferred);\n            deferred.promise.then(function (result) {\n                clearMusicalizacaoCache();");
c = c.replace(/return AuthService\.applyDataScopeToQuery\(\n                    supabase\.from\('musicalizacao_aulas'\)\.update\(currentPayload\)\.eq\('id', data\.id\),\n                    MUSICALIZACAO_AULAS_SCOPE\n                \);\n            }, updateData, deferred\);\n            deferred\.promise\.then\(function \(\) {/g, "return AuthService.applyDataScopeToQuery(\n                    supabase.from('musicalizacao_aulas').update(currentPayload).eq('id', data.id),\n                    MUSICALIZACAO_AULAS_SCOPE\n                );\n            }, updateData, deferred);\n            deferred.promise.then(function () {\n                clearMusicalizacaoCache();");
c = c.replace(/supabase\.from\('musicalizacao_aulas'\)\.delete\(\)\.eq\('id', id\),\n                MUSICALIZACAO_AULAS_SCOPE\n            \)\n                \.then\(function \(response\) {\n                    if \(response\.error\) deferred\.reject\(response\.error\);\n                    else {/g, "supabase.from('musicalizacao_aulas').delete().eq('id', id),\n                MUSICALIZACAO_AULAS_SCOPE\n            )\n                .then(function (response) {\n                    if (response.error) deferred.reject(response.error);\n                    else {\n                        clearMusicalizacaoCache();");

fs.writeFileSync(p, c);
console.log('musicalizacao.service.js patched!');
