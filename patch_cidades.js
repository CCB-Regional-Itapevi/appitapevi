const fs = require('fs');

let ctrlPath = 'js/controllers_v130.js';
let htmlPath = 'views/ebi_presenca.html';
let ctrl = fs.readFileSync(ctrlPath, 'utf8');

// 1. Add getPolosFixosForComum to configureCadastroMusicForm
let configureFormTarget = `    $scope.polosFixos = (dataSource.polos || []).map(repairCadastroMusicText).slice().sort(function (a, b) {
        return a.localeCompare(b, 'pt-BR');
    });`;

let configureFormReplacement = configureFormTarget + `

    $scope.getPolosFixosForComum = function (comumNome) {
        if (!comumNome) return $scope.polosFixos;
        var repairedComum = repairCadastroMusicText(comumNome || '');
        if (!repairedComum) return [];
        var cidadeComum = resolveMunicipioFromCatalog($scope.comumCatalogState, [repairedComum])
            || normalizeOfficialMunicipioRegionalLabel(repairedComum)
            || normalizeMunicipioRegionalLabel(repairedComum);
        var cidade = normalizeComumCatalogLookup(cidadeComum);
        if (!cidade) return [];
        return $scope.polosFixos.filter(function (poloName) {
            var poloCidadeRaw = resolveMunicipioFromCatalog($scope.comumCatalogState, [poloName])
                || normalizeOfficialMunicipioRegionalLabel(poloName)
                || normalizeMunicipioRegionalLabel(poloName);
            var poloCity = normalizeComumCatalogLookup(poloCidadeRaw);
            return poloCity === cidade;
        });
    };

    $scope.syncPoloFixoForComum = function () {
        var model = $scope[modelName];
        if (!model || !model.polo_participacao) return;
        var polosDisponiveis = $scope.getPolosFixosForComum(model.comum_congregacao);
        if (polosDisponiveis.indexOf(model.polo_participacao) === -1) {
            model.polo_participacao = '';
        }
    };`;

ctrl = ctrl.replace(configureFormTarget, configureFormReplacement);

// 2. Change filters object
let filtersTarget = `    $scope.filters = {
        searchText: '',
        cidade: '',
        comum: '',
        dataInicio: null,
        dataFim: null,
        mes: mesAtual
    };`;
let filtersReplacement = `    $scope.filters = {
        searchText: '',
        cidades: [],
        comum: '',
        dataInicio: null,
        dataFim: null,
        mes: mesAtual
    };
    $scope.toggleCidadeFilter = function(cidade) {
        var idx = $scope.filters.cidades.indexOf(cidade);
        if (idx === -1) {
            $scope.filters.cidades.push(cidade);
        } else {
            $scope.filters.cidades.splice(idx, 1);
        }
    };
    $scope.isCidadeSelected = function(cidade) {
        return $scope.filters.cidades.indexOf(cidade) !== -1;
    };
    $scope.clearCidades = function() {
        $scope.filters.cidades = [];
        $scope.applyFilters();
    };`;
ctrl = ctrl.replace(filtersTarget, filtersReplacement);

// 3. refreshScopedEbiCities
let refreshCitiesTarget = `    function refreshScopedEbiCities() {
        $scope.cidades = getScopedEbiMunicipios();

        if ($scope.filters.cidade && $scope.cidades.indexOf(normalizeMunicipioRegionalLabel($scope.filters.cidade)) === -1) {
            $scope.filters.cidade = '';
        }
    }`;
let refreshCitiesReplacement = `    function refreshScopedEbiCities() {
        $scope.cidades = getScopedEbiMunicipios();
        
        $scope.filters.cidades = $scope.filters.cidades.filter(function(c) {
            return $scope.cidades.indexOf(normalizeMunicipioRegionalLabel(c)) !== -1;
        });
    }`;
ctrl = ctrl.replace(refreshCitiesTarget, refreshCitiesReplacement);

// 4. buildFilteredComumOptions
let buildFilteredComumTarget = `            if ($scope.filters.cidade && municipio !== normalizeMunicipioRegionalLabel($scope.filters.cidade)) {
                return;
            }`;
let buildFilteredComumReplacement = `            var selectedCities = $scope.filters.cidades.map(function(c) { return normalizeMunicipioRegionalLabel(c); });
            if (selectedCities.length > 0 && selectedCities.indexOf(municipio) === -1) {
                return;
            }`;
ctrl = ctrl.replace(buildFilteredComumTarget, buildFilteredComumReplacement);

// 5. matchesEbiFilters
let matchesEbiFiltersTarget1 = `        var selectedCity = normalizeFilterValue(filters.cidade);`;
let matchesEbiFiltersReplacement1 = `        var selectedCities = (filters.cidades || []).map(normalizeFilterValue);`;
ctrl = ctrl.replace(matchesEbiFiltersTarget1, matchesEbiFiltersReplacement1);

let matchesEbiFiltersTarget2 = `        if (selectedCity) {
            matchCity = itemCity === selectedCity;
        }`;
let matchesEbiFiltersReplacement2 = `        if (selectedCities && selectedCities.length > 0) {
            matchCity = selectedCities.indexOf(itemCity) !== -1;
        }`;
ctrl = ctrl.replace(matchesEbiFiltersTarget2, matchesEbiFiltersReplacement2);

fs.writeFileSync(ctrlPath, ctrl);

let html = fs.readFileSync(htmlPath, 'utf8');

let htmlTarget = `<div class="col-md-2"><label>Município</label><select class="form-control input-sm" ng-model="filters.cidade" ng-change="applyFilters()" ng-options="c for c in cidades"><option value="">Todos os municípios</option></select></div>`;

let htmlReplacement = `<div class="col-md-2">
    <label>Município</label>
    <div class="dropdown" uib-dropdown>
        <button class="btn btn-default btn-sm form-control" type="button" uib-dropdown-toggle style="text-align:left; background:#fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right:20px; position:relative;">
            <span ng-if="filters.cidades.length === 0">Todos os municípios</span>
            <span ng-if="filters.cidades.length > 0">{{filters.cidades.join(', ')}}</span>
            <span class="caret" style="position:absolute; right:8px; top:12px;"></span>
        </button>
        <ul class="dropdown-menu" uib-dropdown-menu style="max-height: 250px; overflow-y: auto; width: 100%;">
            <li>
                <a href ng-click="clearCidades(); $event.stopPropagation()">
                    <i class="fa fa-fw" ng-class="{'fa-check text-success': filters.cidades.length === 0}"></i> Todos os municípios
                </a>
            </li>
            <li class="divider"></li>
            <li ng-repeat="c in cidades">
                <a href ng-click="toggleCidadeFilter(c); applyFilters(); $event.stopPropagation()">
                    <i class="fa fa-fw" ng-class="{'fa-check text-success': isCidadeSelected(c)}"></i> {{c}}
                </a>
            </li>
        </ul>
    </div>
</div>`;

html = html.replace(htmlTarget, htmlReplacement);
fs.writeFileSync(htmlPath, html);

console.log('Script executed');
