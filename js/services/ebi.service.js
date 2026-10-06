(function () {
    'use strict';

    angular.module('inspinia')
        .factory('EbiService', EbiService);

    EbiService.$inject = ['$q', 'AuthService'];

    function EbiService($q, AuthService) {
        var recitativosCache = {};
        var alunosCache = { data: null, time: 0 };
        var monitoresCache = { data: null, time: 0 };

        function clearEbiCache() {
            recitativosCache = {};
            alunosCache = { data: null, time: 0 };
            monitoresCache = { data: null, time: 0 };
        }

        var ALUNO_FIELDS = [
            'nome_crianca',
            'sexo',
            'data_nascimento',
            'comum_congregacao',
            'localidade',
            'polo_participacao',
            'nome_pai',
            'pai_e_crente',
            'nome_mae',
            'mae_e_crente',
            'pais_vivem_juntos',
            'crianca_vive_com_os_pais',
            'se_nao_vive_com_pais_com_quem_vive',
            'nome_responsavel',
            'celular_responsavel',
            'tem_whatsapp',
            'participa_reunioes_jovens_menores',
            'participa_espaco_infantil',
            'logradouro_numero',
            'complemento',
            'bairro',
            'cidade',
            'cep',
            'dificuldade_aprendizagem',
            'dificuldade_descricao',
            'faz_terapia',
            'terapia_especialidade',
            'status'
        ];
        var MONITOR_FIELDS = [
            'nome_completo',
            'comum_congregacao',
            'localidade',
            'data_nascimento',
            'idade',
            'batizado',
            'data_batismo',
            'celular',
            'email',
            'polo_auxilio',
            'musico_ou_musicista',
            'oficializado',
            'data_oficializacao',
            'instrutor_atualmente',
            'instrutor_em_qual_igreja',
            'formacao_musica',
            'formacao_qual',
            'formacao_data',
            'pedagogo',
            'pedagogo_desde',
            'atua_na_area',
            'afinidade_criancas',
            'cursos_conhecimentos',
            'de_acordo_voluntario',
            'autoriza_tratamento_dados',
            'status'
        ];
        var ALUNO_UPPERCASE_FIELDS = [
            'nome_crianca',
            'comum_congregacao',
            'localidade',
            'polo_participacao',
            'nome_pai',
            'nome_mae',
            'se_nao_vive_com_pais_com_quem_vive',
            'nome_responsavel',
            'logradouro_numero',
            'complemento',
            'bairro',
            'cidade',
            'dificuldade_descricao',
            'terapia_especialidade'
        ];
        var MONITOR_UPPERCASE_FIELDS = [
            'nome_completo',
            'comum_congregacao',
            'localidade',
            'polo_auxilio',
            'instrutor_em_qual_igreja',
            'formacao_qual',
            'cursos_conhecimentos'
        ];
        var EBI_ATIVIDADES_SCOPE = {
            municipioFields: ['cidade', 'localidade']
        };
        var EBI_ALUNOS_SCOPE = {
            commonField: 'comum_congregacao',
            municipioField: 'cidade',
            commonFields: ['comum_congregacao', 'localidade'],
            municipioFields: ['cidade']
        };
        var EBI_MONITORES_SCOPE = {
            commonField: 'comum_congregacao',
            commonFields: ['comum_congregacao', 'localidade'],
            municipioFields: ['cidade']
        };

        var supabase = window.getAppSupabaseClient();

        var service = {
            getRecitativos: getRecitativos,
            saveAtividade: saveAtividade,
            updateAtividade: updateAtividade,
            deleteAtividade: deleteAtividade,
            getAlunos: getAlunos,
            saveAluno: saveAluno,
            updateAluno: updateAluno,
            deleteAluno: deleteAluno,
            getInstrutores: getInstrutores,
            saveInstrutor: saveInstrutor,
            updateInstrutor: updateInstrutor,
            deleteInstrutor: deleteInstrutor
        };

        return service;

        function auditEbi(action, details) {
            if (!AuthService || typeof AuthService.logAudit !== 'function') {
                return;
            }

            AuthService.logAudit(null, action, 'EBI', details || {}).catch(angular.noop);
        }

        function normalizeDateOnly(value) {
            var year;
            var month;
            var day;
            var parts;
            var date;

            if (!value) return null;

            if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
                year = value.getFullYear();
                month = String(value.getMonth() + 1).padStart(2, '0');
                day = String(value.getDate()).padStart(2, '0');
                return [year, month, day].join('-');
            }

            if (typeof value === 'string') {
                parts = value.split('T')[0].split('-');
                if (parts.length === 3) {
                    return parts[0] + '-' + parts[1] + '-' + parts[2];
                }
            }

            date = new Date(value);
            if (isNaN(date.getTime())) return null;
            year = date.getFullYear();
            month = String(date.getMonth() + 1).padStart(2, '0');
            day = String(date.getDate()).padStart(2, '0');
            return [year, month, day].join('-');
        }

        function repairTextValue(value) {
            var repaired = value;

            if (typeof repaired !== 'string') {
                return repaired;
            }

            if (window.AppUiStandards && typeof window.AppUiStandards.repairText === 'function') {
                repaired = window.AppUiStandards.repairText(repaired);
            }

            if (typeof repairCadastroMusicText === 'function') {
                repaired = repairCadastroMusicText(repaired);
            }

            return repaired;
        }

        function repairRecordStrings(record) {
            Object.keys(record || {}).forEach(function (key) {
                if (typeof record[key] === 'string') {
                    record[key] = repairTextValue(record[key]);
                }
            });

            return record;
        }

        function applyUppercaseFields(record, fields) {
            (fields || []).forEach(function (field) {
                if (typeof (record || {})[field] === 'string') {
                    record[field] = String(record[field] || '').trim().toUpperCase();
                }
            });

            return record;
        }

        function getRecitativos(filters) {
            var deferred = $q.defer();
            var mesFiltro = (filters && filters.mes) ? String(filters.mes) : 'all';
            
            function createQuery() {
            var query = supabase.from('ebi_atividades').select('*');
            
            if (filters && filters.mes && filters.mes !== 'Todos os meses') {
                var meses = ['Janeiro', 'Fevereiro', 'Mar\u00e7o', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
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
            
            return AuthService.applyDataScopeToQuery(query, EBI_ATIVIDADES_SCOPE)
                .order('data_reuniao', { ascending: false })
                .order('id', { ascending: false });
            }

            function loadPage(offset, records) {
            createQuery().range(offset, offset + 999)
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else {
                        var page = response.data || [];
                        var allRecords = records.concat(page);
                        if (page.length === 1000) {
                            loadPage(offset + 1000, allRecords);
                            return;
                        }
                        var result = AuthService.filterCollectionByDataScope(
                            allRecords.map(normalizeAtividadeRecord),
                            EBI_ATIVIDADES_SCOPE
                        );
                        recitativosCache[mesFiltro] = { data: result, time: Date.now() };
                        deferred.resolve(result);
                    }
                }).catch(function (error) { deferred.reject(error); });
            }
            loadPage(0, []);
            return deferred.promise;
        }

        function saveAtividade(data) {
            var deferred = $q.defer();
            var payload = AuthService.applyDataScopeToPayload(
                normalizeAtividadePayload(data),
                EBI_ATIVIDADES_SCOPE
            );
            runWithMissingColumnRetry(function (currentPayload) {
                return supabase.from('ebi_atividades').insert([currentPayload]);
            }, payload, deferred);
            deferred.promise.then(function (result) {
                clearEbiCache();
                var record = angular.isArray(result) ? result[0] : result;
                auditEbi('EBI_ATIVIDADE_CREATE', {
                    entity: 'ebi_atividades',
                    record_id: record && record.id,
                    data_reuniao: payload.data_reuniao,
                    instrutora: payload.instrutora,
                    localidade: payload.localidade
                });
            }, angular.noop);
            return deferred.promise;
        }

        function updateAtividade(data) {
            var deferred = $q.defer();
            var updateData = AuthService.applyDataScopeToPayload(
                normalizeAtividadePayload(data),
                EBI_ATIVIDADES_SCOPE
            );
            runWithMissingColumnRetry(function (currentPayload) {
                return AuthService.applyDataScopeToQuery(
                    supabase.from('ebi_atividades').update(currentPayload).eq('id', data.id),
                    EBI_ATIVIDADES_SCOPE
                );
            }, updateData, deferred);
            deferred.promise.then(function () {
                clearEbiCache();
                auditEbi('EBI_ATIVIDADE_UPDATE', {
                    entity: 'ebi_atividades',
                    record_id: data.id,
                    data_reuniao: updateData.data_reuniao,
                    instrutora: updateData.instrutora,
                    localidade: updateData.localidade
                });
            }, angular.noop);
            return deferred.promise;
        }

        function deleteAtividade(id) {
            var deferred = $q.defer();
            AuthService.applyDataScopeToQuery(
                supabase.from('ebi_atividades').delete().eq('id', id),
                EBI_ATIVIDADES_SCOPE
            )
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else {
                        clearEbiCache();
                        auditEbi('EBI_ATIVIDADE_DELETE', {
                            entity: 'ebi_atividades',
                            record_id: id
                        });
                        deferred.resolve(response.data);
                    }
                });
            return deferred.promise;
        }

        // Students (Alunos)
        function getAlunos() {
            var deferred = $q.defer();
            AuthService.applyDataScopeToQuery(
                supabase.from('ebi_criancas').select('*'),
                EBI_ALUNOS_SCOPE
            ).order('nome_crianca', { ascending: true })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(
                        AuthService.filterCollectionByDataScope(
                            (response.data || []).map(normalizeAlunoRecord),
                            EBI_ALUNOS_SCOPE
                        )
                    );
                });
            return deferred.promise;
        }

        function saveAluno(data) {
            var deferred = $q.defer();
            var payload = AuthService.applyDataScopeToPayload(
                normalizeAlunoPayload(data),
                EBI_ALUNOS_SCOPE
            );
            runWithMissingColumnRetry(function (currentPayload) {
                return supabase.from('ebi_criancas').insert([currentPayload]);
            }, payload, deferred);
            deferred.promise.then(function (result) {
                var record = angular.isArray(result) ? result[0] : result;
                auditEbi('EBI_ALUNO_CREATE', {
                    entity: 'ebi_criancas',
                    record_id: record && record.id,
                    nome_crianca: payload.nome_crianca,
                    localidade: payload.localidade,
                    comum_congregacao: payload.comum_congregacao
                });
            }, angular.noop);
            return deferred.promise;
        }

        function updateAluno(data) {
            var deferred = $q.defer();
            var updateData = AuthService.applyDataScopeToPayload(
                normalizeAlunoPayload(data),
                EBI_ALUNOS_SCOPE
            );
            runWithMissingColumnRetry(function (currentPayload) {
                return AuthService.applyDataScopeToQuery(
                    supabase.from('ebi_criancas').update(currentPayload).eq('id', data.id),
                    EBI_ALUNOS_SCOPE
                );
            }, updateData, deferred);
            deferred.promise.then(function () {
                auditEbi('EBI_ALUNO_UPDATE', {
                    entity: 'ebi_criancas',
                    record_id: data.id,
                    nome_crianca: updateData.nome_crianca,
                    localidade: updateData.localidade,
                    comum_congregacao: updateData.comum_congregacao
                });
            }, angular.noop);
            return deferred.promise;
        }

        function deleteAluno(id) {
            var deferred = $q.defer();
            AuthService.applyDataScopeToQuery(
                supabase.from('ebi_criancas').delete().eq('id', id),
                EBI_ALUNOS_SCOPE
            )
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else {
                        auditEbi('EBI_ALUNO_DELETE', {
                            entity: 'ebi_criancas',
                            record_id: id
                        });
                        deferred.resolve(response.data);
                    }
                });
            return deferred.promise;
        }

        // Instructors (Instrutores)
        function getInstrutores() {
            var deferred = $q.defer();
            AuthService.applyDataScopeToQuery(
                supabase.from('ebi_monitores').select('*'),
                EBI_MONITORES_SCOPE
            ).order('nome_completo', { ascending: true })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(
                        AuthService.filterCollectionByDataScope(
                            (response.data || []).map(normalizeMonitorRecord),
                            EBI_MONITORES_SCOPE
                        )
                    );
                });
            return deferred.promise;
        }

        function saveInstrutor(data) {
            var deferred = $q.defer();
            var payload = AuthService.applyDataScopeToPayload(
                normalizeMonitorPayload(data),
                EBI_MONITORES_SCOPE
            );
            runWithMissingColumnRetry(function (currentPayload) {
                return supabase.from('ebi_monitores').insert([currentPayload]);
            }, payload, deferred);
            deferred.promise.then(function (result) {
                var record = angular.isArray(result) ? result[0] : result;
                auditEbi('EBI_INSTRUTOR_CREATE', {
                    entity: 'ebi_monitores',
                    record_id: record && record.id,
                    nome_completo: payload.nome_completo,
                    localidade: payload.localidade,
                    comum_congregacao: payload.comum_congregacao
                });
            }, angular.noop);
            return deferred.promise;
        }

        function updateInstrutor(data) {
            var deferred = $q.defer();
            var updateData = AuthService.applyDataScopeToPayload(
                normalizeMonitorPayload(data),
                EBI_MONITORES_SCOPE
            );
            runWithMissingColumnRetry(function (currentPayload) {
                return AuthService.applyDataScopeToQuery(
                    supabase.from('ebi_monitores').update(currentPayload).eq('id', data.id),
                    EBI_MONITORES_SCOPE
                );
            }, updateData, deferred);
            deferred.promise.then(function () {
                auditEbi('EBI_INSTRUTOR_UPDATE', {
                    entity: 'ebi_monitores',
                    record_id: data.id,
                    nome_completo: updateData.nome_completo,
                    localidade: updateData.localidade,
                    comum_congregacao: updateData.comum_congregacao
                });
            }, angular.noop);
            return deferred.promise;
        }

        function deleteInstrutor(id) {
            var deferred = $q.defer();
            AuthService.applyDataScopeToQuery(
                supabase.from('ebi_monitores').delete().eq('id', id),
                EBI_MONITORES_SCOPE
            )
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else {
                        auditEbi('EBI_INSTRUTOR_DELETE', {
                            entity: 'ebi_monitores',
                            record_id: id
                        });
                        deferred.resolve(response.data);
                    }
                });
            return deferred.promise;
        }

        function normalizeAlunoPayload(aluno) {
            var source = angular.copy(aluno || {});
            var payload = {};

            ALUNO_FIELDS.forEach(function (field) {
                if (Object.prototype.hasOwnProperty.call(source, field)) {
                    payload[field] = source[field];
                }
            });

            payload.localidade = payload.localidade || payload.comum_congregacao || '';

            if (!payload.status) {
                payload.status = 'Ativo';
            }

            repairRecordStrings(payload);
            applyUppercaseFields(payload, ALUNO_UPPERCASE_FIELDS);
            return payload;
        }

        function normalizeAtividadePayload(atividade) {
            var source = angular.copy(atividade || {});
            var instrutora = source.instrutora || source.contadora || '';
            var payload = {
                data_reuniao: normalizeDateOnly(source.data_reuniao),
                localidade: source.localidade || '',
                cidade: source.cidade || '',
                livro: source.livro || '',
                capitulo: source.capitulo || '',
                versiculo: source.versiculo || '',
                titulo_historia: source.titulo_historia || '',
                instrutora: instrutora,
                contadora: instrutora,
                meninas: source.meninas || 0,
                meninos: source.meninos || 0,
                colaboradoras: source.colaboradoras || 0,
                suspenso: source.suspenso || 'Não',
                justificativa: source.justificativa || ''
            };

            return repairRecordStrings(payload);
        }

        function normalizeAtividadeRecord(atividade) {
            var record = angular.copy(atividade || {});

            repairRecordStrings(record);

            record.instrutora = record.instrutora || record.contadora || '';
            if (!record.contadora && record.instrutora) {
                record.contadora = record.instrutora;
            }

            record.suspenso = record.suspenso || 'Não';
            record.justificativa = record.justificativa || '';

            return record;
        }

        function normalizeAlunoRecord(aluno) {
            var record = angular.copy(aluno || {});

            repairRecordStrings(record);
            applyUppercaseFields(record, ALUNO_UPPERCASE_FIELDS);

            record.localidade = record.localidade || record.comum_congregacao || '';
            record.comum_congregacao = record.comum_congregacao || record.localidade || '';
            record.status = record.status || 'Ativo';

            if (record.sexo === 'M') {
                record.sexo = 'Menino';
            } else if (record.sexo === 'F') {
                record.sexo = 'Menina';
            }

            return record;
        }

        function normalizeMonitorPayload(instrutor) {
            var source = angular.copy(instrutor || {});
            var payload = {};

            MONITOR_FIELDS.forEach(function (field) {
                if (Object.prototype.hasOwnProperty.call(source, field)) {
                    payload[field] = source[field];
                }
            });

            payload.localidade = payload.localidade || payload.comum_congregacao || '';

            if (!payload.status) {
                payload.status = 'Ativo';
            }

            repairRecordStrings(payload);
            applyUppercaseFields(payload, MONITOR_UPPERCASE_FIELDS);
            if (typeof payload.email === 'string') {
                payload.email = String(payload.email || '').trim().toLowerCase();
            }
            return payload;
        }

        function normalizeMonitorRecord(instrutor) {
            var record = angular.copy(instrutor || {});

            repairRecordStrings(record);
            applyUppercaseFields(record, MONITOR_UPPERCASE_FIELDS);
            if (typeof record.email === 'string') {
                record.email = String(record.email || '').trim().toLowerCase();
            }

            record.localidade = record.localidade || record.comum_congregacao || '';
            record.comum_congregacao = record.comum_congregacao || record.localidade || '';
            record.status = record.status || 'Ativo';

            return record;
        }

        function extractMissingColumn(error) {
            var message = '';
            var match = null;

            if (!error) return null;

            message = (error.message || error.details || error.hint || error.toString() || '');
            match = message.match(/Could not find the '([^']+)' column/i);
            if (match && match[1]) return match[1];

            match = message.match(/column ["']?([^"' ]+)["']? does not exist/i);
            return match && match[1] ? match[1] : null;
        }

        function runWithMissingColumnRetry(requestFactory, payload, deferred, removedColumns) {
            var currentPayload = angular.copy(payload || {});
            var removed = removedColumns || {};

            requestFactory(currentPayload).then(function (response) {
                var missingColumn = null;

                if (!response.error) {
                    deferred.resolve(response.data);
                    return;
                }

                missingColumn = extractMissingColumn(response.error);
                if (missingColumn && Object.prototype.hasOwnProperty.call(currentPayload, missingColumn) && !removed[missingColumn]) {
                    removed[missingColumn] = true;
                    delete currentPayload[missingColumn];
                    runWithMissingColumnRetry(requestFactory, currentPayload, deferred, removed);
                    return;
                }

                deferred.reject(response.error);
            });
        }
    }
})();
