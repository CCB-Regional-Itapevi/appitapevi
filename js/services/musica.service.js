(function () {
    'use strict';

    angular.module('inspinia')
        .factory('MusicaService', MusicaService);

    MusicaService.$inject = ['$q', 'AuthService'];

    function MusicaService($q, AuthService) {
        var SUPABASE_URL = 'https://sqamxlhfazulrisiptud.supabase.co';
        var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYW14bGhmYXp1bHJpc2lwdHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU4ODQsImV4cCI6MjA4Mjk1MTg4NH0.UmshkDqIgJQYVMmWVVgmfQm-YacUbRBeSpmYsNG0baE';
        var supabase = window.__appSupabaseClient
            || (window.__appSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
        var APP_ENR_SUPABASE_URL = normalizeSupabaseProjectUrl((window.MUSICA_JUSTIFICATIVA_CONFIG || {}).appEnrSupabaseUrl || '');
        var APP_ENR_SUPABASE_ANON_KEY = (window.MUSICA_JUSTIFICATIVA_CONFIG || {}).appEnrSupabaseAnonKey || '';
        var appEnrSupabase = null;
        var REGIONAL_MUNICIPIOS = [
            'ITAPEVI',
            'PIRAPORA DO BOM JESUS',
            'CAUCAIA DO ALTO',
            'COTIA',
            'FAZENDINHA',
            'JANDIRA',
            'VARGEM GRANDE PAULISTA',
            'SANTANA DE PARNAIBA'
        ];
        var REGIONAL_POLOS = [
            'ITAPEVI',
            'PIRAPORA DO BOM JESUS',
            'CAUCAIA DO ALTO',
            'COTIA',
            'FAZENDINHA',
            'JANDIRA',
            'VARGEM GRANDE PAULISTA'
        ];

        var service = {
            getDashboardData: getDashboardData,
            getEnsaios: getEnsaios,
            getEnsaio: getEnsaio,
            saveEnsaio: saveEnsaio,
            updateEnsaio: updateEnsaio,
            deleteEnsaio: deleteEnsaio,
            getLocais: getLocais,
            getParticipantes: getParticipantes,
            saveLocal: saveLocal,
            updateLocal: updateLocal,
            deleteLocal: deleteLocal,
            getPresencas: getPresencas,
            getPresencasAnaliticas: getPresencasAnaliticas,
            savePresenca: savePresenca,
            updatePresenca: updatePresenca,
            deletePresenca: deletePresenca,
            getJustificativas: getJustificativas,
            saveJustificativa: saveJustificativa,
            updateJustificativa: updateJustificativa,
            deleteJustificativa: deleteJustificativa,
            checkJustificativaDuplicadaHoje: checkJustificativaDuplicadaHoje,
            isCadastroExternoConfigured: isCadastroExternoConfigured,
            getPublicCargos: getPublicCargos,
            searchPublicComuns: searchPublicComuns,
            searchPublicPessoas: searchPublicPessoas,
            previewWorkbook: previewWorkbook,
            importWorkbook: importWorkbook,
            getRelatorioUnificado: getRelatorioUnificado,
            getCalendarioPadrao: getCalendarioPadrao
        };

        return service;

        function getCalendarioPadrao() {
            return [
                { meses: 'Janeiro, Maio e Setembro', ciclo: 'Itapevi / Pirapora', locais: 'Itapevi e Parque Laranjeira II - Pirapora do Bom Jesus' },
                { meses: 'Marco, Julho e Novembro', ciclo: 'Polos municipais', locais: 'Caucaia, Cotia, Vargem Grande, Jandira e Fazendinha - Santana de Parnaiba' }
            ];
        }

        function getEnsaios() {
            return listTable('musica_ensaios_regionais', 'data_ensaio', false);
        }

        function getEnsaio(id) {
            var deferred = $q.defer();

            supabase.from('musica_ensaios_regionais').select('*').eq('id', id).single()
                .then(function (response) {
                    handleResponse(deferred, response);
                }).catch(function (error) {
                    deferred.reject(error);
                });

            return deferred.promise;
        }

        function saveEnsaio(ensaio) {
            return insertRecord('musica_ensaios_regionais', normalizeEnsaioPayload(ensaio), 'MUSICA_ENSAIO_CREATE');
        }

        function updateEnsaio(ensaio) {
            return updateRecord('musica_ensaios_regionais', ensaio.id, normalizeEnsaioPayload(ensaio), 'MUSICA_ENSAIO_UPDATE');
        }

        function deleteEnsaio(id) {
            return deleteRecord('musica_ensaios_regionais', id, 'MUSICA_ENSAIO_DELETE');
        }

        function getLocais(ensaioId) {
            return fetchPaged(function () {
                var query = supabase.from('musica_ensaio_locais').select('*').order('ordem', { ascending: true });

                if (ensaioId) {
                    query = query.eq('ensaio_id', ensaioId);
                }

                return query;
            });
        }

        function getParticipantes(ensaioId) {
            return fetchPaged(function () {
                var query = supabase.from('musica_ensaio_participantes').select('*')
                    .order('nome_completo', { ascending: true });

                if (ensaioId) {
                    query = query.eq('ensaio_id', ensaioId);
                }

                return query;
            });
        }

        function getParticipantesByEnsaioIds(ensaioIds) {
            ensaioIds = (ensaioIds || []).filter(Boolean);

            if (!ensaioIds.length) {
                return $q.when([]);
            }

            return fetchPaged(function () {
                return supabase.from('musica_ensaio_participantes').select('*')
                    .in('ensaio_id', ensaioIds)
                    .order('nome_completo', { ascending: true });
            });
        }

        function saveLocal(local) {
            return insertRecord('musica_ensaio_locais', normalizeLocalPayload(local), 'MUSICA_LOCAL_CREATE');
        }

        function updateLocal(local) {
            return updateRecord('musica_ensaio_locais', local.id, normalizeLocalPayload(local), 'MUSICA_LOCAL_UPDATE');
        }

        function deleteLocal(id) {
            return deleteRecord('musica_ensaio_locais', id, 'MUSICA_LOCAL_DELETE');
        }

        function getPresencas(ensaioId) {
            return fetchPaged(function () {
                var query = supabase.from('musica_ensaio_presencas').select('*')
                    .order('municipio', { ascending: true })
                    .order('comum_congregacao', { ascending: true });

                if (ensaioId) {
                    query = query.eq('ensaio_id', ensaioId);
                }

                return query;
            });
        }

        function getPresencasByEnsaioIds(ensaioIds) {
            ensaioIds = (ensaioIds || []).filter(Boolean);

            if (!ensaioIds.length) {
                return $q.when([]);
            }

            return fetchPaged(function () {
                return supabase.from('musica_ensaio_presencas').select('*')
                    .in('ensaio_id', ensaioIds)
                    .order('municipio', { ascending: true })
                    .order('comum_congregacao', { ascending: true });
            });
        }

        function getLocaisByEnsaioIds(ensaioIds) {
            ensaioIds = (ensaioIds || []).filter(Boolean);

            if (!ensaioIds.length) {
                return $q.when([]);
            }

            return fetchPaged(function () {
                return supabase.from('musica_ensaio_locais').select('*')
                    .in('ensaio_id', ensaioIds)
                    .order('ordem', { ascending: true });
            });
        }

        function savePresenca(presenca) {
            return insertRecord('musica_ensaio_presencas', normalizePresencaPayload(presenca), 'MUSICA_PRESENCA_CREATE');
        }

        function updatePresenca(presenca) {
            return updateRecord('musica_ensaio_presencas', presenca.id, normalizePresencaPayload(presenca), 'MUSICA_PRESENCA_UPDATE');
        }

        function deletePresenca(id) {
            return deleteRecord('musica_ensaio_presencas', id, 'MUSICA_PRESENCA_DELETE');
        }

        function getJustificativas(filters) {
            filters = filters || {};

            return fetchPaged(function () {
                var query = supabase.from('musica_justificativas').select('*')
                    .order('data_evento', { ascending: false })
                    .order('created_at', { ascending: false });

                if (filters.tipo_evento) {
                    query = query.eq('tipo_evento', filters.tipo_evento);
                }

                if (filters.status) {
                    query = query.eq('status', filters.status);
                }

                return query;
            });
        }

        function checkJustificativaDuplicadaHoje(nome, comum) {
            var deferred = $q.defer();
            var d = new Date();
            d.setHours(0, 0, 0, 0); // Start of today local time
            var startOfTodayUTC = d.toISOString();
            
            supabase.from('musica_justificativas').select('id')
                .ilike('nome', String(nome || '').trim())
                .ilike('comum', String(comum || '').trim())
                .gte('created_at', startOfTodayUTC)
                .limit(1)
                .then(function (response) {
                    if (response && response.error) {
                        deferred.reject(response.error);
                        return;
                    }
                    deferred.resolve(response && response.data && response.data.length > 0);
                }).catch(function (error) {
                    deferred.reject(error);
                });

            return deferred.promise;
        }

        function saveJustificativa(justificativa) {
            var deferred = $q.defer();
            var payload = normalizeJustificativaPayload(justificativa);

            supabase.from('musica_justificativas').insert([payload])
                .then(function (response) {
                    handleResponse(deferred, response, 'MUSICA_JUSTIFICATIVA_CREATE', payload);
                }).catch(function (error) {
                    deferred.reject(error);
                });

            return deferred.promise;
        }

        function updateJustificativa(justificativa) {
            return updateRecord('musica_justificativas', justificativa.id, normalizeJustificativaPayload(justificativa), 'MUSICA_JUSTIFICATIVA_UPDATE');
        }

        function deleteJustificativa(id) {
            return deleteRecord('musica_justificativas', id, 'MUSICA_JUSTIFICATIVA_DELETE');
        }

        function isCadastroExternoConfigured() {
            return !!(APP_ENR_SUPABASE_URL && APP_ENR_SUPABASE_ANON_KEY);
        }

        function getPublicCargos() {
            return [
                'Músico',
                'Organista',
                'Candidato (a)',
                'Instrutor',
                'Instrutora',
                'Examinadora',
                'Encarregado Local',
                'Encarregado Regional',
                'Secretário da Música',
                'Secretária da Música',
                'Irmandade',
                'Ancião',
                'Diácono',
                'Cooperador do Ofício',
                'Cooperador de Jovens',
                'Porteiro (a)',
                'Bombeiro (a)',
                'Médico (a)',
                'Enfermeiro (a)'
            ];
        }

        function searchPublicComuns(searchText) {
            var client = getAppEnrClient();
            var search = String(searchText || '').trim();

            if (!client) {
                return $q.when([]);
            }

            return fetchExternalPaged(function () {
                var query = client.from('cadastro')
                    .select('comum')
                    .not('comum', 'is', null)
                    .neq('comum', '')
                    .order('comum', { ascending: true });

                if (search) {
                    query = query.ilike('comum', '%' + search + '%');
                }

                return query;
            }).then(function (rows) {
                var seen = {};
                return (rows || []).map(function (row) {
                    return row && row.comum;
                }).filter(function (comum) {
                    var key = normalizeMusicText(comum);
                    if (!key || seen[key]) return false;
                    seen[key] = true;
                    return true;
                }).slice(0, 80).map(function (comum) {
                    return {
                        nome: comum,
                        displayName: extractComumDisplayName(comum)
                    };
                });
            });
        }

        function searchPublicPessoas(comum, cargo, searchText) {
            var client = getAppEnrClient();
            var comumBusca = String(comum || '').trim();
            var cargoBusca = String(cargo || '').trim();
            var search = String(searchText || '').trim();

            if (!client || !comumBusca || !search) {
                return $q.when([]);
            }

            return fetchExternalPaged(function () {
                var query = client.from('cadastro')
                    .select('nome, comum, cargo, instrumento, cidade, nivel')
                    .ilike('comum', '%' + comumBusca + '%')
                    .order('nome', { ascending: true });

                if (cargoBusca) {
                    query = applyPublicCargoFilter(query, cargoBusca);
                }

                if (search) {
                    query = query.ilike('nome', '%' + search + '%');
                }

                return query;
            }).then(function (rows) {
                var seen = {};
                return (rows || []).filter(function (row) {
                    var key = normalizeMusicText([row.nome, row.comum, row.cargo, row.instrumento].join('|'));
                    if (!row.nome || seen[key]) return false;
                    seen[key] = true;
                    return true;
                }).slice(0, 80).map(function (row) {
                    return {
                        nome: row.nome || '',
                        comum: row.comum || comumBusca,
                        municipio: row.cidade || '',
                        cargo: row.cargo || cargoBusca,
                        instrumento: row.instrumento || '',
                        nivel: row.nivel || ''
                    };
                });
            });
        }

        function previewWorkbook(file) {
            return parseWorkbookFile(file).then(function (parsed) {
                return buildImportPreview(parsed, file && file.name);
            });
        }

        function importWorkbook(file) {
            return parseWorkbookFile(file).then(function (parsed) {
                return importParsedWorkbookByDate(parsed, file && file.name);
            });
        }

        function getDashboardData(selectedEnsaioId, selectedLocalidade, selectedMunicipio) {
            return getEnsaios().then(function (ensaios) {
                var ensaiosCanonicos = buildCanonicalEnsaios(ensaios || []);
                var ensaioReferencia = selectedEnsaioId ? findById(ensaiosCanonicos, selectedEnsaioId) : null;

                ensaioReferencia = ensaioReferencia || (ensaiosCanonicos || [])[0] || null;

                return $q.all({
                    ensaios: $q.when(ensaiosCanonicos || []),
                    presencas: getPresencas(),
                    locais: getLocais(),
                    participantes: getParticipantes(),
                    comunsCatalog: AuthService.listComunsCatalog()
                }).then(function (data) {
                    return buildDashboardPayload(data, (ensaioReferencia || {}).id || selectedEnsaioId, selectedLocalidade, selectedMunicipio);
                });
            });
        }

        function getPresencasAnaliticas(ensaioId) {
            return $q.all({
                presencas: getPresencas(ensaioId),
                comunsCatalog: AuthService.listComunsCatalog()
            }).then(function (data) {
                return analyzePresencasAgainstCatalog(data.presencas || [], data.comunsCatalog || []);
            });
        }

        function getRelatorioUnificado(ensaioId) {
            return $q.all({
                ensaios: getEnsaios(),
                analitica: getPresencasAnaliticas(ensaioId),
                locais: getLocais(ensaioId)
            }).then(function (data) {
                var ensaio = findById(data.ensaios, ensaioId) || (data.ensaios || [])[0] || null;
                var relatorio = buildUnifiedReport(((data.analitica || {}).regional || []));
                return angular.extend(relatorio, {
                    ensaio: ensaio,
                    locais: data.locais || [],
                    visitantes: (data.analitica || {}).visitantes || [],
                    totaisVisitantes: summarizePresenceTotals((data.analitica || {}).visitantes || []),
                    catalogoRegional: (data.analitica || {}).catalogoRegional || []
                });
            });
        }

        function listTable(tableName, orderField, ascending) {
            return fetchPaged(function () {
                return supabase.from(tableName).select('*').order(orderField, { ascending: ascending !== false });
            });
        }

        function fetchPaged(buildQuery) {
            var deferred = $q.defer();
            var pageSize = 1000;
            var page = 0;
            var rows = [];

            fetchNextPage();

            return deferred.promise;

            function fetchNextPage() {
                buildQuery()
                .range(page * pageSize, ((page + 1) * pageSize) - 1)
                .then(function (response) {
                    var data;

                    if (response && response.error) {
                        if (isMissingTableError(response.error)) {
                            deferred.resolve([]);
                            return;
                        }
                        deferred.reject(response.error);
                        return;
                    }

                    data = (response && response.data) || [];
                    rows = rows.concat(data);

                    if (data.length === pageSize) {
                        page += 1;
                        fetchNextPage();
                        return;
                    }

                    deferred.resolve(rows);
                }).catch(function (error) {
                    deferred.reject(error);
                });
            }
        }

        function getAppEnrClient() {
            if (!isCadastroExternoConfigured() || !window.supabase) {
                return null;
            }

            if (!appEnrSupabase) {
                appEnrSupabase = window.supabase.createClient(APP_ENR_SUPABASE_URL, APP_ENR_SUPABASE_ANON_KEY, {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                });
            }

            return appEnrSupabase;
        }

        function normalizeSupabaseProjectUrl(value) {
            return String(value || '').replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
        }

        function fetchExternalPaged(buildQuery) {
            var deferred = $q.defer();
            var pageSize = 1000;
            var page = 0;
            var rows = [];

            fetchNextPage();

            return deferred.promise;

            function fetchNextPage() {
                buildQuery()
                .range(page * pageSize, ((page + 1) * pageSize) - 1)
                .then(function (response) {
                    var data;

                    if (response && response.error) {
                        deferred.reject(response.error);
                        return;
                    }

                    data = (response && response.data) || [];
                    rows = rows.concat(data);

                    if (data.length === pageSize && page < 4) {
                        page += 1;
                        fetchNextPage();
                        return;
                    }

                    deferred.resolve(rows);
                }).catch(function (error) {
                    deferred.reject(error);
                });
            }
        }

        function applyPublicCargoFilter(query, cargo) {
            var normalized = normalizeMusicText(cargo);

            if (normalized.indexOf('organista') !== -1) {
                return query.or('cargo.ilike.%ORGANISTA%,instrumento.ilike.%ORGAO%,instrumento.ilike.%ÓRGÃO%');
            }

            if (normalized.indexOf('musico') !== -1) {
                return query.or('cargo.ilike.%MUSICO%,cargo.ilike.%MÚSICO%,cargo.ilike.%ENCARREGADO%,cargo.ilike.%INSTRUTOR%,instrumento.not.is.null');
            }

            return query.ilike('cargo', '%' + cargo + '%');
        }

        function insertRecord(tableName, payload, auditAction) {
            var deferred = $q.defer();

            supabase.from(tableName).insert([payload]).select()
                .then(function (response) {
                    handleResponse(deferred, response, auditAction, payload);
                }).catch(function (error) {
                    deferred.reject(error);
                });

            return deferred.promise;
        }

        function updateRecord(tableName, id, payload, auditAction) {
            var deferred = $q.defer();

            supabase.from(tableName).update(payload).eq('id', id).select()
                .then(function (response) {
                    handleResponse(deferred, response, auditAction, angular.extend({ id: id }, payload));
                }).catch(function (error) {
                    deferred.reject(error);
                });

            return deferred.promise;
        }

        function deleteRecord(tableName, id, auditAction) {
            var deferred = $q.defer();

            supabase.from(tableName).delete().eq('id', id)
                .then(function (response) {
                    handleResponse(deferred, response, auditAction, { id: id });
                }).catch(function (error) {
                    deferred.reject(error);
                });

            return deferred.promise;
        }

        function handleResponse(deferred, response, auditAction, details) {
            if (response && response.error) {
                deferred.reject(response.error);
                return;
            }

            auditMusica(auditAction, details);
            deferred.resolve(response ? response.data : null);
        }

        function resolveMissingTableAsEmpty(deferred, response) {
            if (response && response.error) {
                if (isMissingTableError(response.error)) {
                    deferred.resolve([]);
                    return;
                }
                deferred.reject(response.error);
                return;
            }

            deferred.resolve((response && response.data) || []);
        }

        function isMissingTableError(error) {
            var message = String((error && (error.message || error.details || error.hint)) || '').toLowerCase();
            return message.indexOf('does not exist') >= 0
                || message.indexOf('could not find the table') >= 0
                || String(error && error.code).toLowerCase() === 'pgrst205';
        }

        function normalizeMusicText(value) {
            return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        }

        function extractComumDisplayName(value) {
            var text = String(value || '').trim();
            var parts;

            if (!text) {
                return '';
            }

            if (text.indexOf(' - ') !== -1) {
                parts = text.split(' - ');
                return parts.slice(1).join(' - ').trim() || text;
            }

            return text.replace(/^(?:BR-)?\d{2}-\d{3,6}\s+/i, '').trim() || text;
        }

        function normalizeEnsaioPayload(ensaio) {
            var source = angular.copy(ensaio || {});
            return {
                titulo: source.titulo || 'Ensaio Regional',
                data_ensaio: formatDateValue(source.data_ensaio),
                mes_referencia: source.mes_referencia || resolveMonthLabel(source.data_ensaio),
                ciclo: source.ciclo || '',
                sede_principal: source.sede_principal || '',
                status: source.status || 'Planejado',
                relatorio_modelo: source.relatorio_modelo || 'Unificado por municipio e comum',
                observacoes: source.observacoes || ''
            };
        }

        function normalizeLocalPayload(local) {
            var source = angular.copy(local || {});
            return {
                ensaio_id: source.ensaio_id || null,
                municipio: source.municipio || '',
                localidade: source.localidade || '',
                comum_referencia: source.comum_referencia || source.localidade || '',
                endereco: source.endereco || '',
                ordem: parseInt(source.ordem, 10) || 0,
                observacoes: source.observacoes || ''
            };
        }

        function normalizePresencaPayload(presenca) {
            var source = angular.copy(presenca || {});
            var musicos = parseInt(source.musicos, 10) || 0;
            var organistas = parseInt(source.organistas, 10) || 0;
            var irmandade = parseInt(source.irmandade, 10) || 0;
            var ministerio = parseInt(source.ministerio, 10) || 0;
            var apoio = parseInt(source.apoio, 10) || 0;
            var outros = parseInt(source.outros, 10) || 0;

            return {
                ensaio_id: source.ensaio_id || null,
                municipio: source.municipio || '',
                comum_congregacao: source.comum_congregacao || '',
                local_ensaio: source.local_ensaio || '',
                musicos: musicos,
                organistas: organistas,
                irmandade: irmandade,
                ministerio: ministerio,
                apoio: apoio,
                outros: outros,
                encarregado_local: !!source.encarregado_local,
                nome_encarregado: source.nome_encarregado || '',
                ausentes_justificados: parseInt(source.ausentes_justificados, 10) || 0,
                observacoes: source.observacoes || ''
            };
        }

        function normalizeJustificativaPayload(justificativa) {
            var source = angular.copy(justificativa || {});

            return {
                ensaio_id: source.ensaio_id || null,
                tipo_evento: normalizeJustificativaTipoEvento(source.tipo_evento),
                nome_evento: source.nome_evento || '',
                data_evento: formatDateValue(source.data_evento) || null,
                nome: source.nome || source.nome_completo || '',
                comum: source.comum || source.comum_congregacao || '',
                municipio: source.municipio || '',
                cargo: source.cargo || '',
                instrumento: source.instrumento || '',
                motivo: source.motivo || source.justificativa || '',
                status: source.status || 'Justificado',
                contato: source.contato || '',
                registrado_por: source.registrado_por || '',
                origem_aplicacao: source.origem_aplicacao || 'APP_GLOBAL',
                referencia_externa: source.referencia_externa || source.external_id || '',
                observacoes: source.observacoes || '',
                payload_origem: source.payload_origem || null
            };
        }

        function normalizeJustificativaTipoEvento(value) {
            var normalized = normalizeMusicText(value);

            if (normalized === 'reuniao do ministerio') return 'Reuniao do ministerio';
            if (normalized === 'reuniao tecnica') return 'Reuniao tecnica';
            if (normalized === 'outro evento da musica' || normalized === 'outros eventos da musica') return 'Outro evento da musica';
            return 'Ensaio regional';
        }

        function buildCanonicalEnsaios(ensaios) {
            var grouped = {};
            var rawById = {};

            (ensaios || []).forEach(function (ensaio) {
                var canonicalDate = resolveCanonicalRegionalDate(ensaio && ensaio.data_ensaio);
                var key = canonicalDate || formatDateOnly(ensaio && ensaio.data_ensaio);

                if (!key) {
                    return;
                }

                rawById[String(ensaio.id)] = key;

                if (!grouped[key]) {
                    grouped[key] = angular.extend({}, ensaio, {
                        id: key,
                        data_ensaio: key,
                        ensaio_ids: [],
                        datas_origem: [],
                        raw_date_by_id: {}
                    });
                }

                grouped[key].ensaio_ids.push(ensaio.id);
                grouped[key].raw_date_by_id[String(ensaio.id)] = key;
                if (grouped[key].datas_origem.indexOf(formatDateOnly(ensaio.data_ensaio)) === -1) {
                    grouped[key].datas_origem.push(formatDateOnly(ensaio.data_ensaio));
                }
            });

            return Object.keys(grouped).sort().reverse().map(function (key) {
                return grouped[key];
            });
        }

        function buildEnsaioDateLookup(ensaios) {
            var lookup = {};

            (ensaios || []).forEach(function (ensaio) {
                (ensaio.ensaio_ids || [ensaio.id]).forEach(function (id) {
                    lookup[String(id)] = ensaio.id;
                });
            });

            return lookup;
        }

        function resolvePresenceCanonicalDate(item, lookup) {
            return lookup[String(item && item.ensaio_id)] || '';
        }

        function buildDashboardPayload(data, selectedEnsaioId, selectedLocalidade, selectedMunicipio) {
            var ensaios = data.ensaios || [];
            var presencas = data.presencas || [];
            var locais = data.locais || [];
            var participantes = data.participantes || [];
            var ensaioDateLookup = buildEnsaioDateLookup(ensaios);
            var comunsCatalog = data.comunsCatalog || [];
            var analitica = analyzePresencasAgainstCatalog(presencas, comunsCatalog);
            var regionalPresencas = (presencas || []).filter(isRegionalPresence);
            var visitantes = [];
            var ensaioIdsComPresenca = {};
            var ensaioReferencia = null;
            var relatorio;
            var relatorioAnterior = null;
            var ensaioAnterior = null;
            var visaoRegional;
            var visaoRegionalAnterior;
            var selecionadas;
            var visitantesSelecionados;
            var totalVisitantesSelecionados;
            var localidadeFiltro = normalizeMunicipioValue(selectedLocalidade || '');
            var municipioFiltro = normalizeMunicipioValue(selectedMunicipio || '');
            var presencasDoEnsaio;
            var participantesDoEnsaio;
            var locaisDisponiveis;
            var locaisResumo;
            var municipiosDisponiveis;
            var visitantesRelatorio;

            (regionalPresencas || []).forEach(function (item) {
                if (item && item.ensaio_id) {
                    ensaioIdsComPresenca[resolvePresenceCanonicalDate(item, ensaioDateLookup) || String(item.ensaio_id)] = true;
                }
            });

            if (selectedEnsaioId) {
                ensaioReferencia = findById(ensaios, selectedEnsaioId);
            }

            ensaioReferencia = ensaioReferencia || (ensaios || []).filter(function (item) {
                return !!ensaioIdsComPresenca[String(item.id)];
            })[0] || ensaios[0] || null;

            participantesDoEnsaio = (participantes || []).filter(function (item) {
                return !ensaioReferencia
                    || resolveCanonicalRegionalDate(item && item.data_ensaio) === ensaioReferencia.id
                    || resolvePresenceCanonicalDate(item, ensaioDateLookup) === ensaioReferencia.id;
            });

            if (participantesDoEnsaio.length) {
                presencasDoEnsaio = buildPresencasFromParticipantes(participantesDoEnsaio).filter(isRegionalPresence);
            } else {
                presencasDoEnsaio = (regionalPresencas || []).filter(function (item) {
                    return !ensaioReferencia || resolvePresenceCanonicalDate(item, ensaioDateLookup) === ensaioReferencia.id;
                });
            }

            locaisResumo = buildLocalidadeSummary((presencasDoEnsaio || []).concat(visitantes || []));
            locaisDisponiveis = locaisResumo.map(function (item) { return item.nome; });
            municipiosDisponiveis = buildMunicipioOptions(presencasDoEnsaio, null, localidadeFiltro);

            selecionadas = (presencasDoEnsaio || []).filter(function (item) {
                if (localidadeFiltro && normalizeMunicipioValue(item.local_ensaio || '') !== localidadeFiltro) {
                    return false;
                }
                if (municipioFiltro && normalizeMunicipioValue(item.municipio || '') !== municipioFiltro) {
                    return false;
                }
                return true;
            });
            visitantesSelecionados = [];
            totalVisitantesSelecionados = sumTotalPresencas(visitantesSelecionados);

            relatorio = buildUnifiedReport(selecionadas, comunsCatalog);
            visitantesRelatorio = buildUnifiedReport(visitantesSelecionados);
            ensaioAnterior = findPreviousEnsaioWithData(ensaios, regionalPresencas, ensaioReferencia && ensaioReferencia.id);
            if (ensaioAnterior) {
                relatorioAnterior = buildUnifiedReport((regionalPresencas || []).filter(function (item) {
                    return resolvePresenceCanonicalDate(item, ensaioDateLookup) === ensaioAnterior.id;
                }), comunsCatalog);
            }

            var targets = buildCatalogTargets(comunsCatalog || []);
            enrichMunicipiosWithTargets(relatorio.municipios, targets.byMunicipio);
            visaoRegional = buildRegionalFlowInsights(selecionadas);
            visaoRegionalAnterior = buildRegionalFlowInsights((regionalPresencas || []).filter(function (item) {
                return ensaioAnterior && resolvePresenceCanonicalDate(item, ensaioDateLookup) === ensaioAnterior.id;
            }));

            return {
                metrics: {
                    ensaios: ensaios.length,
                    locais: (locais || []).filter(function (item) {
                        return !ensaioReferencia || resolvePresenceCanonicalDate(item, ensaioDateLookup) === ensaioReferencia.id;
                    }).length,
                    participantes: relatorio.totais.total || 0,
                    musicos: relatorio.totais.musicos || 0,
                    organistas: relatorio.totais.organistas || 0,
                    municipiosRepresentados: relatorio.municipios.length || 0,
                    destinosAtivos: visaoRegional.metrics.destinosAtivos || 0,
                    noProprioMunicipio: relatorio.totais.total || 0,
                    emOutraOrquestra: 0,
                    taxaMobilidade: 0,
                    taxaPermanenciaLocal: relatorio.totais.total ? 100 : 0,
                    totalUltimoEnsaio: relatorio.totais.total || 0,
                    taxaOrganistas: relatorio.totais.total ? Math.round(((relatorio.totais.organistas || 0) / relatorio.totais.total) * 100) : 0,
                    taxaMusicos: relatorio.totais.total ? Math.round(((relatorio.totais.musicos || 0) / relatorio.totais.total) * 100) : 0
                },
                ultimoEnsaio: ensaioReferencia,
                ensaioAnterior: ensaioAnterior,
                rankingMunicipios: relatorio.municipios,
                destinosEnsaio: visaoRegional.destinos,
                topFluxos: visaoRegional.fluxos,
                rankingComuns: relatorio.comuns,
                totaisUltimoEnsaio: relatorio.totais,
                comparativoAnterior: buildParticipantComparativo(visaoRegionalAnterior, visaoRegional),
                visitantesResumo: summarizeVisitantes(visitantesSelecionados, null),
                locaisDisponiveis: locaisDisponiveis,
                locaisResumo: locaisResumo,
                municipiosDisponiveis: municipiosDisponiveis,
                localidadeSelecionada: localidadeFiltro,
                municipioSelecionado: municipioFiltro,
                municipiosCriticos: relatorio.municipios.slice(0, 5),
                ensaios: ensaios,
                calendario: getCalendarioPadrao()
            };
        }

        function buildUnifiedReport(presencas, comunsCatalog) {
            var municipioMap = {};
            var comumMap = {};
            var displayLookup = buildCongregacaoDisplayLookup(presencas, comunsCatalog);
            var totais = { musicos: 0, organistas: 0, irmandade: 0, ministerio: 0, apoio: 0, outros: 0, total: 0, comuns: 0 };

            (presencas || []).forEach(function (item) {
                var municipio = item.municipio || 'Nao informado';
                var comumResolved = resolveCongregacaoReference(municipio, item.comum_congregacao || 'Nao informada', displayLookup);
                var comumKey = comumResolved.key;
                var comum = comumResolved.display;
                var key = municipio + '||' + comumKey;
                var musicos = parseInt(item.musicos, 10) || 0;
                var organistas = parseInt(item.organistas, 10) || 0;
                var irmandade = parseInt(item.irmandade, 10) || 0;
                var ministerio = parseInt(item.ministerio, 10) || 0;
                var apoio = parseInt(item.apoio, 10) || 0;
                var outros = parseInt(item.outros, 10) || 0;
                var total = musicos + organistas + irmandade + ministerio + apoio + outros;

                if (!municipioMap[municipio]) {
                    municipioMap[municipio] = {
                        nome: municipio,
                        musicos: 0,
                        organistas: 0,
                        irmandade: 0,
                        ministerio: 0,
                        apoio: 0,
                        outros: 0,
                        total: 0,
                        comuns: []
                    };
                }

                if (!comumMap[key]) {
                    comumMap[key] = {
                        municipio: municipio,
                        comum: comum,
                        musicos: 0,
                        organistas: 0,
                        irmandade: 0,
                        ministerio: 0,
                        apoio: 0,
                        outros: 0,
                        total: 0
                    };
                    municipioMap[municipio].comuns.push(comumMap[key]);
                }

                comumMap[key].musicos += musicos;
                comumMap[key].organistas += organistas;
                comumMap[key].irmandade += irmandade;
                comumMap[key].ministerio += ministerio;
                comumMap[key].apoio += apoio;
                comumMap[key].outros += outros;
                comumMap[key].total += total;

                municipioMap[municipio].musicos += musicos;
                municipioMap[municipio].organistas += organistas;
                municipioMap[municipio].irmandade += irmandade;
                municipioMap[municipio].ministerio += ministerio;
                municipioMap[municipio].apoio += apoio;
                municipioMap[municipio].outros += outros;
                municipioMap[municipio].total += total;

                totais.musicos += musicos;
                totais.organistas += organistas;
                totais.irmandade += irmandade;
                totais.ministerio += ministerio;
                totais.apoio += apoio;
                totais.outros += outros;
                totais.total += total;
            });

            totais.comuns = Object.keys(comumMap).length;

            return {
                municipios: Object.keys(municipioMap).map(function (key) {
                    municipioMap[key].comuns.sort(sortByTotal);
                    return municipioMap[key];
                }).sort(sortByTotal),
                comuns: Object.keys(comumMap).map(function (key) {
                    return comumMap[key];
                }).sort(sortByTotal),
                totais: totais
            };
        }

        function buildLocalidadeOptions(presencas, ensaioId) {
            return buildLocalidadeSummary(presencas, ensaioId).map(function (item) {
                return item.nome;
            });
        }

        function buildLocalidadeSummary(presencas, ensaioId) {
            var map = {};

            (presencas || []).forEach(function (item) {
                var local = normalizeMunicipioValue(item && item.local_ensaio || '');
                var total = sumTotalPresencas([item]);

                if (!local || !isRegionalPolo(local) || (ensaioId && String(item.ensaio_id) !== String(ensaioId))) {
                    return;
                }

                if (!map[local]) {
                    map[local] = { nome: local, total: 0 };
                }

                map[local].total += total;
            });

            return Object.keys(map).map(function (key) {
                return map[key];
            }).sort(function (a, b) {
                return REGIONAL_POLOS.indexOf(a.nome) - REGIONAL_POLOS.indexOf(b.nome);
            });
        }

        function buildMunicipioOptions(presencas, ensaioId, localidadeFiltro) {
            var map = {};

            (presencas || []).forEach(function (item) {
                var municipio = normalizeMunicipioValue(item && item.municipio || '');
                var local = normalizeMunicipioValue(item && item.local_ensaio || '');

                if (!municipio || !isRegionalMunicipio(municipio) || (ensaioId && String(item.ensaio_id) !== String(ensaioId))) {
                    return;
                }

                if (localidadeFiltro && local !== localidadeFiltro) {
                    return;
                }

                map[municipio] = true;
            });

            return Object.keys(map).sort();
        }

        function isRegionalPresence(item) {
            return isRegionalMunicipio(item && item.municipio);
        }

        function isRegionalMunicipio(value) {
            var municipio = normalizeMunicipioValue(value || '');
            return REGIONAL_MUNICIPIOS.indexOf(municipio) >= 0;
        }

        function isRegionalPolo(value) {
            var local = normalizeMunicipioValue(value || '');
            return REGIONAL_POLOS.indexOf(local) >= 0;
        }

        function analyzePresencasAgainstCatalog(presencas, comunsCatalog) {
            var lookup = buildComumCatalogLookup(comunsCatalog || []);
            var regional = [];
            var visitantes = [];

            (presencas || []).forEach(function (item) {
                var match = matchPresenceToCatalog(item, lookup);
                var cloned = angular.extend({}, item);

                if (match) {
                    cloned.municipio = match.cidade || cloned.municipio;
                    cloned.comum_congregacao = match.nome || cloned.comum_congregacao;
                    cloned.catalogo_comum_id = match.id || null;
                    regional.push(cloned);
                    return;
                }

                visitantes.push(cloned);
            });

            return {
                regional: regional,
                visitantes: visitantes,
                catalogoRegional: comunsCatalog || []
            };
        }

        function buildComumCatalogLookup(comunsCatalog) {
            var byCode = {};
            var byName = {};

            (comunsCatalog || []).forEach(function (item) {
                var code = extractCommonCode(item.codigo || item.nome || '');
                var nameKey = canonicalKeyPart(item.nome || '');
                var cityKey = canonicalKeyPart(item.cidade || '');
                var compoundKey = cityKey + '||' + nameKey;

                if (code) {
                    byCode[code] = item;
                }

                if (nameKey && !byName[nameKey]) {
                    byName[nameKey] = item;
                }

                if (cityKey && nameKey) {
                    byName[compoundKey] = item;
                }
            });

            return { byCode: byCode, byName: byName };
        }

        function matchPresenceToCatalog(item, lookup) {
            var comum = String((item && item.comum_congregacao) || '').trim();
            var municipio = String((item && item.municipio) || '').trim();
            var code = extractCommonCode(comum);
            var nameKey = canonicalKeyPart(comum);
            var compoundKey = canonicalKeyPart(municipio) + '||' + nameKey;

            if (code && lookup.byCode[code]) {
                return lookup.byCode[code];
            }

            return lookup.byName[compoundKey] || lookup.byName[nameKey] || null;
        }

        function extractCommonCode(value) {
            var match = String(value || '').toUpperCase().match(/(BR-\d{2}-\d{4})/);
            return match && match[1] ? match[1] : '';
        }

        function summarizePresenceTotals(items) {
            var totais = buildUnifiedReport(items || []).totais;
            return totais;
        }

        function summarizeVisitantes(visitantes, ensaioId) {
            var selecionados = (visitantes || []).filter(function (item) {
                return !ensaioId || item.ensaio_id === ensaioId;
            });
            var relatorio = buildUnifiedReport(selecionados);

            return {
                totais: relatorio.totais,
                municipios: relatorio.municipios.slice(0, 5),
                comuns: relatorio.comuns.slice(0, 8)
            };
        }

        function findPreviousEnsaioWithData(ensaios, presencas, currentEnsaioId) {
            var currentIndex = -1;
            var indexed = {};

            (presencas || []).forEach(function (item) {
                if (item && item.ensaio_id) {
                    indexed[String(item.ensaio_id)] = true;
                }
            });

            (ensaios || []).forEach(function (item, index) {
                if (currentEnsaioId && String(item.id) === String(currentEnsaioId)) {
                    currentIndex = index;
                }
            });

            if (currentIndex < 0) {
                return null;
            }

            while (++currentIndex < ensaios.length) {
                if (indexed[String(ensaios[currentIndex].id)]) {
                    return ensaios[currentIndex];
                }
            }

            return null;
        }

        function buildComparativoResumo(anterior, atual) {
            var anteriorTotais = (anterior || {}).totais || {};
            var atualTotais = (atual || {}).totais || {};

            return {
                totalAnterior: anteriorTotais.total || 0,
                totalAtual: atualTotais.total || 0,
                diferencaTotal: (atualTotais.total || 0) - (anteriorTotais.total || 0),
                musicosAnterior: anteriorTotais.musicos || 0,
                musicosAtual: atualTotais.musicos || 0,
                organistasAnterior: anteriorTotais.organistas || 0,
                organistasAtual: atualTotais.organistas || 0,
                comunsAnterior: anteriorTotais.comuns || 0,
                comunsAtual: atualTotais.comuns || 0
            };
        }

        function buildParticipantComparativo(anterior, atual) {
            var anteriorTotais = ((anterior || {}).totais) || {};
            var atualTotais = ((atual || {}).totais) || {};

            return {
                totalAnterior: anteriorTotais.total || 0,
                totalAtual: atualTotais.total || 0,
                diferencaTotal: (atualTotais.total || 0) - (anteriorTotais.total || 0),
                musicosAnterior: anteriorTotais.musicos || 0,
                musicosAtual: atualTotais.musicos || 0,
                organistasAnterior: anteriorTotais.organistas || 0,
                organistasAtual: atualTotais.organistas || 0,
                localAnterior: anteriorTotais.propriaOrquestra || 0,
                localAtual: atualTotais.propriaOrquestra || 0,
                visitasAnterior: anteriorTotais.outrasOrquestras || 0,
                visitasAtual: atualTotais.outrasOrquestras || 0
            };
        }

        function buildRegionalFlowInsights(presencas) {
            var totais = {
                total: 0,
                musicos: 0,
                organistas: 0,
                irmandade: 0,
                ministerio: 0,
                apoio: 0,
                outros: 0,
                propriaOrquestra: 0,
                outrasOrquestras: 0
            };
            var origemMap = {};
            var destinoMap = {};
            var fluxoMap = {};

            (presencas || []).forEach(function (item) {
                var musicos = parseInt(item.musicos, 10) || 0;
                var organistas = parseInt(item.organistas, 10) || 0;
                var irmandade = parseInt(item.irmandade, 10) || 0;
                var ministerio = parseInt(item.ministerio, 10) || 0;
                var apoio = parseInt(item.apoio, 10) || 0;
                var outros = parseInt(item.outros, 10) || 0;
                var total = musicos + organistas + irmandade + ministerio + apoio + outros;
                var origem = normalizeRegionalMunicipio(item.municipio || '');
                var destino = normalizeRegionalMunicipio(item.local_ensaio || item.municipio || '');
                var origemKey = origem || 'NAO INFORMADO';
                var destinoKey = destino || origem || 'NAO INFORMADO';
                var mesmaOrquestra = !!origem && !!destino ? canonicalKeyPart(origem) === canonicalKeyPart(destino) : true;
                var fluxoKey;

                totais.total += total;
                totais.musicos += musicos;
                totais.organistas += organistas;
                totais.irmandade += irmandade;
                totais.ministerio += ministerio;
                totais.apoio += apoio;
                totais.outros += outros;
                if (mesmaOrquestra) {
                    totais.propriaOrquestra += total;
                } else {
                    totais.outrasOrquestras += total;
                }

                if (!origemMap[origemKey]) {
                    origemMap[origemKey] = {
                        nome: formatRegionalLabel(origemKey),
                        total: 0,
                        musicos: 0,
                        organistas: 0,
                        ministerio: 0,
                        apoio: 0,
                        propriaOrquestra: 0,
                        outrasOrquestras: 0,
                        destinos: {}
                    };
                }

                if (!destinoMap[destinoKey]) {
                    destinoMap[destinoKey] = {
                        nome: formatRegionalLabel(destinoKey),
                        total: 0,
                        musicos: 0,
                        organistas: 0,
                        locais: 0,
                        visitantes: 0,
                        origens: {}
                    };
                }

                origemMap[origemKey].total += total;
                origemMap[origemKey].musicos += musicos;
                origemMap[origemKey].organistas += organistas;
                origemMap[origemKey].ministerio += ministerio;
                origemMap[origemKey].apoio += apoio;
                destinoMap[destinoKey].total += total;
                destinoMap[destinoKey].musicos += musicos;
                destinoMap[destinoKey].organistas += organistas;

                if (mesmaOrquestra) {
                    origemMap[origemKey].propriaOrquestra += total;
                    destinoMap[destinoKey].locais += total;
                } else {
                    origemMap[origemKey].outrasOrquestras += total;
                    destinoMap[destinoKey].visitantes += total;
                    origemMap[origemKey].destinos[destinoKey] = (origemMap[origemKey].destinos[destinoKey] || 0) + total;
                    destinoMap[destinoKey].origens[origemKey] = (destinoMap[destinoKey].origens[origemKey] || 0) + total;
                    fluxoKey = origemKey + '||' + destinoKey;
                    if (!fluxoMap[fluxoKey]) {
                        fluxoMap[fluxoKey] = {
                            origem: formatRegionalLabel(origemKey),
                            destino: formatRegionalLabel(destinoKey),
                            total: 0,
                            musicos: 0,
                            organistas: 0
                        };
                    }
                    fluxoMap[fluxoKey].total += total;
                    fluxoMap[fluxoKey].musicos += musicos;
                    fluxoMap[fluxoKey].organistas += organistas;
                }
            });

            return {
                totais: totais,
                metrics: {
                    municipiosRepresentados: countNamedKeys(origemMap),
                    destinosAtivos: countNamedKeys(destinoMap),
                    taxaMobilidade: totais.total ? Math.round((totais.outrasOrquestras / totais.total) * 100) : 0,
                    taxaPermanenciaLocal: totais.total ? Math.round((totais.propriaOrquestra / totais.total) * 100) : 0
                },
                origens: Object.keys(origemMap).map(function (key) {
                    var item = origemMap[key];
                    item.taxaLocal = item.total ? Math.round((item.propriaOrquestra / item.total) * 100) : 0;
                    item.taxaVisita = item.total ? Math.round((item.outrasOrquestras / item.total) * 100) : 0;
                    item.destinosVisitados = Object.keys(item.destinos).length;
                    item.principalDestino = resolveTopNamedCount(item.destinos);
                    return item;
                }).sort(sortByTotal),
                destinos: Object.keys(destinoMap).map(function (key) {
                    var item = destinoMap[key];
                    item.taxaVisitantes = item.total ? Math.round((item.visitantes / item.total) * 100) : 0;
                    item.origensRecebidas = Object.keys(item.origens).length;
                    item.principalOrigem = resolveTopNamedCount(item.origens);
                    return item;
                }).sort(sortByTotal),
                fluxos: Object.keys(fluxoMap).map(function (key) {
                    return fluxoMap[key];
                }).sort(sortByTotal)
            };
        }

        function buildCatalogTargets(comunsCatalog) {
            var byMunicipio = {};
            var totalComuns = 0;

            (comunsCatalog || []).forEach(function (item) {
                var municipio = String(item.cidade || '').trim();
                if (!municipio) {
                    return;
                }

                if (!byMunicipio[municipio]) {
                    byMunicipio[municipio] = { municipio: municipio, totalComuns: 0 };
                }

                byMunicipio[municipio].totalComuns += 1;
                totalComuns += 1;
            });

            return {
                totalComuns: totalComuns,
                byMunicipio: byMunicipio
            };
        }

        function enrichMunicipiosWithTargets(municipios, targetMap) {
            (municipios || []).forEach(function (item) {
                var target = targetMap[item.nome] || { totalComuns: 0 };
                item.totalComunsBase = target.totalComuns || 0;
                item.comunsPresentes = (item.comuns || []).length;
                item.comunsAusentes = Math.max(0, item.totalComunsBase - item.comunsPresentes);
                item.coberturaRate = item.totalComunsBase ? Math.round((item.comunsPresentes / item.totalComunsBase) * 100) : 0;
            });
        }

        function normalizeRegionalMunicipio(value) {
            var normalized = canonicalKeyPart(normalizeMunicipioValue(value || ''));

            if (!normalized) {
                return '';
            }

            if (normalized === 'FAZENDINHA') {
                return 'SANTANA DE PARNAIBA';
            }

            return normalized;
        }

        function formatRegionalLabel(value) {
            var normalized = canonicalKeyPart(value || '');
            var labels = {
                'CAUCAIA DO ALTO': 'Caucaia do Alto',
                'COTIA': 'Cotia',
                'FAZENDINHA': 'Fazendinha',
                'ITAPEVI': 'Itapevi',
                'JANDIRA': 'Jandira',
                'PIRAPORA DO BOM JESUS': 'Pirapora do Bom Jesus',
                'SANTANA DE PARNAIBA': 'Santana de Parnaíba',
                'VARGEM GRANDE PAULISTA': 'Vargem Grande Paulista',
                'NAO INFORMADO': 'Não informado'
            };

            return labels[normalized] || toTitleCaseLabel(String(value || ''));
        }

        function toTitleCaseLabel(value) {
            return String(value || '')
                .toLowerCase()
                .split(' ')
                .filter(function (part) { return !!part; })
                .map(function (part) {
                    return part.charAt(0).toUpperCase() + part.slice(1);
                })
                .join(' ');
        }

        function resolveTopNamedCount(map) {
            var entries = Object.keys(map || {}).map(function (key) {
                return { nome: formatRegionalLabel(key), total: map[key] || 0 };
            }).sort(sortByTotal);

            return entries[0] || { nome: '-', total: 0 };
        }

        function countNamedKeys(map) {
            return Object.keys(map || {}).filter(function (key) {
                return key && key !== 'NAO INFORMADO';
            }).length;
        }

        function importWorkbookRows(buffer, fileName) {
            var workbook = window.XLSX.read(buffer, { type: 'array', cellDates: true, raw: false });
            var participantes = buildParticipantesImport(getPrimarySheetObjects(workbook, 'Dados'), fileName);
            var presencas = buildPresencasImport(
                participantes,
                getSheetMatrix(workbook, 'Resumo por Ensaio'),
                getSheetMatrix(workbook, 'Comum'),
                getSheetObjects(workbook, 'Relatório')
            );
            var ensaioDate = resolveWorkbookDate(fileName, participantes);

            return {
                ensaio: {
                    titulo: 'Ensaio Regional',
                    data_ensaio: ensaioDate,
                    mes_referencia: resolveMonthLabel(ensaioDate),
                    ciclo: resolveCycleLabel(ensaioDate),
                    sede_principal: resolveMainLocation(participantes, presencas),
                    status: 'Finalizado',
                    observacoes: 'Importado automaticamente da planilha ' + fileName + ' usando a data do registro como referencia do ensaio regional.'
                },
                participantes: participantes,
                presencas: presencas,
                locais: buildLocaisImport(presencas, participantes)
            };
        }

        function parseWorkbookFile(file) {
            var deferred = $q.defer();

            if (!window.XLSX) {
                deferred.reject(new Error('Biblioteca XLSX nao disponivel no navegador.'));
                return deferred.promise;
            }

            if (!file || typeof file.arrayBuffer !== 'function') {
                deferred.reject(new Error('Arquivo invalido para importacao.'));
                return deferred.promise;
            }

            file.arrayBuffer().then(function (buffer) {
                deferred.resolve(importWorkbookRows(buffer, file.name || 'importacao.xlsx'));
            }).catch(function (error) {
                deferred.reject(error);
            });

            return deferred.promise;
        }

        function buildImportPreview(parsed, fileName) {
            var participantes = parsed.participantes || [];
            var presencasOriginais = parsed.presencas || [];
            var presencasDedupe = dedupePresencas((presencasOriginais || []).map(function (item) {
                return normalizePresencaPayload(item);
            }));
            var duplicatesMerged = Math.max(0, presencasOriginais.length - presencasDedupe.length);
            var gruposPorData = groupParticipantesByEnsaioDate(participantes);
            var locaisPorData = buildPreviewLocalRows(participantes);
            var municipiosPorLocal = buildPreviewMunicipioRows(participantes);

            return {
                fileName: fileName || '',
                ensaio: parsed.ensaio || {},
                datasCount: gruposPorData.length,
                datas: gruposPorData.map(function (grupo) {
                    return {
                        data_ensaio: grupo.data_ensaio,
                        participantes: grupo.participantes.length,
                        locais: buildLocalidadeOptionsFromParticipantes(grupo.participantes)
                    };
                }),
                locaisPorData: locaisPorData,
                municipiosPorLocal: municipiosPorLocal,
                locais: parsed.locais || [],
                participantesCount: participantes.length,
                presencasCount: presencasOriginais.length,
                presencasConsolidadasCount: presencasDedupe.length,
                duplicatesMerged: duplicatesMerged,
                totais: {
                    musicos: sum(presencasDedupe, 'musicos'),
                    organistas: sum(presencasDedupe, 'organistas'),
                    irmandade: sum(presencasDedupe, 'irmandade'),
                    ministerio: sum(presencasDedupe, 'ministerio'),
                    apoio: sum(presencasDedupe, 'apoio'),
                    outros: sum(presencasDedupe, 'outros'),
                    total: sumTotalPresencas(presencasDedupe)
                },
                topComuns: presencasDedupe.sort(sortByTotal).slice(0, 10)
            };
        }

        function buildPreviewLocalRows(participantes) {
            var grouped = {};

            (participantes || []).forEach(function (item) {
                var data = resolveCanonicalRegionalDate((item || {}).data_ensaio);
                var local = normalizeMunicipioValue(item && item.local_ensaio || '') || 'NAO INFORMADO';
                var key;

                if (!data) {
                    return;
                }

                key = data + '||' + local;

                if (!grouped[key]) {
                    grouped[key] = {
                        data_ensaio: data,
                        local_ensaio: local,
                        participantes: 0,
                        musicos: 0,
                        organistas: 0,
                        municipiosMap: {},
                        comunsMap: {}
                    };
                }

                grouped[key].participantes += 1;
                if (classifyParticipantBucket(item) === 'musicos') {
                    grouped[key].musicos += 1;
                }
                if (classifyParticipantBucket(item) === 'organistas') {
                    grouped[key].organistas += 1;
                }
                grouped[key].municipiosMap[resolveParticipanteMunicipio(item) || 'NAO INFORMADO'] = true;
                grouped[key].comunsMap[(resolveParticipanteMunicipio(item) || 'NAO INFORMADO') + '||' + String((item || {}).comum || '').trim()] = true;
            });

            return Object.keys(grouped).sort().map(function (key) {
                var row = grouped[key];
                row.municipios = Object.keys(row.municipiosMap).length;
                row.comuns = Object.keys(row.comunsMap).length;
                delete row.municipiosMap;
                delete row.comunsMap;
                return row;
            });
        }

        function buildPreviewMunicipioRows(participantes) {
            var grouped = {};

            (participantes || []).forEach(function (item) {
                var data = resolveCanonicalRegionalDate((item || {}).data_ensaio);
                var local = normalizeMunicipioValue(item && item.local_ensaio || '') || 'NAO INFORMADO';
                var municipio = resolveParticipanteMunicipio(item) || 'NAO INFORMADO';
                var comum = String((item || {}).comum || '').trim() || 'NAO INFORMADA';
                var key;

                if (!data) {
                    return;
                }

                key = [data, local, municipio, comum].join('||');

                if (!grouped[key]) {
                    grouped[key] = {
                        data_ensaio: data,
                        local_ensaio: local,
                        municipio: municipio,
                        comum: comum,
                        total: 0,
                        musicos: 0,
                        organistas: 0
                    };
                }

                grouped[key].total += 1;
                if (classifyParticipantBucket(item) === 'musicos') {
                    grouped[key].musicos += 1;
                }
                if (classifyParticipantBucket(item) === 'organistas') {
                    grouped[key].organistas += 1;
                }
            });

            return Object.keys(grouped).map(function (key) {
                return grouped[key];
            }).sort(function (a, b) {
                return String(a.data_ensaio).localeCompare(String(b.data_ensaio))
                    || String(a.local_ensaio).localeCompare(String(b.local_ensaio))
                    || (b.total || 0) - (a.total || 0);
            });
        }

        function importParsedWorkbookByDate(parsed, sourceFile) {
            var grupos = groupParticipantesByEnsaioDate(parsed.participantes || []);
            var resultados = [];
            var chain = $q.when();

            if (!grupos.length) {
                grupos = [{
                    data_ensaio: (parsed.ensaio || {}).data_ensaio || formatDateOnly(new Date()),
                    participantes: parsed.participantes || []
                }];
            }

            grupos.forEach(function (grupo) {
                chain = chain.then(function () {
                    var presencasGrupo = buildPresencasFromParticipantes(grupo.participantes || []);
                    var locaisGrupo = buildLocaisImport(presencasGrupo, grupo.participantes || []);
                    var ensaioPayload = angular.extend({}, parsed.ensaio || {}, {
                        data_ensaio: grupo.data_ensaio,
                        mes_referencia: resolveMonthLabel(grupo.data_ensaio),
                        ciclo: resolveCycleLabel(grupo.data_ensaio),
                        sede_principal: resolveMainLocation(grupo.participantes || [], presencasGrupo),
                        observacoes: 'Importado automaticamente da planilha ' + (sourceFile || '') + ' usando a data do registro como referencia do ensaio regional.'
                    });

                    return ensureImportedEnsaio(ensaioPayload).then(function (ensaio) {
                        return ensureImportedLocais(ensaio.id, locaisGrupo).then(function () {
                            return replacePresencasImport(ensaio.id, presencasGrupo).then(function () {
                                return replaceParticipantesImport(ensaio.id, sourceFile, grupo.participantes || []).then(function () {
                                    resultados.push({
                                        ensaio: ensaio,
                                        data_ensaio: grupo.data_ensaio,
                                        participantes: grupo.participantes || [],
                                        presencas: presencasGrupo,
                                        locais: locaisGrupo
                                    });
                                });
                            });
                        });
                    });
                });
            });

            return chain.then(function () {
                return {
                    ensaios: resultados,
                    ensaio: (resultados[0] || {}).ensaio || null,
                    participantes: parsed.participantes || [],
                    presencas: parsed.presencas || [],
                    locais: parsed.locais || []
                };
            });
        }

        function ensureImportedEnsaio(ensaioPayload) {
            return getEnsaios().then(function (ensaios) {
                var existing = (ensaios || []).filter(function (item) {
                    return String(item.data_ensaio || '').slice(0, 10) === String(ensaioPayload.data_ensaio || '').slice(0, 10);
                })[0];

                if (existing) {
                    return updateEnsaio(angular.extend({}, existing, ensaioPayload)).then(function () {
                        return existing;
                    });
                }

                return saveEnsaio(ensaioPayload).then(function (response) {
                    return angular.isArray(response) ? response[0] : response;
                });
            });
        }

        function ensureImportedLocais(ensaioId, locais) {
            var payload = dedupeLocais((locais || []).map(function (item, index) {
                return normalizeLocalPayload({
                    ensaio_id: ensaioId,
                    municipio: item.municipio,
                    localidade: item.localidade,
                    comum_referencia: item.comum_referencia || item.localidade,
                    ordem: index + 1
                });
            }));

            if (!payload.length) {
                return $q.when([]);
            }

            return supabase.from('musica_ensaio_locais')
                .delete()
                .eq('ensaio_id', ensaioId)
                .then(function (response) {
                    if (response && response.error) {
                        throw response.error;
                    }
                    return supabase.from('musica_ensaio_locais').insert(payload).select();
                }).then(function (response) {
                    if (response && response.error) {
                        throw response.error;
                    }
                    return response.data || [];
                });
        }

        function replacePresencasImport(ensaioId, items) {
            var payload = dedupePresencas((items || []).map(function (item) {
                return normalizePresencaPayload(angular.extend({}, item, { ensaio_id: ensaioId }));
            }));

            if (!payload.length) {
                return $q.when([]);
            }

            return supabase.from('musica_ensaio_presencas')
                .delete()
                .eq('ensaio_id', ensaioId)
                .then(function (response) {
                    if (response && response.error) {
                        throw response.error;
                    }
                    return supabase.from('musica_ensaio_presencas').insert(payload).select();
                })
                .then(function (response) {
                    if (response && response.error) {
                        throw response.error;
                    }
                    return response.data || [];
                });
        }

        function dedupePresencas(items) {
            var grouped = {};

            (items || []).forEach(function (item) {
                var local = canonicalKeyPart(item.local_ensaio);
                var municipio = canonicalKeyPart(item.municipio);
                var comum = canonicalKeyPart(item.comum_congregacao);
                var key = [String(item.ensaio_id || ''), local, municipio, comum].join('||');

                if (!local || !municipio || !comum) {
                    return;
                }

                if (!grouped[key]) {
                    grouped[key] = angular.extend({}, item);
                    return;
                }

                grouped[key].musicos = (parseInt(grouped[key].musicos, 10) || 0) + (parseInt(item.musicos, 10) || 0);
                grouped[key].organistas = (parseInt(grouped[key].organistas, 10) || 0) + (parseInt(item.organistas, 10) || 0);
                grouped[key].irmandade = (parseInt(grouped[key].irmandade, 10) || 0) + (parseInt(item.irmandade, 10) || 0);
                grouped[key].ministerio = (parseInt(grouped[key].ministerio, 10) || 0) + (parseInt(item.ministerio, 10) || 0);
                grouped[key].apoio = (parseInt(grouped[key].apoio, 10) || 0) + (parseInt(item.apoio, 10) || 0);
                grouped[key].outros = (parseInt(grouped[key].outros, 10) || 0) + (parseInt(item.outros, 10) || 0);
                grouped[key].ausentes_justificados = (parseInt(grouped[key].ausentes_justificados, 10) || 0) + (parseInt(item.ausentes_justificados, 10) || 0);
                grouped[key].encarregado_local = !!grouped[key].encarregado_local || !!item.encarregado_local;
                grouped[key].nome_encarregado = grouped[key].nome_encarregado || item.nome_encarregado || '';
                grouped[key].local_ensaio = grouped[key].local_ensaio || item.local_ensaio || '';
                grouped[key].observacoes = joinNotes(grouped[key].observacoes, item.observacoes);
            });

            return Object.keys(grouped).map(function (key) {
                return grouped[key];
            });
        }

        function dedupeLocais(items) {
            var grouped = {};

            (items || []).forEach(function (item) {
                var municipio = canonicalKeyPart(item.municipio);
                var localidade = canonicalKeyPart(item.localidade);
                var key;

                if (!municipio || !localidade) {
                    return;
                }

                key = municipio + '||' + localidade;

                if (!grouped[key]) {
                    grouped[key] = angular.extend({}, item);
                    return;
                }

                grouped[key].ordem = Math.min(parseInt(grouped[key].ordem, 10) || 999, parseInt(item.ordem, 10) || 999);
                grouped[key].comum_referencia = grouped[key].comum_referencia || item.comum_referencia || item.localidade || '';
            });

            return Object.keys(grouped).map(function (key) {
                return grouped[key];
            }).sort(function (a, b) {
                return (parseInt(a.ordem, 10) || 999) - (parseInt(b.ordem, 10) || 999);
            });
        }

        function replaceParticipantesImport(ensaioId, sourceFile, items) {
            var payload = (items || []).map(function (item) {
                return normalizeParticipantePayload(angular.extend({}, item, { ensaio_id: ensaioId, origem_arquivo: sourceFile || '' }));
            });
            var deferred = $q.defer();
            var index = 0;
            var batchSize = 300;

            supabase.from('musica_ensaio_participantes')
                .delete()
                .eq('ensaio_id', ensaioId)
                .then(function (response) {
                    if (response && response.error) {
                        deferred.reject(response.error);
                        return;
                    }

                    if (!payload.length) {
                        deferred.resolve([]);
                        return;
                    }

                    insertBatch();
                }).catch(function (error) {
                    deferred.reject(error);
                });

            return deferred.promise;

            function insertBatch() {
                var batch = payload.slice(index, index + batchSize);

                supabase.from('musica_ensaio_participantes').insert(batch).select('id')
                    .then(function (response) {
                        if (response && response.error) {
                            deferred.reject(response.error);
                            return;
                        }

                        index += batch.length;
                        if (index >= payload.length) {
                            deferred.resolve(payload);
                            return;
                        }

                        insertBatch();
                    }).catch(function (error) {
                        deferred.reject(error);
                    });
            }
        }

        function buildParticipantesImport(rows, fileName) {
            return (rows || []).map(function (row) {
                var item = normalizeKeys(row);
                var fixed = normalizeParticipantRowLayout(item);
                var registroDate = getImportValue(item, [
                    'data do registro',
                    'data registro',
                    'data_registro',
                    'registrado em',
                    'criado em',
                    'created at',
                    'timestamp',
                    'data hora',
                    'data/hora',
                    'data'
                ]);
                var ensaioDate = fixed.data_ensaio || getImportValue(item, [
                    'data ensaio',
                    'data_ensaio',
                    'data do ensaio',
                    'ensaio data'
                ]) || registroDate;

                return {
                    uuid_externo: fixed.uuid_externo || getImportValue(item, ['uuid', 'id', 'id externo']) || '',
                    nome_completo: fixed.nome_completo || getImportValue(item, ['nome completo', 'nome_completo', 'nome', 'participante']) || '',
                    comum: fixed.comum || getImportValue(item, ['comum', 'congregacao', 'comum congregacao', 'comum_congregacao']) || '',
                    cidade: normalizeMunicipioValue(fixed.cidade || getImportValue(item, ['cidade', 'municipio']) || ''),
                    cargo: fixed.cargo || getImportValue(item, ['cargo', 'funcao', 'categoria']) || '',
                    nivel: fixed.nivel || getImportValue(item, ['nivel']) || '',
                    instrumento: fixed.instrumento || getImportValue(item, ['instrumento']) || '',
                    naipe_instrumento: fixed.naipe_instrumento || getImportValue(item, ['naipe instrumento', 'naipe_instrumento', 'naipe']) || '',
                    classe_organista: fixed.classe_organista || getImportValue(item, ['classe organista', 'classe_organista', 'organista']) || '',
                    local_ensaio: normalizeMunicipioValue(fixed.local_ensaio || getImportValue(item, ['local ensaio', 'local_ensaio', 'local do ensaio', 'destino', 'polo']) || ''),
                    data_ensaio: normalizeDateTimeValue(ensaioDate),
                    registrado_por: fixed.registrado_por || getImportValue(item, ['registrado por', 'registrado_por', 'usuario']) || '',
                    sync_status: fixed.sync_status || getImportValue(item, ['sync status', 'sync_status', 'status']) || '',
                    synced_at: normalizeDateTimeValue(fixed.synced_at || getImportValue(item, ['synced at', 'synced_at', 'sincronizado em'])),
                    anotacoes: getImportValue(item, ['anotacoes', 'observacoes']) || '',
                    duplicata: getImportValue(item, ['duplicata']) || '',
                    origem_arquivo: fileName || ''
                };
            }).filter(function (item) {
                return !!item.nome_completo;
            });
        }

        function buildPresencasImport(participantes, resumoMatrix, comumMatrix, relatorioRows) {
            var presencas = buildPresencasFromParticipantes(participantes || []);

            if (presencas.length) {
                return presencas;
            }

            presencas = parseSectionAggregateSheet(resumoMatrix || []);

            if (!presencas.length) {
                presencas = parseSectionAggregateSheet(comumMatrix || []);
            }

            if (!presencas.length) {
                presencas = buildPresencasFromRelatorio(relatorioRows || []);
            }

            return presencas;
        }

        function buildPresencasFromParticipantes(participantes) {
            var grouped = {};

            (participantes || []).forEach(function (item) {
                var municipio = resolveParticipanteMunicipio(item);
                var comum = normalizeCongregacaoName(item.comum || '');
                var local = normalizeMunicipioValue(item.local_ensaio || municipio || '');
                var bucket;
                var key;

                if (!local || !municipio || !comum) {
                    return;
                }

                bucket = classifyParticipantBucket(item);
                key = canonicalKeyPart(local) + '||' + canonicalKeyPart(municipio) + '||' + canonicalCongregacaoKey(comum);

                if (!grouped[key]) {
                    grouped[key] = {
                        municipio: municipio,
                        comum_congregacao: comum,
                        local_ensaio: local,
                        musicos: 0,
                        organistas: 0,
                        irmandade: 0,
                        ministerio: 0,
                        apoio: 0,
                        outros: 0,
                        encarregado_local: false,
                        nome_encarregado: ''
                    };
                }

                if (hasCongregacaoCode(item.comum) && !hasCongregacaoCode(grouped[key].comum_congregacao)) {
                    grouped[key].comum_congregacao = String(item.comum || '').trim().toUpperCase();
                }

                grouped[key][bucket] = (parseInt(grouped[key][bucket], 10) || 0) + 1;
            });

            return Object.keys(grouped).map(function (key) {
                return grouped[key];
            }).sort(sortByTotal);
        }

        function resolveParticipanteMunicipio(item) {
            var cidade = normalizeMunicipioValue(item && item.cidade || '');
            var comum = String(item && item.comum || '').trim();
            var local = normalizeMunicipioValue(item && item.local_ensaio || '');

            return cidade || inferMunicipioFromComum(comum) || local || '';
        }

        function inferMunicipioFromComum(value) {
            var text = normalizeImportKey(value || '');

            if (!text) {
                return '';
            }

            if (text.indexOf('caucaia') >= 0) return 'CAUCAIA DO ALTO';
            if (text.indexOf('cotia') >= 0) return 'COTIA';
            if (text.indexOf('itapevi') >= 0) return 'ITAPEVI';
            if (text.indexOf('jandira') >= 0) return 'JANDIRA';
            if (text.indexOf('pirapora') >= 0) return 'PIRAPORA DO BOM JESUS';
            if (text.indexOf('fazendinha') >= 0 || text.indexOf('santana de parnaiba') >= 0 || text.indexOf('stna de parnaiba') >= 0) return 'SANTANA DE PARNAIBA';
            if (text.indexOf('vargem grande') >= 0) return 'VARGEM GRANDE PAULISTA';

            return '';
        }

        function groupParticipantesByEnsaioDate(participantes) {
            var grouped = {};

            (participantes || []).forEach(function (item) {
                var data = resolveCanonicalRegionalDate((item || {}).data_ensaio);

                if (!data) {
                    data = resolveCanonicalRegionalDate(new Date());
                }

                if (!grouped[data]) {
                    grouped[data] = [];
                }

                grouped[data].push(item);
            });

            return Object.keys(grouped).sort().map(function (data) {
                return {
                    data_ensaio: data,
                    participantes: grouped[data]
                };
            });
        }

        function buildLocalidadeOptionsFromParticipantes(participantes) {
            var map = {};

            (participantes || []).forEach(function (item) {
                var local = normalizeMunicipioValue(item && item.local_ensaio || '');
                if (local) {
                    map[local] = true;
                }
            });

            return Object.keys(map).sort();
        }

        function normalizeParticipantRowLayout(item) {
            var localRaw = getImportValue(item, ['local ensaio', 'local_ensaio']);
            var dataRaw = getImportValue(item, ['data ensaio', 'data_ensaio']);
            var classeRaw = getImportValue(item, ['classe organista', 'classe_organista']);
            var nivelRaw = getImportValue(item, ['nivel']);
            var instrumentoRaw = getImportValue(item, ['instrumento']);
            var naipeRaw = getImportValue(item, ['naipe instrumento', 'naipe_instrumento']);
            var looksShifted = isExcelSerialDate(localRaw) && !normalizeDateTimeValue(dataRaw) && !!normalizeMunicipioValue(classeRaw || '');

            if (!looksShifted) {
                return {};
            }

            return {
                uuid_externo: getImportValue(item, ['uuid', 'id', 'id externo']) || '',
                nome_completo: getImportValue(item, ['nome completo', 'nome_completo', 'nome', 'participante']) || '',
                comum: getImportValue(item, ['comum', 'congregacao', 'comum congregacao', 'comum_congregacao']) || '',
                cidade: getImportValue(item, ['cidade', 'municipio']) || '',
                cargo: getImportValue(item, ['cargo', 'funcao', 'categoria']) || '',
                nivel: '',
                instrumento: nivelRaw || '',
                naipe_instrumento: instrumentoRaw || '',
                classe_organista: naipeRaw || '',
                local_ensaio: classeRaw || '',
                data_ensaio: localRaw,
                registrado_por: dataRaw || '',
                sync_status: getImportValue(item, ['registrado por', 'registrado_por', 'usuario']) || '',
                synced_at: getImportValue(item, ['sync status', 'sync_status', 'status']) || ''
            };
        }

        function normalizeParticipantePayload(item) {
            var source = angular.copy(item || {});
            var dataEnsaio = resolveCanonicalRegionalDate(source.data_ensaio);

            return {
                ensaio_id: source.ensaio_id || null,
                uuid_externo: source.uuid_externo || '',
                nome_completo: source.nome_completo || '',
                comum: source.comum || '',
                cidade: source.cidade || '',
                cargo: source.cargo || '',
                nivel: source.nivel || '',
                instrumento: source.instrumento || '',
                naipe_instrumento: source.naipe_instrumento || '',
                classe_organista: source.classe_organista || '',
                local_ensaio: source.local_ensaio || '',
                data_ensaio: dataEnsaio ? normalizeDateTimeValue(dataEnsaio) : normalizeDateTimeValue(source.data_ensaio),
                registrado_por: source.registrado_por || '',
                sync_status: source.sync_status || '',
                synced_at: normalizeDateTimeValue(source.synced_at),
                anotacoes: source.anotacoes || '',
                duplicata: source.duplicata || '',
                origem_arquivo: source.origem_arquivo || ''
            };
        }

        function classifyParticipantBucket(item) {
            var cargo = normalizeImportKey((item && item.cargo) || '');
            var nivel = normalizeImportKey((item && item.nivel) || '');
            var instrumento = normalizeImportKey((item && item.instrumento) || '');
            var classeOrganista = normalizeImportKey((item && item.classe_organista) || '');

            if (cargo.indexOf('music') >= 0 || nivel.indexOf('music') >= 0) {
                return 'musicos';
            }

            if (cargo.indexOf('organista') >= 0) {
                return 'organistas';
            }

            if (cargo.indexOf('minister') >= 0 || cargo.indexOf('encarregado') >= 0 || nivel.indexOf('minister') >= 0) {
                return 'ministerio';
            }

            if (cargo.indexOf('apoio') >= 0 || cargo.indexOf('sam') >= 0) {
                return 'apoio';
            }

            if (cargo.indexOf('irmandade') >= 0) {
                return 'irmandade';
            }

            if (instrumento && classeOrganista && cargo.indexOf('irmandade') === -1) {
                return 'musicos';
            }

            return 'outros';
        }

        function parseSectionAggregateSheet(rows) {
            var currentLocation = '';
            var headerMap = null;
            var result = [];

            (rows || []).forEach(function (row) {
                var firstCell = String((row && row[0]) || '').trim();

                if (!firstCell) {
                    return;
                }

                if (firstCell.indexOf('📍') === 0) {
                    currentLocation = normalizeMunicipioValue(firstCell.replace('📍', '').split('(')[0]);
                    headerMap = null;
                    return;
                }

                if (!headerMap && normalizeImportKey(firstCell).indexOf('comum') === 0) {
                    headerMap = buildHeaderMap(row);
                    return;
                }

                if (!headerMap || normalizeImportKey(firstCell).indexOf('total') === 0) {
                    return;
                }

                var rawMunicipio = row[headerMap.cidade];
                var municipioNormalizado = normalizeMunicipioValue(rawMunicipio || '');
                var localNormalizado = currentLocation || normalizeMunicipioValue(row[headerMap.local_ensaio] || '');

                if (!municipioNormalizado) {
                    municipioNormalizado = localNormalizado;
                }

                result.push({
                    municipio: municipioNormalizado,
                    comum_congregacao: String(row[headerMap.comum] || '').trim(),
                    local_ensaio: localNormalizado,
                    musicos: toInt(row[headerMap.musicos]),
                    organistas: toInt(row[headerMap.organistas]),
                    irmandade: toInt(row[headerMap.irmandade]),
                    ministerio: toInt(row[headerMap.ministerio]),
                    apoio: toInt(row[headerMap.apoio]),
                    outros: toInt(row[headerMap.outros]),
                    encarregado_local: normalizeImportKey(row[headerMap.encarregado_local]) === 'sim',
                    nome_encarregado: row[headerMap.nome] || ''
                });
            });

            return result.filter(function (item) {
                return !!item.comum_congregacao && !!item.municipio;
            });
        }

        function buildHeaderMap(row) {
            var map = {};

            (row || []).forEach(function (cell, index) {
                var key = normalizeImportKey(cell);
                if (key === 'comum') map.comum = index;
                if (key === 'cidade') map.cidade = index;
                if (key === 'musicos') map.musicos = index;
                if (key === 'organistas') map.organistas = index;
                if (key === 'irmandade') map.irmandade = index;
                if (key === 'ministerio') map.ministerio = index;
                if (key === 'apoio') map.apoio = index;
                if (key === 'outros') map.outros = index;
                if (key === 'encarregado local' || key === 'encarregado_local') map.encarregado_local = index;
                if (key === 'nome') map.nome = index;
                if (key === 'local encarregado' || key === 'local do ensaio') map.local_ensaio = index;
            });

            return map;
        }

        function buildPresencasFromRelatorio(rows) {
            return (rows || []).map(function (row) {
                var item = normalizeKeys(row);
                var localNormalizado = normalizeMunicipioValue(item.local_encarregado || '');
                var municipioNormalizado = normalizeMunicipioValue(item.cidade || '') || localNormalizado;
                return {
                    municipio: municipioNormalizado,
                    comum_congregacao: item.comum || '',
                    local_ensaio: localNormalizado,
                    musicos: toInt(item.musicos),
                    organistas: toInt(item.organistas),
                    irmandade: 0,
                    ministerio: 0,
                    apoio: 0,
                    outros: 0,
                    encarregado_local: false,
                    nome_encarregado: ''
                };
            }).filter(function (item) {
                return !!item.comum_congregacao && !!item.municipio;
            });
        }

        function buildLocaisImport(presencas, participantes) {
            var map = {};

            (presencas || []).forEach(function (item) {
                var localidade = normalizeMunicipioValue(item.local_ensaio || item.municipio || '');
                var municipio = normalizeMunicipioValue(item.municipio || localidade);
                if (!localidade) return;
                map[municipio + '||' + localidade] = { municipio: municipio, localidade: localidade, comum_referencia: localidade };
            });

            if (!Object.keys(map).length) {
                (participantes || []).forEach(function (item) {
                    var localidade = normalizeMunicipioValue(item.local_ensaio || '');
                    var municipio = normalizeMunicipioValue(item.local_ensaio || '');
                    if (!localidade) return;
                    if (!map[municipio + '||' + localidade]) {
                        map[municipio + '||' + localidade] = { municipio: municipio, localidade: localidade, comum_referencia: localidade };
                    }
                });
            }

            return Object.keys(map).map(function (key) {
                return map[key];
            });
        }

        function getSheetObjects(workbook, sheetName) {
            var sheet = findSheet(workbook, sheetName);
            if (!sheet) return [];
            return window.XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
        }

        function getPrimarySheetObjects(workbook, preferredSheetName) {
            var preferredRows = getSheetObjects(workbook, preferredSheetName);
            var names;
            var candidate;

            if (preferredRows.length) {
                return preferredRows;
            }

            names = (workbook && workbook.SheetNames) || [];
            candidate = names.filter(function (name) {
                var key = normalizeImportKey(name);
                return key.indexOf('dados') >= 0
                    || key.indexOf('registro') >= 0
                    || key.indexOf('participante') >= 0
                    || key.indexOf('presenca') >= 0;
            })[0] || names[0];

            return candidate ? window.XLSX.utils.sheet_to_json(workbook.Sheets[candidate], { defval: '', raw: true }) : [];
        }

        function getSheetMatrix(workbook, sheetName) {
            var sheet = findSheet(workbook, sheetName);
            if (!sheet) return [];
            return window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
        }

        function findSheet(workbook, targetName) {
            var names = (workbook && workbook.SheetNames) || [];
            var normalizedTarget = normalizeImportKey(targetName);
            var foundName = names.filter(function (name) {
                return normalizeImportKey(name) === normalizedTarget;
            })[0];
            return foundName ? workbook.Sheets[foundName] : null;
        }

        function resolveWorkbookDate(fileName, participantes) {
            var match = String(fileName || '').match(/(\d{2})[._-](\d{2})[._-](\d{4})/);
            var dateCounts = {};
            var selectedDate = '';

            if (match) {
                return [match[3], match[2], match[1]].join('-');
            }

            (participantes || []).forEach(function (item) {
                var parsed = formatDateOnly((item || {}).data_ensaio);
                if (!parsed) {
                    return;
                }
                dateCounts[parsed] = (dateCounts[parsed] || 0) + 1;
            });

            Object.keys(dateCounts).forEach(function (dateKey) {
                if (!selectedDate || dateCounts[dateKey] > dateCounts[selectedDate]) {
                    selectedDate = dateKey;
                }
            });

            return selectedDate || formatDateOnly(new Date());
        }

        function resolveCycleLabel(dateValue) {
            var date = new Date(dateValue);
            var month = isNaN(date.getTime()) ? 0 : date.getMonth() + 1;

            if ([1, 5, 9].indexOf(month) >= 0) {
                return 'Itapevi / Pirapora';
            }

            if ([3, 7, 11].indexOf(month) >= 0) {
                return 'Caucaia / Cotia / Vargem Grande / Jandira / Fazendinha';
            }

            return 'Calendario extraordinario';
        }

        function resolveMainLocation(participantes, presencas) {
            var counts = {};

            (participantes || []).forEach(function (item) {
                var key = normalizeMunicipioValue(item.local_ensaio || '');
                if (key) counts[key] = (counts[key] || 0) + 1;
            });

            if (!Object.keys(counts).length) {
                (presencas || []).forEach(function (item) {
                    var key = normalizeMunicipioValue(item.local_ensaio || '');
                    if (key) counts[key] = (counts[key] || 0) + 1;
                });
            }

            return Object.keys(counts).sort(function (a, b) {
                return counts[b] - counts[a];
            })[0] || '';
        }

        function normalizeKeys(source) {
            var result = {};

            Object.keys(source || {}).forEach(function (key) {
                var normalizedKey = normalizeImportKey(key);
                result[normalizedKey] = source[key];
                result[normalizedKey.replace(/\s+/g, '_')] = source[key];
            });

            return result;
        }

        function getImportValue(source, aliases) {
            var keys = aliases || [];
            var index;
            var key;

            for (index = 0; index < keys.length; index += 1) {
                key = normalizeImportKey(keys[index]);
                if (source && source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== '') {
                    return source[key];
                }
                key = key.replace(/\s+/g, '_');
                if (source && source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== '') {
                    return source[key];
                }
            }

            return '';
        }

        function normalizeImportKey(value) {
            return String(value || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[_]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function normalizeMunicipioValue(value) {
            var text = String(value || '').trim();
            var normalized = normalizeImportKey(text);

            if (!text || text === '(Sem cidade)' || /^BR-\d+/.test(text)) {
                return '';
            }

            if (normalized === 'cotia') return 'COTIA';
            if (normalized === 'caucaia' || normalized === 'caucaia do alto') return 'CAUCAIA DO ALTO';
            if (normalized === 'itapevi') return 'ITAPEVI';
            if (normalized === 'jandira') return 'JANDIRA';
            if (normalized === 'fazendinha') return 'FAZENDINHA';
            if (normalized === 'vargem grande' || normalized === 'vargem grande paulista') return 'VARGEM GRANDE PAULISTA';
            if (normalized.indexOf('pirapora') >= 0) return 'PIRAPORA DO BOM JESUS';

            return text.toUpperCase();
        }

        function normalizeCongregacaoName(value) {
            var text = String(value || '').trim();
            var codeMatch;

            if (!text) {
                return '';
            }

            text = text.replace(/\s+/g, ' ');
            codeMatch = text.match(/^BR-\d{2}-\d{4}\s*-\s*(.+)$/i);

            if (codeMatch && codeMatch[1]) {
                text = codeMatch[1];
            }

            text = text
                .replace(/^JD\.?\s+/i, 'JARDIM ')
                .replace(/^Jd\s+/i, 'JARDIM ')
                .replace(/^VL\.?\s+/i, 'VILA ')
                .replace(/^Vl\s+/i, 'VILA ')
                .replace(/\bSTA\b/ig, 'SANTA')
                .replace(/\bSTO\b/ig, 'SANTO')
                .replace(/\s+/g, ' ')
                .trim();

            return text.toUpperCase();
        }

        function buildCongregacaoDisplayLookup(presencas, comunsCatalog) {
            var lookup = { byName: {}, byCityName: {} };

            (comunsCatalog || []).forEach(function (item) {
                var nome = String((item && item.nome) || '').trim();
                var codigo = String((item && item.codigo) || '').trim();
                var display = codigo && nome && nome.indexOf(codigo) !== 0 ? (codigo + ' - ' + nome) : (nome || codigo);
                var municipio = normalizeMunicipioValue((item && item.cidade) || '');
                var key = canonicalCongregacaoKey(nome || display);
                var aliases = buildCongregacaoAliases(nome || display, municipio);

                if (key && display) {
                    registerCongregacaoLookup(lookup, municipio, key, display);
                    aliases.forEach(function (alias) {
                        registerCongregacaoLookup(lookup, municipio, alias, display);
                    });
                }
            });

            (presencas || []).forEach(function (item) {
                var raw = String((item && item.comum_congregacao) || '').trim();
                var municipio = normalizeMunicipioValue((item && item.municipio) || '');
                var key = canonicalCongregacaoKey(raw);

                if (key && hasCongregacaoCode(raw)) {
                    registerCongregacaoLookup(lookup, municipio, key, raw);
                }
            });

            return lookup;
        }

        function registerCongregacaoLookup(lookup, municipio, key, display) {
            var cityKey = canonicalKeyPart(municipio || '');
            var normalizedDisplay = String(display || '').trim().toUpperCase();

            if (!key || !normalizedDisplay) {
                return;
            }

            if (!lookup.byName[key] || hasCongregacaoCode(normalizedDisplay)) {
                lookup.byName[key] = normalizedDisplay;
            }

            if (cityKey) {
                lookup.byCityName[cityKey + '||' + key] = normalizedDisplay;
            }
        }

        function resolveCongregacaoReference(municipio, raw, lookup) {
            var municipioKey = canonicalKeyPart(normalizeMunicipioValue(municipio || ''));
            var rawKey = canonicalCongregacaoKey(raw);
            var aliases = buildCongregacaoAliases(raw, municipio);
            var keys = [rawKey].concat(aliases);
            var display = '';
            var resolvedKey = rawKey;

            keys.some(function (key) {
                if (!key) {
                    return false;
                }

                display = (lookup.byCityName || {})[municipioKey + '||' + key] || (lookup.byName || {})[key] || '';
                if (display) {
                    resolvedKey = canonicalCongregacaoKey(display);
                    return true;
                }

                return false;
            });

            if (!display) {
                display = normalizeCongregacaoName(raw || 'Nao informada');
            }

            return {
                key: resolvedKey || canonicalCongregacaoKey(display),
                display: display
            };
        }

        function buildCongregacaoAliases(value, municipio) {
            var aliases = {};
            var normalizedName = normalizeCongregacaoName(value || '');
            var municipioName = normalizeMunicipioValue(municipio || '');
            var municipioKey = canonicalKeyPart(municipioName);
            var key = canonicalCongregacaoKey(normalizedName);
            var withoutCentral;
            var withoutCitySuffix;
            var withoutCityPrefix;

            if (key) {
                aliases[key] = true;
            }

            if (key.indexOf(' CENTRAL') > 0) {
                withoutCentral = key.replace(/\s+CENTRAL$/, '').trim();
                aliases[withoutCentral] = true;
            }

            if (key.indexOf('CENTRAL ') === 0) {
                aliases[key.replace(/^CENTRAL\s+/, '').trim()] = true;
            }

            if (municipioKey) {
                withoutCitySuffix = key.replace(new RegExp('\\s+' + municipioKey + '$'), '').trim();
                withoutCityPrefix = key.replace(new RegExp('^' + municipioKey + '\\s+'), '').trim();
                aliases[withoutCitySuffix] = true;
                aliases[withoutCityPrefix] = true;
                aliases[(withoutCitySuffix + ' CENTRAL').trim()] = true;
                aliases[(municipioKey + ' CENTRAL').trim()] = true;
            }

            return Object.keys(aliases).filter(Boolean);
        }

        function hasCongregacaoCode(value) {
            return /^BR-\d{2}-\d{4}\s*-/i.test(String(value || '').trim());
        }

        function canonicalCongregacaoKey(value) {
            return canonicalKeyPart(normalizeCongregacaoName(value))
                .replace(/\bJARDIM\b/g, 'JD')
                .replace(/\bVILA\b/g, 'VL')
                .replace(/\bSANTA\b/g, 'STA')
                .replace(/\bSANTO\b/g, 'STO')
                .replace(/\bCENTRAL\s+([A-Z0-9 ]+)/g, 'CENTRAL $1')
                .trim();
        }

        function canonicalKeyPart(value) {
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^A-Za-z0-9]+/g, ' ')
                .trim()
                .toUpperCase();
        }

        function joinNotes(current, next) {
            var a = String(current || '').trim();
            var b = String(next || '').trim();

            if (!a) return b;
            if (!b) return a;
            if (a.indexOf(b) >= 0) return a;
            return a + ' | ' + b;
        }

        function normalizeDateTimeValue(value) {
            var text;
            var date;
            var dateMatch;
            var numeric;
            var first;
            var second;
            var year;
            var hour;
            var minute;
            var secondTime;
            var day;
            var month;

            if (Object.prototype.toString.call(value) === '[object Date]') {
                return isNaN(value.getTime()) ? null : value.toISOString();
            }

            if (isExcelSerialDate(value)) {
                numeric = Number(value);
                date = new Date(Math.round((numeric - 25569) * 86400 * 1000));
                return isNaN(date.getTime()) ? null : date.toISOString();
            }

            text = String(value || '').trim();
            dateMatch = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);

            if (dateMatch) {
                first = Number(dateMatch[1]);
                second = Number(dateMatch[2]);
                year = dateMatch[3].length === 2 ? Number('20' + dateMatch[3]) : Number(dateMatch[3]);
                hour = Number(dateMatch[4] || 0);
                minute = Number(dateMatch[5] || 0);
                secondTime = Number(dateMatch[6] || 0);

                if (second > 12 && first <= 12) {
                    month = first;
                    day = second;
                } else {
                    day = first;
                    month = second;
                }

                if (!isValidDateParts(year, month, day)) {
                    return null;
                }

                date = new Date(year, month - 1, day, hour, minute, secondTime);
                return isNaN(date.getTime()) ? null : date.toISOString();
            }

            date = new Date(text);

            if (!text || isNaN(date.getTime())) {
                return null;
            }

            return date.toISOString();
        }

        function isValidDateParts(year, month, day) {
            var date;

            if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
                return false;
            }

            date = new Date(year, month - 1, day);
            return date.getFullYear() === year
                && date.getMonth() === month - 1
                && date.getDate() === day;
        }

        function isExcelSerialDate(value) {
            var numeric = Number(value);
            return !isNaN(numeric) && numeric > 20000 && numeric < 80000;
        }

        function formatDateOnly(value) {
            var normalized = normalizeDateTimeValue(value);
            var date = normalized ? new Date(normalized) : null;

            if (!date || isNaN(date.getTime())) {
                return '';
            }

            return date.toISOString().slice(0, 10);
        }

        function resolveCanonicalRegionalDate(value) {
            var dateOnly = formatDateOnly(value);
            var date;
            var thirdSunday;
            var diffDays;

            if (!dateOnly) {
                return '';
            }

            date = new Date(dateOnly + 'T00:00:00Z');
            if (isNaN(date.getTime())) {
                return dateOnly;
            }

            thirdSunday = getThirdSunday(date.getUTCFullYear(), date.getUTCMonth());
            diffDays = Math.round((date.getTime() - thirdSunday.getTime()) / 86400000);

            if (Math.abs(diffDays) <= 1) {
                return thirdSunday.toISOString().slice(0, 10);
            }

            return dateOnly;
        }

        function getThirdSunday(year, monthIndex) {
            var date = new Date(Date.UTC(year, monthIndex, 1));
            var firstSundayOffset = (7 - date.getUTCDay()) % 7;
            return new Date(Date.UTC(year, monthIndex, 1 + firstSundayOffset + 14));
        }

        function sortByTotal(a, b) {
            return (b.total || 0) - (a.total || 0);
        }

        function buildCompositionRows(totais) {
            var total = parseInt((totais || {}).total, 10) || 0;
            var items = [
                { nome: 'Musicos', valor: parseInt((totais || {}).musicos, 10) || 0, classe: 'progress-bar-info' },
                { nome: 'Organistas', valor: parseInt((totais || {}).organistas, 10) || 0, classe: 'progress-bar-warning' },
                { nome: 'Ministerio', valor: parseInt((totais || {}).ministerio, 10) || 0, classe: 'progress-bar-success' },
                { nome: 'Apoio', valor: parseInt((totais || {}).apoio, 10) || 0, classe: 'progress-bar-primary' },
                { nome: 'Outros', valor: parseInt((totais || {}).outros, 10) || 0, classe: 'progress-bar-danger' },
                { nome: 'Irmandade', valor: parseInt((totais || {}).irmandade, 10) || 0, classe: 'progress-bar-default' }
            ];

            return items.map(function (item) {
                item.percentual = total ? Math.round((item.valor / total) * 100) : 0;
                return item;
            }).filter(function (item) {
                return item.valor > 0;
            });
        }

        function sum(items, field) {
            return (items || []).reduce(function (total, item) {
                return total + (parseInt(item && item[field], 10) || 0);
            }, 0);
        }

        function sumTotalPresencas(items) {
            return (items || []).reduce(function (total, item) {
                return total
                    + (parseInt(item && item.musicos, 10) || 0)
                    + (parseInt(item && item.organistas, 10) || 0)
                    + (parseInt(item && item.irmandade, 10) || 0)
                    + (parseInt(item && item.ministerio, 10) || 0)
                    + (parseInt(item && item.apoio, 10) || 0)
                    + (parseInt(item && item.outros, 10) || 0);
            }, 0);
        }

        function uniqueCount(items, field) {
            var map = {};

            (items || []).forEach(function (item) {
                if (item && item[field]) {
                    map[item[field]] = true;
                }
            });

            return Object.keys(map).length;
        }

        function findById(items, id) {
            return (items || []).filter(function (item) {
                return String(item.id) === String(id);
            })[0];
        }

        function formatDateValue(value) {
            var parsed;

            if (!value) {
                return null;
            }

            if (Object.prototype.toString.call(value) === '[object Date]') {
                parsed = value;
                return [parsed.getFullYear(), ('0' + (parsed.getMonth() + 1)).slice(-2), ('0' + parsed.getDate()).slice(-2)].join('-');
            }

            return String(value).slice(0, 10);
        }

        function resolveMonthLabel(value) {
            var months = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            var parsed = value ? new Date(value) : new Date();
            return months[isNaN(parsed.getTime()) ? new Date().getMonth() : parsed.getMonth()];
        }

        function toInt(value) {
            return parseInt(value, 10) || 0;
        }

        function auditMusica(action, details) {
            if (!action || !AuthService || typeof AuthService.logAudit !== 'function') {
                return;
            }

            AuthService.logAudit(null, action, 'MUSICA', details || {}).catch(angular.noop);
        }
    }
})();
