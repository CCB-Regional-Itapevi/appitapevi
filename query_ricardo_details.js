const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sqamxlhfazulrisiptud.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYW14bGhmYXp1bHJpc2lwdHVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3NTg4NCwiZXhwIjoyMDgyOTUxODg0fQ.w92yMKGGh5-ewRq0q6Pdl8TstzGlx0sGms1FCRveDYc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function run() {
    console.log("=== BUSCANDO USER POR ID ===");
    const { data: userById, error: errId } = await supabase.auth.admin.getUserById('2acc360f-f4db-485d-ae29-496fe9a7c2f4');
    if (errId) {
        console.error("Erro por ID:", errId.message);
    } else {
        console.log("Usuário encontrado por ID:", userById);
    }

    console.log("\n=== BUSCANDO USER POR EMAIL NO AUTH ===");
    // Para buscar por email na Auth, podemos usar listUsers com paginação ou pagina por pagina, ou fazer uma busca direta.
    // Vamos listar mais páginas!
    let page = 1;
    let found = false;
    while (true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: 100
        });

        if (error || !users || users.length === 0) {
            console.log(`Fim da paginação na página ${page - 1}`);
            break;
        }

        console.log(`Lendo página ${page}: ${users.length} usuários`);
        const target = users.find(u => u.email === 'ricardograngeiro@gmail.com');
        if (target) {
            console.log("ENCONTRADO na Auth:", target);
            found = true;
            break;
        }
        page++;
    }

    if (!found) {
        console.log("Usuário ricardograngeiro@gmail.com NÃO encontrado na Auth em nenhuma página!");
    }
}

run();
