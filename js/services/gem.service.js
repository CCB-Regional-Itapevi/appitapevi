(function () {
    'use strict';

    angular.module('inspinia')
        .factory('GemService', GemService);

    GemService.$inject = ['$q', 'AuthService'];

    function GemService($q, AuthService) {
        var SUPABASE_URL = 'https://sqamxlhfazulrisiptud.supabase.co';
        var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYW14bGhmYXp1bHJpc2lwdHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU4ODQsImV4cCI6MjA4Mjk1MTg4NH0.UmshkDqIgJQYVMmWVVgmfQm-YacUbRBeSpmYsNG0baE';
        var supabase = window.__appSupabaseClient
            || (window.__appSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
        var PAGE_SIZE = 1000;

        var service = {
            getDashboardData: getDashboardData,
            getAlunos: getAlunos,
            getAlunosPage: getAlunosPage,
            getAluno: getAluno,
            saveAluno: saveAluno,
            updateAluno: updateAluno,
            deleteAluno: deleteAluno,
            previewStatusWorkbookImport: previewStatusWorkbookImport,
            applyStatusWorkbookImport: applyStatusWorkbookImport,
            getResumo: getResumo,
            getHistoricoAulas: getHistoricoAulas,
            getPlanosAula: getPlanosAula,
            getTurmas: getTurmas,
            getMsaFases: getMsaFases,
            saveMsa: saveMsa,
            deleteMsa: deleteMsa,
            saveProva: saveProva,
            deleteProva: deleteProva,
            saveMetodo: saveMetodo,
            deleteMetodo: deleteMetodo,
            saveHinario: saveHinario,
            deleteHinario: deleteHinario,
            saveEscala: saveEscala,
            deleteEscala: deleteEscala,
            saveAtividade: saveAtividade,
            deleteAtividade: deleteAtividade,
            calculateProgress: calculateProgress
        };

        return service;

        function auditGem(action, details) {
            if (!AuthService || typeof AuthService.logAudit !== 'function') {
                return;
            }

            AuthService.logAudit(null, action, 'GEM', details || {}).catch(angular.noop);
        }

        function scopedQuery(tableName) {
            return supabase.from(tableName).select('*');
        }

        function scopedMutation(query) {
            return query;
        }

        function normalizeAlunoPayload(aluno) {
            var source = angular.copy(aluno || {});
            return {
                nome_aluno: source.nome_aluno || '',
                status: source.status || 'Ativo',
                lancado_por: source.lancado_por || '',
                mensagens: parseInt(source.mensagens, 10) || 0,
                comum_congregacao: source.comum_congregacao || '',
                cargo_ministerio: source.cargo_ministerio || '',
                nivel: source.nivel || '',
                instrumento: source.instrumento || '',
                registro_msa: source.registro_msa || '',
                observacoes: source.observacoes || '',
                municipio: source.municipio || '',
                foto_url: source.foto_url || '',
                programa_minimo_percentual: Math.max(0, Math.min(100, parseFloat(source.programa_minimo_percentual || 0) || 0))
            };
        }

        function normalizeChildPayload(payload, defaults) {
            return angular.extend({}, defaults || {}, angular.copy(payload || {}));
        }

        function handleResponse(deferred, response, successAction) {
            if (response && response.error) {
                deferred.reject(response.error);
                return;
            }

            if (typeof successAction === 'function') {
                successAction(response.data);
            }

            deferred.resolve(response.data);
        }

        function getAlunos() {
            return fetchAllRows('musica_acompanhamento_aluno', {
                orderField: 'nome_aluno',
                ascending: true
            });
        }

        function getAlunosPage(filters, pagination) {
            var deferred = $q.defer();
            var currentPage = Math.max(parseInt((pagination || {}).currentPage, 10) || 1, 1);
            var pageSize = Math.max(parseInt((pagination || {}).pageSize, 10) || 50, 1);
            var from = (currentPage - 1) * pageSize;
            var to = from + pageSize - 1;
            var searchText = sanitizeQueryTerm((filters || {}).searchText);
            var comum = sanitizeQueryTerm((filters || {}).comum);
            var instrumento = sanitizeQueryTerm((filters || {}).instrumento);
            var query = supabase.from('musica_acompanhamento_aluno')
                .select('*', { count: 'exact' })
                .order('nome_aluno', { ascending: true });

            if (searchText) {
                query = query.or([
                    'nome_aluno.ilike.%' + searchText + '%',
                    'comum_congregacao.ilike.%' + searchText + '%',
                    'instrumento.ilike.%' + searchText + '%',
                    'cargo_ministerio.ilike.%' + searchText + '%',
                    'registro_msa.ilike.%' + searchText + '%',
                    'nivel.ilike.%' + searchText + '%'
                ].join(','));
            }

            if (comum) {
                query = query.ilike('comum_congregacao', '%' + comum + '%');
            }

            if (instrumento) {
                query = query.ilike('instrumento', '%' + instrumento + '%');
            }

            query.range(from, to).then(function (response) {
                if (response && response.error) {
                    deferred.reject(response.error);
                    return;
                }

                deferred.resolve({
                    rows: response.data || [],
                    totalCount: response.count || 0,
                    currentPage: currentPage,
                    pageSize: pageSize,
                    totalPages: Math.max(1, Math.ceil((response.count || 0) / pageSize))
                });
            }).catch(function (error) {
                deferred.reject(error);
            });

            return deferred.promise;
        }

        function getAluno(id) {
            var deferred = $q.defer();

            scopedMutation(
                supabase.from('musica_acompanhamento_aluno').select('*').eq('id', id)
            )
                .single()
                .then(function (response) {
                    handleResponse(deferred, response);
                });

            return deferred.promise;
        }

        function saveAluno(aluno) {
            var deferred = $q.defer();
            var payload = normalizeAlunoPayload(aluno);

            supabase.from('musica_acompanhamento_aluno')
                .insert([payload])
                .select()
                .then(function (response) {
                    handleResponse(deferred, response, function (data) {
                        var record = angular.isArray(data) ? data[0] : data;
                        auditGem('GEM_ALUNO_CREATE', {
                            entity: 'musica_acompanhamento_aluno',
                            record_id: record && record.id,
                            nome_aluno: payload.nome_aluno
                        });
                    });
                });

            return deferred.promise;
        }

        function updateAluno(aluno) {
            var deferred = $q.defer();
            var payload = normalizeAlunoPayload(aluno);

            scopedMutation(
                supabase.from('musica_acompanhamento_aluno').update(payload).eq('id', aluno.id).select()
            ).then(function (response) {
                handleResponse(deferred, response, function () {
                    auditGem('GEM_ALUNO_UPDATE', {
                        entity: 'musica_acompanhamento_aluno',
                        record_id: aluno.id,
                        nome_aluno: payload.nome_aluno
                    });
                });
            });

            return deferred.promise;
        }

        function deleteAluno(id) {
            var deferred = $q.defer();

            scopedMutation(
                supabase.from('musica_acompanhamento_aluno').delete().eq('id', id)
            ).then(function (response) {
                handleResponse(deferred, response, function () {
                    auditGem('GEM_ALUNO_DELETE', {
                        entity: 'musica_acompanhamento_aluno',
                        record_id: id
                    });
                });
            });

            return deferred.promise;
        }

        function getResumo(id) {
            return $q.all({
                aluno: getAluno(id),
                msa: getOrderedCollection('musica_acompanhamento_msa', id, 'data_aula'),
                provas: getOrderedCollection('musica_acompanhamento_provas', id, 'data_prova'),
                metodo: getOrderedCollection('musica_acompanhamento_metodo', id, 'data_inicio'),
                hinario: getOrderedCollection('musica_acompanhamento_hinario', id, 'data'),
                escalas: getOrderedCollection('musica_acompanhamento_escala', id, 'data'),
                atividades: getOrderedCollection('musica_acompanhamento_atividades', id, 'data_atividade'),
                fases: getMsaFases()
            }).then(function (result) {
                result.progresso = calculateProgress(result.msa, result.fases);
                return result;
            });
        }

        function previewStatusWorkbookImport(fileList) {
            var files = Array.prototype.slice.call(fileList || []).filter(function (file) {
                return !!file;
            });

            if (!files.length) {
                return $q.reject(new Error('Selecione ao menos uma planilha para continuar.'));
            }

            if (!window.XLSX) {
                return $q.reject(new Error('Leitor de planilhas nao disponivel no navegador.'));
            }

            return $q.all(files.map(readWorkbookFile)).then(function (workbooks) {
                var workbookRows = buildWorkbookRows(workbooks);

                return getAlunos().then(function (alunos) {
                    return buildWorkbookImportPreview(workbookRows, alunos || [], files);
                });
            });
        }

        function applyStatusWorkbookImport(preview) {
            var updates = angular.copy((preview && preview.updates) || []);
            var deferred = $q.defer();
            var index = 0;
            var batchSize = 200;

            if (!updates.length) {
                deferred.resolve({
                    updated: 0
                });
                return deferred.promise;
            }

            processBatch();

            return deferred.promise;

            function processBatch() {
                var batch = updates.slice(index, index + batchSize);

                supabase.from('musica_acompanhamento_aluno')
                    .upsert(batch, {
                        onConflict: 'id'
                    })
                    .select('id')
                    .then(function (response) {
                        if (response && response.error) {
                            deferred.reject(response.error);
                            return;
                        }

                        index += batch.length;

                        if (index >= updates.length) {
                            deferred.resolve({
                                updated: updates.length
                            });
                            return;
                        }

                        processBatch();
                    }).catch(function (error) {
                        deferred.reject(error);
                    });
            }
        }

        function getDashboardData() {
            return $q.all({
                alunos: getAlunos(),
                msa: listScopedRecords('musica_acompanhamento_msa', 'data_aula'),
                provas: listScopedRecords('musica_acompanhamento_provas', 'data_prova'),
                metodo: listScopedRecords('musica_acompanhamento_metodo', 'data_inicio'),
                hinario: listScopedRecords('musica_acompanhamento_hinario', 'data'),
                escalas: listScopedRecords('musica_acompanhamento_escala', 'data'),
                atividades: listScopedRecords('musica_acompanhamento_atividades', 'data_atividade'),
                fases: getMsaFases()
            }).then(function (result) {
                return buildDashboardPayload(result);
            });
        }

        function getHistoricoAulas() {
            return $q.all({
                alunos: getAlunos(),
                msa: listScopedRecords('musica_acompanhamento_msa', 'data_aula'),
                fases: getMsaFases()
            }).then(function (result) {
                var alunosMap = {};
                var progressoPorAluno = {};

                (result.alunos || []).forEach(function (aluno) {
                    alunosMap[aluno.id] = aluno;
                });

                buildProgressIndex(result.alunos || [], result.msa || [], result.fases || []).forEach(function (item) {
                    progressoPorAluno[item.id] = item.progresso;
                });

                return (result.msa || []).map(function (registro) {
                    var aluno = alunosMap[registro.aluno_id] || {};
                    var progresso = progressoPorAluno[registro.aluno_id] || calculateProgress([], result.fases);

                    return angular.extend({}, registro, {
                        aluno_nome: aluno.nome_aluno || 'Aluno nao identificado',
                        instrumento: aluno.instrumento || '-',
                        comum_congregacao: registro.comum_congregacao || aluno.comum_congregacao || '-',
                        municipio: registro.municipio || aluno.municipio || '-',
                        nivel: aluno.nivel || '-',
                        progresso_percentual: progresso.percentual || 0,
                        pode_culto: !!progresso.podeCulto,
                        pode_oficializacao: !!progresso.podeOficializacao
                    });
                });
            });
        }

        function getPlanosAula() {
            return $q.all({
                alunos: getAlunos(),
                msa: listScopedRecords('musica_acompanhamento_msa', 'data_aula'),
                provas: listScopedRecords('musica_acompanhamento_provas', 'data_prova'),
                metodo: listScopedRecords('musica_acompanhamento_metodo', 'data_inicio'),
                hinario: listScopedRecords('musica_acompanhamento_hinario', 'data'),
                escalas: listScopedRecords('musica_acompanhamento_escala', 'data'),
                atividades: listScopedRecords('musica_acompanhamento_atividades', 'data_atividade'),
                fases: getMsaFases()
            }).then(function (result) {
                var alunos = result.alunos || [];
                var msa = result.msa || [];
                var fases = result.fases || [];
                var faseCoverage = {};
                var progressoPorAluno = {};

                buildProgressIndex(alunos, msa, fases).forEach(function (item) {
                    progressoPorAluno[item.id] = item.progresso;
                });

                msa.forEach(function (registro) {
                    faseCoverage[registro.fase] = (faseCoverage[registro.fase] || 0) + 1;
                });

                return {
                    resumo: {
                        alunos: alunos.length,
                        lancamentosMsa: msa.length,
                        provas: (result.provas || []).length,
                        metodo: (result.metodo || []).length,
                        hinario: (result.hinario || []).length,
                        escalas: (result.escalas || []).length,
                        atividades: (result.atividades || []).length
                    },
                    fases: fases.map(function (fase, index) {
                        var ordem = fase.ordem || (index + 1);
                        var concluidos = faseCoverage[fase.fase] || 0;
                        return angular.extend({}, fase, {
                            ordem: ordem,
                            titulo: fase.fase,
                            concluidos: concluidos,
                            percentual: alunos.length ? Math.round((concluidos / alunos.length) * 100) : 0
                        });
                    }),
                    alunos: alunos.map(function (aluno) {
                        var progresso = progressoPorAluno[aluno.id] || calculateProgress([], fases);
                        return angular.extend({}, aluno, {
                            progresso: progresso,
                            prioridade: progresso.percentual < 30 ? 'Alta' : (progresso.percentual < 70 ? 'Media' : 'Acompanhamento')
                        });
                    }).sort(function (a, b) {
                        return (a.progresso.percentual || 0) - (b.progresso.percentual || 0);
                    }).slice(0, 10)
                };
            });
        }

        function getTurmas() {
            var deferred = $q.defer();

            supabase.from('turmas')
                .select('*')
                .order('data_inicio', { ascending: false })
                .then(function (turmasResponse) {
                    if (turmasResponse && turmasResponse.error) {
                        deferred.resolve({
                            indisponivel: true,
                            mensagem: resolveTableMessage(turmasResponse.error, 'turmas'),
                            turmas: []
                        });
                        return;
                    }

                    $q.all({
                        cursos: safeTableSelect('cursos'),
                        localidades: safeTableSelect('localidades'),
                        turmaAlunos: safeTableSelect('turma_alunos')
                    }).then(function (lookup) {
                        var cursosMap = mapById(lookup.cursos, 'nome');
                        var localidadesMap = mapById(lookup.localidades, 'congregacao');
                        var alunosPorTurma = {};

                        (lookup.turmaAlunos || []).forEach(function (item) {
                            var turmaId = item.turma_id;
                            if (!turmaId) {
                                return;
                            }

                            alunosPorTurma[turmaId] = (alunosPorTurma[turmaId] || 0) + 1;
                        });

                        deferred.resolve({
                            indisponivel: false,
                            mensagem: '',
                            turmas: (turmasResponse.data || []).map(function (turma) {
                                return angular.extend({}, turma, {
                                    curso_nome: cursosMap[String(turma.curso_id)] || turma.curso || turma.nome_curso || '-',
                                    congregacao_nome: localidadesMap[String(turma.congregacao_id)] || turma.congregacao || turma.comum_congregacao || '-',
                                    matriculados: alunosPorTurma[turma.id] || 0,
                                    periodo_label: buildPeriodoLabel(turma)
                                });
                            })
                        });
                    }).catch(function () {
                        deferred.resolve({
                            indisponivel: false,
                            mensagem: '',
                            turmas: turmasResponse.data || []
                        });
                    });
                });

            return deferred.promise;
        }

        function getOrderedCollection(tableName, alunoId, orderField) {
            var deferred = $q.defer();

            scopedMutation(
                supabase.from(tableName).select('*').eq('aluno_id', alunoId)
            )
                .order(orderField, { ascending: false })
                .then(function (response) {
                    handleResponse(deferred, response);
                });

            return deferred.promise;
        }

        function listScopedRecords(tableName, orderField) {
            return fetchAllRows(tableName, {
                orderField: orderField,
                ascending: false
            });
        }

        function safeTableSelect(tableName) {
            var deferred = $q.defer();

            supabase.from(tableName)
                .select('*')
                .then(function (response) {
                    if (response && response.error) {
                        deferred.resolve([]);
                        return;
                    }

                    deferred.resolve(response.data || []);
                }).catch(function () {
                    deferred.resolve([]);
                });

            return deferred.promise;
        }

        function readWorkbookFile(file) {
            var deferred = $q.defer();
            var reader = new FileReader();

            reader.onload = function (event) {
                try {
                    deferred.resolve({
                        name: file.name,
                        workbook: window.XLSX.read(event.target.result, {
                            type: 'array',
                            cellDates: true
                        })
                    });
                } catch (error) {
                    deferred.reject(error);
                }
            };

            reader.onerror = function () {
                deferred.reject(new Error('Nao foi possivel ler a planilha ' + (file.name || '') + '.'));
            };

            reader.readAsArrayBuffer(file);

            return deferred.promise;
        }

        function buildWorkbookRows(workbooks) {
            var deduped = {};

            (workbooks || []).forEach(function (entry) {
                (entry.workbook.SheetNames || []).forEach(function (sheetName) {
                    var sheet;
                    var rows;
                    var priority;

                    if (normalizeImportText(sheetName) === 'RELATORIO') {
                        return;
                    }

                    sheet = entry.workbook.Sheets[sheetName];
                    rows = (window.XLSX.utils.sheet_to_json(sheet, {
                        defval: null,
                        raw: false
                    }) || []).map(function (row) {
                        return sanitizeWorkbookRow(row);
                    }).filter(function (row) {
                        return row.Nome && row.Localidade && row.Nivel && normalizeImportText(row.Nivel).indexOf('CANDIDATO') >= 0;
                    });

                    if (!rows.length) {
                        return;
                    }

                    priority = normalizeImportText(entry.name).indexOf('ITAPEVI') >= 0 || normalizeImportText(sheetName).indexOf('ITAPEVI') >= 0 ? 2 : 1;

                    rows.forEach(function (row) {
                        var key = buildImportPairKey(row.Nome, row.Localidade);
                        var payload = angular.extend({}, row, {
                            __sourceFile: entry.name,
                            __sourceSheet: sheetName,
                            __priority: priority
                        });

                        if (!deduped[key] || payload.__priority >= deduped[key].__priority) {
                            deduped[key] = payload;
                        }
                    });
                });
            });

            return Object.keys(deduped).map(function (key) {
                return deduped[key];
            });
        }

        function buildWorkbookImportPreview(workbookRows, alunos, files) {
            var candidates = (alunos || []).filter(isAlunoStatusTrackable);
            var dbByPair = {};
            var dbByBasePair = {};
            var dbByName = {};
            var dbByLocalidadeBase = {};
            var workbookNameCounts = {};
            var updates = [];
            var unmatched = [];
            var statusCounts = {};
            var matchBreakdown = {
                parExato: 0,
                parSemCodigo: 0,
                nomeUnico: 0
            };
            var reviewRows = [];

            candidates.forEach(function (aluno) {
                var pairKey = buildImportPairKey(aluno.nome_aluno, aluno.comum_congregacao);
                var basePairKey = buildImportBasePairKey(aluno.nome_aluno, aluno.comum_congregacao);
                var nameKey = normalizeImportText(aluno.nome_aluno);
                var localidadeBaseKey = normalizeImportLocalidade(aluno.comum_congregacao);

                dbByPair[pairKey] = aluno;
                if (!dbByBasePair[basePairKey]) {
                    dbByBasePair[basePairKey] = [];
                }
                dbByBasePair[basePairKey].push(aluno);
                if (!dbByName[nameKey]) {
                    dbByName[nameKey] = [];
                }
                dbByName[nameKey].push(aluno);
                if (!dbByLocalidadeBase[localidadeBaseKey]) {
                    dbByLocalidadeBase[localidadeBaseKey] = [];
                }
                dbByLocalidadeBase[localidadeBaseKey].push(aluno);
            });

            (workbookRows || []).forEach(function (row) {
                var nameKey = normalizeImportText(row.Nome);
                workbookNameCounts[nameKey] = (workbookNameCounts[nameKey] || 0) + 1;
            });

            (workbookRows || []).forEach(function (row) {
                var pairKey = buildImportPairKey(row.Nome, row.Localidade);
                var basePairKey = buildImportBasePairKey(row.Nome, row.Localidade);
                var nameKey = normalizeImportText(row.Nome);
                var target = null;
                var latestActivity = getLatestWorkbookActivity(row);
                var status;
                var note;
                var reviewSuggestions;

                if (dbByPair[pairKey]) {
                    target = dbByPair[pairKey];
                    matchBreakdown.parExato += 1;
                } else if ((dbByBasePair[basePairKey] || []).length === 1) {
                    target = dbByBasePair[basePairKey][0];
                    matchBreakdown.parSemCodigo += 1;
                } else if ((dbByName[nameKey] || []).length === 1 && workbookNameCounts[nameKey] === 1) {
                    target = dbByName[nameKey][0];
                    matchBreakdown.nomeUnico += 1;
                }

                if (!target) {
                    reviewSuggestions = buildImportReviewSuggestions(row, dbByLocalidadeBase);
                    unmatched.push({
                        nome: row.Nome,
                        localidade: row.Localidade,
                        arquivo: row.__sourceFile,
                        aba: row.__sourceSheet,
                        sugestoes: reviewSuggestions
                    });
                    if (reviewSuggestions.length) {
                        reviewRows.push({
                            nome: row.Nome,
                            localidade: row.Localidade,
                            arquivo: row.__sourceFile,
                            aba: row.__sourceSheet,
                            sugestoes: reviewSuggestions
                        });
                    }
                    return;
                }

                status = classifyImportStatus(latestActivity);
                note = buildStatusImportNote(status, latestActivity, row.__sourceFile, row.__sourceSheet);

                updates.push({
                    id: target.id,
                    status: status,
                    observacoes: mergeStatusObservacoes(target.observacoes, note)
                });

                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });

            return {
                files: (files || []).map(function (file) { return file.name; }),
                workbookRowsCount: (workbookRows || []).length,
                candidateCount: candidates.length,
                matchedCount: updates.length,
                unmatchedCount: unmatched.length,
                reviewCount: reviewRows.length,
                statusCounts: statusCounts,
                matchBreakdown: matchBreakdown,
                unmatchedSample: unmatched.slice(0, 20),
                reviewSample: reviewRows.slice(0, 20),
                reviewRows: reviewRows,
                updates: updates
            };
        }

        function fetchAllRows(tableName, options) {
            var deferred = $q.defer();
            var allRows = [];
            var from = 0;
            var orderField = options && options.orderField;
            var ascending = !!(options && options.ascending);

            loadPage();

            return deferred.promise;

            function loadPage() {
                var query = scopedQuery(tableName).select('*').range(from, from + PAGE_SIZE - 1);

                if (orderField) {
                    query = query.order(orderField, { ascending: ascending });
                }

                query.then(function (response) {
                    var rows;

                    if (response && response.error) {
                        deferred.reject(response.error);
                        return;
                    }

                    rows = response.data || [];
                    allRows = allRows.concat(rows);

                    if (rows.length < PAGE_SIZE) {
                        deferred.resolve(allRows);
                        return;
                    }

                    from += PAGE_SIZE;
                    loadPage();
                }).catch(function (error) {
                    deferred.reject(error);
                });
            }
        }

        function getMsaFases() {
            var deferred = $q.defer();

            supabase.from('musica_msa_fases')
                .select('*')
                .order('ordem', { ascending: true })
                .then(function (response) {
                    handleResponse(deferred, response);
                });

            return deferred.promise;
        }

        function saveMsa(payload) {
            return saveChildRecord('musica_acompanhamento_msa', normalizeChildPayload(payload), 'GEM_MSA_SAVE');
        }

        function deleteMsa(id) {
            return deleteChildRecord('musica_acompanhamento_msa', id, 'GEM_MSA_DELETE');
        }

        function saveProva(payload) {
            return saveChildRecord('musica_acompanhamento_provas', normalizeChildPayload(payload), 'GEM_PROVA_SAVE');
        }

        function deleteProva(id) {
            return deleteChildRecord('musica_acompanhamento_provas', id, 'GEM_PROVA_DELETE');
        }

        function saveMetodo(payload) {
            return saveChildRecord('musica_acompanhamento_metodo', normalizeChildPayload(payload), 'GEM_METODO_SAVE');
        }

        function deleteMetodo(id) {
            return deleteChildRecord('musica_acompanhamento_metodo', id, 'GEM_METODO_DELETE');
        }

        function saveHinario(payload) {
            return saveChildRecord('musica_acompanhamento_hinario', normalizeChildPayload(payload), 'GEM_HINARIO_SAVE');
        }

        function deleteHinario(id) {
            return deleteChildRecord('musica_acompanhamento_hinario', id, 'GEM_HINARIO_DELETE');
        }

        function saveEscala(payload) {
            return saveChildRecord('musica_acompanhamento_escala', normalizeChildPayload(payload), 'GEM_ESCALA_SAVE');
        }

        function deleteEscala(id) {
            return deleteChildRecord('musica_acompanhamento_escala', id, 'GEM_ESCALA_DELETE');
        }

        function saveAtividade(payload) {
            return saveChildRecord('musica_acompanhamento_atividades', normalizeChildPayload(payload, {
                titulo: payload.titulo || payload.tipo_atividade || 'Atividade',
                descricao: payload.descricao || '',
                data_atividade: payload.data_atividade || new Date().toISOString().slice(0, 10)
            }), 'GEM_ATIVIDADE_SAVE');
        }

        function deleteAtividade(id) {
            return deleteChildRecord('musica_acompanhamento_atividades', id, 'GEM_ATIVIDADE_DELETE');
        }

        function saveChildRecord(tableName, payload, auditAction) {
            var deferred = $q.defer();
            var query;

            if (payload.id) {
                query = scopedMutation(
                    supabase.from(tableName).update(stripMetaFields(payload)).eq('id', payload.id).select()
                );
            } else {
                query = supabase.from(tableName).insert([stripMetaFields(payload)]).select();
            }

            query.then(function (response) {
                handleResponse(deferred, response, function (data) {
                    var record = angular.isArray(data) ? data[0] : data;
                    auditGem(auditAction, {
                        entity: tableName,
                        record_id: record && record.id,
                        aluno_id: payload.aluno_id
                    });
                });
            });

            return deferred.promise;
        }

        function deleteChildRecord(tableName, id, auditAction) {
            var deferred = $q.defer();

            scopedMutation(
                supabase.from(tableName).delete().eq('id', id)
            ).then(function (response) {
                handleResponse(deferred, response, function () {
                    auditGem(auditAction, {
                        entity: tableName,
                        record_id: id
                    });
                });
            });

            return deferred.promise;
        }

        function stripMetaFields(payload) {
            var cleanPayload = angular.copy(payload || {});
            delete cleanPayload.id;
            delete cleanPayload.created_at;
            delete cleanPayload.updated_at;
            return cleanPayload;
        }

        function parseFaseNumber(value) {
            var match = String(value || '').match(/(\d+(?:\.\d+)?)(?!.*\d)/);
            return match ? parseFloat(match[1]) : 0;
        }

        function calculateProgress(msa, fases) {
            var orderedFases = angular.copy(fases || []);
            var total = orderedFases.length || 16;
            var ultima = (msa || [])[0];
            var faseValue = 0;
            var percentual = 0;
            var message = 'Nenhuma fase registrada ainda.';

            if (!ultima) {
                return {
                    percentual: 0,
                    mensagem: message,
                    podeCulto: false,
                    podeOficializacao: false
                };
            }

            faseValue = parseFaseNumber(ultima.fase);
            if (!faseValue && orderedFases.length) {
                faseValue = orderedFases.length;
            }

            percentual = Math.max(0, Math.min(100, (faseValue / total) * 100));

            if (percentual < 60) {
                message = 'O aluno completou ' + Math.round(percentual) + '% do Programa Mínimo. Nesta fase ainda não é possível fazer pedido de exame.';
            } else if (percentual < 100) {
                message = 'O aluno completou ' + Math.round(percentual) + '% do Programa Mínimo. Já pode pedir carta de Culto Oficial.';
            } else {
                message = 'O aluno completou 100% do Programa Mínimo. Já pode pedir carta de Oficialização.';
            }

            return {
                percentual: percentual,
                mensagem: message,
                podeCulto: percentual >= 60,
                podeOficializacao: percentual >= 100
            };
        }

        function buildDashboardPayload(result) {
            var alunos = result.alunos || [];
            var msa = result.msa || [];
            var provas = result.provas || [];
            var metodo = result.metodo || [];
            var hinario = result.hinario || [];
            var escalas = result.escalas || [];
            var atividades = result.atividades || [];
            var fases = result.fases || [];
            var alunosEmAcompanhamento = (alunos || []).filter(isAlunoEmAcompanhamento);
            var alunoIdsEmAcompanhamento = {};
            var msaEmAcompanhamento;
            var provasEmAcompanhamento;
            var metodoEmAcompanhamento;
            var hinarioEmAcompanhamento;
            var escalasEmAcompanhamento;
            var atividadesEmAcompanhamento;
            var alunosComProgresso;
            var mediaProgresso = 0;
            var aptosCulto = 0;
            var aptosOficializacao = 0;
            var ativos = 0;
            var comunsMap = {};
            var municipiosMap = {};
            var instrumentosMap = {};
            var rankingComuns = {};
            var rankingMunicipios = {};
            var rankingInstrumentos = {};

            alunosEmAcompanhamento.forEach(function (aluno) {
                alunoIdsEmAcompanhamento[aluno.id] = true;
            });

            msaEmAcompanhamento = (msa || []).filter(function (item) {
                return !!alunoIdsEmAcompanhamento[item.aluno_id];
            });
            provasEmAcompanhamento = (provas || []).filter(function (item) {
                return !!alunoIdsEmAcompanhamento[item.aluno_id];
            });
            metodoEmAcompanhamento = (metodo || []).filter(function (item) {
                return !!alunoIdsEmAcompanhamento[item.aluno_id];
            });
            hinarioEmAcompanhamento = (hinario || []).filter(function (item) {
                return !!alunoIdsEmAcompanhamento[item.aluno_id];
            });
            escalasEmAcompanhamento = (escalas || []).filter(function (item) {
                return !!alunoIdsEmAcompanhamento[item.aluno_id];
            });
            atividadesEmAcompanhamento = (atividades || []).filter(function (item) {
                return !!alunoIdsEmAcompanhamento[item.aluno_id];
            });
            alunosComProgresso = buildProgressIndex(alunosEmAcompanhamento, msaEmAcompanhamento, fases);

            alunosComProgresso.forEach(function (aluno) {
                var comum = aluno.comum_congregacao || 'Nao informado';
                var instrumento = aluno.instrumento || 'Nao informado';
                var municipio = aluno.municipio || 'Nao informado';

                mediaProgresso += aluno.progresso.percentual || 0;
                comunsMap[comum] = true;
                municipiosMap[municipio] = true;
                instrumentosMap[instrumento] = true;

                if (String(aluno.status || '').toLowerCase() === 'ativo') {
                    ativos += 1;
                }

                if (aluno.progresso.podeCulto) {
                    aptosCulto += 1;
                }

                if (aluno.progresso.podeOficializacao) {
                    aptosOficializacao += 1;
                }

                if (!rankingComuns[comum]) {
                    rankingComuns[comum] = {
                        nome: comum,
                        municipio: municipio,
                        alunos: 0,
                        ativos: 0,
                        progressoTotal: 0,
                        aptosCulto: 0,
                        aptosOficializacao: 0
                    };
                }

                if (!rankingMunicipios[municipio]) {
                    rankingMunicipios[municipio] = {
                        nome: municipio,
                        alunos: 0,
                        ativos: 0,
                        progressoTotal: 0,
                        aptosCulto: 0,
                        aptosOficializacao: 0,
                        comunsMap: {},
                        comuns: []
                    };
                }

                if (!rankingInstrumentos[instrumento]) {
                    rankingInstrumentos[instrumento] = {
                        nome: instrumento,
                        alunos: 0,
                        progressoTotal: 0
                    };
                }

                rankingComuns[comum].alunos += 1;
                rankingComuns[comum].progressoTotal += aluno.progresso.percentual || 0;
                rankingMunicipios[municipio].alunos += 1;
                rankingMunicipios[municipio].progressoTotal += aluno.progresso.percentual || 0;
                rankingInstrumentos[instrumento].alunos += 1;
                rankingInstrumentos[instrumento].progressoTotal += aluno.progresso.percentual || 0;

                if (String(aluno.status || '').toLowerCase() === 'ativo') {
                    rankingComuns[comum].ativos += 1;
                    rankingMunicipios[municipio].ativos += 1;
                }

                if (aluno.progresso.podeCulto) {
                    rankingComuns[comum].aptosCulto += 1;
                    rankingMunicipios[municipio].aptosCulto += 1;
                }

                if (aluno.progresso.podeOficializacao) {
                    rankingComuns[comum].aptosOficializacao += 1;
                    rankingMunicipios[municipio].aptosOficializacao += 1;
                }
            });

            Object.keys(rankingComuns).forEach(function (key) {
                var comumItem = rankingComuns[key];
                var municipioItem = rankingMunicipios[comumItem.municipio || 'Nao informado'];

                comumItem.progressoMedio = comumItem.alunos ? Math.round(comumItem.progressoTotal / comumItem.alunos) : 0;

                if (municipioItem) {
                    municipioItem.comunsMap[comumItem.nome] = comumItem;
                }
            });

            return {
                metrics: {
                    totalAlunos: alunosEmAcompanhamento.length,
                    ativos: ativos,
                    comunsAtivas: Object.keys(comunsMap).length,
                    municipiosAtivos: Object.keys(municipiosMap).length,
                    instrumentosAtivos: Object.keys(instrumentosMap).length,
                    mediaProgresso: alunosEmAcompanhamento.length ? Math.round(mediaProgresso / alunosEmAcompanhamento.length) : 0,
                    aptosCulto: aptosCulto,
                    aptosOficializacao: aptosOficializacao,
                    lancamentosMsa: msaEmAcompanhamento.length,
                    provas: provasEmAcompanhamento.length,
                    metodo: metodoEmAcompanhamento.length,
                    hinario: hinarioEmAcompanhamento.length,
                    escalas: escalasEmAcompanhamento.length,
                    atividades: atividadesEmAcompanhamento.length
                },
                alunos: alunosComProgresso.sort(function (a, b) {
                    return (b.progresso.percentual || 0) - (a.progresso.percentual || 0);
                }),
                rankingComuns: Object.keys(rankingComuns).map(function (key) {
                    return rankingComuns[key];
                }).sort(function (a, b) {
                    return (b.progressoMedio || 0) - (a.progressoMedio || 0);
                }),
                rankingMunicipios: Object.keys(rankingMunicipios).map(function (key) {
                    var item = rankingMunicipios[key];
                    item.progressoMedio = item.alunos ? Math.round(item.progressoTotal / item.alunos) : 0;
                    item.comuns = Object.keys(item.comunsMap || {}).map(function (commonKey) {
                        return item.comunsMap[commonKey];
                    }).sort(function (a, b) {
                        return (b.alunos || 0) - (a.alunos || 0);
                    });
                    item.totalComuns = item.comuns.length;
                    delete item.comunsMap;
                    return item;
                }).sort(function (a, b) {
                    return (b.alunos || 0) - (a.alunos || 0);
                }),
                rankingInstrumentos: Object.keys(rankingInstrumentos).map(function (key) {
                    var item = rankingInstrumentos[key];
                    item.progressoMedio = item.alunos ? Math.round(item.progressoTotal / item.alunos) : 0;
                    return item;
                }).sort(function (a, b) {
                    return (b.alunos || 0) - (a.alunos || 0);
                }),
                timeline: buildTimeline(msaEmAcompanhamento, atividadesEmAcompanhamento, alunosEmAcompanhamento)
            };
        }

        function buildProgressIndex(alunos, msa, fases) {
            var msaByAluno = {};

            (msa || []).forEach(function (item) {
                if (!msaByAluno[item.aluno_id]) {
                    msaByAluno[item.aluno_id] = [];
                }
                msaByAluno[item.aluno_id].push(item);
            });

            return (alunos || []).map(function (aluno) {
                return angular.extend({}, aluno, {
                    progresso: calculateProgress(msaByAluno[aluno.id] || [], fases || []),
                    totalMsa: (msaByAluno[aluno.id] || []).length
                });
            });
        }

        function buildTimeline(msa, atividades, alunos) {
            var alunosMap = {};
            var eventos = [];

            (alunos || []).forEach(function (aluno) {
                alunosMap[aluno.id] = aluno;
            });

            (msa || []).slice(0, 8).forEach(function (item) {
                var aluno = alunosMap[item.aluno_id] || {};
                eventos.push({
                    data: item.data_aula,
                    titulo: 'Aula MSA registrada',
                    descricao: (aluno.nome_aluno || 'Aluno') + ' - ' + (item.fase || 'Fase nao informada'),
                    tipo: 'MSA'
                });
            });

            (atividades || []).slice(0, 8).forEach(function (item) {
                var aluno = alunosMap[item.aluno_id] || {};
                eventos.push({
                    data: item.data_atividade,
                    titulo: item.titulo || item.tipo_atividade || 'Atividade',
                    descricao: aluno.nome_aluno || 'Aluno nao identificado',
                    tipo: 'ATIVIDADE'
                });
            });

            return eventos.sort(function (a, b) {
                return String(b.data || '').localeCompare(String(a.data || ''));
            }).slice(0, 8);
        }

        function sanitizeWorkbookRow(row) {
            var cleaned = {};

            Object.keys(row || {}).forEach(function (key) {
                var cleanKey = removeDiacritics(String(key || '')).trim();
                cleaned[cleanKey] = row[key];
            });

            return cleaned;
        }

        function isAlunoEmAcompanhamento(aluno) {
            var status = String((aluno && aluno.status) || '').toLowerCase();
            var nivel = String((aluno && aluno.nivel) || '').toLowerCase();

            if (status === 'concluido') {
                return false;
            }

            if (nivel.indexOf('oficializado') >= 0) {
                return false;
            }

            return true;
        }

        function isAlunoStatusTrackable(aluno) {
            var status = String((aluno && aluno.status) || '').toLowerCase();
            var nivel = normalizeImportText(aluno && aluno.nivel);

            if (status === 'concluido') {
                return false;
            }

            if (nivel.indexOf('OFICIALIZADO') >= 0) {
                return false;
            }

            return true;
        }

        function buildImportPairKey(nome, localidade) {
            return [normalizeImportText(nome), normalizeImportText(localidade)].join('||');
        }

        function buildImportBasePairKey(nome, localidade) {
            return [normalizeImportText(nome), normalizeImportLocalidade(localidade)].join('||');
        }

        function normalizeImportText(value) {
            return removeDiacritics(String(value || ''))
                .toUpperCase()
                .replace(/[^A-Z0-9 ]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function sanitizeQueryTerm(value) {
            return String(value || '')
                .replace(/[%"]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function normalizeImportLocalidade(value) {
            return normalizeImportText(value)
                .replace(/^BR\s+\d+\s+\d+\s+/, '')
                .replace(/^BR\s+\d+\s+/, '')
                .replace(/^\d+\s+/, '')
                .trim();
        }

        function removeDiacritics(value) {
            return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        }

        function parseWorkbookDate(value) {
            var normalized;
            var parts;
            var parsed;

            if (!value) {
                return null;
            }

            if (angular.isDate(value)) {
                return value;
            }

            if (typeof value === 'number' && window.XLSX && window.XLSX.SSF && typeof window.XLSX.SSF.parse_date_code === 'function') {
                parsed = window.XLSX.SSF.parse_date_code(value);
                if (parsed) {
                    return new Date(parsed.y, parsed.m - 1, parsed.d);
                }
            }

            normalized = String(value).trim();
            parts = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);

            if (parts) {
                return new Date(parseInt(parts[3], 10), parseInt(parts[2], 10) - 1, parseInt(parts[1], 10));
            }

            parsed = new Date(normalized);
            return isNaN(parsed.getTime()) ? null : parsed;
        }

        function getLatestWorkbookActivity(row) {
            var dates = [
                parseWorkbookDate(row['MSA Lancamento']),
                parseWorkbookDate(row['Data Metodo']),
                parseWorkbookDate(row['Data Hino'])
            ].filter(function (item) {
                return !!item;
            });

            if (!dates.length) {
                return null;
            }

            return dates.sort(function (a, b) {
                return b.getTime() - a.getTime();
            })[0];
        }

        function isImportReviewNameCandidate(workbookName, dbName) {
            var workbookNormalized = normalizeImportText(workbookName);
            var dbNormalized = normalizeImportText(dbName);

            if (!workbookNormalized || !dbNormalized) {
                return false;
            }

            if (workbookNormalized === dbNormalized) {
                return true;
            }

            return workbookNormalized.indexOf(dbNormalized) === 0 || dbNormalized.indexOf(workbookNormalized) === 0;
        }

        function buildImportReviewSuggestions(row, dbByLocalidadeBase) {
            var localidadeKey = normalizeImportLocalidade(row && row.Localidade);

            return (dbByLocalidadeBase[localidadeKey] || []).filter(function (candidate) {
                return isImportReviewNameCandidate(row && row.Nome, candidate && candidate.nome_aluno);
            }).slice(0, 5).map(function (candidate) {
                return {
                    id: candidate.id,
                    nome_aluno: candidate.nome_aluno,
                    comum_congregacao: candidate.comum_congregacao,
                    status: candidate.status,
                    nivel: candidate.nivel
                };
            });
        }

        function classifyImportStatus(latestActivity) {
            var today = new Date();
            var monthDiff;

            if (!latestActivity) {
                return 'Excluir';
            }

            monthDiff = (today.getFullYear() - latestActivity.getFullYear()) * 12 + (today.getMonth() - latestActivity.getMonth());

            if (monthDiff < 3) {
                return 'Ativo';
            }

            if (monthDiff < 6) {
                return 'Alerta';
            }

            if (monthDiff < 12) {
                return 'Inativo';
            }

            return 'Excluir';
        }

        function buildStatusImportNote(status, latestActivity, sourceFile, sourceSheet) {
            var lastDateText = latestActivity ? latestActivity.toLocaleDateString('pt-BR') : 'sem atividade identificada';
            return '[STATUS_SAM] Status atualizado para ' + status
                + ' com base na planilha ' + sourceFile + ' / aba ' + sourceSheet
                + '. Ultima atividade considerada: ' + lastDateText + '.';
        }

        function mergeStatusObservacoes(existing, note) {
            var existingText = String(existing || '').replace(/\[STATUS_SAM\][^\[]*/g, '').trim();
            return existingText ? (existingText + '\n' + note).trim() : note;
        }

        function mapById(collection, labelField) {
            var result = {};

            (collection || []).forEach(function (item) {
                if (!item || !item.id) {
                    return;
                }

                result[String(item.id)] = item[labelField] || '-';
            });

            return result;
        }

        function buildPeriodoLabel(turma) {
            var dia = turma.dia_semana || turma.dia || '';
            var inicio = turma.hora_inicio || '';
            var fim = turma.hora_fim || '';
            var partes = [];

            if (dia) {
                partes.push(dia);
            }

            if (inicio || fim) {
                partes.push([inicio, fim].filter(Boolean).join(' as '));
            }

            return partes.join(' - ') || '-';
        }

        function resolveTableMessage(error, tableName) {
            var errorMessage = String((error && error.message) || '').toLowerCase();
            var errorCode = String((error && error.code) || '').toLowerCase();

            if (!error) {
                return 'Nao foi possivel carregar os dados de ' + tableName + '.';
            }

            if (
                errorMessage.indexOf('does not exist') >= 0 ||
                errorMessage.indexOf('could not find the table') >= 0 ||
                errorMessage.indexOf('schema cache') >= 0 ||
                errorCode === 'pgrst205'
            ) {
                return 'A area de turmas ainda nao foi implantada neste ambiente do G.E.M. Assim que a tabela for criada, os registros aparecerao aqui.';
            }

            return error.message || ('Nao foi possivel carregar os dados de ' + tableName + '.');
        }
    }
})();
