(function () {
    'use strict';

    angular.module('inspinia')
        .factory('DarpeService', DarpeService);

    DarpeService.$inject = ['$q', 'AuthService'];

    function DarpeService($q, AuthService) {
        var SUPABASE_URL = 'https://sqamxlhfazulrisiptud.supabase.co';
        var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYW14bGhmYXp1bHJpc2lwdHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU4ODQsImV4cCI6MjA4Mjk1MTg4NH0.UmshkDqIgJQYVMmWVVgmfQm-YacUbRBeSpmYsNG0baE';
        var MUSICO_FIELDS = [
            'nome_completo',
            'data_nascimento',
            'celular',
            'email',
            'comum_congregacao',
            'cidade',
            'instrumento',
            'nivel',
            'disponibilidade',
            'apto_atendimentos',
            'observacoes',
            'status'
        ];
        var CLINICA_FIELDS = [
            'nome_local',
            'tipo_local',
            'cidade',
            'endereco',
            'responsavel_local',
            'telefone_contato',
            'periodicidade_preferencial',
            'observacoes',
            'status'
        ];
        var ATENDIMENTO_FIELDS = [
            'data_atendimento',
            'periodicidade',
            'local_id',
            'local_nome',
            'tipo_local',
            'cidade',
            'responsavel_ministerio',
            'musicos_ids',
            'musicos_nomes',
            'quantidade_musicos',
            'repertorio',
            'observacoes',
            'status',
            'proxima_visita'
        ];
        var UPPERCASE_FIELDS = [
            'nome_completo',
            'comum_congregacao',
            'cidade',
            'instrumento',
            'nivel',
            'disponibilidade',
            'observacoes',
            'nome_local',
            'tipo_local',
            'endereco',
            'responsavel_local',
            'periodicidade_preferencial',
            'local_nome',
            'responsavel_ministerio',
            'musicos_nomes',
            'repertorio'
        ];

        var supabase = window.__appSupabaseClient
            || (window.__appSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
        var DARPE_MUSICOS_SCOPE = {
            commonField: 'comum_congregacao',
            municipioField: 'cidade',
            commonFields: ['comum_congregacao'],
            municipioFields: ['cidade']
        };
        var DARPE_CLINICAS_SCOPE = {
            municipioField: 'cidade',
            municipioFields: ['cidade']
        };
        var DARPE_ATENDIMENTOS_SCOPE = {
            municipioField: 'cidade',
            municipioFields: ['cidade']
        };

        return {
            getMusicos: getMusicos,
            saveMusico: saveMusico,
            updateMusico: updateMusico,
            deleteMusico: deleteMusico,
            getClinicas: getClinicas,
            saveClinica: saveClinica,
            updateClinica: updateClinica,
            deleteClinica: deleteClinica,
            getAtendimentos: getAtendimentos,
            saveAtendimento: saveAtendimento,
            updateAtendimento: updateAtendimento,
            deleteAtendimento: deleteAtendimento
        };

        function auditDarpe(action, details) {
            if (!AuthService || typeof AuthService.logAudit !== 'function') {
                return;
            }

            AuthService.logAudit(null, action, 'DARPE', details || {}).catch(angular.noop);
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

            if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
                parts = value.split('/');
                return [parts[2], parts[1], parts[0]].join('-');
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

            if (typeof repaired !== 'string' || !repaired) {
                return repaired;
            }

            try {
                // Priority: Use the standardized global repair function if available
                if (window.AppUiStandards && typeof window.AppUiStandards.repairText === 'function') {
                    repaired = window.AppUiStandards.repairText(repaired);
                } else if (AuthService && typeof AuthService.repairCatalogText === 'function') {
                    repaired = AuthService.repairCatalogText(repaired);
                }
            } catch (e) {
                console.warn('Text repair failed for value:', value, e);
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

        function ensureArray(value) {
            if (angular.isArray(value)) return value;
            if (!value) return [];

            if (typeof value === 'string') {
                try {
                    value = JSON.parse(value);
                    if (angular.isArray(value)) return value;
                } catch (error) {
                    return value.split(',').map(function (item) {
                        return String(item || '').trim();
                    }).filter(Boolean);
                }
            }

            return [];
        }

        function getMusicos() {
            var deferred = $q.defer();
            AuthService.applyDataScopeToQuery(
                supabase.from('darpe_musicos').select('*'),
                DARPE_MUSICOS_SCOPE
            ).order('nome_completo', { ascending: true })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(
                        AuthService.filterCollectionByDataScope(
                            (response.data || []).map(normalizeMusicoRecord),
                            DARPE_MUSICOS_SCOPE
                        )
                    );
                });
            return deferred.promise;
        }

        function saveMusico(data) {
            var deferred = $q.defer();
            var payload = AuthService.applyDataScopeToPayload(normalizeMusicoPayload(data), DARPE_MUSICOS_SCOPE);
            runWithMissingColumnRetry(function (currentPayload) {
                return supabase.from('darpe_musicos').insert([currentPayload]);
            }, payload, deferred);
            deferred.promise.then(function (result) {
                var record = angular.isArray(result) ? result[0] : result;
                auditDarpe('DARPE_MUSICO_CREATE', {
                    entity: 'darpe_musicos',
                    record_id: record && record.id,
                    nome_completo: payload.nome_completo,
                    cidade: payload.cidade
                });
            }, angular.noop);
            return deferred.promise;
        }

        function updateMusico(data) {
            var deferred = $q.defer();
            var payload = AuthService.applyDataScopeToPayload(normalizeMusicoPayload(data), DARPE_MUSICOS_SCOPE);
            runWithMissingColumnRetry(function (currentPayload) {
                return AuthService.applyDataScopeToQuery(
                    supabase.from('darpe_musicos').update(currentPayload).eq('id', data.id),
                    DARPE_MUSICOS_SCOPE
                );
            }, payload, deferred);
            deferred.promise.then(function () {
                auditDarpe('DARPE_MUSICO_UPDATE', {
                    entity: 'darpe_musicos',
                    record_id: data.id,
                    nome_completo: payload.nome_completo,
                    cidade: payload.cidade
                });
            }, angular.noop);
            return deferred.promise;
        }

        function deleteMusico(id) {
            var deferred = $q.defer();
            AuthService.applyDataScopeToQuery(
                supabase.from('darpe_musicos').delete().eq('id', id),
                DARPE_MUSICOS_SCOPE
            )
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else {
                        auditDarpe('DARPE_MUSICO_DELETE', {
                            entity: 'darpe_musicos',
                            record_id: id
                        });
                        deferred.resolve(response.data);
                    }
                });
            return deferred.promise;
        }

        function getClinicas() {
            var deferred = $q.defer();
            AuthService.applyDataScopeToQuery(
                supabase.from('darpe_clinicas').select('*'),
                DARPE_CLINICAS_SCOPE
            ).order('nome_local', { ascending: true })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(
                        AuthService.filterCollectionByDataScope(
                            (response.data || []).map(normalizeClinicaRecord),
                            DARPE_CLINICAS_SCOPE
                        )
                    );
                });
            return deferred.promise;
        }

        function saveClinica(data) {
            var deferred = $q.defer();
            var payload = AuthService.applyDataScopeToPayload(normalizeClinicaPayload(data), DARPE_CLINICAS_SCOPE);
            runWithMissingColumnRetry(function (currentPayload) {
                return supabase.from('darpe_clinicas').insert([currentPayload]);
            }, payload, deferred);
            deferred.promise.then(function (result) {
                var record = angular.isArray(result) ? result[0] : result;
                auditDarpe('DARPE_CLINICA_CREATE', {
                    entity: 'darpe_clinicas',
                    record_id: record && record.id,
                    nome_local: payload.nome_local,
                    cidade: payload.cidade
                });
            }, angular.noop);
            return deferred.promise;
        }

        function updateClinica(data) {
            var deferred = $q.defer();
            var payload = AuthService.applyDataScopeToPayload(normalizeClinicaPayload(data), DARPE_CLINICAS_SCOPE);
            runWithMissingColumnRetry(function (currentPayload) {
                return AuthService.applyDataScopeToQuery(
                    supabase.from('darpe_clinicas').update(currentPayload).eq('id', data.id),
                    DARPE_CLINICAS_SCOPE
                );
            }, payload, deferred);
            deferred.promise.then(function () {
                auditDarpe('DARPE_CLINICA_UPDATE', {
                    entity: 'darpe_clinicas',
                    record_id: data.id,
                    nome_local: payload.nome_local,
                    cidade: payload.cidade
                });
            }, angular.noop);
            return deferred.promise;
        }

        function deleteClinica(id) {
            var deferred = $q.defer();
            AuthService.applyDataScopeToQuery(
                supabase.from('darpe_clinicas').delete().eq('id', id),
                DARPE_CLINICAS_SCOPE
            )
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else {
                        auditDarpe('DARPE_CLINICA_DELETE', {
                            entity: 'darpe_clinicas',
                            record_id: id
                        });
                        deferred.resolve(response.data);
                    }
                });
            return deferred.promise;
        }

        function getAtendimentos() {
            var deferred = $q.defer();
            AuthService.applyDataScopeToQuery(
                supabase.from('darpe_atendimentos').select('*'),
                DARPE_ATENDIMENTOS_SCOPE
            ).order('data_atendimento', { ascending: false })
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else deferred.resolve(
                        AuthService.filterCollectionByDataScope(
                            (response.data || []).map(normalizeAtendimentoRecord),
                            DARPE_ATENDIMENTOS_SCOPE
                        )
                    );
                });
            return deferred.promise;
        }

        function saveAtendimento(data) {
            var deferred = $q.defer();
            var payload = AuthService.applyDataScopeToPayload(normalizeAtendimentoPayload(data), DARPE_ATENDIMENTOS_SCOPE);
            runWithMissingColumnRetry(function (currentPayload) {
                return supabase.from('darpe_atendimentos').insert([currentPayload]);
            }, payload, deferred);
            deferred.promise.then(function (result) {
                var record = angular.isArray(result) ? result[0] : result;
                auditDarpe('DARPE_ATENDIMENTO_CREATE', {
                    entity: 'darpe_atendimentos',
                    record_id: record && record.id,
                    local_nome: payload.local_nome,
                    data_atendimento: payload.data_atendimento,
                    quantidade_musicos: payload.quantidade_musicos
                });
            }, angular.noop);
            return deferred.promise;
        }

        function updateAtendimento(data) {
            var deferred = $q.defer();
            var payload = AuthService.applyDataScopeToPayload(normalizeAtendimentoPayload(data), DARPE_ATENDIMENTOS_SCOPE);
            runWithMissingColumnRetry(function (currentPayload) {
                return AuthService.applyDataScopeToQuery(
                    supabase.from('darpe_atendimentos').update(currentPayload).eq('id', data.id),
                    DARPE_ATENDIMENTOS_SCOPE
                );
            }, payload, deferred);
            deferred.promise.then(function () {
                auditDarpe('DARPE_ATENDIMENTO_UPDATE', {
                    entity: 'darpe_atendimentos',
                    record_id: data.id,
                    local_nome: payload.local_nome,
                    data_atendimento: payload.data_atendimento,
                    quantidade_musicos: payload.quantidade_musicos
                });
            }, angular.noop);
            return deferred.promise;
        }

        function deleteAtendimento(id) {
            var deferred = $q.defer();
            AuthService.applyDataScopeToQuery(
                supabase.from('darpe_atendimentos').delete().eq('id', id),
                DARPE_ATENDIMENTOS_SCOPE
            )
                .then(function (response) {
                    if (response.error) deferred.reject(response.error);
                    else {
                        auditDarpe('DARPE_ATENDIMENTO_DELETE', {
                            entity: 'darpe_atendimentos',
                            record_id: id
                        });
                        deferred.resolve(response.data);
                    }
                });
            return deferred.promise;
        }

        function normalizeMusicoPayload(item) {
            var source = angular.copy(item || {});
            var payload = {};

            MUSICO_FIELDS.forEach(function (field) {
                if (Object.prototype.hasOwnProperty.call(source, field)) {
                    payload[field] = source[field];
                }
            });

            payload.data_nascimento = normalizeDateOnly(payload.data_nascimento);

            if (!payload.status) {
                payload.status = 'Ativo';
            }

            if (typeof payload.email === 'string') {
                payload.email = String(payload.email || '').trim().toLowerCase();
            }

            repairRecordStrings(payload);
            applyUppercaseFields(payload, UPPERCASE_FIELDS);
            return payload;
        }

        function normalizeMusicoRecord(item) {
            var record = angular.copy(item || {});

            repairRecordStrings(record);
            applyUppercaseFields(record, UPPERCASE_FIELDS);
            if (typeof record.email === 'string') {
                record.email = String(record.email || '').trim().toLowerCase();
            }
            record.status = record.status || 'Ativo';

            return record;
        }

        function normalizeClinicaPayload(item) {
            var source = angular.copy(item || {});
            var payload = {};

            CLINICA_FIELDS.forEach(function (field) {
                if (Object.prototype.hasOwnProperty.call(source, field)) {
                    payload[field] = source[field];
                }
            });

            if (!payload.status) {
                payload.status = 'Ativo';
            }

            repairRecordStrings(payload);
            applyUppercaseFields(payload, UPPERCASE_FIELDS);
            return payload;
        }

        function normalizeClinicaRecord(item) {
            var record = angular.copy(item || {});

            repairRecordStrings(record);
            applyUppercaseFields(record, UPPERCASE_FIELDS);
            record.status = record.status || 'Ativo';

            return record;
        }

        function normalizeAtendimentoPayload(item) {
            var source = angular.copy(item || {});
            var payload = {};
            var musicosIds = ensureArray(source.musicos_ids || source.musicosSelecionadosIds);
            var musicosNomes = ensureArray(source.musicos_nomes || source.musicosSelecionadosNomes);

            ATENDIMENTO_FIELDS.forEach(function (field) {
                if (Object.prototype.hasOwnProperty.call(source, field)) {
                    payload[field] = source[field];
                }
            });

            payload.data_atendimento = normalizeDateOnly(payload.data_atendimento);
            payload.proxima_visita = normalizeDateOnly(payload.proxima_visita);
            payload.musicos_ids = musicosIds;
            payload.musicos_nomes = musicosNomes.join(', ');
            payload.quantidade_musicos = musicosIds.length;

            if (!payload.status) {
                payload.status = 'Agendado';
            }

            repairRecordStrings(payload);
            applyUppercaseFields(payload, UPPERCASE_FIELDS);
            return payload;
        }

        function normalizeAtendimentoRecord(item) {
            var record = angular.copy(item || {});

            repairRecordStrings(record);
            applyUppercaseFields(record, UPPERCASE_FIELDS);
            record.musicos_ids = ensureArray(record.musicos_ids);
            record.musicos_nomes = record.musicos_nomes || '';
            record.quantidade_musicos = record.quantidade_musicos || record.musicos_ids.length || 0;
            record.status = record.status || 'Agendado';

            return record;
        }

        function extractMissingColumn(error) {
            var message = '';
            var match = null;

            if (!error) return null;

            message = error.message || error.details || error.hint || error.toString() || '';
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
