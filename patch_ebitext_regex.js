const fs = require('fs');
let p = 'js/controllers_v130.js';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/institution:\s*'CONGREGAÇÃO CRISTÃ NO BRASIL'/g, "institution: 'CONGREGAÇÃO CRISTÃ NO BRASIL'");
c = c.replace(/institution:\s*'CONGREGAÇÃO CRISTÃ NO BRASIL'/g, "institution: 'CONGREGAÇÃO CRISTÃ NO BRASIL'");
c = c.replace(/region:\s*'Regional Itapevi - São Paulo'/g, "region: 'Regional Itapevi - S\\u00E3o Paulo'");
c = c.replace(/moduleName:\s*'ESPAÇO BÍBLICO INFANTIL - EBI'/g, "moduleName: 'ESPA\\u00C7O B\\u00CDBLICO INFANTIL - EBI'");
c = c.replace(/detailedReportTitle:\s*'Relatório Detalhado de Atividades e Comparecimento'/g, "detailedReportTitle: 'Relat\\u00F3rio Detalhado de Atividades e Comparecimento'");
c = c.replace(/issueDateLabel:\s*'Emissão'/g, "issueDateLabel: 'Emiss\\u00E3o'");
c = c.replace(/periodLabel:\s*'Período'/g, "periodLabel: 'Per\\u00EDodo'");
c = c.replace(/municipalityLabel:\s*'Município'/g, "municipalityLabel: 'Munic\\u00EDpio'");
c = c.replace(/municipalitySectionLabel:\s*'MUNICÍPIO'/g, "municipalitySectionLabel: 'MUNIC\\u00CDPIO'");
c = c.replace(/storyLabel:\s*'História Contada'/g, "storyLabel: 'Hist\\u00F3ria Contada'");
c = c.replace(/pageLabel:\s*'Página'/g, "pageLabel: 'P\\u00E1gina'");
c = c.replace(/deletedLabel:\s*'Excluído!'/g, "deletedLabel: 'Exclu\\u00EDdo!'");
c = c.replace(/pdfErrorMessage:\s*'Não foi possível gerar o PDF do EBI no momento.'/g, "pdfErrorMessage: 'N\\u00E3o foi poss\\u00EDvel gerar o PDF do EBI no momento.'");

fs.writeFileSync(p, c);
console.log('Fixed ebiText encoding with regex');
