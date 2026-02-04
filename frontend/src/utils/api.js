import axios from 'axios';

// URL DO BACKEND NA VERCEL
// (Quando você subir o backend, copie a URL dele e cole aqui no lugar deste texto)
const PROD_URL = 'https://sua-url-backend-na-vercel.app';

const api = axios.create({
    baseURL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3001/api' // Usa Localhost se estiver no seu PC
        : `${PROD_URL}/api`            // Usa Vercel se estiver na internet
});

export default api;