(function () {
    'use strict';

    angular.module('inspinia')
        .factory('VisitasService', VisitasService);

    VisitasService.$inject = ['$q', 'AuthService'];

    function VisitasService($q, AuthService) {
        var SUPABASE_URL = 'https://sqamxlhfazulrisiptud.supabase.co';
        var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYW14bGhmYXp1bHJpc2lwdHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzU4ODQsImV4cCI6MjA4Mjk1MTg4NH0.UmshkDqIgJQYVMmWVVgmfQm-YacUbRBeSpmYsNG0baE';
        var supabase = window.__appSupabaseClient
            || (window.__appSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
        var monthLabels = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        return {
            getLancamentos: getLancamentos,
            saveLancamento: saveLancamento,
            updateLancamento: updateLancamento,
            deleteLancamento: deleteLancamento,
            getAgenda: getAgenda,
            getVisitados: getVisitados,
            saveVisitado: saveVisitado,
            updateVisitado: updateVisitado,
            deleteVisitado: deleteVisitado,
            getGrupos: getGrupos,
            saveGrupo: saveGrupo,
            updateGrupo: updateGrupo,
            deleteGrupo: deleteGrupo
        };

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

        function normalizeInteger(value) {
            var parsed = parseInt(value, 10);
            return isNaN(parsed) || parsed < 0 ? 0 : parsed;
        }

        function formatLocalDateOnly(value) {
            if (!(value instanceof Date) || isNaN(value.getTime())) {
                return null;
            }

            return value.getFullYear() + '-' +
                String(value.getMonth() + 1).padStart(2, '0') + '-' +
                String(value.getDate()).padStart(2, '0');
        }

        function normalizeDateOnly(value) {
            var date;

            if (!value) return null;

            if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
                return formatLocalDateOnly(value);
            }

            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                return value;
            }

            date = new Date(value);
            if (isNaN(date.getTime())) return null;
            return formatLocalDateOnly(date);
        }

        function getMesNumero(value) {
            var month = normalizeInteger(value);
            var index;
            var normalizedValue = repairTextValue(String(value || '')).toLowerCase();

            if (month >= 1 && month <= 12) {
                return month;
            }

            for (index = 0; index < monthLabels.length; index += 1) {
                if (repairTextValue(monthLabels[index]).toLowerCase() === normalizedValue) {
                    return index + 1;
                }
            }

            return new Date().getMonth() + 1;
        }

        function getMesLabel(value) {
            return monthLabels[Math.max(1, Math.min(12, normalizeInteger(value))) - 1] || '';
        }

        function buildFriendlyError(error, fallbackMessage) {
            var message = repairTextValue((error && (error.message || error.error_description || error.details)) || fallbackMessage || 'Erro inesperado.');
            var lower = String(message || '').toLowerCase();

            if (lower.indexOf('visitas_lancamentos') !== -1 && (
                lower.indexOf('does not exist') !== -1 ||
                lower.indexOf('could not find the table') !== -1
            )) {
                return {
                    code: 'schema_missing',
                    message: 'A tabela public.visitas_lancamentos ainda nao existe no Supabase. Rode o arquivo visitas_schema.sql antes de usar o modulo.'
                };
            }

            if (lower.indexOf('visitas_irmandade') !== -1 && (
                lower.indexOf('does not exist') !== -1 ||
                lower.indexOf('could not find the table') !== -1 ||
                lower.indexOf('schema cache') !== -1
            )) {
                return {
                    code: 'schema_missing',
                    message: 'A tabela public.visitas_irmandade nao esta disponivel no Supabase. O cadastro de visitados depende dessa tabela existente do modulo de Visitas.'
                };
            }

            if (lower.indexOf('visitas_grupos') !== -1 && (
                lower.indexOf('does not exist') !== -1 ||
                lower.indexOf('could not find the table') !== -1 ||
                lower.indexOf('schema cache') !== -1
            )) {
                return {
                    code: 'schema_missing',
                    message: 'A tabela public.visitas_grupos ainda nao foi aplicada no Supabase. Rode apenas a migration isolada visitas_grupos_schema.sql para habilitar o cadastro de grupos.'
                };
            }

            if (lower.indexOf('duplicate key') !== -1 || lower.indexOf('unique') !== -1) {
                return {
                    code: 'duplicate',
                    message: 'Ja existe um registro com esses dados principais. Revise os campos e tente novamente.'
                };
            }

            return {
                code: (error && error.code) || 'unknown',
                message: message
            };
        }

        function auditVisitas(action, entity, details) {
            if (!AuthService || typeof AuthService.logAudit !== 'function') {
                return;
            }

            AuthService.logAudit(null, action, 'VISITAS', angular.extend({
                entity: entity
            }, details || {})).catch(angular.noop);
        }

        function normalizeLancamentoRecord(record) {
            var normalized = angular.extend({}, record || {});

            normalized.comum = repairTextValue(normalized.comum);
            normalized.municipio = repairTextValue(normalized.municipio);
            normalized.codigo_comum = repairTextValue(normalized.codigo_comum);
            normalized.observacoes = repairTextValue(normalized.observacoes);
            normalized.status = repairTextValue(normalized.status);
            normalized.mes = getMesLabel(normalized.referencia_mes);
            normalized.ano = normalizeInteger(normalized.referencia_ano);
            normalized.data = normalized.data_lancamento;
            normalized.igreja = normalized.comum;
            normalized.musicos = normalizeInteger(normalized.gvmu);
            normalized.total = normalizeInteger(normalized.total_visitas) || (
                normalizeInteger(normalized.gvi) +
                normalizeInteger(normalized.gvm) +
                normalizeInteger(normalized.gvmu) +
                normalizeInteger(normalized.rf) +
                normalizeInteger(normalized.re)
            );
            normalized.gvi = normalizeInteger(normalized.gvi);
            normalized.gvm = normalizeInteger(normalized.gvm);
            normalized.rf = normalizeInteger(normalized.rf);
            normalized.re = normalizeInteger(normalized.re);

            return normalized;
        }

        function normalizeLancamentoPayload(input) {
            var payload = angular.copy(input || {});
            var referenciaAno = normalizeInteger(payload.referencia_ano || payload.ano);
            var referenciaMes = getMesNumero(payload.referencia_mes || payload.mes);

            return {
                data_lancamento: normalizeDateOnly(payload.data_lancamento || payload.data) || formatLocalDateOnly(new Date()),
                referencia_ano: referenciaAno || new Date().getFullYear(),
                referencia_mes: referenciaMes,
                municipio: repairTextValue(payload.municipio || ''),
                comum: repairTextValue(payload.comum || payload.igreja || ''),
                codigo_comum: repairTextValue(payload.codigo_comum || payload.codigo || ''),
                gvi: normalizeInteger(payload.gvi),
                gvm: normalizeInteger(payload.gvm),
                gvmu: normalizeInteger(payload.gvmu != null ? payload.gvmu : payload.musicos),
                rf: normalizeInteger(payload.rf),
                re: normalizeInteger(payload.re),
                status: repairTextValue(payload.status || 'Lancado'),
                observacoes: repairTextValue(payload.observacoes || '')
            };
        }

        function normalizeGrupoRecord(record) {
            var normalized = angular.extend({}, record || {});

            normalized.nome = repairTextValue(normalized.nome);
            normalized.municipio = repairTextValue(normalized.municipio);
            normalized.comum_base = repairTextValue(normalized.comum_base);
            normalized.codigo_comum = repairTextValue(normalized.codigo_comum);
            normalized.lider_nome = repairTextValue(normalized.lider_nome);
            normalized.lider_telefone = repairTextValue(normalized.lider_telefone);
            normalized.dia_visita = repairTextValue(normalized.dia_visita);
            normalized.periodicidade = repairTextValue(normalized.periodicidade);
            normalized.status = repairTextValue(normalized.status || 'Ativo');
            normalized.observacoes = repairTextValue(normalized.observacoes);
            normalized.capacidade = normalizeInteger(normalized.capacidade);

            return normalized;
        }

        function normalizeGrupoPayload(input) {
            var payload = angular.copy(input || {});

            return {
                nome: repairTextValue(payload.nome || ''),
                municipio: repairTextValue(payload.municipio || ''),
                comum_base: repairTextValue(payload.comum_base || ''),
                codigo_comum: repairTextValue(payload.codigo_comum || ''),
                lider_nome: repairTextValue(payload.lider_nome || ''),
                lider_telefone: repairTextValue(payload.lider_telefone || ''),
                dia_visita: repairTextValue(payload.dia_visita || ''),
                periodicidade: repairTextValue(payload.periodicidade || 'Semanal'),
                capacidade: normalizeInteger(payload.capacidade),
                status: repairTextValue(payload.status || 'Ativo'),
                observacoes: repairTextValue(payload.observacoes || '')
            };
        }

        function normalizeAgendaRecord(record) {
            var normalized = angular.extend({}, record || {});

            normalized.titulo = repairTextValue(normalized.titulo);
            normalized.categoria = repairTextValue(normalized.categoria);
            normalized.status = repairTextValue(normalized.status || 'Agendada');
            normalized.equipe_responsavel = repairTextValue(normalized.equipe_responsavel);
            normalized.setor = repairTextValue(normalized.setor);
            normalized.motivo_cancelamento = repairTextValue(normalized.motivo_cancelamento);
            normalized.observacoes = repairTextValue(normalized.observacoes);
            normalized.endereco_visitado = repairTextValue(normalized.endereco_visitado);
            normalized.data_inicio = normalized.data_inicio || null;
            normalized.data_fim = normalized.data_fim || null;

            return normalized;
        }

        function normalizeVisitadoRecord(record) {
            var normalized = angular.extend({}, record || {});

            normalized.nome = repairTextValue(normalized.nome);
            normalized.categoria = repairTextValue(normalized.categoria);
            normalized.sexo = normalized.categoria;
            normalized.municipio = repairTextValue(normalized.municipio);
            normalized.comum = repairTextValue(normalized.comum);
            normalized.codigo_comum = repairTextValue(normalized.codigo_comum);
            normalized.familia = repairTextValue(normalized.familia);
            normalized.referencia_geografica = repairTextValue(normalized.referencia_geografica);
            normalized.bairro = normalized.referencia_geografica;
            normalized.endereco = repairTextValue(normalized.endereco);
            normalized.telefone = repairTextValue(normalized.telefone);
            normalized.grupo_id = null;
            normalized.grupo_nome = '';
            normalized.status = repairTextValue(normalized.status || 'Ativo');
            normalized.frequencia_visita = repairTextValue(normalized.frequencia_visita);
            normalized.data_nascimento = normalizeDateOnly(normalized.data_nascimento);
            normalized.data_inicio_acompanhamento = normalizeDateOnly(normalized.data_cadastro || normalized.created_at);
            normalized.ultima_visita = normalizeDateOnly(normalized.ultima_visita);
            normalized.observacoes = repairTextValue(normalized.observacoes);

            return normalized;
        }

        function normalizeVisitadoPayload(input) {
            var payload = angular.copy(input || {});

            return {
                nome: repairTextValue(payload.nome || ''),
                comum: repairTextValue(payload.comum || ''),
                codigo_comum: repairTextValue(payload.codigo_comum || ''),
                familia: repairTextValue(payload.familia || ''),
                categoria: repairTextValue(payload.categoria || payload.sexo || ''),
                endereco: repairTextValue(payload.endereco || ''),
                telefone: repairTextValue(payload.telefone || ''),
                referencia_geografica: repairTextValue(payload.referencia_geografica || payload.bairro || ''),
                status: repairTextValue(payload.status || 'Ativo'),
                frequencia_visita: repairTextValue(payload.frequencia_visita || ''),
                data_nascimento: normalizeDateOnly(payload.data_nascimento),
                ultima_visita: normalizeDateOnly(payload.ultima_visita),
                observacoes: repairTextValue(payload.observacoes || '')
            };
        }

        function executeOrderedSelect(tableName, orderSteps, normalizeFn, fallbackMessage) {
            var deferred = $q.defer();
            var query = supabase.from(tableName).select('*');

            (orderSteps || []).forEach(function (step) {
                query = query.order(step.column, { ascending: step.ascending });
            });

            query.then(function (response) {
                if (response.error) {
                    deferred.reject(buildFriendlyError(response.error, fallbackMessage));
                    return;
                }

                deferred.resolve((response.data || []).map(normalizeFn));
            }).catch(function (error) {
                deferred.reject(buildFriendlyError(error, fallbackMessage));
            });

            return deferred.promise;
        }

        function saveRecord(tableName, payload, normalizeFn, action, entity, fallbackMessage, detailsBuilder) {
            var deferred = $q.defer();

            supabase
                .from(tableName)
                .insert([payload])
                .select('*')
                .single()
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(buildFriendlyError(response.error, fallbackMessage));
                        return;
                    }

                    auditVisitas(action, entity, angular.extend({
                        record_id: response.data && response.data.id
                    }, detailsBuilder ? detailsBuilder(payload, response.data) : {}));
                    deferred.resolve(normalizeFn(response.data));
                }).catch(function (error) {
                    deferred.reject(buildFriendlyError(error, fallbackMessage));
                });

            return deferred.promise;
        }

        function updateRecord(tableName, id, payload, normalizeFn, action, entity, missingIdMessage, fallbackMessage, detailsBuilder) {
            var deferred = $q.defer();

            if (!id) {
                deferred.reject({ code: 'missing_id', message: missingIdMessage });
                return deferred.promise;
            }

            supabase
                .from(tableName)
                .update(payload)
                .eq('id', id)
                .select('*')
                .single()
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(buildFriendlyError(response.error, fallbackMessage));
                        return;
                    }

                    auditVisitas(action, entity, angular.extend({
                        record_id: id
                    }, detailsBuilder ? detailsBuilder(payload, response.data) : {}));
                    deferred.resolve(normalizeFn(response.data));
                }).catch(function (error) {
                    deferred.reject(buildFriendlyError(error, fallbackMessage));
                });

            return deferred.promise;
        }

        function deleteRecord(tableName, id, action, entity, missingIdMessage, fallbackMessage) {
            var deferred = $q.defer();

            if (!id) {
                deferred.reject({ code: 'missing_id', message: missingIdMessage });
                return deferred.promise;
            }

            supabase
                .from(tableName)
                .delete()
                .eq('id', id)
                .then(function (response) {
                    if (response.error) {
                        deferred.reject(buildFriendlyError(response.error, fallbackMessage));
                        return;
                    }

                    auditVisitas(action, entity, {
                        record_id: id
                    });
                    deferred.resolve(response.data);
                }).catch(function (error) {
                    deferred.reject(buildFriendlyError(error, fallbackMessage));
                });

            return deferred.promise;
        }

        function getLancamentos() {
            return executeOrderedSelect('visitas_lancamentos', [
                { column: 'referencia_ano', ascending: false },
                { column: 'referencia_mes', ascending: false },
                { column: 'municipio', ascending: true },
                { column: 'comum', ascending: true }
            ], normalizeLancamentoRecord, 'Erro ao carregar lancamentos de visitas.');
        }

        function getAgenda() {
            return executeOrderedSelect('visitas_agenda', [
                { column: 'data_inicio', ascending: false },
                { column: 'titulo', ascending: true }
            ], normalizeAgendaRecord, 'Erro ao carregar agenda de visitas.');
        }

        function saveLancamento(data) {
            var payload = normalizeLancamentoPayload(data);

            return saveRecord(
                'visitas_lancamentos',
                payload,
                normalizeLancamentoRecord,
                'VISITAS_LANCAMENTO_CREATE',
                'visitas_lancamentos',
                'Erro ao salvar lancamento.',
                function () {
                    return {
                        comum: payload.comum,
                        municipio: payload.municipio,
                        referencia_ano: payload.referencia_ano,
                        referencia_mes: payload.referencia_mes,
                        total_visitas: payload.gvi + payload.gvm + payload.gvmu + payload.rf + payload.re
                    };
                }
            );
        }

        function updateLancamento(data) {
            var payload = normalizeLancamentoPayload(data);
            return updateRecord(
                'visitas_lancamentos',
                data && data.id,
                payload,
                normalizeLancamentoRecord,
                'VISITAS_LANCAMENTO_UPDATE',
                'visitas_lancamentos',
                'ID do lancamento nao informado.',
                'Erro ao atualizar lancamento.',
                function () {
                    return {
                        comum: payload.comum,
                        municipio: payload.municipio,
                        referencia_ano: payload.referencia_ano,
                        referencia_mes: payload.referencia_mes,
                        total_visitas: payload.gvi + payload.gvm + payload.gvmu + payload.rf + payload.re
                    };
                }
            );
        }

        function deleteLancamento(id) {
            return deleteRecord(
                'visitas_lancamentos',
                id,
                'VISITAS_LANCAMENTO_DELETE',
                'visitas_lancamentos',
                'ID do lancamento nao informado.',
                'Erro ao excluir lancamento.'
            );
        }

        function getVisitados() {
            return executeOrderedSelect('visitas_irmandade', [
                { column: 'status', ascending: true },
                { column: 'comum', ascending: true },
                { column: 'nome', ascending: true }
            ], normalizeVisitadoRecord, 'Erro ao carregar visitados.');
        }

        function saveVisitado(data) {
            var payload = normalizeVisitadoPayload(data);

            return saveRecord(
                'visitas_irmandade',
                payload,
                normalizeVisitadoRecord,
                'VISITAS_VISITADO_CREATE',
                'visitas_irmandade',
                'Erro ao salvar visitado.',
                function () {
                    return {
                        nome: payload.nome,
                        comum: payload.comum,
                        categoria: payload.categoria
                    };
                }
            );
        }

        function updateVisitado(data) {
            var payload = normalizeVisitadoPayload(data);

            return updateRecord(
                'visitas_irmandade',
                data && data.id,
                payload,
                normalizeVisitadoRecord,
                'VISITAS_VISITADO_UPDATE',
                'visitas_irmandade',
                'ID do visitado nao informado.',
                'Erro ao atualizar visitado.',
                function () {
                    return {
                        nome: payload.nome,
                        comum: payload.comum,
                        categoria: payload.categoria
                    };
                }
            );
        }

        function deleteVisitado(id) {
            return deleteRecord(
                'visitas_irmandade',
                id,
                'VISITAS_VISITADO_DELETE',
                'visitas_irmandade',
                'ID do visitado nao informado.',
                'Erro ao excluir visitado.'
            );
        }

        function getGrupos() {
            return executeOrderedSelect('visitas_grupos', [
                { column: 'status', ascending: true },
                { column: 'municipio', ascending: true },
                { column: 'nome', ascending: true }
            ], normalizeGrupoRecord, 'Erro ao carregar grupos de visita.');
        }

        function saveGrupo(data) {
            var payload = normalizeGrupoPayload(data);

            return saveRecord(
                'visitas_grupos',
                payload,
                normalizeGrupoRecord,
                'VISITAS_GRUPO_CREATE',
                'visitas_grupos',
                'Erro ao salvar grupo de visita.',
                function () {
                    return {
                        nome: payload.nome,
                        municipio: payload.municipio,
                        lider_nome: payload.lider_nome
                    };
                }
            );
        }

        function updateGrupo(data) {
            var payload = normalizeGrupoPayload(data);

            return updateRecord(
                'visitas_grupos',
                data && data.id,
                payload,
                normalizeGrupoRecord,
                'VISITAS_GRUPO_UPDATE',
                'visitas_grupos',
                'ID do grupo nao informado.',
                'Erro ao atualizar grupo de visita.',
                function () {
                    return {
                        nome: payload.nome,
                        municipio: payload.municipio,
                        lider_nome: payload.lider_nome
                    };
                }
            );
        }

        function deleteGrupo(id) {
            return deleteRecord(
                'visitas_grupos',
                id,
                'VISITAS_GRUPO_DELETE',
                'visitas_grupos',
                'ID do grupo nao informado.',
                'Erro ao excluir grupo de visita.'
            );
        }
    }
})();
