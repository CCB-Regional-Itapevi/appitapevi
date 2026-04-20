(function () {
    'use strict';

    function darpeCanManage(user) {
        if (typeof userCanManageSectorCadastros === 'function') {
            return userCanManageSectorCadastros(user || {}, 'DARPE');
        }
        return true;
    }

    function darpeRestrict(message) {
        if (typeof showScopedManagementRestriction === 'function') {
            showScopedManagementRestriction(message);
            return;
        }
        swal('Acesso restrito', message, 'warning');
    }

    function parseDarpeDate(dateStr) {
        var parts = null;

        if (!dateStr) return null;
        if (angular.isDate(dateStr)) return isNaN(dateStr.getTime()) ? null : new Date(dateStr.getTime());

        if (typeof dateStr === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            parts = dateStr.split('/');
            return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }

        if (typeof dateStr === 'string' && dateStr.indexOf('-') !== -1) {
            parts = dateStr.split('T')[0].split('-');
            if (parts.length === 3) {
                return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            }
        }

        return null;
    }

    function formatDarpeDateInput(value) {
        var parsed = parseDarpeDate(value);
        var digits = String(value || '').replace(/\D/g, '').slice(0, 8);
        var parts = [];

        if (parsed && !isNaN(parsed.getTime()) && typeof value === 'string' && value.indexOf('-') !== -1) {
            return [
                ('0' + parsed.getDate()).slice(-2),
                ('0' + (parsed.getMonth() + 1)).slice(-2),
                parsed.getFullYear()
            ].join('/');
        }

        if (digits.length >= 2) {
            parts.push(digits.slice(0, 2));
        } else if (digits.length) {
            parts.push(digits);
        }

        if (digits.length >= 4) {
            parts.push(digits.slice(2, 4));
        } else if (digits.length > 2) {
            parts.push(digits.slice(2));
        }

        if (digits.length > 4) {
            parts.push(digits.slice(4, 8));
        }

        return parts.join('/');
    }

    function formatDarpePhone(value) {
        var digits = String(value || '').replace(/\D/g, '').slice(0, 11);
        var area = digits.slice(0, 2);
        var rest = digits.slice(2);

        if (!digits) return '';
        if (digits.length <= 2) return '(' + digits;

        if (rest.charAt(0) === '9') {
            if (rest.length <= 1) return '(' + area + ') ' + rest;
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
                
                try {
                    if (window.AppUiStandards && typeof window.AppUiStandards.repairText === 'function') {
                        value = window.AppUiStandards.repairText(value);
                    }
                } catch (e) {
                    console.warn('Display text repair failed for key:', key, e);
                }

                record[key] = value;
            }
        });

        return record;
    }

    function showDarpeModal(modalId, $timeout) {
        $timeout(function () {
            var $modal = $(modalId);

            if (typeof window.cleanupBootstrapModalState === 'function') {
                window.cleanupBootstrapModalState();
            }

            $modal.off('shown.bs.modal.darpe hidden.bs.modal.darpe');
            $modal.on('shown.bs.modal.darpe', function () {
                var $currentModal = $(this);
                $currentModal.attr('aria-hidden', 'false');

                $timeout(function () {
                    var $focusTarget = $currentModal.find('input, select, textarea, button')
                        .filter(':visible:not([disabled])')
                        .first();

                    if ($focusTarget && $focusTarget.length) {
                        $focusTarget.trigger('focus');
                    }
                }, 0);
            });

            $modal.on('hidden.bs.modal.darpe', function () {
                $(this).attr('aria-hidden', 'true');
                if (typeof window.cleanupBootstrapModalState === 'function') {
                    window.cleanupBootstrapModalState();
                }
            });

            if (!$modal.parent().is('body')) {
                $modal.appendTo('body');
            }

            $modal.modal('show');
        }, 0);
    }

    function resolveDarpeCidade(scope, values) {
        if (typeof resolveMunicipioFromCatalog === 'function') {
            return resolveMunicipioFromCatalog(scope.comumCatalogState, values) || '';
        }
        return '';
    }

    function nextVisitFromPeriod(dateValue, periodicidade) {
        var date = parseDarpeDate(dateValue);

        if (!date || isNaN(date.getTime())) return '';

        if (periodicidade === 'Semanal') {
            date.setDate(date.getDate() + 7);
        } else if (periodicidade === 'Quinzenal') {
            date.setDate(date.getDate() + 14);
        } else if (periodicidade === 'Mensal') {
            date.setMonth(date.getMonth() + 1);
        } else {
            return '';
        }

        return formatDarpeDateInput(date);
    }

    function refreshDarpePermissions($scope, $rootScope) {
        function updateManagementPermission() {
            $scope.canManageCadastros = darpeCanManage($rootScope.currentUser || {});
        }

        updateManagementPermission();
        $scope.$watch(function () {
            return $rootScope.currentUser;
        }, updateManagementPermission, true);
    }

    function darpeMusicosCtrl($scope, DarpeService, $timeout, AuthService, $rootScope) {
        $scope.musicos = [];
        $scope.loading = true;
        $scope.searchText = '';
        $scope.newMusico = {};
        $scope.editingMusico = false;
        $scope.viewOnly = false;
        $scope.canManageCadastros = false;

        if (typeof configureCadastroMusicForm === 'function') {
            configureCadastroMusicForm($scope, 'newMusico', AuthService);
        }
        refreshDarpePermissions($scope, $rootScope);

        $scope.formatDateField = function (modelName, fieldName) {
            if (!modelName || !fieldName) return;
            $scope[modelName] = $scope[modelName] || {};
            $scope[modelName][fieldName] = formatDarpeDateInput((($scope[modelName] || {})[fieldName]) || '');
        };

        $scope.formatPhoneField = function (modelName, fieldName) {
            if (!modelName || !fieldName) return;
            $scope[modelName] = $scope[modelName] || {};
            $scope[modelName][fieldName] = formatDarpePhone((($scope[modelName] || {})[fieldName]) || '');
        };

        $scope.loadMusicos = function () {
            $scope.loading = true;
            DarpeService.getMusicos().then(function (data) {
                $scope.musicos = (data || []).map(normalizeDisplayRecord);
                $scope.loading = false;
            }).catch(function () {
                $scope.loading = false;
                $scope.musicos = [];
            });
        };

        $scope.prepareAdd = function () {
            $scope.newMusico = {
                status: 'Ativo',
                apto_atendimentos: 'Sim'
            };
            $scope.editingMusico = false;
            $scope.viewOnly = false;
            if (typeof configureCadastroMusicForm === 'function') {
                configureCadastroMusicForm($scope, 'newMusico', AuthService);
            }
            showDarpeModal('#modalAddMusicoDarpe', $timeout);
        };

        $scope.prepareEdit = function (musico) {
            if (!$scope.canManageCadastros) {
                darpeRestrict('Somente coordenadores do DARPE, admin ou master podem editar cadastros.');
                return;
            }

            $scope.newMusico = angular.copy(musico || {});
            $scope.newMusico.data_nascimento = formatDarpeDateInput($scope.newMusico.data_nascimento || '');
            $scope.newMusico.celular = formatDarpePhone($scope.newMusico.celular || '');
            $scope.editingMusico = true;
            $scope.viewOnly = false;
            if (typeof configureCadastroMusicForm === 'function') {
                configureCadastroMusicForm($scope, 'newMusico', AuthService);
            }
            showDarpeModal('#modalAddMusicoDarpe', $timeout);
        };

        $scope.verDetalhes = function (musico) {
            $scope.newMusico = angular.copy(musico || {});
            $scope.newMusico.data_nascimento = formatDarpeDateInput($scope.newMusico.data_nascimento || '');
            $scope.newMusico.celular = formatDarpePhone($scope.newMusico.celular || '');
            $scope.editingMusico = false;
            $scope.viewOnly = true;
            if (typeof configureCadastroMusicForm === 'function') {
                configureCadastroMusicForm($scope, 'newMusico', AuthService);
            }
            showDarpeModal('#modalAddMusicoDarpe', $timeout);
        };

        $scope.saveNewMusico = function () {
            if ($scope.viewOnly) {
                $('#modalAddMusicoDarpe').modal('hide');
                return;
            }

            if ($scope.formAddMusicoDarpe && $scope.formAddMusicoDarpe.$invalid) {
                $scope.formAddMusicoDarpe.$setSubmitted();
                swal('Campos obrigatórios', 'Preencha os campos obrigatórios para salvar o músico.', 'warning');
                return;
            }

            if ($scope.editingMusico && !$scope.canManageCadastros) {
                darpeRestrict('Somente coordenadores do DARPE, admin ou master podem salvar alterações.');
                return;
            }

            $scope.newMusico.data_nascimento = formatDarpeDateInput($scope.newMusico.data_nascimento || '');
            $scope.newMusico.celular = formatDarpePhone($scope.newMusico.celular || '');
            $scope.newMusico.cidade = resolveDarpeCidade($scope, [
                $scope.newMusico.cidade,
                $scope.newMusico.comum_congregacao
            ]) || $scope.newMusico.cidade || '';

            ($scope.editingMusico ? DarpeService.updateMusico($scope.newMusico) : DarpeService.saveMusico($scope.newMusico)).then(function () {
                swal({
                    title: 'Sucesso',
                    text: $scope.editingMusico ? 'Músico atualizado com sucesso.' : 'Músico cadastrado com sucesso.',
                    type: 'success',
                    timer: 3000,
                    showConfirmButton: false
                });
                $timeout(function () {
                    $('#modalAddMusicoDarpe').modal('hide');
                    $scope.loadMusicos();
                }, 3000);
            }).catch(function (error) {
                swal('Erro', 'Erro ao salvar cadastro: ' + (error.message || error), 'error');
            });
        };

        $scope.confirmDelete = function (musico) {
            if (!$scope.canManageCadastros) {
                darpeRestrict('Somente coordenadores do DARPE, admin ou master podem excluir cadastros.');
                return;
            }

            swal({
                title: 'Remover Músico?',
                text: 'Deseja excluir o cadastro de ' + (musico.nome_completo || '') + '?',
                type: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sim, excluir!',
                closeOnConfirm: false
            }, function () {
                DarpeService.deleteMusico(musico.id).then(function () {
                    swal('Removido!', 'Músico removido com sucesso.', 'success');
                    $scope.loadMusicos();
                });
            });
        };

        $scope.loadMusicos();
    }

    function darpeClinicasCtrl($scope, DarpeService, $timeout, $rootScope) {
        $scope.clinicas = [];
        $scope.loading = true;
        $scope.searchText = '';
        $scope.newClinica = {};
        $scope.editingClinica = false;
        $scope.viewOnly = false;
        $scope.canManageCadastros = false;

        refreshDarpePermissions($scope, $rootScope);

        $scope.formatPhoneField = function (modelName, fieldName) {
            if (!modelName || !fieldName) return;
            $scope[modelName] = $scope[modelName] || {};
            $scope[modelName][fieldName] = formatDarpePhone((($scope[modelName] || {})[fieldName]) || '');
        };

        $scope.loadClinicas = function () {
            $scope.loading = true;
            DarpeService.getClinicas().then(function (data) {
                $scope.clinicas = (data || []).map(normalizeDisplayRecord);
                $scope.loading = false;
            }).catch(function () {
                $scope.loading = false;
                $scope.clinicas = [];
            });
        };

        $scope.prepareAdd = function () {
            $scope.newClinica = {
                status: 'Ativo',
                tipo_local: 'Clínica',
                periodicidade_preferencial: 'Quinzenal'
            };
            $scope.editingClinica = false;
            $scope.viewOnly = false;
            showDarpeModal('#modalAddClinicaDarpe', $timeout);
        };

        $scope.prepareEdit = function (clinica) {
            if (!$scope.canManageCadastros) {
                darpeRestrict('Somente coordenadores do DARPE, admin ou master podem editar locais.');
                return;
            }

            $scope.newClinica = angular.copy(clinica || {});
            $scope.newClinica.telefone_contato = formatDarpePhone($scope.newClinica.telefone_contato || '');
            $scope.editingClinica = true;
            $scope.viewOnly = false;
            showDarpeModal('#modalAddClinicaDarpe', $timeout);
        };

        $scope.verDetalhes = function (clinica) {
            $scope.newClinica = angular.copy(clinica || {});
            $scope.newClinica.telefone_contato = formatDarpePhone($scope.newClinica.telefone_contato || '');
            $scope.editingClinica = false;
            $scope.viewOnly = true;
            showDarpeModal('#modalAddClinicaDarpe', $timeout);
        };

        $scope.saveNewClinica = function () {
            if ($scope.viewOnly) {
                $('#modalAddClinicaDarpe').modal('hide');
                return;
            }

            if ($scope.formAddClinicaDarpe && $scope.formAddClinicaDarpe.$invalid) {
                $scope.formAddClinicaDarpe.$setSubmitted();
                swal('Campos obrigatórios', 'Preencha os campos obrigatórios para salvar o local de atendimento.', 'warning');
                return;
            }

            if ($scope.editingClinica && !$scope.canManageCadastros) {
                darpeRestrict('Somente coordenadores do DARPE, admin ou master podem salvar alterações.');
                return;
            }

            $scope.newClinica.telefone_contato = formatDarpePhone($scope.newClinica.telefone_contato || '');

            ($scope.editingClinica ? DarpeService.updateClinica($scope.newClinica) : DarpeService.saveClinica($scope.newClinica)).then(function () {
                swal({
                    title: 'Sucesso',
                    text: $scope.editingClinica ? 'Local atualizado com sucesso.' : 'Local cadastrado com sucesso.',
                    type: 'success',
                    timer: 3000,
                    showConfirmButton: false
                });
                $timeout(function () {
                    $('#modalAddClinicaDarpe').modal('hide');
                    $scope.loadClinicas();
                }, 3000);
            }).catch(function (error) {
                swal('Erro', 'Erro ao salvar cadastro: ' + (error.message || error), 'error');
            });
        };

        $scope.confirmDelete = function (clinica) {
            if (!$scope.canManageCadastros) {
                darpeRestrict('Somente coordenadores do DARPE, admin ou master podem excluir locais.');
                return;
            }

            swal({
                title: 'Remover Local?',
                text: 'Deseja excluir o cadastro de ' + (clinica.nome_local || '') + '?',
                type: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sim, excluir!',
                closeOnConfirm: false
            }, function () {
                DarpeService.deleteClinica(clinica.id).then(function () {
                    swal('Removido!', 'Local removido com sucesso.', 'success');
                    $scope.loadClinicas();
                });
            });
        };

        $scope.loadClinicas();
    }

    function darpeAtendimentosCtrl($scope, DarpeService, $timeout, $rootScope) {
        $scope.atendimentos = [];
        $scope.musicos = [];
        $scope.clinicas = [];
        $scope.loading = true;
        $scope.searchText = '';
        $scope.currentAtendimento = {};
        $scope.editingAtendimento = false;
        $scope.viewOnly = false;
        $scope.canManageCadastros = false;

        refreshDarpePermissions($scope, $rootScope);

        $scope.formatDateField = function (modelName, fieldName) {
            if (!modelName || !fieldName) return;
            $scope[modelName] = $scope[modelName] || {};
            $scope[modelName][fieldName] = formatDarpeDateInput((($scope[modelName] || {})[fieldName]) || '');
        };

        function syncAtendimentoSelections(model) {
            var selectedIds = angular.copy((model && model.musicos_ids) || []);
            var selectedMusicos = ($scope.musicos || []).filter(function (musico) {
                return selectedIds.indexOf(musico.id) !== -1;
            });

            model.musicosSelecionadosIds = selectedIds;
            model.musicosSelecionadosNomes = selectedMusicos.map(function (musico) {
                return musico.nome_completo;
            });
        }

        function syncLocalFields(model) {
            var local = null;

            ($scope.clinicas || []).some(function (item) {
                if (String(item.id) === String(model.local_id || '')) {
                    local = item;
                    return true;
                }
                return false;
            });

            if (!local) return;

            model.local_nome = local.nome_local;
            model.tipo_local = local.tipo_local;
            model.cidade = local.cidade;
        }

        function normalizeAtendimentoForm(model) {
            model = model || {};
            model.data_atendimento = formatDarpeDateInput(model.data_atendimento || '');
            model.proxima_visita = formatDarpeDateInput(model.proxima_visita || '');

            if (!model.proxima_visita && model.data_atendimento && model.periodicidade) {
                model.proxima_visita = nextVisitFromPeriod(model.data_atendimento, model.periodicidade);
            }

            syncLocalFields(model);
            model.musicos_ids = angular.copy(model.musicosSelecionadosIds || []);
            model.musicosSelecionadosNomes = ($scope.musicos || []).filter(function (musico) {
                return model.musicos_ids.indexOf(musico.id) !== -1;
            }).map(function (musico) {
                return musico.nome_completo;
            });
            model.musicos_nomes = model.musicosSelecionadosNomes.join(', ');
            model.quantidade_musicos = model.musicos_ids.length;
        }

        $scope.toggleMusicoSelection = function (musicoId) {
            var index = -1;

            $scope.currentAtendimento.musicosSelecionadosIds = $scope.currentAtendimento.musicosSelecionadosIds || [];
            index = $scope.currentAtendimento.musicosSelecionadosIds.indexOf(musicoId);

            if (index === -1) {
                $scope.currentAtendimento.musicosSelecionadosIds.push(musicoId);
            } else {
                $scope.currentAtendimento.musicosSelecionadosIds.splice(index, 1);
            }

            normalizeAtendimentoForm($scope.currentAtendimento);
        };

        $scope.isMusicoSelected = function (musicoId) {
            var selected = ($scope.currentAtendimento && $scope.currentAtendimento.musicosSelecionadosIds) || [];
            return selected.indexOf(musicoId) !== -1;
        };

        $scope.handleLocalChange = function () {
            syncLocalFields($scope.currentAtendimento);
        };

        $scope.loadData = function () {
            $scope.loading = true;

            return Promise.all([
                DarpeService.getAtendimentos(),
                DarpeService.getMusicos(),
                DarpeService.getClinicas()
            ]).then(function (results) {
                $scope.$applyAsync(function () {
                    $scope.atendimentos = (results[0] || []).map(normalizeDisplayRecord);
                    $scope.musicos = (results[1] || []).map(normalizeDisplayRecord).filter(function (item) {
                        return (item.status || 'Ativo') === 'Ativo';
                    });
                    $scope.clinicas = (results[2] || []).map(normalizeDisplayRecord).filter(function (item) {
                        return (item.status || 'Ativo') === 'Ativo';
                    });
                    $scope.loading = false;
                });
            }).catch(function () {
                $scope.$applyAsync(function () {
                    $scope.loading = false;
                });
            });
        };

        $scope.prepareAdd = function () {
            $scope.currentAtendimento = {
                status: 'Agendado',
                periodicidade: 'Quinzenal',
                musicosSelecionadosIds: []
            };
            $scope.editingAtendimento = false;
            $scope.viewOnly = false;
            showDarpeModal('#modalAddAtendimentoDarpe', $timeout);
        };

        $scope.prepareEdit = function (item) {
            if (!$scope.canManageCadastros) {
                darpeRestrict('Somente coordenadores do DARPE, admin ou master podem editar atendimentos.');
                return;
            }

            $scope.currentAtendimento = angular.copy(item || {});
            $scope.currentAtendimento.data_atendimento = formatDarpeDateInput($scope.currentAtendimento.data_atendimento || '');
            $scope.currentAtendimento.proxima_visita = formatDarpeDateInput($scope.currentAtendimento.proxima_visita || '');
            syncAtendimentoSelections($scope.currentAtendimento);
            $scope.editingAtendimento = true;
            $scope.viewOnly = false;
            showDarpeModal('#modalAddAtendimentoDarpe', $timeout);
        };

        $scope.verDetalhes = function (item) {
            $scope.currentAtendimento = angular.copy(item || {});
            $scope.currentAtendimento.data_atendimento = formatDarpeDateInput($scope.currentAtendimento.data_atendimento || '');
            $scope.currentAtendimento.proxima_visita = formatDarpeDateInput($scope.currentAtendimento.proxima_visita || '');
            syncAtendimentoSelections($scope.currentAtendimento);
            $scope.editingAtendimento = false;
            $scope.viewOnly = true;
            showDarpeModal('#modalAddAtendimentoDarpe', $timeout);
        };

        $scope.saveAtendimento = function () {
            if ($scope.viewOnly) {
                $('#modalAddAtendimentoDarpe').modal('hide');
                return;
            }

            if ($scope.formAddAtendimentoDarpe && $scope.formAddAtendimentoDarpe.$invalid) {
                $scope.formAddAtendimentoDarpe.$setSubmitted();
                swal('Campos obrigatórios', 'Preencha os campos obrigatórios para salvar o atendimento.', 'warning');
                return;
            }

            if ($scope.editingAtendimento && !$scope.canManageCadastros) {
                darpeRestrict('Somente coordenadores do DARPE, admin ou master podem salvar alterações.');
                return;
            }

            normalizeAtendimentoForm($scope.currentAtendimento);

            if (!$scope.currentAtendimento.musicos_ids.length) {
                swal('Selecione os músicos', 'Escolha pelo menos um músico para este atendimento.', 'warning');
                return;
            }

            ($scope.editingAtendimento ? DarpeService.updateAtendimento($scope.currentAtendimento) : DarpeService.saveAtendimento($scope.currentAtendimento)).then(function () {
                swal({
                    title: 'Sucesso',
                    text: $scope.editingAtendimento ? 'Atendimento atualizado com sucesso.' : 'Atendimento cadastrado com sucesso.',
                    type: 'success',
                    timer: 3000,
                    showConfirmButton: false
                });
                $timeout(function () {
                    $('#modalAddAtendimentoDarpe').modal('hide');
                    $scope.loadData();
                }, 3000);
            }).catch(function (error) {
                swal('Erro', 'Erro ao salvar atendimento: ' + (error.message || error), 'error');
            });
        };

        $scope.confirmDelete = function (item) {
            if (!$scope.canManageCadastros) {
                darpeRestrict('Somente coordenadores do DARPE, admin ou master podem excluir atendimentos.');
                return;
            }

            swal({
                title: 'Remover Atendimento?',
                text: 'Deseja excluir o atendimento em ' + (item.local_nome || '') + '?',
                type: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sim, excluir!',
                closeOnConfirm: false
            }, function () {
                DarpeService.deleteAtendimento(item.id).then(function () {
                    swal('Removido!', 'Atendimento removido com sucesso.', 'success');
                    $scope.loadData();
                });
            });
        };

        $scope.loadData();
    }


    function darpeDashboardCtrl($scope, DarpeService) {
        $scope.loading = true;
        $scope.dashboard = {
            totalMusicos: 0,
            musicosAtivos: 0,
            locaisAtivos: 0,
            totalAtendimentos: 0,
            realizados: 0,
            agendados: 0,
            semanais: 0,
            quinzenais: 0,
            proximaAgenda: [],
            cidades: [],
            locaisRanking: []
        };

        function normalizeDateForCompare(value) {
            var date = parseDarpeDate(value);
            if (!date || isNaN(date.getTime())) return null;
            date.setHours(0, 0, 0, 0);
            return date;
        }

        function buildDashboard(musicos, clinicas, atendimentos) {
            var today = new Date();
            var month = today.getMonth();
            var year = today.getFullYear();
            var cityMap = {};
            var localMap = {};
            today.setHours(0, 0, 0, 0);

            atendimentos.forEach(function (item) {
                var itemDate = normalizeDateForCompare(item.data_atendimento);
                var cityKey = (item.cidade || 'SEM CIDADE').toUpperCase();
                var localKey = item.local_nome || 'SEM LOCAL';

                if (!cityMap[cityKey]) {
                    cityMap[cityKey] = { cidade: item.cidade || 'Sem cidade', total: 0, realizados: 0, agendados: 0 };
                }
                if (!localMap[localKey]) {
                    localMap[localKey] = { local: localKey, total: 0, cidade: item.cidade || '-' };
                }

                cityMap[cityKey].total += 1;
                localMap[localKey].total += 1;

                if ((item.status || '').toUpperCase() === 'REALIZADO') cityMap[cityKey].realizados += 1;
                else if ((item.status || '').toUpperCase() === 'AGENDADO') cityMap[cityKey].agendados += 1;

                if (itemDate && itemDate >= today) $scope.dashboard.proximaAgenda.push(item);
            });

            $scope.dashboard.totalMusicos = musicos.length;
            $scope.dashboard.musicosAtivos = musicos.filter(function (item) { return (item.status || 'Ativo') === 'Ativo'; }).length;
            $scope.dashboard.locaisAtivos = clinicas.filter(function (item) { return (item.status || 'Ativo') === 'Ativo'; }).length;
            $scope.dashboard.totalAtendimentos = atendimentos.length;
            $scope.dashboard.realizados = atendimentos.filter(function (item) { return (item.status || '').toUpperCase() === 'REALIZADO'; }).length;
            $scope.dashboard.agendados = atendimentos.filter(function (item) { return (item.status || '').toUpperCase() === 'AGENDADO'; }).length;
            
            $scope.dashboard.cidades = Object.keys(cityMap).map(function (key) { return cityMap[key]; }).sort(function (a, b) { return b.total - a.total; });
            $scope.dashboard.locaisRanking = Object.keys(localMap).map(function (key) { return localMap[key]; }).sort(function (a, b) { return b.total - a.total; }).slice(0, 8);
        }

        Promise.all([
            DarpeService.getMusicos(),
            DarpeService.getClinicas(),
            DarpeService.getAtendimentos()
        ]).then(function (results) {
            $scope.$applyAsync(function () {
                buildDashboard(results[0], results[1], results[2]);
                $scope.loading = false;
            });
        }).catch(function () {
            $scope.$applyAsync(function () { $scope.loading = false; });
        });
    }

    function darpeBatismosCtrl($scope, DarpeService, $timeout, AuthService, $rootScope) {
        $scope.batismos = [];
        $scope.loading = true;
        $scope.searchText = '';
        $scope.newBatismo = {};
        $scope.editingBatismo = false;
        $scope.viewOnly = false;
        $scope.canManageCadastros = false;
        $scope.setores = [
            'SETOR 1 - Sistemas de Ressocialização e Socioeducativos',
            'SETOR 2 - Clínica de Dependentes e Albergues',
            'SETOR 3 - Forças de Segurança',
            'SETOR 4 - Hospitais, Instituição para Idosos, Setor Educacional'
        ];

        refreshDarpePermissions($scope, $rootScope);

        $scope.formatDateField = function (modelName, fieldName) {
            if (!modelName || !fieldName) return;
            $scope[modelName] = $scope[modelName] || {};
            $scope[modelName][fieldName] = formatDarpeDateInput((($scope[modelName] || {})[fieldName]) || '');
        };

        $scope.loadBatismos = function () {
            $scope.loading = true;
            DarpeService.getBatismos().then(function (data) {
                $scope.batismos = (data || []).map(normalizeDisplayRecord);
                $scope.loading = false;
            }).catch(function () {
                $scope.loading = false;
                $scope.batismos = [];
            });
        };

        $scope.prepareAdd = function () {
            $scope.newBatismo = {
                data_batismo: formatDarpeDateInput(new Date())
            };
            $scope.editingBatismo = false;
            $scope.viewOnly = false;
            showDarpeModal('#modalAddBatismoDarpe', $timeout);
        };

        $scope.prepareEdit = function (batismo) {
            if (!$scope.canManageCadastros) {
                darpeRestrict('Somente coordenadores do DARPE, admin ou master podem editar cadastros.');
                return;
            }

            $scope.newBatismo = angular.copy(batismo || {});
            $scope.newBatismo.data_batismo = formatDarpeDateInput($scope.newBatismo.data_batismo || '');
            $scope.editingBatismo = true;
            $scope.viewOnly = false;
            showDarpeModal('#modalAddBatismoDarpe', $timeout);
        };

        $scope.verDetalhes = function (batismo) {
            $scope.newBatismo = angular.copy(batismo || {});
            $scope.newBatismo.data_batismo = formatDarpeDateInput($scope.newBatismo.data_batismo || '');
            $scope.editingBatismo = false;
            $scope.viewOnly = true;
            showDarpeModal('#modalAddBatismoDarpe', $timeout);
        };

        $scope.saveBatismo = function () {
            if ($scope.viewOnly) {
                $('#modalAddBatismoDarpe').modal('hide');
                return;
            }

            if ($scope.formAddBatismoDarpe && $scope.formAddBatismoDarpe.$invalid) {
                $scope.formAddBatismoDarpe.$setSubmitted();
                swal('Campos obrigatórios', 'Preencha os campos obrigatórios para salvar o registro.', 'warning');
                return;
            }

            if ($scope.editingBatismo && !$scope.canManageCadastros) {
                darpeRestrict('Somente coordenadores do DARPE, admin ou master podem salvar alterações.');
                return;
            }

            ($scope.editingBatismo ? DarpeService.updateBatismo($scope.newBatismo) : DarpeService.saveBatismo($scope.newBatismo)).then(function () {
                swal({
                    title: 'Sucesso',
                    text: $scope.editingBatismo ? 'Registro atualizado com sucesso.' : 'Batismo registrado com sucesso.',
                    type: 'success',
                    timer: 2500,
                    showConfirmButton: false
                });
                $timeout(function () {
                    $('#modalAddBatismoDarpe').modal('hide');
                    $scope.loadBatismos();
                }, 2500);
            }).catch(function (error) {
                swal('Erro', 'Erro ao salvar registro: ' + (error.message || error), 'error');
            });
        };

        $scope.confirmDelete = function (batismo) {
            if (!$scope.canManageCadastros) {
                darpeRestrict('Somente coordenadores do DARPE, admin ou master podem excluir registros.');
                return;
            }

            swal({
                title: 'Remover Registro?',
                text: 'Deseja excluir o registro de ' + (batismo.nome_batizado || '') + '?',
                type: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sim, excluir!',
                closeOnConfirm: false
            }, function () {
                DarpeService.deleteBatismo(batismo.id).then(function () {
                    swal('Removido!', 'Registro removido com sucesso.', 'success');
                    $scope.loadBatismos();
                });
            });
        };

        $scope.loadBatismos();
    }

    function darpeDashboardConsolidadoCtrl($scope, DarpeService, VisitasService, $timeout) {
        $scope.loading = true;
        $scope.stats = {
            totalBatismos: 0,
            batismosPorSetor: {},
            evolucaoMes: [],
            visitas: { totalGeral: 0, tendencia: 'up' },
            darpe: { musicosAtivos: 0, clinicasAtendidas: 0, agendamentosFuturos: 0 },
            recentes: []
        };

        function processStats(musicos, clinicas, atendimentos, batismos, visitasLancamentos) {
            var sectorStats = {};
            var monthlyVisits = {};
            var monthlyBaptisms = {};
            var currentMonth = new Date().getMonth();
            var currentYear = new Date().getFullYear();
            var today = new Date();
            today.setHours(0, 0, 0, 0);

            // Batismos por Setor
            batismos.forEach(function (b) {
                var s = b.setor || 'NÃO INFORMADO';
                sectorStats[s] = (sectorStats[s] || 0) + 1;
                
                var d = parseDarpeDate(b.data_batismo);
                if (d) {
                    var key = d.getFullYear() + '-' + (d.getMonth() + 1);
                    monthlyBaptisms[key] = (monthlyBaptisms[key] || 0) + 1;
                }
            });

            // Visitas por Mês (Consolidação de lançamentos)
            visitasLancamentos.forEach(function (v) {
                var key = v.referencia_ano + '-' + v.referencia_mes;
                var totalVisitas = (v.gvi || 0) + (v.gvm || 0) + (v.gvmu || 0) + (v.rf || 0) + (v.re || 0);
                monthlyVisits[key] = (monthlyVisits[key] || 0) + totalVisitas;
            });

            // Evolução Combinada (últimos 6 meses)
            var evolution = [];
            for (var i = 5; i >= 0; i--) {
                var targetDate = new Date(currentYear, currentMonth - i, 1);
                var m = targetDate.getMonth() + 1;
                var y = targetDate.getFullYear();
                var key = y + '-' + m;
                
                evolution.push({
                    mes: m + '/' + y,
                    visitas: monthlyVisits[key] || 0,
                    batismos: monthlyBaptisms[key] || 0
                });
            }

            $scope.stats.totalBatismos = batismos.length;
            $scope.stats.batismosPorSetor = sectorStats;
            $scope.stats.evolucaoMes = evolution;
            
            $scope.stats.visitas.totalGeral = Object.values(monthlyVisits).reduce(function(a, b) { return a + b; }, 0);
            
            $scope.stats.darpe.musicosAtivos = musicos.filter(function(m) { return m.status === 'Ativo'; }).length;
            $scope.stats.darpe.clinicasAtendidas = clinicas.filter(function(c) { return c.status === 'Ativo'; }).length;
            
            $scope.stats.darpe.agendamentosFuturos = atendimentos.filter(function(a) { 
                var d = parseDarpeDate(a.data_atendimento);
                return d && d >= today && (a.status || '').toUpperCase() === 'AGENDADO';
            }).length;

            $scope.stats.recentes = atendimentos.slice(0, 5);
        }

        $scope.init = function () {
            $scope.loading = true;
            Promise.all([
                DarpeService.getMusicos(),
                DarpeService.getClinicas(),
                DarpeService.getAtendimentos(),
                DarpeService.getBatismos(),
                VisitasService.getLancamentos()
            ]).then(function (results) {
                $scope.$applyAsync(function () {
                    processStats(
                        results[0], results[1], results[2], results[3],
                        results[4]
                    );
                    $scope.loading = false;
                });
            }).catch(function (error) {
                console.error('Erro ao carregar dados do dashboard DARPE:', error);
                $scope.$applyAsync(function () { $scope.loading = false; });
            });
        };

        $scope.init();
    }

    function darpeCalendarioCtrl($scope, DarpeService, $timeout, $rootScope, uiCalendarConfig) {
        $scope.loading = true;
        if (window.moment) moment.locale('pt-br');
        refreshDarpePermissions($scope, $rootScope);
        
        $scope.atendimentos = [];
        $scope.musicos = [];
        $scope.clinicas = [];
        $scope.currentAtendimento = {};
        
        // Modal State
        $scope.editingAtendimento = false;
        $scope.viewOnly = false;

        $scope.formatDateField = function (modelName, fieldName) {
            if (!modelName || !fieldName) return;
            $scope[modelName] = $scope[modelName] || {};
            $scope[modelName][fieldName] = formatDarpeDateInput((($scope[modelName] || {})[fieldName]) || '');
        };

        // Calendário Config
        $scope.uiConfig = {
            calendar: {
                height: 700,
                editable: true,
                header: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'month,agendaWeek,agendaDay'
                },
                lang: 'pt-br',
                locale: 'pt-br',
                timezone: 'local',
                monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
                monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
                dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
                dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
                buttonText: {
                    today: 'Hoje',
                    month: 'Mês',
                    week: 'Semana',
                    day: 'Dia'
                },
                editable: true,
                droppable: true,
                eventStartEditable: true,
                eventDurationEditable: true,
                eventClick: function(event) {
                    $scope.prepareEdit(event.originalData);
                },
                eventDrop: function(event, delta, revertFunc) {
                    updateEventDate(event, revertFunc);
                },
                eventResize: function(event, delta, revertFunc) {
                    updateEventDate(event, revertFunc);
                }
            }
        };

        function updateEventDate(event, revertFunc) {
            var original = event.originalData;
            var newDate = event.start.toDate();
            
            // Fix timezone / format
            var formattedDate = moment(newDate).format('YYYY-MM-DD');
            
            var payload = angular.copy(original);
            payload.data_atendimento = formattedDate;

            DarpeService.updateAtendimento(payload).then(function() {
                toastr.success('Atendimento reagendado para ' + moment(newDate).format('DD/MM/YYYY'));
                $scope.loadData();
            }).catch(function(err) {
                if (revertFunc) revertFunc();
                swal('Erro ao atualizar', err.message || 'Erro inesperado', 'error');
            });
        }

        function mapToCalendarEvents(data) {
            return data.map(function(item) {
                var d = parseDarpeDate(item.data_atendimento);
                if (!d) return null;

                // Sector Mapping (Matching dashboard colors)
                var sectorClasses = {
                    'SETOR 1': 'sector-1',
                    'SETOR 2': 'sector-2',
                    'SETOR 3': 'sector-3',
                    'SETOR 4': 'sector-4'
                };
                
                var sectorKey = (item.setor || '').split(' - ')[0];
                var sectorClass = sectorClasses[sectorKey] || '';

                // Status Mapping
                var statusClass = 'status-' + (item.status || 'agendado').toLowerCase();

                return {
                    id: item.id,
                    title: (item.local_nome || 'Local não informado'),
                    start: d,
                    allDay: true,
                    className: [sectorClass, statusClass],
                    originalData: item
                };
            }).filter(function(e) { return e !== null; });
        }

        $scope.eventSources = [];

        $scope.loadData = function () {
            $scope.loading = true;
            Promise.all([
                DarpeService.getAtendimentos(),
                DarpeService.getMusicos(),
                DarpeService.getClinicas()
            ]).then(function (results) {
                $scope.$applyAsync(function () {
                    var rawAtendimentos = results[0] || [];
                    $scope.atendimentos = rawAtendimentos.map(normalizeDisplayRecord);
                    $scope.musicos = (results[1] || []).map(normalizeDisplayRecord).filter(function(m) { return m.status === 'Ativo'; });
                    $scope.clinicas = (results[2] || []).map(normalizeDisplayRecord).filter(function(c) { return c.status === 'Ativo'; });
                    
                    var events = mapToCalendarEvents($scope.atendimentos);
                    $scope.eventSources.length = 0;
                    $scope.eventSources.push(events);
                    
                    $scope.loading = false;
                });
            }).catch(function (error) {
                console.error('Erro ao carregar calendário DARPE:', error);
                $scope.$applyAsync(function () { $scope.loading = false; });
            });
        };

        // Modal Helpers (Replicated from darpeAtendimentosCtrl for scope independence)
        $scope.isMusicoSelected = function (id) {
            return ($scope.currentAtendimento.musicos_ids || []).indexOf(id) > -1;
        };

        $scope.toggleMusicoSelection = function (id) {
            $scope.currentAtendimento.musicos_ids = $scope.currentAtendimento.musicos_ids || [];
            var idx = $scope.currentAtendimento.musicos_ids.indexOf(id);
            if (idx > -1) $scope.currentAtendimento.musicos_ids.splice(idx, 1);
            else $scope.currentAtendimento.musicos_ids.push(id);
        };

        $scope.handleLocalChange = function () {
            var localId = $scope.currentAtendimento.local_id;
            var local = $scope.clinicas.find(function (c) { return c.id == localId; });
            if (local) {
                $scope.currentAtendimento.local_nome = local.nome_local;
                $scope.currentAtendimento.tipo_local = local.tipo;
                $scope.currentAtendimento.cidade = local.cidade;
                $scope.currentAtendimento.setor = local.setor;
            }
        };

        $scope.prepareEdit = function (item) {
            if (!$scope.canManageCadastros) {
                darpeRestrict('Somente coordenadores podem editar.');
                return;
            }
            $scope.currentAtendimento = angular.copy(item || {});
            $scope.currentAtendimento.data_atendimento = formatDarpeDateInput($scope.currentAtendimento.data_atendimento || '');
            $scope.currentAtendimento.proxima_visita = formatDarpeDateInput($scope.currentAtendimento.proxima_visita || '');
            syncAtendimentoSelections($scope.currentAtendimento);
            $scope.editingAtendimento = true;
            $scope.viewOnly = false;
            showDarpeModal('#modalAddAtendimentoDarpe', $timeout);
        };

        $scope.saveAtendimento = function () {
            normalizeAtendimentoForm($scope.currentAtendimento);
            DarpeService.updateAtendimento($scope.currentAtendimento).then(function () {
                swal('Sucesso', 'Atualizado com sucesso.', 'success');
                $('#modalAddAtendimentoDarpe').modal('hide');
                $scope.loadData();
            });
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
