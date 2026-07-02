const fs = require('fs');
let p = 'js/controllers_v130.js';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  '        if (selectedCity) {\r\n            matchCity = itemCity === selectedCity;\r\n        }',
  '        if (selectedCities && selectedCities.length > 0) {\r\n            matchCity = selectedCities.indexOf(itemCity) !== -1;\r\n        }'
);

c = c.replace(
  '        if (selectedCity) {\n            matchCity = itemCity === selectedCity;\n        }',
  '        if (selectedCities && selectedCities.length > 0) {\n            matchCity = selectedCities.indexOf(itemCity) !== -1;\n        }'
);

fs.writeFileSync(p, c);
console.log('Fixed');
