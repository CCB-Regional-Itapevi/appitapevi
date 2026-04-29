const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');

const credentials = readSupabaseCredentials();

async function main() {
    const targetRows = await fetchRowsToReclassify();

    console.log(JSON.stringify({
        registros_encontrados: targetRows.length,
        modo: APPLY ? 'apply' : 'dry-run',
        amostra: targetRows.slice(0, 5).map((item) => ({
            id: item.id,
            nome_aluno: item.nome_aluno,
            nivel: item.nivel,
            status: item.status,
            lancado_por: item.lancado_por
        }))
    }, null, 2));

    if (!APPLY || !targetRows.length) {
        return;
    }

    const batchSize = 250;
    let updated = 0;

    for (let i = 0; i < targetRows.length; i += batchSize) {
        const batch = targetRows.slice(i, i + batchSize);
        await updateBatch(batch);
        updated += batch.length;
        console.log(`Lote reclassificado: ${updated}/${targetRows.length}`);
    }

    console.log(`Reclassificacao concluida com sucesso. Atualizados: ${updated}`);
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

async function fetchRowsToReclassify() {
    const rows = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
        const to = from + pageSize - 1;
        const response = await fetch(
            `${credentials.url}/rest/v1/musica_acompanhamento_aluno?select=id,nome_aluno,nivel,status,lancado_por&lancado_por=eq.Importacao%20CSV%20MAR26&order=created_at.asc`,
            {
                method: 'GET',
                headers: buildHeaders({
                    Range: `${from}-${to}`,
                    Prefer: 'count=exact'
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Falha ao consultar registros para reclassificacao: ${response.status} ${await response.text()}`);
        }

        const pageRows = await response.json();
        rows.push(...pageRows);

        if (pageRows.length < pageSize) {
            break;
        }

        from += pageSize;
    }

    return rows;
}

async function updateBatch(batch) {
    await Promise.all(batch.map(async (item) => {
        const payload = {
            status: 'Concluido',
            lancado_por: 'Importacao CSV OFICIALIZADOS MAR26',
            observacoes: 'Registro de musico oficializado importado por arquivo CSV e separado da base de candidatos do G.E.M.'
        };

        const response = await fetch(
            `${credentials.url}/rest/v1/musica_acompanhamento_aluno?id=eq.${item.id}`,
            {
                method: 'PATCH',
                headers: buildHeaders({
                    'Content-Type': 'application/json',
                    Prefer: 'return=minimal'
                }),
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            throw new Error(`Falha ao reclassificar ${item.id}: ${response.status} ${await response.text()}`);
        }
    }));
}

function buildHeaders(extraHeaders) {
    return Object.assign({
        apikey: credentials.key,
        Authorization: `Bearer ${credentials.key}`
    }, extraHeaders || {});
}

main().catch((error) => {
    console.error('Erro na reclassificacao:', error.message);
    process.exit(1);
});
