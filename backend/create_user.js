const { createClient } = require('@supabase/supabase-js');

// Suas credenciais do Supabase
const supabaseUrl = 'https://lofcuoeibkhuoaddcgwn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZmN1b2VpYmtodW9hZGRjZ3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTg0NjAsImV4cCI6MjA4NTczNDQ2MH0.ZbZECkvojwCN2X_C9gN2w_1h20elC3um2ovsgCqqTcM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cadastrarEverton() {
    console.log("🚀 Iniciando cadastro forçado...");

    const { data, error } = await supabase
        .from('User')
        .insert([
            {
                username: 'everton',
                password: '#Carinho123', // Esta será sua senha inicial
                perm_monitor: true,
                perm_aovivo: true,
                perm_planilha: true,
                perm_terminal: true,
                perm_admin: true
            }
        ])
        .select();

    if (error) {
        console.error("❌ Erro ao criar usuário:", error.message);
        console.log("Dica: Verifique se a tabela 'User' já existe no seu Supabase.");
    } else {
        console.log("✅ Usuário 'everton' criado com sucesso!");
        console.log("🔑 Usuário: everton | Senha: 123");
    }
}

cadastrarEverton();