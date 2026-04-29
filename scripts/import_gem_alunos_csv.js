const fs = require('fs');
const path = require('path');

const CSV_PATH = process.argv[2];
const APPLY = process.argv.includes('--apply');
const SOURCE_ARG = (process.argv.find((arg) => arg.indexOf('--source=') === 0) || '').split('=')[1] || 'candidatos';
const BATCH_SIZE = 500;

if (!CSV_PATH) {
    console.error('Uso: node scripts/import_gem_alunos_csv.js "<caminho_csv>" [--apply] [--source=candidatos|oficializados]');
    process.exit(1);
}

const credentials = readSupabaseCredentials();

async function main() {
    const csvText = fs.readFileSync(CSV_PATH, 'utf8');
    const rows = parseSemicolonCsv(csvText);

    if (!rows.length) {
        console.log('Nenhum registro encontrado no CSV.');
        return;
    }

    const normalizedRows = rows
        .map(function (row) {
            return normalizeCsvRow(row, SOURCE_ARG);
        })
        .filter((item) => !!item.nome_aluno);

    const existing = await fetchExistingStudents();
    const existingKeys = new Set(existing.map(buildStudentKey));

    const uniquePayload = [];
    const seenInFile = new Set();
    let skippedExisting = 0;
    let skippedDuplicateInFile = 0;

    for (const item of normalizedRows) {
        const key = buildStudentKey(item);

        if (seenInFile.has(key)) {
            skippedDuplicateInFile += 1;
            continue;
        }

        seenInFile.add(key);

        if (existingKeys.has(key)) {
            skippedExisting += 1;
            continue;
        }

        uniquePayload.push(item);
    }

    console.log(JSON.stringify({
        csv_registros: rows.length,
        normalizados: normalizedRows.length,
        existentes_no_banco: existing.length,
        ignorados_ja_existentes: skippedExisting,
        ignorados_duplicados_no_csv: skippedDuplicateInFile,
        prontos_para_importar: uniquePayload.length,
        origem: SOURCE_ARG,
        amostra_pendentes: uniquePayload.slice(0, 10).map((item) => ({
            nome_aluno: item.nome_aluno,
            comum_congregacao: item.comum_congregacao,
            instrumento: item.instrumento
        })),
        modo: APPLY ? 'apply' : 'dry-run'
    }, null, 2));

    if (!APPLY || !uniquePayload.length) {
        return;
    }

    let inserted = 0;

    for (let i = 0; i < uniquePayload.length; i += BATCH_SIZE) {
        const batch = uniquePayload.slice(i, i + BATCH_SIZE);
        await insertBatch(batch);
        inserted += batch.length;
        console.log(`Lote inserido: ${inserted}/${uniquePayload.length}`);
    }

    console.log(`Importacao concluida com sucesso. Inseridos: ${inserted}`);
}

function readSupabaseCredentials() {
    const sourcePath = path.join(__dirname, '..', 'create_demo_users.js');
    const source = fs.readFileSync(sourcePath, 'utf8');
    const urlMatch = source.match(/SUPABASE_URL\s*=\s*'([^']+)'/);
    const keyMatch = source.match(/SERVICE_ROLE_KEY\s*=\s*'([^']+)'/);

    if (!urlMatch || !keyMatch) {
        throw new Error('Nao foi possivel localizar as credenciais do Supabase em create_demo_users.js');
    }

    return {
        url: urlMatch[1],
        key: keyMatch[1]
    };
}

function parseSemicolonCsv(text) {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);

    if (!lines.length) {
        return [];
    }

    const headers = splitCsvLine(lines[0]).map((item) => item.trim().toLowerCase());

    return lines.slice(1).map((line) => {
        const values = splitCsvLine(line);
        const row = {};

        headers.forEach((header, index) => {
            row[header] = (values[index] || '').trim();
        });

        return row;
    });
}

function splitCsvLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];

        if (char === '"') {
            if (insideQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                insideQuotes = !insideQuotes;
            }
            continue;
        }

        if (char === ';' && !insideQuotes) {
            result.push(current);
            current = '';
            continue;
        }

        current += char;
    }

    result.push(current);
    return result;
}

function normalizeCsvRow(row, sourceType) {
    var sourceConfig = getSourceConfig(sourceType);

    return {
        nome_aluno: sanitize(row.nome),
        instrumento: sanitize(row.instrumento),
        comum_congregacao: sanitize(row.comum),
        municipio: sanitize(row.cidade),
        cargo_ministerio: sanitize(row.cargo),
        nivel: sanitize(row.nivel),
        status: sourceConfig.status,
        lancado_por: sourceConfig.lancadoPor,
        mensagens: 0,
        registro_msa: '',
        observacoes: sourceConfig.observacoes,
        foto_url: '',
        programa_minimo_percentual: 0
    };
}

function getSourceConfig(sourceType) {
    if (sourceType === 'oficializados') {
        return {
            status: 'Concluido',
            lancadoPor: 'Importacao CSV OFICIALIZADOS MAR26',
            observacoes: 'Carga de musicos oficializados importada por arquivo CSV.'
        };
    }

    return {
        status: 'Ativo',
        lancadoPor: 'Importacao CSV CANDIDATOS MAR26',
        observacoes: 'Carga inicial de candidatos do G.E.M importada por arquivo CSV.'
    };
}

function sanitize(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
}

function buildStudentKey(item) {
    return [
        sanitize(item.nome_aluno).toUpperCase(),
        sanitize(item.comum_congregacao).toUpperCase(),
        sanitize(item.instrumento).toUpperCase()
    ].join('||');
}

async function fetchExistingStudents() {
    const pageSize = 1000;
    let from = 0;
    let allRows = [];

    while (true) {
        const to = from + pageSize - 1;
        const response = await fetch(
            `${credentials.url}/rest/v1/musica_acompanhamento_aluno?select=nome_aluno,comum_congregacao,instrumento&order=created_at.asc`,
            {
                method: 'GET',
                headers: buildHeaders({
                    Range: `${from}-${to}`,
                    Prefer: 'count=exact'
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Falha ao consultar alunos existentes: ${response.status} ${await response.text()}`);
        }

        const rows = await response.json();
        allRows = allRows.concat(rows);

        if (rows.length < pageSize) {
            break;
        }

        from += pageSize;
    }

    return allRows;
}

async function insertBatch(batch) {
    const response = await fetch(`${credentials.url}/rest/v1/musica_acompanhamento_aluno`, {
        method: 'POST',
        headers: buildHeaders({
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
        }),
        body: JSON.stringify(batch)
    });

    if (!response.ok) {
        throw new Error(`Falha ao inserir lote: ${response.status} ${await response.text()}`);
    }
}

function buildHeaders(extraHeaders) {
    return Object.assign({
        apikey: credentials.key,
        Authorization: `Bearer ${credentials.key}`
    }, extraHeaders || {});
}

main().catch((error) => {
    console.error('Erro na importacao:', error.message);
    process.exit(1);
});
