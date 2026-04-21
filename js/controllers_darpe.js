(function () {
    'use strict';

    /* ==========================================================================
       HELPERS GLOBAIS (Compartilhados entre controladores)
       ========================================================================== */

    function darpeCanManage(user) {
        if (typeof userCanManageSectorCadastros === 'function') { return userCanManageSectorCadastros(user || {}, 'DARPE'); }
        return true;
    }

    function darpeRestrict(message) {
        if (typeof showScopedManagementRestriction === 'function') { showScopedManagementRestriction(message); return; }
        swal('Acesso restrito', message, 'warning');
    }

    function parseDarpeDate(dateStr) {
        if (!dateStr) return null;
        if (angular.isDate(dateStr)) return isNaN(dateStr.getTime()) ? null : new Date(dateStr.getTime());
        if (typeof dateStr === 'string') {
            if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                var parts = dateStr.split('T')[0].split('-');
                return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            }
            if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
                var parts = dateStr.split('/');
                return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            }
        }
        return null;
    }

    function formatDarpeDateInput(value) {
        if (!value) return '';
        if (angular.isDate(value)) {
            if (isNaN(value.getTime())) return '';
            return [('0' + value.getDate()).slice(-2), ('0' + (value.getMonth() + 1)).slice(-2), value.getFullYear()].join('/');
        }
        var parsed = parseDarpeDate(value);
        if (parsed && !isNaN(parsed.getTime())) {
            return [('0' + parsed.getDate()).slice(-2), ('0' + (parsed.getMonth() + 1)).slice(-2), parsed.getFullYear()].join('/');
        }
        return String(value || '');
    }

    function formatDarpePhone(value) {
        var digits = String(value || '').replace(/\D/g, '').slice(0, 11);
        if (!digits) return '';
        var area = digits.slice(0, 2), rest = digits.slice(2);
        if (digits.length <= 2) return '(' + digits;
        if (rest.charAt(0) === '9') {
            if (rest.length <= 5) return '(' + area + ') ' + rest.charAt(0) + ' ' + rest.slice(1);
            return '(' + area + ') ' + rest.charAt(0) + ' ' + rest.slice(1, 5) + '-' + rest.slice(5, 9);
        }
        if (rest.length <= 4) return '(' + area + ') ' + rest;
        return '(' + area + ') ' + rest.slice(0, 4) + '-' + rest.slice(4, 8);
    }

    function normalizeDisplayRecord(item) {
        var record = angular.copy(item || {});
        Object.keys(record).forEach(function (key) {
            if (typeof record[key] === 'string') {
                var value = String(record[key] || '').trim();
                try { if (window.AppUiStandards && typeof window.AppUiStandards.repairText === 'function') { value = window.AppUiStandards.repairText(value); } } catch (e) { }
                record[key] = value;
            }
        });
        return record;
    }

    function showDarpeModal(modalId, $timeout) {
        $timeout(function () {
            var $modal = $(modalId);
            if (typeof window.cleanupBootstrapModalState === 'function') { window.cleanupBootstrapModalState(); }
            $modal.modal('show');
        }, 50);
    }

    function syncAtendimentoSelections(model) {
        if (!model) return;
        model.musicosSelecionadosIds = angular.copy(model.musicos_ids || []);
        var nomes = String(model.musicos_nomes || '');
        model.musicosSelecionadosNomes = nomes ? nomes.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];
    }

    function syncLocalFields(model, clinicas) {
        if (!model || !model.local_id) return;
        var local = (clinicas || []).find(function (c) { return String(c.id) === String(model.local_id); });
        if (local) {
            model.local_nome = local.nome_local;
            model.tipo_local = local.tipo_local;
            model.cidade = local.cidade;
        }
    }

    function nextVisitFromPeriod(dateValue, periodicidade) {
        var date = parseDarpeDate(dateValue);
        if (!date || isNaN(date.getTime())) return '';
        if (periodicidade === 'Semanal') date.setDate(date.getDate() + 7);
        else if (periodicidade === 'Quinzenal') date.setDate(date.getDate() + 14);
        else if (periodicidade === 'Mensal') date.setMonth(date.getMonth() + 1);
        else return '';
        return formatDarpeDateInput(date);
    }

    function normalizeAtendimentoForm(model, musicos, clinicas) {
        model = model || {};
        model.data_atendimento = formatDarpeDateInput(model.data_atendimento);
        model.proxima_visita = formatDarpeDateInput(model.proxima_visita);
        if (!model.proxima_visita && model.data_atendimento && (model.periodicidade || '').indexOf('Eventual') === -1) {
            model.proxima_visita = nextVisitFromPeriod(model.data_atendimento, model.periodicidade);
        }
        syncLocalFields(model, clinicas);
        model.musicos_ids = angular.copy(model.musicosSelecionadosIds || []);
        var selecionados = (musicos || []).filter(function (m) { return model.musicos_ids.indexOf(m.id) !== -1; });
        model.musicosSelecionadosNomes = selecionados.map(function (m) { return m.nome_completo; });
        model.musicos_nomes = model.musicosSelecionadosNomes.join(', ');
        model.quantidade_musicos = model.musicos_ids.length;
    }

    function generateRecurrenceSeries(baseEvent, count) {
        var series = [];
        var currentDate = parseDarpeDate(baseEvent.data_atendimento);
        if (!currentDate || !baseEvent.periodicidade || baseEvent.periodicidade === 'Eventual') return [];

        for (var i = 0; i < count; i++) {
            if (baseEvent.periodicidade === 'Semanal') currentDate.setDate(currentDate.getDate() + 7);
            else if (baseEvent.periodicidade === 'Quinzenal') currentDate.setDate(currentDate.getDate() + 14);
            else if (baseEvent.periodicidade === 'Mensal') currentDate.setMonth(currentDate.getMonth() + 1);
            else break;

            var nextEvent = angular.copy(baseEvent);
            nextEvent.data_atendimento = formatDarpeDateInput(currentDate);
            // Calcula a próxima visita do próximo evento também
            nextEvent.proxima_visita = nextVisitFromPeriod(nextEvent.data_atendimento, baseEvent.periodicidade);
            series.push(nextEvent);
        }
        return series;
    }

    function refreshDarpePermissions($scope, $rootScope) {
        var update = function () { $scope.canManageCadastros = darpeCanManage($rootScope.currentUser || {}); };
        update();
        $scope.$watch(function () { return $rootScope.currentUser; }, update, true);
    }

    /* ==========================================================================
       CONTROLADORES
       ========================================================================== */

    function darpeMusicosCtrl($scope, DarpeService, $timeout, AuthService, $rootScope) {
        $scope.musicos = []; $scope.loading = true; $scope.newMusico = {}; $scope.editingMusico = false; $scope.viewOnly = false;
        refreshDarpePermissions($scope, $rootScope);

        $scope.formatDateField = function (m, f) { $scope[m][f] = formatDarpeDateInput($scope[m][f] || ''); };
        $scope.formatPhoneField = function (m, f) { $scope[m][f] = formatDarpePhone($scope[m][f] || ''); };

        $scope.loadMusicos = function () {
            $scope.loading = true;
            DarpeService.getMusicos().then(function (d) { $scope.musicos = (d || []).map(normalizeDisplayRecord); $scope.loading = false; })
                .catch(function () { $scope.loading = false; $scope.musicos = []; });
        };

        $scope.prepareAdd = function () {
            $scope.newMusico = { status: 'Ativo', apto_atendimentos: 'Sim' };
            $scope.editingMusico = false; $scope.viewOnly = false;
            showDarpeModal('#modalAddMusicoDarpe', $timeout);
        };

        $scope.prepareEdit = function (m) {
            if (!$scope.canManageCadastros) return darpeRestrict('Acesso restrito.');
            $scope.newMusico = angular.copy(m || {});
            $scope.newMusico.data_nascimento = formatDarpeDateInput($scope.newMusico.data_nascimento);
            $scope.newMusico.celular = formatDarpePhone($scope.newMusico.celular);
            $scope.editingMusico = true; $scope.viewOnly = false;
            showDarpeModal('#modalAddMusicoDarpe', $timeout);
        };

        $scope.saveNewMusico = function () {
            if ($scope.viewOnly) return $('#modalAddMusicoDarpe').modal('hide');
            ($scope.editingMusico ? DarpeService.updateMusico($scope.newMusico) : DarpeService.saveMusico($scope.newMusico)).then(function () {
                swal('Sucesso', '', 'success'); $('#modalAddMusicoDarpe').modal('hide'); $scope.loadMusicos();
            }).catch(function (e) { swal('Erro', e.message || e, 'error'); });
        };

        $scope.confirmDelete = function (m) {
            if (!$scope.canManageCadastros) return darpeRestrict('Acesso restrito.');
            swal({ title: 'Excluir?', type: 'warning', showCancelButton: true }, function () {
                DarpeService.deleteMusico(m.id).then(function () { $scope.loadMusicos(); swal('Removido', '', 'success'); });
            });
        };

        $scope.loadMusicos();
    }

    function darpeClinicasCtrl($scope, DarpeService, $timeout, $rootScope) {
        $scope.clinicas = []; $scope.loading = true; $scope.newClinica = {}; $scope.editingClinica = false; $scope.viewOnly = false;
        refreshDarpePermissions($scope, $rootScope);

        $scope.loadClinicas = function () {
            $scope.loading = true;
            DarpeService.getClinicas().then(function (d) { $scope.clinicas = (d || []).map(normalizeDisplayRecord); $scope.loading = false; })
                .catch(function () { $scope.loading = false; $scope.clinicas = []; });
        };

        $scope.prepareAdd = function () {
            $scope.newClinica = { status: 'Ativo', tipo_local: 'Clínica', periodicidade_preferencial: 'Quinzenal' };
            $scope.editingClinica = false; $scope.viewOnly = false;
            showDarpeModal('#modalAddClinicaDarpe', $timeout);
        };

        $scope.prepareEdit = function (c) {
            if (!$scope.canManageCadastros) return darpeRestrict('Acesso restrito.');
            $scope.newClinica = angular.copy(c || {});
            $scope.editingClinica = true; $scope.viewOnly = false;
            showDarpeModal('#modalAddClinicaDarpe', $timeout);
        };

        $scope.saveNewClinica = function () {
            ($scope.editingClinica ? DarpeService.updateClinica($scope.newClinica) : DarpeService.saveClinica($scope.newClinica)).then(function () {
                swal('Sucesso', '', 'success'); $('#modalAddClinicaDarpe').modal('hide'); $scope.loadClinicas();
            }).catch(function (e) { swal('Erro', e.message || e, 'error'); });
        };

        $scope.loadClinicas();
    }

    function darpeAtendimentosCtrl($scope, DarpeService, $timeout, $rootScope) {
        $scope.atendimentos = []; $scope.musicos = []; $scope.clinicas = []; $scope.loading = true; $scope.currentAtendimento = {};
        $scope.editingAtendimento = false; $scope.viewOnly = false;
        refreshDarpePermissions($scope, $rootScope);

        $scope.formatDateField = function (m, f) { $scope[m][f] = formatDarpeDateInput($scope[m][f] || ''); };

        $scope.loadData = function () {
            $scope.loading = true;
            return Promise.all([DarpeService.getAtendimentos(), DarpeService.getMusicos(), DarpeService.getClinicas()]).then(function (res) {
                $scope.$applyAsync(function () {
                    $scope.atendimentos = (res[0] || []).map(normalizeDisplayRecord);
                    $scope.musicos = (res[1] || []).map(normalizeDisplayRecord).filter(function (m) { return (m.status || 'Ativo') === 'Ativo'; });
                    $scope.clinicas = (res[2] || []).map(normalizeDisplayRecord).filter(function (c) { return (c.status || 'Ativo') === 'Ativo'; });
                    $scope.loading = false;
                });
            }).catch(function () { $scope.$applyAsync(function () { $scope.loading = false; }); });
        };

        $scope.isMusicoSelected = function (id) { return ($scope.currentAtendimento.musicosSelecionadosIds || []).indexOf(id) !== -1; };
        $scope.toggleMusicoSelection = function (id) {
            $scope.currentAtendimento.musicosSelecionadosIds = $scope.currentAtendimento.musicosSelecionadosIds || [];
            var idx = $scope.currentAtendimento.musicosSelecionadosIds.indexOf(id);
            if (idx === -1) $scope.currentAtendimento.musicosSelecionadosIds.push(id);
            else $scope.currentAtendimento.musicosSelecionadosIds.splice(idx, 1);
            normalizeAtendimentoForm($scope.currentAtendimento, $scope.musicos, $scope.clinicas);
        };

        $scope.handleLocalChange = function () { syncLocalFields($scope.currentAtendimento, $scope.clinicas); };

        $scope.prepareAdd = function () {
            $scope.currentAtendimento = { status: 'Agendado', periodicidade: 'Quinzenal', musicosSelecionadosIds: [] };
            $scope.editingAtendimento = false; $scope.viewOnly = false;
            showDarpeModal('#modalAddAtendimentoDarpe', $timeout);
        };

        $scope.prepareEdit = function (item) {
            if (!$scope.canManageCadastros) return darpeRestrict('Acesso restrito.');
            $scope.currentAtendimento = angular.copy(item || {});
            $scope.currentAtendimento.data_atendimento = formatDarpeDateInput($scope.currentAtendimento.data_atendimento);
            $scope.currentAtendimento.proxima_visita = formatDarpeDateInput($scope.currentAtendimento.proxima_visita);
            syncAtendimentoSelections($scope.currentAtendimento);
            $scope.editingAtendimento = true; $scope.viewOnly = false;
            showDarpeModal('#modalAddAtendimentoDarpe', $timeout);
        };

        $scope.saveAtendimento = function () {
            if ($scope.viewOnly) return $('#modalAddAtendimentoDarpe').modal('hide');
            normalizeAtendimentoForm($scope.currentAtendimento, $scope.musicos, $scope.clinicas);
            
            if ($scope.editingAtendimento) {
                DarpeService.updateAtendimento($scope.currentAtendimento).then(function () {
                    swal('Sucesso', '', 'success'); $('#modalAddAtendimentoDarpe').modal('hide'); $scope.loadData();
                }).catch(function (e) { swal('Erro', e.message || e, 'error'); });
            } else {
                // Novo atendimento - criar série recorrente
                var series = generateRecurrenceSeries($scope.currentAtendimento, 4);
                var promises = [DarpeService.saveAtendimento($scope.currentAtendimento)];
                series.forEach(function (occ) { promises.push(DarpeService.saveAtendimento(occ)); });

                Promise.all(promises).then(function () {
                    swal('Sucesso', 'Série de agendamentos criada.', 'success'); 
                    $('#modalAddAtendimentoDarpe').modal('hide'); 
                    $scope.loadData();
                }).catch(function (e) { swal('Erro ao criar série', e.message || e, 'error'); });
            }
        };

        $scope.loadData();
    }

    function darpeDashboardCtrl($scope, DarpeService) {
        $scope.loading = true; $scope.dashboard = { totalMusicos: 0, musicosAtivos: 0, locaisAtivos: 0, totalAtendimentos: 0, proximaAgenda: [] };
        Promise.all([DarpeService.getMusicos(), DarpeService.getClinicas(), DarpeService.getAtendimentos()]).then(function (res) {
            $scope.$applyAsync(function () {
                var mus = res[0] || [], cli = res[1] || [], ate = res[2] || [];
                $scope.dashboard.totalMusicos = mus.length;
                $scope.dashboard.musicosAtivos = mus.filter(function (m) { return (m.status || 'Ativo') === 'Ativo'; }).length;
                $scope.dashboard.locaisAtivos = cli.filter(function (c) { return (c.status || 'Ativo') === 'Ativo'; }).length;
                $scope.dashboard.totalAtendimentos = ate.length;
                $scope.dashboard.proximaAgenda = ate.slice(0, 5);
                $scope.loading = false;
            });
        }).catch(function () { $scope.$applyAsync(function () { $scope.loading = false; }); });
    }

    function darpeBatismosCtrl($scope, DarpeService, $timeout, $rootScope) {
        $scope.batismos = []; $scope.loading = true; $scope.newBatismo = {};
        refreshDarpePermissions($scope, $rootScope);
        $scope.loadBatismos = function () {
            DarpeService.getBatismos().then(function (d) { $scope.batismos = (d || []).map(normalizeDisplayRecord); $scope.loading = false; });
        };
        $scope.prepareAdd = function () { $scope.newBatismo = { data_batismo: formatDarpeDateInput(new Date()) }; showDarpeModal('#modalAddBatismoDarpe', $timeout); };
        $scope.saveBatismo = function () {
            DarpeService.saveBatismo($scope.newBatismo).then(function () { swal('Sucesso', '', 'success'); $('#modalAddBatismoDarpe').modal('hide'); $scope.loadBatismos(); });
        };
        $scope.loadBatismos();
    }

    function darpeDashboardConsolidadoCtrl($scope, DarpeService, VisitasService) {
        $scope.loading = true; $scope.stats = { totalBatismos: 0, visitas: { totalGeral: 0 } };
        $scope.init = function () {
            Promise.all([DarpeService.getBatismos(), VisitasService.getLancamentos()]).then(function (res) {
                $scope.$applyAsync(function () {
                    $scope.stats.totalBatismos = (res[0] || []).length;
                    $scope.loading = false;
                });
            });
        };
        $scope.init();
    }

    function darpeCalendarioCtrl($scope, DarpeService, $timeout, $rootScope, uiCalendarConfig) {
        $scope.loading = true; if (window.moment) moment.locale('pt-br'); refreshDarpePermissions($scope, $rootScope);
        $scope.atendimentos = []; $scope.musicos = []; $scope.clinicas = []; $scope.currentAtendimento = {};
        $scope.eventSources = [];

        $scope.formatDateField = function (m, f) { $scope[m][f] = formatDarpeDateInput($scope[m][f] || ''); };

        function initializeExternalEvents() {
            $timeout(function() {
                $('#external-events .external-event').each(function() {
                    $(this).data('event', { title: $.trim($(this).text()), stick: true, sector_id: $(this).data('sector-id') });
                    if ($(this).data('ui-draggable')) $(this).draggable('destroy');
                    $(this).draggable({ zIndex: 999, revert: true, revertDuration: 0 });
                });
            }, 500);
        }

        $scope.uiConfig = {
            calendar: {
                height: 700, editable: true, droppable: true,
                header: { left: 'prev,next today', center: 'title', right: 'month,agendaWeek,agendaDay' },
                eventClick: function(e) { $scope.prepareEdit(e.originalData); },
                dayClick: function(d) { $scope.prepareAdd(d); },
                eventReceive: function(e) {
                    var cal = uiCalendarConfig.calendars['darpeCalendar'];
                    if (cal) cal.fullCalendar('removeEvents', e._id || e.id);
                    $scope.$apply(function() { $scope.prepareAdd(e.start, e.sector_id || $(e.el).data('sector-id')); });
                }
            }
        };

        function mapToCalendarEvents(data) {
            var sc = { 'SETOR 1': 'sector-1', 'SETOR 2': 'sector-2', 'SETOR 3': 'sector-3', 'SETOR 4': 'sector-4' };
            return data.map(function(item) {
                var d = parseDarpeDate(item.data_atendimento); if (!d) return null;
                var sk = (item.setor || '').split(' - ')[0];
                return { id: item.id, title: (item.local_nome || 'Local') + ' (' + (item.musicos_nomes || '') + ')', start: d, allDay: true, className: [sc[sk] || '', 'status-' + (item.status || 'agendado').toLowerCase()], originalData: item };
            }).filter(Boolean);
        }

        $scope.loadData = function () {
            $scope.loading = true;
            return Promise.all([DarpeService.getAtendimentos(), DarpeService.getMusicos(), DarpeService.getClinicas()]).then(function (res) {
                $scope.$applyAsync(function () {
                    $scope.atendimentos = (res[0] || []).map(normalizeDisplayRecord);
                    $scope.musicos = (res[1] || []).map(normalizeDisplayRecord).filter(function(m) { return (m.status || 'Ativo') === 'Ativo'; });
                    $scope.clinicas = (res[2] || []).map(normalizeDisplayRecord).filter(function(c) { return (c.status || 'Ativo') === 'Ativo'; });
                    $scope.eventSources.length = 0; $scope.eventSources.push(mapToCalendarEvents($scope.atendimentos));
                    $scope.loading = false; initializeExternalEvents();
                });
            }).catch(function () { $scope.$applyAsync(function () { $scope.loading = false; }); });
        };

        $scope.isMusicoSelected = function (id) { return ($scope.currentAtendimento.musicosSelecionadosIds || []).indexOf(id) > -1; };
        $scope.toggleMusicoSelection = function (id) {
            $scope.currentAtendimento.musicosSelecionadosIds = $scope.currentAtendimento.musicosSelecionadosIds || [];
            var idx = $scope.currentAtendimento.musicosSelecionadosIds.indexOf(id);
            if (idx > -1) $scope.currentAtendimento.musicosSelecionadosIds.splice(idx, 1);
            else $scope.currentAtendimento.musicosSelecionadosIds.push(id);
            normalizeAtendimentoForm($scope.currentAtendimento, $scope.musicos, $scope.clinicas);
        };
        $scope.handleLocalChange = function () { syncLocalFields($scope.currentAtendimento, $scope.clinicas); };

        $scope.prepareAdd = function (date) {
            if (!$scope.canManageCadastros) return darpeRestrict('Acesso restrito.');
            $scope.currentAtendimento = { status: 'Agendado', periodicidade: 'Quinzenal', musicosSelecionadosIds: [], data_atendimento: formatDarpeDateInput(date || new Date()) };
            $scope.editingAtendimento = false; $scope.viewOnly = false; showDarpeModal('#modalAddAtendimentoDarpe', $timeout);
        };

        $scope.prepareEdit = function (item) {
            if (!$scope.canManageCadastros) return darpeRestrict('Acesso restrito.');
            $scope.currentAtendimento = angular.copy(item || {});
            $scope.currentAtendimento.data_atendimento = formatDarpeDateInput($scope.currentAtendimento.data_atendimento);
            $scope.currentAtendimento.proxima_visita = formatDarpeDateInput($scope.currentAtendimento.proxima_visita);
            syncAtendimentoSelections($scope.currentAtendimento);
            $scope.editingAtendimento = true; $scope.viewOnly = false; showDarpeModal('#modalAddAtendimentoDarpe', $timeout);
        };

        $scope.saveAtendimento = function () {
            normalizeAtendimentoForm($scope.currentAtendimento, $scope.musicos, $scope.clinicas);
            if ($scope.editingAtendimento) {
                DarpeService.updateAtendimento($scope.currentAtendimento).then(function () {
                    swal('Sucesso', '', 'success'); $('#modalAddAtendimentoDarpe').modal('hide'); $scope.loadData();
                }).catch(function (e) { swal('Erro', e.message || e, 'error'); });
            } else {
                var series = generateRecurrenceSeries($scope.currentAtendimento, 4);
                var promises = [DarpeService.saveAtendimento($scope.currentAtendimento)];
                series.forEach(function (occ) { promises.push(DarpeService.saveAtendimento(occ)); });
                Promise.all(promises).then(function () {
                    swal('Sucesso', 'Eventos criados.', 'success'); $('#modalAddAtendimentoDarpe').modal('hide'); $scope.loadData();
                }).catch(function (e) { swal('Erro', e.message || e, 'error'); });
            }
        };
        $scope.loadData();
    }

    angular.module('inspinia')
        .controller('darpeMusicosCtrl', darpeMusicosCtrl)
        .controller('darpeClinicasCtrl', darpeClinicasCtrl)
        .controller('darpeAtendimentosCtrl', darpeAtendimentosCtrl)
        .controller('darpeDashboardCtrl', darpeDashboardCtrl)
        .controller('darpeBatismosCtrl', darpeBatismosCtrl)
        .controller('darpeDashboardConsolidadoCtrl', darpeDashboardConsolidadoCtrl)
        .controller('darpeCalendarioCtrl', darpeCalendarioCtrl);

})();
