import React, { useState, useEffect } from 'react';
import axios from 'axios';

// DEFININDO O LINK DA API (VERCEL)
const API_URL = 'https://institutional-tracker-backend.vercel.app/api';

const GestaoUsuarios = () => {
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState({
        username: '', password: '', email: '', role: 'user',
        permissions: { aovivo: false, terminal: false, monitor: false, historico: false }
    });
    const [editingId, setEditingId] = useState(null);

    const fetchUsers = async () => {
        try {
            // Alterado para API_URL
            const res = await axios.get(`${API_URL}/users`);
            setUsers(res.data);
        } catch (err) { console.error("Erro ao listar usuários", err); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleChange = (e) => {
        const { name, value, checked } = e.target;
        if (name.startsWith('perm_')) {
            const permName = name.split('_')[1];
            setForm(prev => ({ ...prev, permissions: { ...prev.permissions, [permName]: checked } }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                // Alterado para API_URL
                await axios.put(`${API_URL}/users/${editingId}`, form);
                alert("Usuário atualizado com sucesso!");
            } else {
                // Alterado para API_URL
                await axios.post(`${API_URL}/users`, form);
                alert("Usuário criado com sucesso!");
            }
            setForm({ username: '', password: '', email: '', role: 'user', permissions: { aovivo: false, terminal: false, monitor: false, historico: false } });
            setEditingId(null);
            fetchUsers();
        } catch (err) { alert("Erro ao salvar usuário. Verifique se o nome já existe."); }
    };

    const handleEdit = (user) => {
        setEditingId(user.id);
        setForm({
            username: user.username, password: '', email: user.email || '', role: user.role,
            permissions: {
                aovivo: user.perm_aovivo, terminal: user.perm_terminal,
                monitor: user.perm_monitor, historico: user.perm_historico
            }
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm("Tem certeza que deseja excluir este usuário permanentemente?")) {
            try {
                // Alterado para API_URL
                await axios.delete(`${API_URL}/users/${id}`);
                fetchUsers();
            } catch (err) { alert("Erro ao excluir."); }
        }
    };

    return (
        <div className="w-full font-sans antialiased text-white space-y-8 animate-fade-in">
            <h2 className="text-lg font-bold uppercase border-l-4 border-[#22d3ee] pl-3">Painel de Gestão de Usuários</h2>

            {/* Formulário de Cadastro/Edição */}
            <div className="bg-[#0a1120] p-8 rounded-2xl border border-white/5 shadow-xl">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 font-bold uppercase">Nome de Usuário</label>
                        <input name="username" value={form.username} onChange={handleChange} required className="w-full bg-black/40 border border-white/10 p-3 rounded text-sm text-white focus:border-[#22d3ee] outline-none" disabled={editingId} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 font-bold uppercase">E-mail</label>
                        <input name="email" type="email" value={form.email} onChange={handleChange} required className="w-full bg-black/40 border border-white/10 p-3 rounded text-sm text-white focus:border-[#22d3ee] outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 font-bold uppercase">{editingId ? "Nova Senha (Opcional)" : "Senha"}</label>
                        <input name="password" type="password" value={form.password} onChange={handleChange} className="w-full bg-black/40 border border-white/10 p-3 rounded text-sm text-white focus:border-[#22d3ee] outline-none" required={!editingId} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 font-bold uppercase">Nível de Acesso</label>
                        <div className="flex items-center gap-4 bg-black/20 p-3 rounded border border-white/5 h-[46px]">
                            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="role" value="user" checked={form.role === 'user'} onChange={handleChange} className="accent-[#22d3ee]" /> Usuário</label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="role" value="admin" checked={form.role === 'admin'} onChange={handleChange} className="accent-[#22d3ee]" /> Admin</label>
                        </div>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label className="text-xs text-gray-500 font-bold uppercase">Permissões de Abas</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-black/20 p-4 rounded border border-white/5">
                            {['aovivo', 'terminal', 'monitor', 'historico'].map(perm => (
                                <label key={perm} className="flex items-center gap-2 text-sm capitalize cursor-pointer hover:text-[#22d3ee] transition-colors">
                                    <input type="checkbox" name={`perm_${perm}`} checked={form.permissions[perm]} onChange={handleChange} className="accent-[#22d3ee] w-4 h-4" />
                                    {perm === 'aovivo' ? 'Ao Vivo' : perm === 'historico' ? 'Histórico Índices' : perm === 'monitor' ? 'Monitor Índices' : 'Terminal'}
                                </label>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="md:col-span-2 bg-[#22d3ee] text-black font-black py-4 rounded hover:bg-cyan-400 transition uppercase tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                        {editingId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                    </button>

                    {editingId && (
                        <button type="button" onClick={() => { setEditingId(null); setForm({ username: '', password: '', email: '', role: 'user', permissions: { aovivo: false, terminal: false, monitor: false, historico: false } }) }} className="md:col-span-2 bg-red-500/10 text-red-500 text-xs py-2 rounded hover:bg-red-500/20 transition uppercase tracking-widest">
                            Cancelar Edição
                        </button>
                    )}
                </form>
            </div>

            {/* Tabela de Listagem */}
            <div className="bg-[#0a1120] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-sm text-left">
                    <thead className="bg-black/40 text-[#22d3ee] uppercase text-xs border-b border-white/5">
                        <tr>
                            <th className="p-4 w-20">ID</th>
                            <th className="p-4">Usuário</th>
                            <th className="p-4">Permissões</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="p-4 text-gray-500 font-mono">#{u.id}</td>
                                <td className="p-4">
                                    <div className="font-bold text-white flex items-center gap-2">
                                        {u.username}
                                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${u.role === 'admin' ? 'bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/30' : 'bg-gray-700/30 text-gray-400 border-gray-600'}`}>{u.role}</span>
                                    </div>
                                    <div className="text-gray-500 text-xs mt-1">{u.email || 'Sem e-mail'}</div>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2 flex-wrap">
                                        {u.perm_aovivo && <span className="bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] px-2 py-0.5 rounded uppercase font-bold">Ao Vivo</span>}
                                        {u.perm_terminal && <span className="bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] px-2 py-0.5 rounded uppercase font-bold">Terminal</span>}
                                        {u.perm_monitor && <span className="bg-purple-500/10 border border-purple-500/20 text-purple-500 text-[10px] px-2 py-0.5 rounded uppercase font-bold">Monitor</span>}
                                        {u.perm_historico && <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] px-2 py-0.5 rounded uppercase font-bold">Histórico</span>}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-3">
                                        <button onClick={() => handleEdit(u)} className="text-blue-400 hover:text-white transition p-2 bg-blue-500/10 rounded hover:bg-blue-500">✏️</button>
                                        <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-white transition p-2 bg-red-500/10 rounded hover:bg-red-500">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GestaoUsuarios;