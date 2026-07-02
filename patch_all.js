const fs = require('fs');
let p = 'js/controllers_v130.js';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/'CONGREGAÇÃO CRISTÃ NO BRASIL'/g, "'CONGREGA\\u00C7\\u00C3O CRIST\\u00C3 NO BRASIL'");
c = c.replace(/'CONGREGAÇÃO CRISTàNO BRASIL'/g, "'CONGREGA\\u00C7\\u00C3O CRIST\\u00C3 NO BRASIL'");
c = c.replace(/'CONGREGAÇÃO CRIST NO BRASIL'/g, "'CONGREGA\\u00C7\\u00C3O CRIST\\u00C3 NO BRASIL'");
c = c.replace(/'Regional Itapevi - São Paulo'/g, "'Regional Itapevi - S\\u00E3o Paulo'");
c = c.replace(/'ESPAÇO BÍBLICO INFANTIL - EBI'/g, "'ESPA\\u00C7O B\\u00CDBLICO INFANTIL - EBI'");
c = c.replace(/'Relatório Detalhado de Atividades e Comparecimento'/g, "'Relat\\u00F3rio Detalhado de Atividades e Comparecimento'");
c = c.replace(/'Emissão'/g, "'Emiss\\u00E3o'");
c = c.replace(/'Período'/g, "'Per\\u00EDodo'");
c = c.replace(/'Município'/g, "'Munic\\u00EDpio'");
c = c.replace(/'MUNICÍPIO'/g, "'MUNIC\\u00CDPIO'");
c = c.replace(/'História Contada'/g, "'Hist\\u00F3ria Contada'");
c = c.replace(/'Página'/g, "'P\\u00E1gina'");
c = c.replace(/'Excluído!'/g, "'Exclu\\u00EDdo!'");

fs.writeFileSync(p, c);
console.log('Fixed ALL hardcoded strings');
