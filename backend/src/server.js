const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 1. Configuração do Supabase (Movida para o topo)
const supabaseUrl = 'https://lofcuoeibkhuoaddcgwn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZmN1b2VpYmtodW9hZGRjZ3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTg0NjAsImV4cCI6MjA4NTczNDQ2MH0.ZbZECkvojwCN2X_C9gN2w_1h20elC3um2ovsgCqqTcM';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- 2. NOVAS FUNÇÕES DE GRAVAÇÃO NO SUPABASE STORAGE ---
async function saveToSupabaseStorage(fileName, header, csvRow) {
    try {
        // Tenta baixar o arquivo atual do bucket 'planilhas'
        const { data, error } = await supabase.storage.from('planilhas').download(fileName);
        let newContent = "";

        if (error || !data) {
            // Se o arquivo não existir, cria com o cabeçalho
            newContent = header + '\n' + csvRow;
        } else {
            // Se existir, converte o conteúdo para texto e anexa a nova linha
            const text = await data.text();
            newContent = text + '\n' + csvRow;
        }

        // Faz o upload substituindo (upsert) o arquivo antigo pelo novo atualizado
        const { error: uploadError } = await supabase.storage.from('planilhas').upload(fileName, newContent, {
            contentType: 'text/csv',
            upsert: true
        });

        if (uploadError) throw uploadError;
        console.log(`✅ CSV [${fileName}] atualizado no Supabase Storage!`);
    } catch (err) {
        console.error(`⚠️ Erro no Storage para ${fileName}:`, err.message);
    }
}

async function appendForexToStorage(csvRow) {
    const fileName = `historico_forca_${new Date().toISOString().split('T')[0]}.csv`;
    const header = "Data;AUD_1h;AUD_4h;AUD_D;CAD_1h;CAD_4h;CAD_D;CHF_1h;CHF_4h;CHF_D;EUR_1h;EUR_4h;EUR_D;GBP_1h;GBP_4h;GBP_D;JPY_1h;JPY_4h;JPY_D;NZD_1h;NZD_4h;NZD_D;USD_1h;USD_4h;USD_D;Setup_H1;Setup_H4;Setup_Daily";
    await saveToSupabaseStorage(fileName, header, csvRow);
}

async function appendIndicesToStorage(indicesData) {
    const fileName = `historico_indices_${new Date().toISOString().split('T')[0]}.csv`;
    const now = new Date();
    const ts = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) - (5 * 60 * 60 * 1000)).toISOString().replace('T', ' ').substring(0, 19);

    let csvRow = `${ts}`;
    const ativos = Object.keys(indicesData);
    ativos.forEach(ativo => {
        const d = indicesData[ativo];
        csvRow += `;${d.h1 || 0};${d.h4 || 0};${d.daily || 0}`;
    });

    let header = "Data";
    ativos.forEach(ativo => { header += `;1h_${ativo};4h_${ativo};D_${ativo}`; });

    await saveToSupabaseStorage(fileName, header, csvRow);
}

const app = express();

// Permite conexões de qualquer lugar (necessário para Vercel/Mobile)
app.use(cors({ origin: '*' }));
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Length, X-Requested-With");

    // Responde imediatamente ao preflight do navegador
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
app.use(express.json());

// Cache em RAM (Necessário para evitar delay na Vercel)
let indicesCache = { data: {}, metadata: { last_update: "Inicializando..." } };
const isMarketOpen = () => {
    const now = new Date();
    const utc5 = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) - (5 * 60 * 60 * 1000));
    const day = utc5.getDay();
    const hour = utc5.getHours();

    if (day === 0) return hour >= 17;   // Domingo 17h
    if (day >= 1 && day <= 4) return true; // Seg-Qui
    if (day === 5) return hour < 16;    // Sexta 16h
    return false; // Sábado
};

const marketGuard = (req, res, next) => {
    if (!isMarketOpen()) {
        return res.status(503).json({ error: "Mercado Fechado (UTC-5)" });
    }
    next();
};

app.get('/', (req, res) => res.send('API Institutional Tracker Online 🚀'));

const formatCsvRow = (data) => {
    const now = new Date();
    // Ajuste para UTC-5 (Horário do Mercado/Itatiba)
    const ts = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) - (5 * 60 * 60 * 1000))
        .toISOString().replace('T', ' ').substring(0, 19);

    const currencies = ['AUD', 'CAD', 'CHF', 'EUR', 'GBP', 'JPY', 'NZD', 'USD'];
    let row = `${ts}`; // Primeira coluna sempre é o Horário

    // Gera colunas: 1h_CURR;4h_CURR;D_CURR para cada uma das 8 moedas
    currencies.forEach(curr => {
        const v1h = data.h1?.[curr] || 0;
        const v4h = data.h4?.[curr] || 0;
        const vD = data.daily?.[curr] || 0;
        row += `;${v1h};${v4h};${vD}`;
    });

    // Finaliza com os Setups identificados pelo Python
    row += `;${data.setup_h1 || ''};${data.setup_h4 || ''};${data.setup_daily || ''}\n`;

    return row;
};

// --- LOGIN (COM MODO ESPIÃO/DEBUG ATIVADO) ---
app.post('/api/login', async (req, res) => {
    let { username, password } = req.body;

    // Forçar limpeza de caracteres invisíveis
    const cleanUsername = username ? username.trim() : "";
    const cleanPassword = password ? password.trim() : "";

    console.log(`🔍 Tentativa de login: [${cleanUsername}]`);

    try {
        // Busca usando .eq e .maybeSingle para evitar erros de processamento
        const { data: user, error } = await supabase
            .from('User')
            .select('*')
            .eq('username', cleanUsername)
            .maybeSingle();

        if (error) {
            console.error("❌ Erro na consulta Supabase:", error.message);
            return res.status(500).json({ error: "Erro interno no banco" });
        }

        if (!user) {
            console.log(`❌ Usuário [${cleanUsername}] não localizado no banco.`);
            return res.status(401).json({ error: "Usuário não encontrado" });
        }

        // Comparação de senha
        if (user.password !== cleanPassword) {
            console.log(`❌ Senha incorreta para o usuário: ${cleanUsername}`);
            return res.status(401).json({ error: "Senha incorreta" });
        }

        console.log("✅ Login aprovado para:", cleanUsername);
        res.json({
            id: user.id,
            username: user.username,
            role: user.role,
            permissions: {
                aovivo: user.perm_aovivo,
                terminal: user.perm_terminal,
                monitor: user.perm_monitor,
                historico: user.perm_historico
            }
        });
    } catch (err) {
        console.error("🔥 Erro fatal no login:", err);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

// --- FOREX (COM FILTRO DINÂMICO) ---
app.get('/api/get-strength-history', async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    try {
        const { data } = await supabase.from('CurrencyStrength').select('*').order('timestamp', { ascending: false }).limit(limit);
        res.json(data || []);
    } catch (err) { res.status(500).json([]); }
});

// 3. ROTA DE FORÇA (Atualizada)
app.post('/api/update-strength', marketGuard, async (req, res) => {
    const { data } = req.body;
    try {
        // 1. Salva no Supabase
        await supabase.from('CurrencyStrength').insert([{ data }]);

        // 2. Formata a linha para o CSV
        const newRow = formatCsvRow(data);

        // 3. NOVO: Salva direto no Supabase Storage
        await appendForexToStorage(newRow);

        res.sendStatus(200);
    } catch (err) {
        console.error("Erro no processamento:", err);
        res.sendStatus(500);
    }
});

// --- ÍNDICES (COM CACHE E FILTRO) ---
// 4. ROTA DE ÍNDICES (Atualizada)
app.post('/api/update-indices', marketGuard, async (req, res) => {
    const payload = req.body;
    if (payload?.data) {
        try {
            indicesCache = payload;
            // 1. Salva no Supabase banco de dados
            await supabase.from('indiceshistory').insert([{ data: payload.data }]);

            // 2. NOVO: Salva direto no Supabase Storage
            await appendIndicesToStorage(payload.data);

            res.sendStatus(200);
        } catch (err) {
            console.error("Erro ao processar índices:", err);
            res.sendStatus(500);
        }
    } else {
        res.sendStatus(400);
    }
});

app.get('/api/indices-data', async (req, res) => {
    if (!indicesCache.data || Object.keys(indicesCache.data).length === 0) {
        const { data } = await supabase.from('indiceshistory').select('*').order('created_at', { ascending: false }).limit(1);
        if (data && data.length > 0) {
            indicesCache = {
                data: data[0].data,
                metadata: { last_update: new Date(data[0].created_at).toISOString() }
            };
        }
    }
    res.json(indicesCache);
});

app.get('/api/get-indices-history', async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    try {
        const { data } = await supabase.from('indiceshistory').select('*').order('created_at', { ascending: false }).limit(limit);
        res.json(data || []);
    } catch (err) { res.status(500).json([]); }
});

// --- GESTÃO DE USUÁRIOS ---
app.get('/api/users', async (req, res) => {
    const { data } = await supabase.from('User').select('*').order('id');
    res.json(data || []);
});

app.post('/api/users', async (req, res) => {
    const { username, password, email, role, permissions } = req.body;
    await supabase.from('User').insert([{
        username, password, email, role,
        perm_aovivo: permissions.aovivo,
        perm_terminal: permissions.terminal,
        perm_monitor: permissions.monitor,
        perm_historico: permissions.historico
    }]);
    res.json({ msg: "OK" });
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { email, password, role, permissions } = req.body;
    let updates = {
        email, role,
        perm_aovivo: permissions.aovivo,
        perm_terminal: permissions.terminal,
        perm_monitor: permissions.monitor,
        perm_historico: permissions.historico
    };
    if (password) updates.password = password;
    await supabase.from('User').update(updates).eq('id', id);
    res.json({ msg: "OK" });
});

app.delete('/api/users/:id', async (req, res) => {
    await supabase.from('User').delete().eq('id', req.params.id);
    res.json({ msg: "OK" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));

module.exports = app;