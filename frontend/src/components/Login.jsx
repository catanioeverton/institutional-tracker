import React, { useState } from 'react';
import api from '../utils/api';

export default function Login({ onLoginSuccess, onClose }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            console.log("Iniciando tentativa de login...");

            // Tenta enviar para o Backend
            const { data } = await api.post('/login', { username, password });

            console.log("Login sucesso:", data);
            onLoginSuccess(data);

        } catch (err) {
            console.error("Erro no Login:", err);

            // --- DIAGNÓSTICO DETALHADO (ISSO VAI APARECER NA TELA DO CELULAR) ---
            if (err.response) {
                // O servidor respondeu (Conexão OK), mas recusou o login
                // Ex: 401 (Senha errada) ou 500 (Erro no código)
                setError(`NEGADO PELO SERVIDOR (${err.response.status}): ${err.response.data.error || 'Dados incorretos'}`);
            } else if (err.request) {
                // O servidor NÃO respondeu (Conexão falhou)
                // Isso acontece se o link estiver errado ou internet bloqueando
                setError('ERRO DE CONEXÃO: O celular não encontrou o servidor. Verifique a internet ou o link da API.');
            } else {
                // Outro tipo de erro
                setError(`ERRO INTERNO: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#0a1120] p-8 rounded-2xl border border-white/10 shadow-2xl w-full max-w-md relative">
            {/* Botão Fechar */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
                ✕
            </button>

            <div className="text-center mb-8">
                <div className="text-4xl mb-4">🔒</div>
                <h2 className="text-2xl font-black uppercase tracking-wider text-white">Acesso Restrito</h2>
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-2">Área do Membro Elite</p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                    <input
                        type="text"
                        placeholder="Usuário (Ex: admin)"
                        className="w-full bg-[#050a14] border border-white/10 p-4 rounded-lg text-white placeholder-gray-600 focus:border-[#22d3ee] focus:outline-none transition-colors"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <div>
                    <input
                        type="password"
                        placeholder="Senha"
                        className="w-full bg-[#050a14] border border-white/10 p-4 rounded-lg text-white placeholder-gray-600 focus:border-[#22d3ee] focus:outline-none transition-colors"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                </div>

                {/* MENSAGEM DE ERRO (Agora detalhada em vermelho) */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded text-red-500 text-xs font-bold text-center uppercase tracking-wide">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#22d3ee] text-[#050a14] font-black uppercase tracking-widest py-4 rounded-lg hover:bg-[#22d3ee]/90 transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Verificando...' : 'Entrar'}
                </button>
            </form>
        </div>
    );
}