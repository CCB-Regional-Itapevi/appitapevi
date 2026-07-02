const fs = require('fs');
let p = 'js/controllers_v130.js';
let c = fs.readFileSync(p, 'utf8');

const target1 = `$scope.loadData = function () {
        $scope.loading = true;
        EbiService.getRecitativos().then(function (data) {
            $scope.recitativos = (data || []).map(sanitizeEbiRecord);
            $scope.applyFilters();
            $scope.loading = false;
        }).catch(function (err) {
            $scope.error = "Erro ao carregar dados: " + (err.message || err);
            $scope.loading = false;
        });
    };`;

const replacement1 = `$scope.lastLoadedMonth = null;
    $scope.loadData = function () {
        $scope.loading = true;
        $scope.lastLoadedMonth = $scope.filters.mes;
        EbiService.getRecitativos($scope.filters).then(function (data) {
            $scope.recitativos = (data || []).map(sanitizeEbiRecord);
            // Bypass the reload check to actually apply the filters
            var originalLastLoaded = $scope.lastLoadedMonth;
            $scope.applyFilters();
            $scope.lastLoadedMonth = originalLastLoaded;
            $scope.loading = false;
        }).catch(function (err) {
            $scope.error = "Erro ao carregar dados: " + (err.message || err);
            $scope.loading = false;
        });
    };`;

const target2 = `$scope.applyFilters = function () {
        if (!$scope.recitativos) return;

        buildFilteredComumOptions();`;

const replacement2 = `$scope.applyFilters = function () {
        if ($scope.lastLoadedMonth !== $scope.filters.mes) {
            $scope.loadData();
            return;
        }
        if (!$scope.recitativos) return;

        buildFilteredComumOptions();`;

c = c.replace(target1, replacement1);
c = c.replace(target2, replacement2);

fs.writeFileSync(p, c);
console.log('controllers_v130.js patched for EBI');
