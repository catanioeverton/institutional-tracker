const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const { google } = require('googleapis');

// --- CONFIGURAÇÃO GOOGLE DRIVE ---
let drive;
try {
    const serviceAccountVar = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountVar) {
        const serviceAccount = JSON.parse(serviceAccountVar);
        const auth = new google.auth.GoogleAuth({
            credentials: serviceAccount,
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });
        drive = google.drive({ version: 'v3', auth });
        console.log("✅ Google Drive API configurada com sucesso.");
    }
} catch (err) {
    console.error("❌ Erro ao processar JSON da conta de serviço:", err.message);
}

const DRIVE_FOLDER_ID = '1u4EhTBCJYq2l2U7UaSnXr6MGKLf700uo';

// --- FUNÇÕES AUXILIARES DRIVE (DEFINIDAS ANTES DAS ROTAS) ---

async function appendToGoogleDrive(csvRow) {
    if (!drive) return;
    const fileName = `historico_forca_${new Date().toISOString().split('T')[0]}.csv`;
    try {
        const res = await drive.files.list({
            q: `name = '${fileName}' and '${DRIVE_FOLDER_ID}' in parents and trashed = false`,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });
        const file = res.data.files[0];
        if (file) {
            const existingFile = await drive.files.get({ fileId: file.id, alt: 'media', supportsAllDrives: true });
            await drive.files.update({
                fileId: file.id,
                media: { mimeType: 'text/csv', body: existingFile.data + '\n' + csvRow },
                supportsAllDrives: true
            });
            console.log(`✅ Planilha Forex [${fileName}] atualizada.`);
        } else {
            const header = "Data;AUD_1h;AUD_4h;AUD_D;CAD_1h;CAD_4h;CAD_D;CHF_1h;CHF_4h;CHF_D;EUR_1h;EUR_4h;EUR_D;GBP_1h;GBP_4h;GBP_D;JPY_1h;JPY_4h;JPY_D;NZD_1h;NZD_4h;NZD_D;USD_1h;USD_4h;USD_D;Setup_H1;Setup_H4;Setup_Daily";
            await drive.files.create({
                requestBody: { name: fileName, parents: [DRIVE_FOLDER_ID] },
                media: { mimeType: 'text/csv', body: header + '\n' + csvRow },
                supportsAllDrives: true
            });
            console.log(`✅ Planilha Forex [${fileName}] criada.`);
        }
    } catch (err) { console.error("⚠️ Erro Drive Forex:", err.message); }
}

async function appendIndicesToGoogleDrive(indicesData) {
    if (!drive) return;
    const fileName = `historico_indices_${new Date().toISOString().split('T')[0]}.csv`;
    try {
        const res = await drive.files.list({
            q: `name = '${fileName}' and '${DRIVE_FOLDER_ID}' in parents and trashed = false`,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });
        const file = res.data.files[0];
        const now = new Date();
        const ts = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) - (5 * 60 * 60 * 1000)).toISOString().replace('T', ' ').substring(0, 19);

        let csvRow = `${ts}`;
        const ativos = Object.keys(indicesData);
        ativos.forEach(ativo => {
            const d = indicesData[ativo];
            csvRow += `;${d.h1 || 0};${d.h4 || 0};${d.daily || 0}`;
        });

        if (file) {
            const existingFile = await drive.files.get({ fileId: file.id, alt: 'media', supportsAllDrives: true });
            await drive.files.update({
                fileId: file.id,
                media: { mimeType: 'text/csv', body: existingFile.data + '\n' + csvRow },
                supportsAllDrives: true
            });
            console.log(`✅ Planilha Índices [${fileName}] atualizada.`);
        } else {
            let header = "Data";
            ativos.forEach(ativo => { header += `;1h_${ativo};4h_${ativo};D_${ativo}`; });
            await drive.files.create({
                requestBody: { name: fileName, parents: [DRIVE_FOLDER_ID] },
                media: { mimeType: 'text/csv', body: header + '\n' + csvRow },
                supportsAllDrives: true
            });
            console.log(`✅ Planilha Índices [${fileName}] criada.`);
        }
    } catch (err) { console.error("⚠️ Erro Drive Índices:", err.message); }
}

// --- CONFIGURAÇÃO SERVER & SUPABASE ---
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const supabaseUrl = 'https://lofcuoeibkhuoaddcgwn.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Mantenha sua chave
const supabase = createClient(supabaseUrl, supabaseKey);

let indicesCache = { data: {}, metadata: { last_update: "Inicializando..." } };

const isMarketOpen = () => {
    const now = new Date();
    const utc5 = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) - (5 * 60 * 60 * 1000));
    const day = utc5.getDay();
    const hour = utc5.getHours();
    if (day === 0) return hour >= 17;
    if (day >= 1 && day <= 4) return true;
    if (day === 5) return hour < 16;
    return false;
};

const marketGuard = (req, res, next) => {
    if (!isMarketOpen()) return res.status(503).json({ error: "Mercado Fechado" });
    next();
};

const formatCsvRow = (data) => {
    const now = new Date();
    const ts = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) - (5 * 60 * 60 * 1000)).toISOString().replace('T', ' ').substring(0, 19);
    const currencies = ['AUD', 'CAD', 'CHF', 'EUR', 'GBP', 'JPY', 'NZD', 'USD'];
    let row = `${ts}`;
    currencies.forEach(curr => {
        row += `;${data.h1?.[curr] || 0};${data.h4?.[curr] || 0};${data.daily?.[curr] || 0}`;
    });
    row += `;${data.setup_h1 || ''};${data.setup_h4 || ''};${data.setup_daily || ''}`;
    return row;
};

// --- ROTAS ---

app.get('/', (req, res) => res.send('API Institutional Tracker Online 🚀'));

app.post('/api/login', async (req, res) => {
    let { username, password } = req.body;
    const cleanUsername = username?.trim() || "";
    const cleanPassword = password?.trim() || "";
    try {
        const { data: user, error } = await supabase.from('User').select('*').eq('username', cleanUsername).maybeSingle();
        if (!user || user.password !== cleanPassword) return res.status(401).json({ error: "Credenciais inválidas" });
        res.json({ id: user.id, username: user.username, role: user.role, permissions: { aovivo: user.perm_aovivo, terminal: user.perm_terminal, monitor: user.perm_monitor, historico: user.perm_historico } });
    } catch (err) { res.status(500).json({ error: "Erro interno" }); }
});

app.post('/api/update-strength', marketGuard, async (req, res) => {
    const { data } = req.body;
    try {
        await supabase.from('CurrencyStrength').insert([{ data }]);
        const newRow = formatCsvRow(data);
        await appendToGoogleDrive(newRow); // AGORA DEFINIDA CORRETAMENTE
        res.sendStatus(200);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/update-indices', marketGuard, async (req, res) => {
    const payload = req.body;
    if (payload?.data) {
        try {
            indicesCache = payload;
            await supabase.from('indiceshistory').insert([{ data: payload.data }]);
            await appendIndicesToGoogleDrive(payload.data);
            res.sendStatus(200);
        } catch (err) { res.status(500).send(err.message); }
    } else { res.sendStatus(400); }
});

// ... (Mantenha suas outras rotas GET de histórico e usuários abaixo)
app.get('/api/indices-data', async (req, res) => res.json(indicesCache));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
module.exports = app;