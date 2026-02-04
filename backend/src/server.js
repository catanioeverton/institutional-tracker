const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Permite conexões de qualquer lugar (necessário para Vercel/Mobile)
app.use(cors({ origin: '*' }));
app.use(express.json());

// Configuração do Supabase
const supabaseUrl = 'https://lofcuoeibkhuoaddcgwn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvZmN1b2VpYmtodW9hZGRjZ3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTg0NjAsImV4cCI6MjA4NTczNDQ2MH0.ZbZECkvojwCN2X_C9gN2w_1h20elC3um2ovsgCqqTcM';
const supabase = createClient(supabaseUrl, supabaseKey);

// Cache em RAM (Necessário para evitar delay na Vercel)
let indicesCache = { data: {}, metadata: { last_update: "Inicializando..." } };

app.get('/', (req, res) => res.send('API Institutional Tracker Online 🚀'));

// --- LOGIN (BLINDADO PARA MOBILE/EXTERNO) ---
app.post('/api/login', async (req, res) => {
    let { username, password } = req.body;

    // 1. Limpeza de Espaços (Resolve o problema do celular adicionar espaço no final)
    if (username) username = username.trim();
    if (password) password = password.trim();

    try {
        // 2. Busca o usuário no banco ignorando Maiúscula/Minúscula (ilike)
        const { data: user, error } = await supabase
            .from('User')
            .select('*')
            .ilike('username', username)
            .single();

        // 3. Verificações
        if (error || !user) {
            return res.status(401).json({ error: "Usuário não encontrado" });
        }

        // A senha deve ser exata
        if (user.password !== password) {
            return res.status(401).json({ error: "Senha incorreta" });
        }

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
        console.error("Erro no Login:", err);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

// --- FOREX (COM FILTRO DINÂMICO) ---
app.get('/api/get-strength-history', async (req, res) => {
    // Pega o limite da URL (ex: ?limit=288) ou usa 50 como padrão
    const limit = parseInt(req.query.limit) || 50;
    try {
        const { data } = await supabase.from('CurrencyStrength').select('*').order('timestamp', { ascending: false }).limit(limit);
        res.json(data || []);
    } catch (err) { res.status(500).json([]); }
});

app.post('/api/update-strength', async (req, res) => {
    const { data } = req.body;
    try { await supabase.from('CurrencyStrength').insert([{ data }]); res.sendStatus(200); } catch (err) { res.sendStatus(500); }
});

// --- ÍNDICES (COM CACHE E FILTRO) ---
app.post('/api/update-indices', async (req, res) => {
    const payload = req.body;
    if (payload?.data) {
        indicesCache = payload;
        await supabase.from('indiceshistory').insert([{ data: payload.data }]);
    }
    res.sendStatus(200);
});

app.get('/api/indices-data', async (req, res) => {
    // Se o cache estiver vazio (Vercel resetou), busca do banco
    if (!indicesCache.data || Object.keys(indicesCache.data).length === 0) {
        const { data } = await supabase.from('indiceshistory').select('*').order('created_at', { ascending: false }).limit(1);
        if (data && data.length > 0) {
            // Reconstrói o cache usando o último dado do banco
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
    if (password) updates.password = password; // Só atualiza senha se enviada
    await supabase.from('User').update(updates).eq('id', id);
    res.json({ msg: "OK" });
});

app.delete('/api/users/:id', async (req, res) => {
    await supabase.from('User').delete().eq('id', req.params.id);
    res.json({ msg: "OK" });
});

// Configuração de Porta e Exportação (Necessário para Vercel)
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));

module.exports = app;