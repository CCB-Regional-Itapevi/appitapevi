const fs = require('fs');
let p = 'js/controllers_v130.js';
let c = fs.readFileSync(p, 'utf8');

const target1 = `            if ($scope.filters.cidade && municipio !== normalizeMunicipioRegionalLabel($scope.filters.cidade)) {\r\n                return;\r\n            }`;
const target2 = `            if ($scope.filters.cidade && municipio !== normalizeMunicipioRegionalLabel($scope.filters.cidade)) {\n                return;\n            }`;

const replacement = `            if ($scope.filters.cidades && $scope.filters.cidades.length > 0) {
                var isSelected = false;
                for (var i = 0; i < $scope.filters.cidades.length; i++) {
                    if (municipio === normalizeMunicipioRegionalLabel($scope.filters.cidades[i])) {
                        isSelected = true;
                        break;
                    }
                }
                if (!isSelected) {
                    return;
                }
            }`;

c = c.replace(target1, replacement);
c = c.replace(target2, replacement);

fs.writeFileSync(p, c);
console.log('Fixed buildFilteredComumOptions');
