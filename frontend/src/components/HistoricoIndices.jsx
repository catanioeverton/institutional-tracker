import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const HistoricoIndices = () => {
    const [history, setHistory] = useState([]);
    const [limit, setLimit] = useState(50); // Novo estado

    const assets = [
        'IDX_USD', 'IDX_EUR', 'IDX_GBP', 'IDX_JPY',
        'IDX_CHF', 'IDX_CAD', 'IDX_AUD', 'IDX_NZD'
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Passa o limite dinâmico
                const res = await api.get(`/get-indices-history?limit=${limit}`);
                if (Array.isArray(res.data)) setHistory(res.data);
            } catch (err) { console.error("Erro ao buscar histórico:", err); }
        };
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [limit]); // Recarrega ao mudar

    const formatCell = (val) => {
        const num = val || 0;
        const color = num > 0 ? 'text-green-400' : num < 0 ? 'text-red-400' : 'text-gray-500';
        return <span className={`${color} font-bold text-[13px]`}>{num > 0 ? '+' : ''}{num.toFixed(2)}</span>;
    };

    return (
        <div className="space-y-6 w-full font-sans antialiased">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-white uppercase border-l-4 border-[#22d3ee] pl-3">
                    Histórico de Índices <span className="text-gray-500 text-xs ml-2">(1H / 4H / Diário)</span>
                </h2>

                {/* Seletor de Linhas */}
                <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="bg-[#0a1120] border border-white/10 text-gray-400 text-xs rounded px-2 py-1 outline-none focus:border-[#22d3ee] font-bold uppercase tracking-wide"
                >
                    <option value={50}>Exibir: 50 Linhas</option>
                    <option value={288}>Exibir: 288 Linhas</option>
                </select>
            </div>

            <div className="bg-[#0a1120] border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-[12px] border-collapse min-w-[1100px]">
                        <thead className="bg-[#0a1120] border-b border-white/5 text-[#22d3ee]">
                            <tr>
                                <th className="py-4 px-4 text-left border-r border-white/5 sticky left-0 bg-[#0a1120] z-20">HORÁRIO</th>
                                {assets.map(asset => (
                                    <th key={asset} colSpan="3" className="py-2 px-4 border-l border-white/5 text-center font-black uppercase tracking-widest bg-white/5">
                                        {asset}
                                    </th>
                                ))}
                            </tr>
                            <tr className="text-[10px] text-gray-400 bg-black/20">
                                <th className="border-r border-white/5 sticky left-0 bg-[#0a1120] z-20"></th>
                                {assets.map(asset => (
                                    <React.Fragment key={`sub-${asset}`}>
                                        <th className="py-1 border-l border-white/5">1H</th>
                                        <th className="py-1 border-l border-white/10">4H</th>
                                        <th className="py-1 border-l border-white/10">DIA</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 ? (
                                <tr><td colSpan={assets.length * 3 + 1} className="py-10 text-center text-gray-500 italic">Aguardando novos dados...</td></tr>
                            ) : (
                                history.map((row, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-4 text-gray-400 font-bold border-r border-white/5 sticky left-0 bg-[#0a1120] z-10 whitespace-nowrap">
                                            {row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </td>
                                        {assets.map(asset => {
                                            const assetData = row.data?.[asset] || {};
                                            return (
                                                <React.Fragment key={`${i}-${asset}`}>
                                                    <td className="py-2 px-2 text-center border-l border-white/5">
                                                        {formatCell(assetData['1h'])}
                                                    </td>
                                                    <td className="py-2 px-2 text-center border-l border-white/10">
                                                        {formatCell(assetData['4h'])}
                                                    </td>
                                                    <td className="py-2 px-2 text-center border-l border-white/10 bg-white/5">
                                                        {formatCell(assetData['daily'])}
                                                    </td>
                                                </React.Fragment>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HistoricoIndices;