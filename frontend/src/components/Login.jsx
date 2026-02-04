import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onLoginSuccess, onClose }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Chamada corrigida para a porta 3001
            const response = await axios.post('http://localhost:3001/api/login', {
                username,
                password
            });

            if (response.data) {
                onLoginSuccess(response.data);
            }
        } catch (err) {
            // Exibe o erro se o usuário ou senha estiverem incorretos
            setError("Acesso negado. Verifique suas credenciais.");
            console.error("Erro no login:", err);
        }
    };

    return (
        <div className="bg-[#0f172a] border border-[#22d3ee]/20 p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>

            <div className="text-center mb-8">
                <div className="text-[#22d3ee] text-4xl mb-4">🔒</div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Acesso Restrito</h2>
                <p className="text-gray-400 text-xs mt-2 uppercase tracking-widest">Área do Membro Elite</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <input
                        type="text"
                        placeholder="Usuário"
                        className="w-full bg-[#1e293b] border border-white/5 p-4 rounded-xl text-white outline-none focus:border-[#22d3ee]/50 transition-all"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <input
                        type="password"
                        placeholder="Senha"
                        className="w-full bg-[#1e293b] border border-white/5 p-4 rounded-xl text-white outline-none focus:border-[#22d3ee]/50 transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {error && <p className="text-red-500 text-[10px] text-center uppercase font-bold">{error}</p>}

                <button
                    type="submit"
                    className="w-full bg-[#22d3ee] text-[#0f172a] font-black py-4 rounded-xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                >
                    Entrar
                </button>
            </form>
        </div>
    );
};

export default Login;