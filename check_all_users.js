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
    console.log("=== LISTANDO TODOS OS USUÁRIOS NA AUTH ===");
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("Erro ao listar usuários da Auth:", error.message);
        return;
    }

    console.log(`Total de usuários na Auth: ${users.length}`);
    users.forEach(u => {
        console.log(`- ID: ${u.id} | Email: ${u.email} | Nome: ${u.user_metadata?.full_name || 'N/A'}`);
    });
}

run();
