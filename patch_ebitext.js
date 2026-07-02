const fs = require('fs');
let p = 'js/controllers_v130.js';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  "institution: 'CONGREGAÇÃO CRISTÃ NO BRASIL',",
  "institution: 'CONGREGAÇÃO CRISTÃ NO BRASIL',"
);

// Actually, wait, the node script reported that it is NOT literal `\\u`.
// It's literally the UTF-8 bytes!
// So let's replace the UTF-8 string with safe Javascript escape sequences!

const target = "    var ebiText = {\r\n        institution: 'CONGREGAÇÃO CRISTÃ NO BRASIL',\r\n        region: 'Regional Itapevi - São Paulo',\r\n        moduleName: 'ESPAÇO BÍBLICO INFANTIL - EBI',\r\n        detailedReportTitle: 'Relatório Detalhado de Atividades e Comparecimento',\r\n        issueDateLabel: 'Emissão',\r\n        periodLabel: 'Período',\r\n        municipalityLabel: 'Município',\r\n        municipalitySectionLabel: 'MUNICÍPIO',\r\n        storyLabel: 'História Contada',\r\n        pageLabel: 'Página',\r\n        deletedLabel: 'Excluído!',\r\n        pdfErrorMessage: 'Não foi possível gerar o PDF do EBI no momento.',\r\n        allRecordsLabel: 'Todos os registros'\r\n    };";

const target2 = "    var ebiText = {\n        institution: 'CONGREGAÇÃO CRISTÃ NO BRASIL',\n        region: 'Regional Itapevi - São Paulo',\n        moduleName: 'ESPAÇO BÍBLICO INFANTIL - EBI',\n        detailedReportTitle: 'Relatório Detalhado de Atividades e Comparecimento',\n        issueDateLabel: 'Emissão',\n        periodLabel: 'Período',\n        municipalityLabel: 'Município',\n        municipalitySectionLabel: 'MUNICÍPIO',\n        storyLabel: 'História Contada',\n        pageLabel: 'Página',\n        deletedLabel: 'Excluído!',\n        pdfErrorMessage: 'Não foi possível gerar o PDF do EBI no momento.',\n        allRecordsLabel: 'Todos os registros'\n    };";

const replacement = "    var ebiText = {\n        institution: 'CONGREGAÇÃO CRISTÃ NO BRASIL',\n        region: 'Regional Itapevi - S\\u00E3o Paulo',\n        moduleName: 'ESPA\\u00C7O B\\u00CDBLICO INFANTIL - EBI',\n        detailedReportTitle: 'Relat\\u00F3rio Detalhado de Atividades e Comparecimento',\n        issueDateLabel: 'Emiss\\u00E3o',\n        periodLabel: 'Per\\u00EDodo',\n        municipalityLabel: 'Munic\\u00EDpio',\n        municipalitySectionLabel: 'MUNIC\\u00CDPIO',\n        storyLabel: 'Hist\\u00F3ria Contada',\n        pageLabel: 'P\\u00E1gina',\n        deletedLabel: 'Exclu\\u00EDdo!',\n        pdfErrorMessage: 'N\\u00E3o foi poss\\u00EDvel gerar o PDF do EBI no momento.',\n        allRecordsLabel: 'Todos os registros'\n    };";

c = c.replace(target, replacement);
c = c.replace(target2, replacement);

fs.writeFileSync(p, c);
console.log('Fixed ebiText encoding');
