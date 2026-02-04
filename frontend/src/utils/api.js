import axios from 'axios';

// URL FIXA DA VERCEL (Copie exatamente o link do seu Backend em 'Domains' na Vercel)
// Exemplo: 'https://institutional-tracker-backend.vercel.app'
const PROD_URL = 'https://institutional-tracker-backend.vercel.app';

const api = axios.create({
    // FORÇAMOS usar sempre a URL da produção, mesmo estando local.
    // Isso garante que se funcionar no seu PC, TEM que funcionar no celular.
    baseURL: `${PROD_URL}/api`
});

export default api;