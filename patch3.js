const fs = require('fs');
let p = 'js/controllers_v130.js';
let c = fs.readFileSync(p, 'utf8');

const replFilters = `    $scope.filters = {
        searchText: '',
        cidades: [],
        comum: '',
        dataInicio: null,
        dataFim: null,
        mes: mesAtual
    };

    $scope.toggleCidadeFilter = function(cidade) {
        var idx = $scope.filters.cidades.indexOf(cidade);
        if (idx > -1) {
            $scope.filters.cidades.splice(idx, 1);
        } else {
            $scope.filters.cidades.push(cidade);
        }
    };
    $scope.isCidadeSelected = function(cidade) {
        return $scope.filters.cidades.indexOf(cidade) > -1;
    };
    $scope.clearCidades = function() {
        $scope.filters.cidades = [];
        $scope.applyFilters();
    };
`;

c = c.replace(
  "    $scope.filters = {\r\n        searchText: '',\r\n        cidade: '',\r\n        comum: '',\r\n        dataInicio: null,\r\n        dataFim: null,\r\n        mes: mesAtual\r\n    };",
  replFilters
);
c = c.replace(
  "    $scope.filters = {\n        searchText: '',\n        cidade: '',\n        comum: '',\n        dataInicio: null,\n        dataFim: null,\n        mes: mesAtual\n    };",
  replFilters
);

fs.writeFileSync(p, c);
console.log('toggleCidadeFilter included:', c.includes('toggleCidadeFilter'));
