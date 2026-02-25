const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const { google } = require('googleapis');

// Configuração de Autenticação do Google Drive com Proteção
let drive;
try {
    const serviceAccountVar = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountVar) {
        // Tenta converter a string da Vercel em objeto JSON
        const serviceAccount = JSON.parse(serviceAccountVar);

        const auth = new google.auth.GoogleAuth({
            credentials: serviceAccount,
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        drive = google.drive({ version: 'v3', auth });
        console.log("✅ Google Drive API configurada com sucesso.");
    } else {
        console.warn("⚠️ Aviso: Variável GOOGLE_SERVICE_ACCOUNT_JSON não encontrada.");
    }
} catch (err) {
    // Se a chave estiver ruim, o servidor avisa no log mas NÃO TRAVA o login
    console.error("❌ Erro ao processar JSON da conta de serviço:", err.message);
}
// ID da sua pasta do Drive que você enviou
const DRIVE_FOLDER_ID = '1u4EhTBCJYq2l2U7UaSnXr6MGKLf700uo';

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

// Configuração do Supabase
const supabaseUrl = 'https://lofcuoeibkhuoaddcgwn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZmN1b2VpYmtodW9hZGRjZ3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTg0NjAsImV4cCI6MjA4NTczNDQ2MH0.ZbZECkvojwCN2X_C9gN2w_1h20elC3um2ovsgCqqTcM';
const supabase = createClient(supabaseUrl, supabaseKey);

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

async function appendToGoogleDrive(content) {
    try {
        const fileName = `historico_forca_${new Date().toISOString().split('T')[0]}.csv`;

        const res = await drive.files.list({
            q: `name = '${fileName}' and '${DRIVE_FOLDER_ID}' in parents and trashed = false`,
            fields: 'files(id)',
        });

        if (res.data.files.length > 0) {
            const fileId = res.data.files[0].id;

            // --- CORREÇÃO AQUI ---
            // Para anexar na Vercel, o método mais seguro é baixar e subir ou 
            // usar o modo de atualização de mídia.
            await drive.files.update({
                fileId: fileId,
                media: {
                    mimeType: 'text/csv',
                    body: content // O Google Drive API v3 permite substituir o conteúdo
                }
            });
        } else {
            const header = "Horario;1h_AUD;4h_AUD;D_AUD;1h_CAD;4h_CAD;D_CAD;1h_CHF;4h_CHF;D_CHF;1h_EUR;4h_EUR;D_EUR;1h_GBP;4h_GBP;D_GBP;1h_JPY;4h_JPY;D_JPY;1h_NZD;4h_NZD;D_NZD;1h_USD;4h_USD;D_USD;Setup_1H;Setup_4H;Setup_Daily\n";
            await drive.files.create({
                requestBody: { name: fileName, parents: [DRIVE_FOLDER_ID] },
                media: { mimeType: 'text/csv', body: header + content },
            });
        }
        console.log(`✅ Planilha atualizada no Drive: ${fileName}`);
    } catch (err) {
        console.error("⚠️ Erro na API do Drive:", err.message);
    }
}

// --- LOGIN (COM MODO ESPIÃO/DEBUG ATIVADO) ---
app.post('/api/login', async (req, res) => {
    let { username, password } = req.body;

    // --- ÁREA DE DEBUG (O que está chegando do celular?) ---
    console.log("\n========================================");
    console.log("🔍 NOVA TENTATIVA DE LOGIN DETECTADA");
    console.log("1. Recebido Bruto (JSON):", JSON.stringify(req.body));

    // Limpeza de Espaços
    const originalUsername = username;
    const originalPassword = password;

    if (username) username = username.trim();
    if (password) password = password.trim();

    console.log(`2. Após limpeza (.trim): Usuário='${username}' | Senha='${password}'`);
    if (originalPassword !== password) console.log("⚠️ AVISO: A senha original tinha espaços extras!");

    try {
        // Busca o usuário no banco ignorando Maiúscula/Minúscula (ilike)
        const { data: user, error } = await supabase
            .from('User')
            .select('*')
            .eq('username', username.trim()) // Usando .eq para teste exato
            .single();
        // Verificações
        if (error || !user) {
            console.log("❌ ERRO: Usuário não encontrado no Supabase.");
            return res.status(401).json({ error: "Usuário não encontrado" });
        }

        console.log(`3. Usuário encontrado no Banco: ID ${user.id} (${user.username})`);
        console.log(`   Senha no Banco: '${user.password}'`);

        // A senha deve ser exata
        if (user.password !== password) {
            console.log("❌ ERRO: Senha incorreta!");
            console.log(`   Esperado (Banco): '${user.password}' (Tamanho: ${user.password.length})`);
            console.log(`   Recebido (Input): '${password}' (Tamanho: ${password.length})`);

            // Dica extra no log se for problema de Maiúscula/Minúscula na senha
            if (user.password.toLowerCase() === password.toLowerCase()) {
                console.log("💡 DICA: A senha está certa, mas a Maiúscula/Minúscula está diferente.");
            }

            return res.status(401).json({ error: "Senha incorreta" });
        }

        console.log("✅ SUCESSO: Login aprovado.");
        console.log("========================================\n");

        // Sucesso
        res.json({
            id: user.id, username: user.username, role: user.role,
            permissions: {
                aovivo: user.perm_aovivo,
                terminal: user.perm_terminal,
                monitor: user.perm_monitor,
                historico: user.perm_historico
            }
        });
    } catch (err) {
        console.error("🔥 ERRO CRÍTICO NO LOGIN:", err);
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

app.post('/api/update-strength', marketGuard, async (req, res) => {
    const { data } = req.body;
    try {
        // 1. Salva no Supabase
        await supabase.from('CurrencyStrength').insert([{ data }]);

        // 2. Formata a linha para o CSV
        const newRow = formatCsvRow(data);

        // 3. Envia para o Google Drive (Função que usará a API que você vai liberar)
        await appendToGoogleDrive(newRow);

        res.sendStatus(200);
    } catch (err) {
        console.error("Erro no processamento:", err);
        res.sendStatus(500);
    }
});

// --- ÍNDICES (COM CACHE E FILTRO) ---
app.post('/api/update-indices', marketGuard, async (req, res) => {
    const payload = req.body; // Recebe o 'payload_indices' do Python
    if (payload?.data) {
        indicesCache = payload;
        await supabase.from('indiceshistory').insert([{ data: payload.data }]);
    }
    res.sendStatus(200);
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