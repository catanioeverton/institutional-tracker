import axios from 'axios';

// OBRIGATÓRIO: Link do BACKEND (A Cozinha/API)
// Se colocar o do frontend aqui, não funciona.
const api = axios.create({
    baseURL: 'https://institutional-tracker-backend.vercel.app/api'
});

export default api;