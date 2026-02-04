import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const CurrencyMonitor = () => {
    const [history, setHistory] = useState([]);
    const [limit, setLimit] = useState(50); // Novo estado para o filtro
    const currencies = ['AUD', 'CAD', 'CHF', 'EUR', 'GBP', 'JPY', 'NZD', 'USD'];

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Passa o limite dinâmico para a API
                const res = await api.get(`/get-strength-history?limit=${limit}`);
                setHistory(res.data || []);
            } catch (err) { console.error(err); }
        };
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [limit]); // Recarrega se o limite mudar

    if (history.length === 0) return <div className="text-center p-10 text-[#22d3ee] animate-pulse font-bold">Sincronizando Mercado...</div>;

    const latest = history[0].data;

    return (
        <div className="space-y-6 w-full antialiased" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
            <div className="flex gap-4">
                {['h1', 'h4', 'daily'].map(m => (
                    <div key={m} className="bg-[#0a1120] border border-white/5 p-4 rounded-xl flex-1 text-center shadow-lg">
                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 tracking-widest">Setup {m.toUpperCase()}</div>
                        <div className="text-2xl font-black text-[#22d3ee]">⚡ {latest[`setup_${m}`]}</div>
                    </div>
                ))}
            </div>

            <div className="space-y-2">
                {/* Seletor de Linhas */}
                <div className="flex justify-end">
                    <select
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="bg-[#0a1120] border border-white/10 text-gray-400 text-xs rounded px-2 py-1 outline-none focus:border-[#22d3ee] font-bold uppercase tracking-wide"
                    >
                        <option value={50}>Exibir: 50 Linhas</option>
                        <option value={288}>Exibir: 288 Linhas</option>
                    </select>
                </div>

                <div className="bg-[#0a1120] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <table className="w-full text-[13px] border-collapse table-auto">
                        <thead className="bg-[#0a1120] sticky top-0 z-10">
                            <tr className="text-[#22d3ee] border-b border-white/5 uppercase">
                                <th className="py-4 px-2 text-left font-bold whitespace-nowrap">Horário</th>
                                {currencies.map(c => <th key={c} colSpan="3" className="py-3 px-0.5 text-center border-l border-white/5 font-bold">{c}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((row, idx) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors font-bold">
                                    <td className="py-3 px-2 text-gray-500 whitespace-nowrap">
                                        {new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    {currencies.map(c => {
                                        const d = row.data || {};
                                        const v1 = d.h1?.[c] || 0;
                                        const v4 = d.h4?.[c] || 0;
                                        const vd = d.daily?.[c] || 0;

                                        return (
                                            <React.Fragment key={c}>
                                                <td className={`py-2 px-0 text-center border-l border-white/5 ${v1 > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    <span className="mr-0.5 text-[11px] font-black">{v1 > 0 ? '↑' : '↓'}</span>
                                                    {Math.abs(v1).toFixed(2)}
                                                </td>
                                                <td className={`py-2 px-0 text-center ${v4 > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    <span className="mr-0.5 text-[11px] font-black">{v4 > 0 ? '↑' : '↓'}</span>
                                                    {Math.abs(v4).toFixed(2)}
                                                </td>
                                                <td className={`py-2 px-0 text-center ${vd > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    <span className="mr-0.5 text-[11px] font-black">{vd > 0 ? '↑' : '↓'}</span>
                                                    {Math.abs(vd).toFixed(2)}
                                                </td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CurrencyMonitor;