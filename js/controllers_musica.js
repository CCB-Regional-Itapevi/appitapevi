(function () {
    'use strict';

    angular.module('inspinia')
        .controller('musicaDashboardCtrl', musicaDashboardCtrl)
        .controller('musicaEnsaiosCtrl', musicaEnsaiosCtrl)
        .controller('musicaPresencasCtrl', musicaPresencasCtrl)
        .controller('musicaJustificativasCtrl', musicaJustificativasCtrl)
        .controller('musicaJustificativaPublicaCtrl', musicaJustificativaPublicaCtrl)
        .controller('musicaRelatoriosCtrl', musicaRelatoriosCtrl);

    musicaDashboardCtrl.$inject = ['$scope', '$state', 'MusicaService'];
    musicaEnsaiosCtrl.$inject = ['$scope', '$timeout', 'MusicaService'];
    musicaPresencasCtrl.$inject = ['$scope', '$timeout', 'MusicaService'];
    musicaJustificativasCtrl.$inject = ['$scope', '$timeout', '$rootScope', 'MusicaService'];
    musicaJustificativaPublicaCtrl.$inject = ['$scope', '$timeout', 'MusicaService'];
    musicaRelatoriosCtrl.$inject = ['$scope', 'MusicaService'];

    function musicaDashboardCtrl($scope, $state, MusicaService) {
        $scope.loading = true;
        $scope.dashboardReady = false;
        $scope.refreshingDashboard = false;
        $scope.errorMessage = '';
        $scope.dashboard = { metrics: {}, calendario: [], rankingMunicipios: [], rankingComuns: [], ensaios: [] };
        $scope.dashboardCharts = buildEmptyDashboardCharts();
        $scope.selectedEnsaioId = '';
        $scope.selectedLocalidade = '';
        $scope.selectedMunicipio = '';
        $scope.getEnsaioOptionLabel = getEnsaioOptionLabel;
        $scope.getEnsaioShortLabel = getEnsaioShortLabel;
        $scope.selectDashboardEnsaio = selectDashboardEnsaio;
        $scope.selectDashboardLocalidade = selectDashboardLocalidade;
        $scope.selectDashboardMunicipio = selectDashboardMunicipio;
        $scope.clearDashboardMunicipio = clearDashboardMunicipio;
        $scope.exportDashboardExcel = exportDashboardExcel;
        $scope.exportDashboardPdf = exportDashboardPdf;
        $scope.clearDashboardFilters = clearDashboardFilters;
        $scope.onDashboardEnsaioChange = function () {
            $scope.selectedLocalidade = '';
            $scope.selectedMunicipio = '';
            loadDashboard();
        };
        $scope.onDashboardLocalidadeChange = function () {
            $scope.selectedMunicipio = '';
            loadDashboard();
        };

        $scope.goToEnsaios = function () {
            $state.go('music.ensaios');
        };

        $scope.goToPresencas = function () {
            $state.go('music.presencas');
        };

        $scope.reloadDashboard = loadDashboard;

        loadDashboard();

        function loadDashboard() {
            $scope.loading = !$scope.dashboardReady;
            $scope.refreshingDashboard = $scope.dashboardReady;
            MusicaService.getDashboardData($scope.selectedEnsaioId, $scope.selectedLocalidade, $scope.selectedMunicipio).then(function (data) {
                $scope.dashboard = data || $scope.dashboard;
                $scope.selectedEnsaioId = $scope.selectedEnsaioId || (($scope.dashboard.ultimoEnsaio || {}).id || '');
                if ($scope.selectedLocalidade && (($scope.dashboard.locaisDisponiveis || []).indexOf($scope.selectedLocalidade) === -1)) {
                    $scope.selectedLocalidade = '';
                    loadDashboard();
                    return;
                }
                if ($scope.selectedMunicipio && (($scope.dashboard.municipiosDisponiveis || []).indexOf($scope.selectedMunicipio) === -1)) {
                    $scope.selectedMunicipio = '';
                    loadDashboard();
                    return;
                }
                $scope.dashboardCharts = buildDashboardCharts($scope.dashboard);
                $scope.dashboardReady = true;
            }).catch(function (error) {
                $scope.errorMessage = 'Nao foi possivel carregar o dashboard da musica: ' + resolveMusicError(error);
            }).finally(function () {
                $scope.loading = false;
                $scope.refreshingDashboard = false;
            });
        }

        function getEnsaioOptionLabel(ensaio) {
            var rawDate = ((ensaio || {}).data_ensaio || '');
            var date = rawDate ? new Date(rawDate) : null;
            var dateLabel = 'data nao informada';

            if (date && !isNaN(date.getTime()) && date.getUTCFullYear() > 1970) {
                dateLabel = [
                    padNumber(date.getUTCDate()),
                    padNumber(date.getUTCMonth() + 1),
                    date.getUTCFullYear()
                ].join('/');
            }

            return [((ensaio || {}).titulo || 'Ensaio'), '-', dateLabel].join(' ');
        }

        function getEnsaioShortLabel(ensaio) {
            var rawDate = ((ensaio || {}).data_ensaio || '');
            var date = rawDate ? new Date(rawDate) : null;

            if (date && !isNaN(date.getTime()) && date.getUTCFullYear() > 1970) {
                return [
                    padNumber(date.getUTCDate()),
                    padNumber(date.getUTCMonth() + 1),
                    date.getUTCFullYear()
                ].join('/');
            }

            return 'Data nao informada';
        }

        function selectDashboardEnsaio(id) {
            if (!id || $scope.selectedEnsaioId === id) {
                return;
            }

            $scope.selectedEnsaioId = id;
            $scope.selectedLocalidade = '';
            $scope.selectedMunicipio = '';
            loadDashboard();
        }

        function selectDashboardLocalidade(localidade) {
            localidade = localidade || '';

            if ($scope.selectedLocalidade === localidade) {
                return;
            }

            $scope.selectedLocalidade = localidade;
            $scope.selectedMunicipio = '';
            loadDashboard();
        }

        function clearDashboardFilters() {
            $scope.selectedEnsaioId = (($scope.dashboard.ultimoEnsaio || {}).id || '');
            $scope.selectedLocalidade = '';
            $scope.selectedMunicipio = '';
            loadDashboard();
        }

        function selectDashboardMunicipio(item) {
            var municipio = (item || {}).nome || '';
            $scope.selectedMunicipio = $scope.selectedMunicipio === municipio ? '' : municipio;
            loadDashboard();
        }

        function clearDashboardMunicipio() {
            $scope.selectedMunicipio = '';
            loadDashboard();
        }

        function exportDashboardExcel() {
            var rows = [['Data', 'Polo', 'Municipio', 'Congregacao', 'Presentes', 'Musicos', 'Organistas', 'Ministerio', 'Apoio', 'Outros']];
            var ensaio = $scope.dashboard.ultimoEnsaio || {};
            var data = ensaio.data_ensaio || '';
            var polo = $scope.selectedLocalidade || 'Todos';
            var municipios = getDashboardMunicipiosForExport();

            if (!window.XLSX) {
                showMusicAlert('Excel indisponivel', 'A biblioteca XLSX nao esta carregada.', 'warning');
                return;
            }

            municipios.forEach(function (municipio) {
                rows.push([
                    data,
                    polo,
                    municipio.nome || '',
                    'TOTAL DO MUNICIPIO',
                    municipio.total || 0,
                    municipio.musicos || 0,
                    municipio.organistas || 0,
                    municipio.ministerio || 0,
                    municipio.apoio || 0,
                    municipio.outros || 0
                ]);

                (municipio.comuns || []).forEach(function (item) {
                    rows.push([
                        data,
                        polo,
                        municipio.nome || item.municipio || '',
                        item.comum || '',
                        item.total || 0,
                        item.musicos || 0,
                        item.organistas || 0,
                        item.ministerio || 0,
                        item.apoio || 0,
                        item.outros || 0
                    ]);
                });
            });

            rows.push([
                'TOTAL',
                '',
                $scope.selectedMunicipio || '',
                '',
                ($scope.dashboard.totaisUltimoEnsaio || {}).total || 0,
                ($scope.dashboard.totaisUltimoEnsaio || {}).musicos || 0,
                ($scope.dashboard.totaisUltimoEnsaio || {}).organistas || 0,
                ($scope.dashboard.totaisUltimoEnsaio || {}).ministerio || 0,
                ($scope.dashboard.totaisUltimoEnsaio || {}).apoio || 0,
                ($scope.dashboard.totaisUltimoEnsaio || {}).outros || 0
            ]);

            var workbook = window.XLSX.utils.book_new();
            var sheet = window.XLSX.utils.aoa_to_sheet(rows);
            window.XLSX.utils.book_append_sheet(workbook, sheet, 'Dashboard Musica');
            window.XLSX.writeFile(workbook, 'musica_dashboard_ensaio_regional.xlsx');
        }

        function exportDashboardPdf() {
            var body = [];
            var municipios = getDashboardMunicipiosForExport();

            body.push([
                { text: 'Municipio / Congregacao', bold: true },
                { text: 'Presentes', bold: true, alignment: 'center' },
                { text: 'Musicos', bold: true, alignment: 'center' },
                { text: 'Organistas', bold: true, alignment: 'center' }
            ]);

            if (!window.pdfMake) {
                showMusicAlert('PDF indisponivel', 'A biblioteca pdfMake nao esta carregada.', 'warning');
                return;
            }

            municipios.forEach(function (municipio) {
                body.push([
                    { text: municipio.nome || '', bold: true, fillColor: '#f3f3f4' },
                    { text: municipio.total || 0, bold: true, alignment: 'center', fillColor: '#f3f3f4' },
                    { text: municipio.musicos || 0, bold: true, alignment: 'center', fillColor: '#f3f3f4' },
                    { text: municipio.organistas || 0, bold: true, alignment: 'center', fillColor: '#f3f3f4' }
                ]);

                (municipio.comuns || []).forEach(function (item) {
                    body.push([
                        { text: '  ' + (item.comum || ''), margin: [10, 0, 0, 0] },
                        { text: item.total || 0, alignment: 'center' },
                        { text: item.musicos || 0, alignment: 'center' },
                        { text: item.organistas || 0, alignment: 'center' }
                    ]);
                });
            });

            body.push([
                { text: 'TOTAL GERAL', bold: true, fillColor: '#e7eaec' },
                { text: ($scope.dashboard.totaisUltimoEnsaio || {}).total || 0, alignment: 'center', bold: true, fillColor: '#e7eaec' },
                { text: ($scope.dashboard.totaisUltimoEnsaio || {}).musicos || 0, alignment: 'center', bold: true, fillColor: '#e7eaec' },
                { text: ($scope.dashboard.totaisUltimoEnsaio || {}).organistas || 0, alignment: 'center', bold: true, fillColor: '#e7eaec' }
            ]);

            window.pdfMake.createPdf({
                pageOrientation: 'landscape',
                content: [
                    { text: 'Musica - Dashboard do Ensaio Regional', style: 'header' },
                    { text: 'Polo: ' + ($scope.selectedLocalidade || 'Todos') + ' | Municipio: ' + ($scope.selectedMunicipio || 'Todos'), margin: [0, 0, 0, 10] },
                    { table: { headerRows: 1, widths: ['*', 70, 70, 70], body: body } }
                ],
                styles: { header: { fontSize: 16, bold: true, margin: [0, 0, 0, 8] } },
                defaultStyle: { fontSize: 9 }
            }).download('musica_dashboard_ensaio_regional.pdf');
        }

        function getDashboardMunicipiosForExport() {
            if ($scope.selectedMunicipio) {
                return ($scope.dashboard.rankingMunicipios || []).filter(function (item) {
                    return item.nome === $scope.selectedMunicipio;
                });
            }

            return ($scope.dashboard.rankingMunicipios || []).slice();
        }
    }

    function musicaEnsaiosCtrl($scope, $timeout, MusicaService) {
        $scope.loading = true;
        $scope.saving = false;
        $scope.importing = false;
        $scope.errorMessage = '';
        $scope.ensaios = [];
        $scope.locais = [];
        $scope.filteredLocais = [];
        $scope.groupedLocais = [];
        $scope.calendario = MusicaService.getCalendarioPadrao();
        $scope.ensaioForm = buildEnsaioForm();
        $scope.localForm = buildLocalForm();
        $scope.importFiles = [];
        $scope.importFileName = '';
        $scope.importPreview = null;
        $scope.previewingImport = false;
        $scope.selectedEnsaioId = '';

        $scope.openEnsaioModal = function (ensaio) {
            $scope.ensaioForm = angular.extend(buildEnsaioForm(), angular.copy(ensaio || {}));
            openMusicModal('#musicaEnsaioModal', $timeout);
        };

        $scope.saveEnsaio = function () {
            var payload = angular.copy($scope.ensaioForm || {});
            var action;

            if (!payload.data_ensaio || !payload.titulo) {
                showMusicAlert('Campos obrigatórios', 'Informe o título e a data do ensaio.', 'warning');
                return;
            }

            $scope.saving = true;
            action = payload.id ? MusicaService.updateEnsaio(payload) : MusicaService.saveEnsaio(payload);
            action.then(function () {
                angular.element('#musicaEnsaioModal').modal('hide');
                showMusicAlert('Sucesso', 'Ensaio salvo com sucesso.', 'success');
                loadData();
            }).catch(function (error) {
                showMusicAlert('Erro', 'Não foi possível salvar o ensaio: ' + resolveMusicError(error), 'error');
            }).finally(function () {
                $scope.saving = false;
            });
        };

        $scope.confirmDeleteEnsaio = function (ensaio) {
            if (!ensaio || !ensaio.id) return;
            showMusicConfirm('Excluir ensaio?', 'As presencas e locais vinculados tambem serao removidos.', function () {
                MusicaService.deleteEnsaio(ensaio.id).then(loadData).catch(function (error) {
                    showMusicAlert('Erro', 'Não foi possível excluir: ' + resolveMusicError(error), 'error');
                });
            });
        };

        $scope.openLocalModal = function (local) {
            $scope.localForm = angular.extend(buildLocalForm(), angular.copy(local || {}));
            if (!$scope.localForm.ensaio_id && $scope.ensaios.length) {
                $scope.localForm.ensaio_id = $scope.ensaios[0].id;
            }
            openMusicModal('#musicaLocalModal', $timeout);
        };

        $scope.openImportModal = function () {
            $scope.importFiles = [];
            $scope.importFileName = '';
            $scope.importPreview = null;
            if (document.getElementById('musicaWorkbookInput')) {
                document.getElementById('musicaWorkbookInput').value = '';
            }
            openMusicModal('#musicaImportModal', $timeout);
        };

        $scope.chooseImportFile = function () {
            var input = document.getElementById('musicaWorkbookInput');
            if (input) {
                input.click();
            }
        };

        $scope.handleImportSelection = function (element) {
            $scope.$applyAsync(function () {
                var files = Array.prototype.slice.call((element && element.files) || []).filter(Boolean);
                $scope.importFiles = files.length ? [files[0]] : [];
                $scope.importFileName = (($scope.importFiles[0] || {}).name) || '';
                $scope.importPreview = null;

                if (element && element.files && element.files.length > 1) {
                    showMusicAlert('Importação individual', 'Por enquanto, importe uma planilha por vez.', 'warning');
                }
            });
        };

        $scope.previewImport = function () {
            var file = (($scope.importFiles || []).filter(Boolean))[0];

            if (!file) {
                showMusicAlert('Planilha obrigatória', 'Selecione uma planilha para analisar.', 'warning');
                return;
            }

            $scope.previewingImport = true;
            $scope.importPreview = null;

            MusicaService.previewWorkbook(file).then(function (preview) {
                $scope.importPreview = preview;
            }).catch(function (error) {
                showMusicAlert('Erro', 'Não foi possível analisar ' + file.name + ': ' + resolveMusicError(error), 'error');
            }).finally(function () {
                $scope.previewingImport = false;
            });
        };

        $scope.importWorkbooks = function () {
            var file = (($scope.importFiles || []).filter(Boolean))[0];

            if (!file) {
                showMusicAlert('Planilhas obrigatórias', 'Selecione ao menos uma planilha para importar.', 'warning');
                return;
            }

            if (!$scope.importPreview) {
                showMusicAlert('Analise primeiro', 'Gere a prévia antes de confirmar a importação.', 'warning');
                return;
            }

            $scope.importing = true;

            MusicaService.importWorkbook(file).then(function () {
                $scope.importing = false;
                $scope.importFiles = [];
                $scope.importFileName = '';
                $scope.importPreview = null;
                if (document.getElementById('musicaWorkbookInput')) {
                    document.getElementById('musicaWorkbookInput').value = '';
                }
                angular.element('#musicaImportModal').modal('hide');
                showMusicAlert('Importação concluída', 'Planilha importada com sucesso.', 'success');
                loadData();
            }).catch(function (error) {
                $scope.importing = false;
                showMusicAlert('Erro', 'Não foi possível importar ' + file.name + ': ' + resolveMusicError(error), 'error');
            });
        };

        $scope.saveLocal = function () {
            var payload = angular.copy($scope.localForm || {});
            var action;

            if (!payload.ensaio_id || !payload.municipio || !payload.localidade) {
                showMusicAlert('Campos obrigatórios', 'Informe ensaio, município e localidade.', 'warning');
                return;
            }

            action = payload.id ? MusicaService.updateLocal(payload) : MusicaService.saveLocal(payload);
            action.then(function () {
                angular.element('#musicaLocalModal').modal('hide');
                showMusicAlert('Sucesso', 'Local salvo com sucesso.', 'success');
                loadData();
            }).catch(function (error) {
                showMusicAlert('Erro', 'Não foi possível salvar o local: ' + resolveMusicError(error), 'error');
            });
        };

        $scope.confirmDeleteLocal = function (local) {
            if (!local || !local.id) return;
            showMusicConfirm('Excluir local?', 'Este local sera removido do ensaio.', function () {
                MusicaService.deleteLocal(local.id).then(loadData).catch(function (error) {
                    showMusicAlert('Erro', 'Não foi possível excluir: ' + resolveMusicError(error), 'error');
                });
            });
        };

        $scope.$watch('selectedEnsaioId', function () {
            $scope.filteredLocais = ($scope.locais || []).filter(function (item) {
                return !$scope.selectedEnsaioId || String(item.ensaio_id) === String($scope.selectedEnsaioId);
            });
            $scope.groupedLocais = groupLocaisByMunicipio($scope.filteredLocais);
        });

        loadData();

        function loadData() {
            $scope.loading = true;
            $scope.errorMessage = '';
            Promise.all([MusicaService.getEnsaios(), MusicaService.getLocais()]).then(function (result) {
                $scope.$applyAsync(function () {
                    $scope.ensaios = result[0] || [];
                    $scope.locais = result[1] || [];
                    $scope.selectedEnsaioId = $scope.selectedEnsaioId || (($scope.ensaios[0] || {}).id || '');
                    $scope.filteredLocais = ($scope.locais || []).filter(function (item) {
                        return !$scope.selectedEnsaioId || String(item.ensaio_id) === String($scope.selectedEnsaioId);
                    });
                    $scope.groupedLocais = groupLocaisByMunicipio($scope.filteredLocais);
                    $scope.loading = false;
                });
            }).catch(function (error) {
                $scope.$applyAsync(function () {
                    $scope.errorMessage = 'Nao foi possivel carregar os ensaios: ' + resolveMusicError(error);
                    $scope.loading = false;
                });
            });
        }
    }

    function musicaPresencasCtrl($scope, $timeout, MusicaService) {
        $scope.loading = true;
        $scope.saving = false;
        $scope.errorMessage = '';
        $scope.ensaios = [];
        $scope.presencas = [];
        $scope.visitantesResumo = { totais: {}, municipios: [] };
        $scope.filteredPresencas = [];
        $scope.groupedPresencas = [];
        $scope.collapsedMunicipios = {};
        $scope.selectedEnsaioId = '';
        $scope.filters = { searchText: '', municipio: '' };
        $scope.presencaForm = buildPresencaForm();

        $scope.openPresencaModal = function (presenca) {
            $scope.presencaForm = angular.extend(buildPresencaForm(), angular.copy(presenca || {}));
            if (!$scope.presencaForm.ensaio_id) {
                $scope.presencaForm.ensaio_id = $scope.selectedEnsaioId || (($scope.ensaios[0] || {}).id || '');
            }
            openMusicModal('#musicaPresencaModal', $timeout);
        };

        $scope.savePresenca = function () {
            var payload = angular.copy($scope.presencaForm || {});
            var action;

            if (!payload.ensaio_id || !payload.municipio || !payload.comum_congregacao) {
                showMusicAlert('Campos obrigatórios', 'Informe ensaio, município e comum.', 'warning');
                return;
            }

            $scope.saving = true;
            action = payload.id ? MusicaService.updatePresenca(payload) : MusicaService.savePresenca(payload);
            action.then(function () {
                angular.element('#musicaPresencaModal').modal('hide');
                showMusicAlert('Sucesso', 'Presença salva com sucesso.', 'success');
                loadPresencas();
            }).catch(function (error) {
                showMusicAlert('Erro', 'Não foi possível salvar: ' + resolveMusicError(error), 'error');
            }).finally(function () {
                $scope.saving = false;
            });
        };

        $scope.confirmDeletePresenca = function (presenca) {
            if (!presenca || !presenca.id) return;
            showMusicConfirm('Excluir presenca?', 'Este lancamento sera removido do relatorio.', function () {
                MusicaService.deletePresenca(presenca.id).then(loadPresencas).catch(function (error) {
                    showMusicAlert('Erro', 'Não foi possível excluir: ' + resolveMusicError(error), 'error');
                });
            });
        };

        $scope.applyFilters = applyFilters;
        $scope.$watchGroup(['selectedEnsaioId', 'filters.searchText', 'filters.municipio'], function (newValues, oldValues) {
            if (newValues[0] !== oldValues[0]) {
                loadPresencas();
                return;
            }
            applyFilters();
        });

        MusicaService.getEnsaios().then(function (ensaios) {
            $scope.ensaios = ensaios || [];
            return MusicaService.getPresencas().then(function (presencas) {
                var ensaioIdsComPresenca = {};
                (presencas || []).forEach(function (item) {
                    if (item && item.ensaio_id) {
                        ensaioIdsComPresenca[String(item.ensaio_id)] = true;
                    }
                });

                $scope.selectedEnsaioId = (($scope.ensaios || []).filter(function (ensaio) {
                    return !!ensaioIdsComPresenca[String(ensaio.id)];
                })[0] || ($scope.ensaios[0] || {})).id || '';

                return loadPresencas();
            });
        }).catch(function (error) {
            $scope.errorMessage = 'Nao foi possivel carregar os ensaios: ' + resolveMusicError(error);
            $scope.loading = false;
        });

        function loadPresencas() {
            $scope.loading = true;
            return MusicaService.getPresencasAnaliticas($scope.selectedEnsaioId).then(function (analitica) {
                $scope.visitantesResumo = {
                    totais: buildPresenceSummary((analitica || {}).visitantes || []),
                    municipios: (((analitica || {}).visitantes || []).slice(0, 6))
                };
                $scope.presencas = (((analitica || {}).regional) || []).map(function (item) {
                    item.total_presentes = (parseInt(item.musicos, 10) || 0)
                        + (parseInt(item.organistas, 10) || 0)
                        + (parseInt(item.irmandade, 10) || 0)
                        + (parseInt(item.ministerio, 10) || 0)
                        + (parseInt(item.apoio, 10) || 0)
                        + (parseInt(item.outros, 10) || 0);
                    return item;
                });
                applyFilters();
            }).catch(function (error) {
                $scope.errorMessage = 'Nao foi possivel carregar as presencas: ' + resolveMusicError(error);
            }).finally(function () {
                $scope.loading = false;
            });
        }

        function applyFilters() {
            var search = normalizeMusicText($scope.filters.searchText);
            var municipio = normalizeMusicText($scope.filters.municipio);

            $scope.filteredPresencas = ($scope.presencas || []).filter(function (item) {
                var haystack = normalizeMusicText([item.municipio, item.comum_congregacao, item.local_ensaio, item.observacoes].join(' '));
                if (search && haystack.indexOf(search) === -1) return false;
                if (municipio && normalizeMusicText(item.municipio).indexOf(municipio) === -1) return false;
                return true;
            });
            $scope.groupedPresencas = groupPresencasByMunicipio($scope.filteredPresencas);
        }
    }

    function musicaRelatoriosCtrl($scope, MusicaService) {
        $scope.loading = true;
        $scope.errorMessage = '';
        $scope.ensaios = [];
        $scope.selectedEnsaioId = '';
        $scope.selectedMunicipio = '';
        $scope.relatorio = { municipios: [], comuns: [], totais: {}, locais: [] };

        $scope.loadRelatorio = loadRelatorio;
        $scope.exportExcel = exportExcel;
        $scope.exportPdf = exportPdf;

        MusicaService.getEnsaios().then(function (ensaios) {
            $scope.ensaios = ensaios || [];
            return MusicaService.getPresencas().then(function (presencas) {
                var ensaioIdsComPresenca = {};

                (presencas || []).forEach(function (item) {
                    if (item && item.ensaio_id) {
                        ensaioIdsComPresenca[String(item.ensaio_id)] = true;
                    }
                });

                $scope.selectedEnsaioId = (($scope.ensaios || []).filter(function (ensaio) {
                    return !!ensaioIdsComPresenca[String(ensaio.id)];
                })[0] || ($scope.ensaios[0] || {})).id || '';

                return loadRelatorio();
            });
        }).catch(function (error) {
            $scope.errorMessage = 'Nao foi possivel carregar o relatorio: ' + resolveMusicError(error);
            $scope.loading = false;
        });

        function loadRelatorio() {
            $scope.loading = true;
            return MusicaService.getRelatorioUnificado($scope.selectedEnsaioId).then(function (data) {
                $scope.relatorio = data || $scope.relatorio;
                if ($scope.selectedMunicipio && !$scope.relatorio.municipios.some(function (item) { return item.nome === $scope.selectedMunicipio; })) {
                    $scope.selectedMunicipio = '';
                }
            }).catch(function (error) {
                $scope.errorMessage = 'Nao foi possivel gerar o relatorio: ' + resolveMusicError(error);
            }).finally(function () {
                $scope.loading = false;
            });
        }

        function exportExcel() {
            var rows = [['Municipio', 'Comum', 'Musicos', 'Organistas', 'Ministerio', 'Apoio', 'Outros', 'Total']];
            getSelectedRelatorioComuns().forEach(function (item) {
                rows.push([item.municipio, item.comum, item.musicos, item.organistas, item.ministerio || 0, item.apoio || 0, item.outros || 0, item.total]);
            });
            rows.push(['TOTAL GERAL', '', getSelectedTotais().musicos || 0, getSelectedTotais().organistas || 0, getSelectedTotais().ministerio || 0, getSelectedTotais().apoio || 0, getSelectedTotais().outros || 0, getSelectedTotais().total || 0]);

            if (!window.XLSX) {
                showMusicAlert('Excel indisponível', 'A biblioteca XLSX não está carregada.', 'warning');
                return;
            }

            var workbook = window.XLSX.utils.book_new();
            var sheet = window.XLSX.utils.aoa_to_sheet(rows);
            window.XLSX.utils.book_append_sheet(workbook, sheet, 'Relatorio EnR');
            window.XLSX.writeFile(workbook, 'musica_relatorio_ensaio_regional.xlsx');
        }

        function exportPdf() {
            var body = [[
                { text: 'Municipio', bold: true },
                { text: 'Comum', bold: true },
                { text: 'Musicos', bold: true, alignment: 'center' },
                { text: 'Organistas', bold: true, alignment: 'center' },
                { text: 'Ministerio', bold: true, alignment: 'center' },
                { text: 'Apoio', bold: true, alignment: 'center' },
                { text: 'Outros', bold: true, alignment: 'center' },
                { text: 'Total', bold: true, alignment: 'center' }
            ]];

            if (!window.pdfMake) {
                showMusicAlert('PDF indisponível', 'A biblioteca pdfMake não está carregada.', 'warning');
                return;
            }

            getSelectedRelatorioComuns().forEach(function (item) {
                body.push([
                    item.municipio,
                    item.comum,
                    { text: item.musicos || 0, alignment: 'center' },
                    { text: item.organistas || 0, alignment: 'center' },
                    { text: item.ministerio || 0, alignment: 'center' },
                    { text: item.apoio || 0, alignment: 'center' },
                    { text: item.outros || 0, alignment: 'center' },
                    { text: item.total || 0, alignment: 'center', bold: true }
                ]);
            });

            body.push([
                { text: 'TOTAL GERAL', colSpan: 2, bold: true, fillColor: '#f3f3f4' },
                {},
                { text: getSelectedTotais().musicos || 0, alignment: 'center', bold: true, fillColor: '#f3f3f4' },
                { text: getSelectedTotais().organistas || 0, alignment: 'center', bold: true, fillColor: '#f3f3f4' },
                { text: getSelectedTotais().ministerio || 0, alignment: 'center', bold: true, fillColor: '#f3f3f4' },
                { text: getSelectedTotais().apoio || 0, alignment: 'center', bold: true, fillColor: '#f3f3f4' },
                { text: getSelectedTotais().outros || 0, alignment: 'center', bold: true, fillColor: '#f3f3f4' },
                { text: getSelectedTotais().total || 0, alignment: 'center', bold: true, fillColor: '#f3f3f4' }
            ]);

            window.pdfMake.createPdf({
                pageOrientation: 'landscape',
                content: [
                    { text: 'Relatorio Unificado - Ensaio Regional', style: 'header' },
                    { text: (($scope.relatorio.ensaio || {}).titulo || '') + ' - ' + (($scope.relatorio.ensaio || {}).data_ensaio || '') + ($scope.selectedMunicipio ? (' - ' + $scope.selectedMunicipio) : ''), margin: [0, 0, 0, 10] },
                    { table: { headerRows: 1, widths: ['18%', '*', 52, 58, 58, 52, 52, 52], body: body } }
                ],
                styles: { header: { fontSize: 16, bold: true, margin: [0, 0, 0, 8] } },
                defaultStyle: { fontSize: 9 }
            }).download('musica_relatorio_ensaio_regional.pdf');
        }

        $scope.getMunicipioOptions = function () {
            return ($scope.relatorio.municipios || []).map(function (item) { return item.nome; });
        };

        $scope.getMunicipioAtual = function () {
            if (!$scope.selectedMunicipio) {
                return null;
            }
            return ($scope.relatorio.municipios || []).filter(function (item) {
                return item.nome === $scope.selectedMunicipio;
            })[0] || null;
        };

        $scope.getComunsVisiveis = getSelectedRelatorioComuns;
        $scope.getTotaisVisiveis = getSelectedTotais;

        function getSelectedRelatorioComuns() {
            if (!$scope.selectedMunicipio) {
                return $scope.relatorio.comuns || [];
            }

            return ($scope.relatorio.comuns || []).filter(function (item) {
                return item.municipio === $scope.selectedMunicipio;
            });
        }

        function getSelectedTotais() {
            var municipio;

            if (!$scope.selectedMunicipio) {
                return $scope.relatorio.totais || {};
            }

            municipio = $scope.getMunicipioAtual();
            return municipio || { musicos: 0, organistas: 0, ministerio: 0, apoio: 0, outros: 0, total: 0 };
        }
    }

    function musicaJustificativasCtrl($scope, $timeout, $rootScope, MusicaService) {
        $scope.loading = true;
        $scope.saving = false;
        $scope.errorMessage = '';
        $scope.justificativas = [];
        $scope.filteredJustificativas = [];
        $scope.groupedJustificativas = [];
        $scope.resumo = buildJustificativasResumo([]);
        $scope.filters = { searchText: '', tipo_evento: '', data_inicio: null, data_fim: null };
        $scope.justificativaForm = buildJustificativaForm();
        $scope.tipoEventoOptions = [
            'Ensaio Regional',
            'Reunião do Ministério',
            'Reunião Técnica',
            'Outros eventos da Música'
        ];

        $scope.loadJustificativas = loadJustificativas;
        $scope.applyJustificativaFilters = applyJustificativaFilters;
        $scope.formatJustificativaDate = formatJustificativaDate;
        $scope.formatJustificativaTime = formatJustificativaTime;
        $scope.formatJustificativaTipoEvento = normalizeJustificativaTipoEventoLabel;
        $scope.exportJustificativasExcel = exportJustificativasExcel;
        $scope.exportJustificativasPdf = exportJustificativasPdf;
        $scope.clearJustificativaFilters = clearJustificativaFilters;
        $scope.filterJustificativasToday = filterJustificativasToday;

        $scope.openJustificativaModal = function (justificativa) {
            $scope.justificativaForm = angular.extend(buildJustificativaForm(), angular.copy(justificativa || {}));
            if ($scope.justificativaForm.data_evento && Object.prototype.toString.call($scope.justificativaForm.data_evento) !== '[object Date]') {
                $scope.justificativaForm.data_evento = new Date($scope.justificativaForm.data_evento + 'T00:00:00');
            }
            openMusicModal('#musicaJustificativaModal', $timeout);
        };

        $scope.saveJustificativa = function () {
            var payload = angular.copy($scope.justificativaForm || {});
            var action;

            if (!payload.nome || !payload.comum || !payload.motivo) {
                showMusicAlert('Campos obrigatorios', 'Informe nome, comum e motivo da justificativa.', 'warning');
                return;
            }

            $scope.saving = true;
            action = payload.id ? MusicaService.updateJustificativa(payload) : MusicaService.saveJustificativa(payload);
            action.then(function () {
                angular.element('#musicaJustificativaModal').modal('hide');
                showMusicAlert('Sucesso', 'Justificativa salva com sucesso.', 'success');
                loadJustificativas();
            }).catch(function (error) {
                showMusicAlert('Erro', 'Nao foi possivel salvar: ' + resolveMusicError(error), 'error');
            }).finally(function () {
                $scope.saving = false;
            });
        };

        $scope.confirmDeleteJustificativa = function (justificativa) {
            if (!justificativa || !justificativa.id) return;
            var alertText = 'excluir o registro de ' + (justificativa.nome || 'justificativa') + '? Este registro será removido da listagem.';
            showMusicConfirm('Excluir justificativa?', alertText, function () {
                MusicaService.deleteJustificativa(justificativa.id).then(loadJustificativas).catch(function (error) {
                    showMusicAlert('Erro', 'Nao foi possivel excluir: ' + resolveMusicError(error), 'error');
                });
            });
        };

        $scope.$watchGroup(['filters.searchText', 'filters.tipo_evento', 'filters.data_inicio', 'filters.data_fim'], function () {
            applyJustificativaFilters();
        });

        loadJustificativas();

        function loadJustificativas() {
            $scope.loading = true;
            $scope.errorMessage = '';

            return MusicaService.getJustificativas().then(function (items) {
                $scope.justificativas = items || [];
                applyJustificativaFilters();
            }).catch(function (error) {
                $scope.errorMessage = 'Nao foi possivel carregar as justificativas: ' + resolveMusicError(error);
            }).finally(function () {
                $scope.loading = false;
            });
        }

        function applyJustificativaFilters() {
            var search = normalizeMusicText($scope.filters.searchText);
            var tipoEvento = normalizeMusicText($scope.filters.tipo_evento);
            var dataInicio = parseJustificativaDateKey($scope.filters.data_inicio);
            var dataFim = parseJustificativaDateKey($scope.filters.data_fim);

            $scope.filteredJustificativas = ($scope.justificativas || []).filter(function (item) {
                var haystack = normalizeMusicText([
                    item.nome,
                    item.comum,
                    item.municipio,
                    item.cargo,
                    item.instrumento,
                    item.motivo,
                    item.nome_evento,
                    item.origem_aplicacao,
                    item.referencia_externa
                ].join(' '));
                var dataEvento = parseJustificativaDateKey(item.data_evento);

                if (search && haystack.indexOf(search) === -1) return false;
                if (tipoEvento && normalizeMusicText(normalizeJustificativaTipoEventoLabel(item.tipo_evento)) !== tipoEvento) return false;
                if (dataInicio && (!dataEvento || dataEvento < dataInicio)) return false;
                if (dataFim && (!dataEvento || dataEvento > dataFim)) return false;
                return true;
            }).sort(compareJustificativasByHierarchy);

            $scope.resumo = buildJustificativasResumo($scope.filteredJustificativas);
            $scope.groupedJustificativas = groupJustificativasByEvento($scope.filteredJustificativas);
        }

        function clearJustificativaFilters() {
            $scope.filters = { searchText: '', tipo_evento: '', data_inicio: null, data_fim: null };
            applyJustificativaFilters();
        }

        function filterJustificativasToday() {
            var today = new Date();
            today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            $scope.filters.data_inicio = today;
            $scope.filters.data_fim = today;
            applyJustificativaFilters();
        }

        function formatJustificativaDate(value) {
            var date;

            if (!value) {
                return '-';
            }

            date = new Date(String(value).slice(0, 10) + 'T00:00:00');
            if (isNaN(date.getTime())) {
                return value;
            }

            return [padNumber(date.getDate()), padNumber(date.getMonth() + 1), date.getFullYear()].join('/');
        }

        function formatJustificativaTime(value) {
            var date;

            if (!value) {
                return '-';
            }

            date = new Date(value);
            if (isNaN(date.getTime())) {
                return '-';
            }

            return [padNumber(date.getHours()), padNumber(date.getMinutes())].join(':');
        }

        function exportJustificativasExcel() {
            var printInfo = getJustificativaPrintInfo();
            var rows;
            var workbook;
            var sheet;

            if (!window.XLSX) {
                showMusicAlert('Excel indisponivel', 'A biblioteca XLSX nao esta carregada.', 'warning');
                return;
            }

            if (!$scope.filteredJustificativas.length) {
                showMusicAlert('Sem registros', 'Nao ha justificativas para exportar com os filtros atuais.', 'warning');
                return;
            }

            rows = [
                ['Congregação Cristã no Brasil'],
                ['Regional Itapevi'],
                ['Secretária da Música - Justificativas de Ausência'],
                ['Período', getJustificativaPeriodLabel()],
                ['Impresso por', printInfo.name],
                ['Impresso em', printInfo.date + ' às ' + printInfo.time],
                [],
                ['Evento', 'Data', 'Horário do registro', 'Nome', 'Comum', 'Município', 'Cargo', 'Instrumento', 'Motivo', 'Status']
            ];

            $scope.filteredJustificativas.forEach(function (item) {
                rows.push([
                    normalizeJustificativaTipoEventoLabel(item.tipo_evento),
                    formatJustificativaDate(item.data_evento),
                    formatJustificativaTime(item.created_at),
                    item.nome || '',
                    item.comum || '',
                    item.municipio || '',
                    item.cargo || '',
                    item.instrumento || '',
                    item.motivo || '',
                    'Recebida'
                ]);
            });

            workbook = window.XLSX.utils.book_new();
            sheet = window.XLSX.utils.aoa_to_sheet(rows);
            sheet['!cols'] = [
                { wch: 24 }, { wch: 12 }, { wch: 18 }, { wch: 32 }, { wch: 36 },
                { wch: 18 }, { wch: 26 }, { wch: 18 }, { wch: 16 }, { wch: 12 }
            ];
            window.XLSX.utils.book_append_sheet(workbook, sheet, 'Justificativas');
            window.XLSX.writeFile(workbook, 'Justificativas_Música_' + getJustificativaFileDate() + '.xlsx');
        }

        function exportJustificativasPdf() {
            if (!window.pdfMake) {
                showMusicAlert('PDF indisponivel', 'A biblioteca pdfMake nao esta carregada.', 'warning');
                return;
            }

            if (!$scope.filteredJustificativas.length) {
                showMusicAlert('Sem registros', 'Nao ha justificativas para exportar com os filtros atuais.', 'warning');
                return;
            }

            loadMusicLogoDataUrl().then(function (logoDataUrl) {
                var body = buildJustificativasPdfBody();
                var hasLogo = !!logoDataUrl;
                var printInfo = getJustificativaPrintInfo();
                var docDefinition = {
                    pageOrientation: 'landscape',
                    pageSize: 'A4',
                    pageMargins: [50, 125, 30, 35],
                    header: function (currentPage, pageCount) {
                        return {
                            margin: [50, 20, 30, 0],
                            columns: [
                                hasLogo ? { image: logoDataUrl, width: 90 } : { text: '', width: 90 },
                                {
                                    stack: [
                                        { text: 'Congregação Cristã no Brasil', style: 'entityName' },
                                        { text: 'Regional Itapevi', style: 'entitySub' },
                                        { text: 'Secretária da Música', style: 'moduleName' },
                                        { text: 'Justificativas de Ausência', style: 'reportTitle' }
                                    ],
                                    alignment: 'center',
                                    margin: [0, 5, 0, 0]
                                },
                                {
                                    stack: [
                                        { text: 'Página ' + currentPage + ' de ' + pageCount, alignment: 'right', fontSize: 9 },
                                        { text: 'Emissão: ' + new Date().toLocaleDateString('pt-BR'), alignment: 'right', fontSize: 9 },
                                        { text: 'Período: ' + getJustificativaPeriodLabel(), alignment: 'right', fontSize: 8, margin: [0, 5, 0, 0] },
                                        { text: 'Impresso por: ' + printInfo.name, alignment: 'right', fontSize: 8, margin: [0, 5, 0, 0] },
                                        { text: printInfo.date + ' às ' + printInfo.time, alignment: 'right', fontSize: 8 }
                                    ],
                                    width: 170
                                }
                            ]
                        };
                    },
                    content: [
                        {
                            table: {
                                headerRows: 1,
                                widths: [75, 50, '*', '*', 70, 115, 60, 45],
                                body: body
                            },
                            layout: {
                                fillColor: function (rowIndex) {
                                    return (rowIndex % 2 === 0 && rowIndex !== 0) ? '#f9f9f9' : null;
                                },
                                hLineColor: function (i, node) {
                                    return (i === 0 || i === node.table.body.length) ? '#1e4b7a' : '#eee';
                                },
                                vLineColor: function () {
                                    return '#eee';
                                }
                            }
                        }
                    ],
                    styles: {
                        entityName: { fontSize: 14, bold: true, color: '#222' },
                        entitySub: { fontSize: 10, color: '#666', margin: [0, 2, 0, 2] },
                        moduleName: { fontSize: 12, bold: true, color: '#1e4b7a', margin: [0, 5, 0, 2] },
                        reportTitle: { fontSize: 10, italic: true, color: '#444' },
                        tableHeader: { bold: true, fontSize: 8, color: 'white', fillColor: '#1e4b7a', alignment: 'center' }
                    },
                    defaultStyle: { fontSize: 8 }
                };

                window.pdfMake.createPdf(docDefinition).download('Justificativas_Música_' + getJustificativaFileDate() + '.pdf');
            }).catch(function () {
                showMusicAlert('Erro', 'Nao foi possivel gerar o PDF das justificativas.', 'error');
            });
        }

        function buildJustificativasPdfBody() {
            var body = [[
                { text: 'Evento', style: 'tableHeader' },
                { text: 'Data', style: 'tableHeader' },
                { text: 'Nome', style: 'tableHeader' },
                { text: 'Comum', style: 'tableHeader' },
                { text: 'Município', style: 'tableHeader' },
                { text: 'Cargo', style: 'tableHeader' },
                { text: 'Motivo', style: 'tableHeader' },
                { text: 'Status', style: 'tableHeader' }
            ]];

            $scope.filteredJustificativas.forEach(function (item) {
                body.push([
                    normalizeJustificativaTipoEventoLabel(item.tipo_evento),
                    {
                        stack: [
                            { text: formatJustificativaDate(item.data_evento) },
                            { text: formatJustificativaTime(item.created_at), fontSize: 7, color: '#666', margin: [0, 2, 0, 0] }
                        ]
                    },
                    item.nome || '',
                    item.comum || '',
                    item.municipio || '',
                    item.cargo || '',
                    item.motivo || '',
                    { text: 'Recebida', color: '#1ab394', bold: true }
                ]);
            });

            return body;
        }

        function getJustificativaPeriodLabel() {
            var inicio = $scope.filters.data_inicio ? formatJustificativaDate(formatDateKeyFromDate($scope.filters.data_inicio)) : 'Todos';
            var fim = $scope.filters.data_fim ? formatJustificativaDate(formatDateKeyFromDate($scope.filters.data_fim)) : 'Todos';

            if (inicio === 'Todos' && fim === 'Todos') {
                return 'Todos os registros';
            }

            return inicio + ' a ' + fim;
        }

        function getJustificativaFileDate() {
            var today = new Date();
            return [padNumber(today.getDate()), padNumber(today.getMonth() + 1), today.getFullYear()].join('_');
        }

        function getJustificativaPrintInfo() {
            var user = ($rootScope && $rootScope.currentUser) || {};
            var now = new Date();
            var name = user.full_name || user.nome || user.name || user.email || 'Usuário logado';

            return {
                name: name,
                date: [padNumber(now.getDate()), padNumber(now.getMonth() + 1), now.getFullYear()].join('/'),
                time: [padNumber(now.getHours()), padNumber(now.getMinutes())].join(':')
            };
        }

        function loadMusicLogoDataUrl() {
            if (!window.fetch || !window.FileReader) {
                return Promise.resolve('');
            }

            return window.fetch('img/logo-ccb-light.png').then(function (response) {
                if (!response.ok) {
                    return '';
                }
                return response.blob();
            }).then(function (blob) {
                return new Promise(function (resolve) {
                    if (!blob) {
                        resolve('');
                        return;
                    }

                    var reader = new FileReader();
                    reader.onloadend = function () { resolve(reader.result || ''); };
                    reader.onerror = function () { resolve(''); };
                    reader.readAsDataURL(blob);
                });
            }).catch(function () {
                return '';
            });
        }
    }

    function musicaJustificativaPublicaCtrl($scope, $timeout, MusicaService) {
        var comumSearchTimer = null;
        var pessoaSearchTimer = null;

        $scope.loadingComuns = false;
        $scope.loadingPessoas = false;
        $scope.sending = false;
        $scope.sent = false;
        $scope.errorMessage = '';
        $scope.infoMessage = MusicaService.isCadastroExternoConfigured()
            ? ''
            : 'Cadastro externo ainda nao configurado. O formulario esta pronto para modelagem; a busca sera ativada quando a URL e anon key forem informadas.';
        $scope.cargos = MusicaService.getPublicCargos();
        $scope.motivosAusencia = ['Trabalho', 'Enfermidade', 'Viagem', 'Outros'];
        $scope.instrumentosOptions = [
            'Acordeon', 'Violino', 'Viola', 'Violoncelo', 'Flauta transversal',
            'Oboé', "Oboé d'amore", 'Corne inglês', 'Clarinete', 'Clarinete alto', 
            'Clarinete baixo (clarone)', 'Fagote', 'Saxofone soprano (reto)', 'Saxofone alto',
            'Saxofone tenor', 'Saxofone barítono', 'Trompete', 'Cornet', 'Flugelhorn', 'Trompa',
            'Trombone', 'Trombonito', 'Barítono (pisto)', 'Eufônio', 'Tuba'
        ];
        $scope.instrumentosFiltrados = [];
        $scope.activeInstrumentoIndex = 0;
        $scope.instrumentoSelecionado = false;

        $scope.comuns = [];
        $scope.pessoas = [];
        $scope.activeComumIndex = 0;
        $scope.activePessoaIndex = 0;
        $scope.selectedPessoa = null;
        $scope.form = buildPublicJustificativaForm();

        $scope.onComumSearchChange = function () {
            $scope.form.nome = '';
            $scope.form.instrumento = '';
            $scope.form.municipio = '';
            $scope.selectedPessoa = null;
            $scope.pessoas = [];
            $scope.activeComumIndex = 0;

            if (comumSearchTimer) {
                $timeout.cancel(comumSearchTimer);
            }

            comumSearchTimer = $timeout(loadComuns, 300);
        };

        $scope.selectComum = function (comum) {
            if (!comum) return;
            $scope.form.comum = comum.nome || comum.displayName || '';
            $scope.form.comum_display = comum.displayName || comum.nome || '';
            $scope.form.nome = '';
            $scope.form.cargo = '';
            $scope.form.instrumento = '';
            $scope.form.municipio = '';
            $scope.selectedPessoa = null;
            $scope.pessoas = [];
            $scope.comuns = [];
            $scope.activeComumIndex = 0;
        };

        $scope.onCargoChange = function () {
            if (!$scope.selectedPessoa) {
                $scope.form.instrumento = '';
                $scope.form.municipio = '';

                if (typeof normalizeMusicText === 'function') {
                    var cargo = normalizeMusicText($scope.form.cargo || '');
                    if (cargo === 'organista' || cargo === 'secretaria da musica' || cargo === 'instrutora') {
                        $scope.form.instrumento = 'Órgão';
                    }
                }
            }
        };

        $scope.shouldShowPublicInstrumentoField = function () {
            if (!$scope.shouldShowPublicCargoField()) return false;
            
            if (typeof normalizeMusicText !== 'function') return false;
            
            var cargo = normalizeMusicText($scope.form.cargo || '');
            return cargo === 'musico' ||
                   cargo === 'encarregado local' ||
                   cargo === 'encarregado regional' ||
                   cargo === 'instrutor';
        };

        $scope.onInstrumentoFocus = function () {
            $scope.instrumentoSelecionado = false;
            if (!$scope.form.instrumento) {
                $scope.instrumentosFiltrados = $scope.instrumentosOptions;
            } else {
                $scope.onInstrumentoSearchChange();
            }
        };

        $scope.onInstrumentoSearchChange = function () {
            $scope.instrumentoSelecionado = false;
            $scope.activeInstrumentoIndex = 0;
            var term = normalizeMusicText($scope.form.instrumento || '');
            if (!term) {
                $scope.instrumentosFiltrados = $scope.instrumentosOptions;
                return;
            }
            $scope.instrumentosFiltrados = $scope.instrumentosOptions.filter(function (inst) {
                return normalizeMusicText(inst).indexOf(term) !== -1;
            });
        };

        $scope.selectInstrumento = function (inst) {
            $scope.form.instrumento = inst;
            $scope.instrumentoSelecionado = true;
            $scope.instrumentosFiltrados = [];
        };

        $scope.handleInstrumentoKeydown = function ($event) {
            var key = ($event && ($event.key || $event.which)) || '';
            var total = ($scope.instrumentosFiltrados || []).length;

            if (!total || $scope.instrumentoSelecionado) return;

            if (key === 'ArrowDown' || key === 40) {
                $event.preventDefault();
                $scope.activeInstrumentoIndex = ($scope.activeInstrumentoIndex + 1) % total;
            } else if (key === 'ArrowUp' || key === 38) {
                $event.preventDefault();
                $scope.activeInstrumentoIndex = ($scope.activeInstrumentoIndex - 1 + total) % total;
            } else if (key === 'Enter' || key === 13) {
                $event.preventDefault();
                var selected = $scope.instrumentosFiltrados[$scope.activeInstrumentoIndex];
                if (selected) {
                    $scope.selectInstrumento(selected);
                }
            } else if (key === 'Escape' || key === 27) {
                $scope.instrumentosFiltrados = [];
            }
        };

        $scope.onNomeSearchChange = function () {
            $scope.selectedPessoa = null;
            $scope.form.cargo = '';
            $scope.form.instrumento = '';
            $scope.form.municipio = '';
            $scope.activePessoaIndex = 0;

            if (pessoaSearchTimer) {
                $timeout.cancel(pessoaSearchTimer);
            }

            pessoaSearchTimer = $timeout(loadPessoas, 300);
        };

        $scope.selectPessoa = function (pessoa) {
            if (!pessoa) return;
            $scope.selectedPessoa = pessoa;
            $scope.form.nome = pessoa.nome || '';
            $scope.form.comum = pessoa.comum || $scope.form.comum;
            $scope.form.municipio = pessoa.municipio || '';
            $scope.form.cargo = pessoa.cargo || $scope.form.cargo;
            $scope.form.instrumento = pessoa.instrumento || '';
            $scope.form.nivel = pessoa.nivel || '';
            $scope.pessoas = [];
            $scope.activePessoaIndex = 0;
        };

        $scope.handleComumKeydown = function ($event) {
            var key = ($event && ($event.key || $event.which)) || '';
            var total = ($scope.comuns || []).length;

            if (!total) {
                return;
            }

            if (key === 'ArrowDown' || key === 40) {
                $event.preventDefault();
                $scope.activeComumIndex = ($scope.activeComumIndex + 1) % total;
                return;
            }

            if (key === 'ArrowUp' || key === 38) {
                $event.preventDefault();
                $scope.activeComumIndex = ($scope.activeComumIndex + total - 1) % total;
                return;
            }

            if (key === 'Enter' || key === 13) {
                $event.preventDefault();
                $scope.selectComum($scope.comuns[$scope.activeComumIndex] || $scope.comuns[0]);
            }
        };

        $scope.handlePessoaKeydown = function ($event) {
            var key = ($event && ($event.key || $event.which)) || '';
            var total = ($scope.pessoas || []).length;

            if (!total) {
                return;
            }

            if (key === 'ArrowDown' || key === 40) {
                $event.preventDefault();
                $scope.activePessoaIndex = ($scope.activePessoaIndex + 1) % total;
                return;
            }

            if (key === 'ArrowUp' || key === 38) {
                $event.preventDefault();
                $scope.activePessoaIndex = ($scope.activePessoaIndex + total - 1) % total;
                return;
            }

            if (key === 'Enter' || key === 13) {
                $event.preventDefault();
                $scope.selectPessoa($scope.pessoas[$scope.activePessoaIndex] || $scope.pessoas[0]);
            }
        };

        $scope.shouldShowPublicCargoField = function () {
            return !!$scope.form.nome
                && !$scope.selectedPessoa
                && !$scope.loadingPessoas
                && !$scope.pessoas.length;
        };

        $scope.resetForm = function () {
            $scope.sent = false;
        };

        $scope.submitJustificativa = function () {
            var payload;

            $scope.errorMessage = '';

            if (!$scope.form.tipo_evento) {
                $scope.errorMessage = 'Selecione o tipo de evento.';
                return;
            }

            if (!$scope.form.comum) {
                $scope.errorMessage = 'Selecione a comum na lista antes de continuar.';
                return;
            }

            if (!$scope.form.nome) {
                $scope.errorMessage = 'Informe o nome.';
                return;
            }

            if (!$scope.form.cargo) {
                $scope.errorMessage = 'Selecione o nome na lista ou informe o cargo quando o nome nao for encontrado.';
                return;
            }

            if (!$scope.form.motivo) {
                $scope.errorMessage = 'Selecione o motivo da ausencia.';
                return;
            }

            payload = angular.extend({}, $scope.form, {
                nome: ($scope.form.nome || '').toUpperCase(),
                cargo: ($scope.form.cargo || '').toUpperCase(),
                instrumento: ($scope.form.instrumento || '').toUpperCase(),
                tipo_evento: $scope.form.tipo_evento,
                data_evento: $scope.form.data_evento || null,
                origem_aplicacao: 'FORMULARIO_PUBLICO_MUSICA',
                referencia_externa: buildPublicJustificativaReference($scope.form),
                status: 'Recebida',
                payload_origem: {
                    fonte: 'url_publica',
                    pessoa_encontrada_no_cadastro: !!$scope.selectedPessoa,
                    nivel: $scope.form.nivel || ''
                }
            });

            $scope.sending = true;
            MusicaService.saveJustificativa(payload).then(function () {
                $scope.sent = true;
                $scope.form = buildPublicJustificativaForm();
                $scope.selectedPessoa = null;
                $scope.pessoas = [];
                $scope.comuns = [];
                $scope.activeComumIndex = 0;
                $scope.activePessoaIndex = 0;
                window.scrollTo(0, 0);
            }).catch(function (error) {
                if (error && String(error.code) === '23505') {
                    if (window.swal) {
                        var nomeStr = ($scope.form.nome || '').toUpperCase();
                        var comumStr = ($scope.form.comum_display || $scope.form.comum || '').toUpperCase();
                        var msg = '<div style="font-size:15px;line-height:1.5;color:#555;">' +
                                  '<strong>' + nomeStr + '</strong> de <strong>' + comumStr + '</strong><br>' +
                                  'já foi cadastrado(a) hoje!' +
                                  '</div>';
                        window.swal({
                            title: 'Cadastro Duplicado!',
                            text: msg,
                            type: 'warning',
                            html: true,
                            showConfirmButton: true,
                            confirmButtonColor: '#255ec8',
                            confirmButtonText: '✔ OK'
                        });
                        setTimeout(function () { 
                            attachMusicAlertProgressBar(3000); 
                            setTimeout(function () {
                                if (window.swal && typeof window.swal.close === 'function') {
                                    window.swal.close();
                                } else {
                                    var okBtn = document.querySelector('.sweet-alert .confirm');
                                    if (okBtn) okBtn.click();
                                }
                            }, 3000);
                        }, 0);
                    } else {
                        window.alert('Cadastro Duplicado: ' + ($scope.form.nome || '') + ' já enviou uma justificativa hoje para este evento.');
                    }
                } else {
                    $scope.errorMessage = 'Ocorreu um erro ao enviar a justificativa: ' + resolveMusicError(error);
                }
            }).finally(function () {
                $scope.sending = false;
            });
        };

        loadComuns();

        function loadComuns() {
            if (!MusicaService.isCadastroExternoConfigured()) {
                $scope.comuns = [];
                return;
            }

            $scope.loadingComuns = true;
            MusicaService.searchPublicComuns($scope.form.comum_display || $scope.form.comum || '').then(function (items) {
                $scope.comuns = items || [];
                $scope.activeComumIndex = 0;
            }).catch(function (error) {
                $scope.errorMessage = 'Nao foi possivel buscar as comuns: ' + resolveMusicError(error);
            }).finally(function () {
                $scope.loadingComuns = false;
            });
        }

        function loadPessoas() {
            if (!MusicaService.isCadastroExternoConfigured() || !$scope.form.comum || !$scope.form.nome) {
                $scope.pessoas = [];
                return;
            }

            $scope.loadingPessoas = true;
            MusicaService.searchPublicPessoas($scope.form.comum, $scope.form.cargo, $scope.form.nome).then(function (items) {
                $scope.pessoas = items || [];
                $scope.activePessoaIndex = 0;
            }).catch(function (error) {
                $scope.errorMessage = 'Nao foi possivel buscar os nomes: ' + resolveMusicError(error);
            }).finally(function () {
                $scope.loadingPessoas = false;
            });
        }
    }

    function buildEnsaioForm() {
        return {
            titulo: 'Ensaio Regional',
            data_ensaio: new Date(),
            mes_referencia: '',
            ciclo: '',
            sede_principal: '',
            status: 'Planejado',
            relatorio_modelo: 'Unificado por municipio e comum',
            observacoes: ''
        };
    }

    function buildLocalForm() {
        return { ensaio_id: '', municipio: '', localidade: '', comum_referencia: '', endereco: '', ordem: 0, observacoes: '' };
    }

    function buildPresencaForm() {
        return {
            ensaio_id: '',
            municipio: '',
            comum_congregacao: '',
            local_ensaio: '',
            musicos: 0,
            organistas: 0,
            irmandade: 0,
            ministerio: 0,
            apoio: 0,
            outros: 0,
            encarregado_local: false,
            nome_encarregado: '',
            ausentes_justificados: 0,
            observacoes: ''
        };
    }

    function buildJustificativaForm() {
        return {
            tipo_evento: 'Ensaio Regional',
            nome_evento: '',
            data_evento: new Date(),
            nome: '',
            comum: '',
            municipio: '',
            cargo: '',
            instrumento: '',
            motivo: '',
            status: 'Recebida',
            contato: '',
            origem_aplicacao: 'APP_GLOBAL',
            referencia_externa: '',
            registrado_por: '',
            observacoes: ''
        };
    }

    function buildPublicJustificativaForm() {
        return {
            tipo_evento: '',
            data_evento: getTodayDateObject(),
            comum: '',
            comum_display: '',
            cargo: '',
            nome: '',
            municipio: '',
            instrumento: '',
            nivel: '',
            motivo: '',
            contato: '',
            observacoes: ''
        };
    }

    function getTodayDateObject() {
        var today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }

    function buildPublicJustificativaReference(form) {
        var todayStr = new Date().toISOString().slice(0, 10);
        return [
            'pub',
            todayStr,
            normalizeMusicText((form && form.tipo_evento) || '').replace(/\s+/g, '-').slice(0, 20),
            normalizeMusicText((form && form.comum) || '').replace(/\s+/g, '-').slice(0, 20),
            normalizeMusicText((form && form.nome) || '').replace(/\s+/g, '-').slice(0, 32)
        ].join('-');
    }

    function openMusicModal(selector, $timeout) {
        $timeout(function () {
            var $modal = angular.element(selector);
            if (!$modal.parent().is('body')) {
                $modal.appendTo('body');
            }
            $modal.modal('show');
        }, 0);
    }

    function normalizeMusicText(value) {
        return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function padNumber(value) {
        return value < 10 ? '0' + value : String(value);
    }

    function buildPresenceSummary(items) {
        return (items || []).reduce(function (acc, item) {
            acc.musicos += parseInt(item.musicos, 10) || 0;
            acc.organistas += parseInt(item.organistas, 10) || 0;
            acc.ministerio += parseInt(item.ministerio, 10) || 0;
            acc.apoio += parseInt(item.apoio, 10) || 0;
            acc.outros += parseInt(item.outros, 10) || 0;
            acc.total += (parseInt(item.musicos, 10) || 0)
                + (parseInt(item.organistas, 10) || 0)
                + (parseInt(item.ministerio, 10) || 0)
                + (parseInt(item.apoio, 10) || 0)
                + (parseInt(item.outros, 10) || 0)
                + (parseInt(item.irmandade, 10) || 0);
            return acc;
        }, { musicos: 0, organistas: 0, ministerio: 0, apoio: 0, outros: 0, total: 0 });
    }

    function groupPresencasByMunicipio(items) {
        var grouped = {};

        (items || []).forEach(function (item) {
            var key = item.municipio || 'Não informado';
            if (!grouped[key]) {
                grouped[key] = {
                    municipio: key,
                    items: [],
                    musicos: 0,
                    organistas: 0,
                    ministerio: 0,
                    apoio: 0,
                    outros: 0,
                    total: 0
                };
            }

            grouped[key].items.push(item);
            grouped[key].musicos += parseInt(item.musicos, 10) || 0;
            grouped[key].organistas += parseInt(item.organistas, 10) || 0;
            grouped[key].ministerio += parseInt(item.ministerio, 10) || 0;
            grouped[key].apoio += parseInt(item.apoio, 10) || 0;
            grouped[key].outros += parseInt(item.outros, 10) || 0;
            grouped[key].total += parseInt(item.total_presentes, 10) || 0;
        });

        return Object.keys(grouped).map(function (key) {
            grouped[key].items.sort(function (a, b) {
                return (b.total_presentes || 0) - (a.total_presentes || 0);
            });
            return grouped[key];
        }).sort(function (a, b) {
            return b.total - a.total;
        });
    }

    function groupLocaisByMunicipio(items) {
        var grouped = {};

        (items || []).forEach(function (item) {
            var key = item.municipio || 'Não informado';
            if (!grouped[key]) {
                grouped[key] = {
                    municipio: key,
                    localidades: []
                };
            }

            if (grouped[key].localidades.indexOf(item.localidade) === -1) {
                grouped[key].localidades.push(item.localidade);
            }
        });

        return Object.keys(grouped).map(function (key) {
            grouped[key].quantidade = grouped[key].localidades.length;
            return grouped[key];
        }).sort(function (a, b) {
            return a.municipio.localeCompare(b.municipio);
        });
    }

    function buildJustificativasResumo(items) {
        var resumo = {
            total: 0,
            eventos: 0,
            comuns: 0,
            musicos: 0,
            organistas: 0,
            ministerio: 0,
            tecnicos: 0
        };
        var eventos = {};
        var comuns = {};

        (items || []).forEach(function (item) {
            var cargo = normalizeMusicText(item.cargo);
            var instrumento = normalizeMusicText(item.instrumento);

            resumo.total += 1;
            eventos[normalizeJustificativaTipoEventoLabel(item.tipo_evento) + '|' + (item.data_evento || '') + '|' + (item.nome_evento || '')] = true;
            comuns[(item.municipio || '') + '|' + (item.comum || '')] = true;

            if (cargo.indexOf('organista') !== -1 || instrumento.indexOf('orgao') !== -1) {
                resumo.organistas += 1;
            } else if (cargo.indexOf('ministerio') !== -1 || cargo.indexOf('encarregado') !== -1 || cargo.indexOf('cooperador') !== -1) {
                resumo.ministerio += 1;
            } else if (cargo.indexOf('tecnic') !== -1) {
                resumo.tecnicos += 1;
            } else {
                resumo.musicos += 1;
            }
        });

        resumo.eventos = Object.keys(eventos).length;
        resumo.comuns = Object.keys(comuns).length;
        return resumo;
    }

    function groupJustificativasByEvento(items) {
        var grouped = {};

        (items || []).forEach(function (item) {
            var tipoEvento = normalizeJustificativaTipoEventoLabel(item.tipo_evento);
            var key = [
                tipoEvento || 'Nao informado',
                item.data_evento || 'Sem data',
                item.nome_evento || ''
            ].join('|');

            if (!grouped[key]) {
                grouped[key] = {
                    tipo_evento: tipoEvento || 'Nao informado',
                    data_evento: item.data_evento || '',
                    nome_evento: item.nome_evento || '',
                    items: [],
                    total: 0
                };
            }

            grouped[key].items.push(item);
            grouped[key].total += 1;
        });

        return Object.keys(grouped).map(function (key) {
            grouped[key].items.sort(compareJustificativasByHierarchy);
            return grouped[key];
        }).sort(function (a, b) {
            return String(b.data_evento || '').localeCompare(String(a.data_evento || ''));
        });
    }

    function compareJustificativasByHierarchy(a, b) {
        var rankA = getJustificativaCargoRank((a || {}).cargo);
        var rankB = getJustificativaCargoRank((b || {}).cargo);
        var dateA = String((a || {}).data_evento || '');
        var dateB = String((b || {}).data_evento || '');

        if (rankA !== rankB) return rankA - rankB;
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return String((a || {}).nome || '').localeCompare(String((b || {}).nome || ''), 'pt-BR');
    }

    function getJustificativaCargoRank(cargo) {
        var value = normalizeMusicText(cargo);

        if (value.indexOf('anciao') !== -1) return 1;
        if (value.indexOf('diacono') !== -1) return 2;
        if (value.indexOf('cooperador do oficio') !== -1 || value.indexOf('coorperador do oficio') !== -1) return 3;
        if (value.indexOf('cooperador de jovens') !== -1 || value.indexOf('coorperador de jovens') !== -1) return 4;
        if (value.indexOf('encarregado regional') !== -1) return 5;
        if (value.indexOf('examinadora') !== -1) return 6;
        if (value.indexOf('encarregado local') !== -1) return 7;
        if (value.indexOf('secretario da musica') !== -1) return 8;
        if (value.indexOf('secretaria da musica') !== -1) return 9;
        if (value.indexOf('secretario do gem') !== -1) return 10;
        if (value.indexOf('instrutor') !== -1 || value.indexOf('instrutora') !== -1) return 11;
        if (value.indexOf('musico') !== -1 || value.indexOf('organista') !== -1) return 12;
        return 99;
    }

    function normalizeJustificativaTipoEventoLabel(value) {
        var normalized = normalizeMusicText(value);

        if (normalized === 'reuniao do ministerio') return 'Reunião do Ministério';
        if (normalized === 'reuniao tecnica') return 'Reunião Técnica';
        if (normalized === 'outro evento da musica' || normalized === 'outros eventos da musica') return 'Outros eventos da Música';
        return 'Ensaio Regional';
    }

    function parseJustificativaDateKey(value) {
        var date;

        if (!value) {
            return '';
        }

        if (Object.prototype.toString.call(value) === '[object Date]') {
            return formatDateKeyFromDate(value);
        }

        date = new Date(String(value).slice(0, 10) + 'T00:00:00');
        if (isNaN(date.getTime())) {
            return '';
        }

        return formatDateKeyFromDate(date);
    }

    function formatDateKeyFromDate(date) {
        if (!date || isNaN(date.getTime())) {
            return '';
        }

        return [date.getFullYear(), padNumber(date.getMonth() + 1), padNumber(date.getDate())].join('-');
    }

    function buildEmptyDashboardCharts() {
        return {
            composicaoData: [[0, 0, 0, 0, 0, 0]],
            composicaoOptions: {
                responsive: true,
                maintainAspectRatio: false,
                scaleBeginAtZero: true
            },
            composicaoLabels: ['Musicos', 'Organistas', 'Irmandade', 'Ministerio', 'Apoio', 'Outros'],
            municipiosData: [],
            municipiosLabels: [],
            municipiosSeries: ['Presentes'],
            municipiosOptions: {
                responsive: true,
                maintainAspectRatio: false,
                scaleBeginAtZero: true
            }
        };
    }

    function buildDashboardCharts(dashboard) {
        var empty = buildEmptyDashboardCharts();
        var totais = (dashboard && dashboard.totaisUltimoEnsaio) || {};
        var municipios = ((dashboard && dashboard.rankingMunicipios) || []).slice(0, 6);

        empty.composicaoData = [[
            totais.musicos || 0,
            totais.organistas || 0,
            totais.irmandade || 0,
            totais.ministerio || 0,
            totais.apoio || 0,
            totais.outros || 0
        ]];
        empty.composicaoOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scaleBeginAtZero: true,
            scaleShowGridLines: false,
            barShowStroke: false,
            datasetFill: false
        };
        empty.municipiosLabels = municipios.map(function (item) {
            return item.nome;
        });
        empty.municipiosData = [municipios.map(function (item) {
            return item.total || 0;
        })];
        empty.municipiosOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scaleBeginAtZero: true,
            barShowStroke: false,
            datasetFill: false
        };

        return empty;
    }

    function resolveMusicError(error) {
        return (error && (error.message || error.details || error.error_description)) || 'Erro desconhecido';
    }

    function showMusicAlert(title, text, type) {
        if (window.swal) {
            window.swal({
                title: title,
                text: text,
                type: type,
                showConfirmButton: false,
                timer: 2500,
                closeOnConfirm: true
            });
            setTimeout(function () {
                attachMusicAlertProgressBar();
            }, 0);
            return;
        }
        window.alert(title + ': ' + text);
    }

    function attachMusicAlertProgressBar(timer) {
        var modal = document.querySelector('.sweet-alert');
        var duration = timer || 2500;
        var existingBar;
        var bar;

        if (!modal) {
            return;
        }

        existingBar = modal.querySelector('.music-alert-progress');
        if (existingBar) {
            existingBar.parentNode.removeChild(existingBar);
        }

        bar = document.createElement('div');
        bar.className = 'music-alert-progress';
        bar.style.position = 'absolute';
        bar.style.left = '0';
        bar.style.right = '0';
        bar.style.bottom = '0';
        bar.style.height = '4px';
        bar.style.background = 'rgba(28, 132, 198, 0.16)';
        bar.style.overflow = 'hidden';
        bar.style.borderBottomLeftRadius = '4px';
        bar.style.borderBottomRightRadius = '4px';
        bar.innerHTML = '<span style="display:block;height:100%;width:100%;background:#1c84c6;transform-origin:left center;transform:scaleX(1);transition:transform ' + (duration / 1000) + 's linear;"></span>';

        modal.appendChild(bar);

        setTimeout(function () {
            var fill = bar.querySelector('span');
            if (fill) {
                fill.style.transform = 'scaleX(0)';
            }
        }, 30);
    }

    function showMusicConfirm(title, text, onConfirm) {
        if (window.swal) {
            window.swal({
                title: title,
                text: text,
                type: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ed5565',
                confirmButtonText: 'Sim, excluir',
                cancelButtonText: 'Cancelar',
                closeOnConfirm: true
            }, function (isConfirm) {
                if (isConfirm && typeof onConfirm === 'function') onConfirm();
            });
            return;
        }
        if (window.confirm(text) && typeof onConfirm === 'function') onConfirm();
    }
})();
