const fs = require('fs');
let p = 'js/controllers_v130.js';
let c = fs.readFileSync(p, 'utf8');

const targetLoadData = `Promise.all([
            MusicalizacaoService.getPolos(),
            MusicalizacaoService.getAulas(),
            MusicalizacaoService.getInstrutores()
        ])`;

const replaceLoadData = `$scope.lastLoadedMonth = $scope.filters.mes;
        Promise.all([
            MusicalizacaoService.getPolos(),
            MusicalizacaoService.getAulas($scope.filters),
            MusicalizacaoService.getInstrutores()
        ])`;

c = c.replace(new RegExp(targetLoadData.replace(/[.*+?^$\{\}\(\)\|\[\]\\]/g, '\\$&'), 'g'), replaceLoadData);

const applyRegex = /\$scope\.applyFilters = function\(\) {/g;
let match;
let indices = [];
while ((match = applyRegex.exec(c)) !== null) {
    indices.push(match.index);
}

// Check which applyFilters are within musicalizacao controllers
const fnHistoricoIdx = c.indexOf('function musicalizacaoAtividadesHistoricoCtrl');
const fnDashIdx = c.indexOf('function musicalizacaoDashboardCtrl');

c = c.replace(/function musicalizacaoAtividadesHistoricoCtrl\(\$scope, MusicalizacaoService, \$timeout, \$rootScope\) \{/g, "function musicalizacaoAtividadesHistoricoCtrl($scope, MusicalizacaoService, $timeout, $rootScope) {\n    $scope.lastLoadedMonth = null;");
c = c.replace(/function musicalizacaoDashboardCtrl\(\$scope, MusicalizacaoService, \$timeout, \$state\) \{/g, "function musicalizacaoDashboardCtrl($scope, MusicalizacaoService, $timeout, $state) {\n    $scope.lastLoadedMonth = null;");

// Now carefully replace applyFilters ONLY inside these two functions by finding the first applyFilters after their declaration
function replaceAfter(content, startIdx) {
    const search = '$scope.applyFilters = function() {';
    const replace = `$scope.applyFilters = function() {
        if ($scope.lastLoadedMonth !== $scope.filters.mes) {
            $scope.loadData();
            return;
        }`;
    const idx = content.indexOf(search, startIdx);
    if (idx !== -1) {
        return content.substring(0, idx) + replace + content.substring(idx + search.length);
    }
    return content;
}

c = replaceAfter(c, c.indexOf('function musicalizacaoAtividadesHistoricoCtrl'));
c = replaceAfter(c, c.indexOf('function musicalizacaoDashboardCtrl'));

fs.writeFileSync(p, c);
console.log('controllers_v130.js patched for Musicalizacao');
