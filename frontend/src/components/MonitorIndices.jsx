import React, { useState, useEffect } from 'react';
import axios from 'axios';

// URL DO SERVIDOR (Agora apontando para a nuvem Vercel)
const API_URL = 'https://institutional-tracker-backend.vercel.app/api';

const MonitorIndices = () => {
    const [data, setData] = useState(null);
    const [currentTime, setCurrentTime] = useState('');

    // Relógio UTC-5
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const utc5 = new Date(now.getTime() - (5 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60000));
            setCurrentTime(utc5.toISOString().replace('T', ' ').substring(0, 19));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Busca de Dados
    useEffect(() => {
        const fetchData = async () => {
            try {
                // CORREÇÃO AQUI: Usando o link da Vercel
                const res = await axios.get(`${API_URL}/indices-data`);
                setData(res.data || {});
            } catch (err) { console.error(err); }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    if (!data || !data.data) return <div className="bg-black text-gray-500 font-mono p-10 h-full flex items-center justify-center">ESTABLISHING UPLINK...</div>;

    const indices = data.data;

    // Ordenação
    const sortedKeys = Object.keys(indices).sort((a, b) => {
        const isAIdx = a.startsWith('IDX_');
        const isBIdx = b.startsWith('IDX_');
        if (isAIdx && !isBIdx) return -1;
        if (!isAIdx && isBIdx) return 1;
        return a.localeCompare(b);
    });

    const getFormat = (val) => {
        const num = val || 0;
        const color = 'text-white';
        let arrow = '→';
        if (num > 0.01) { arrow = '↑'; }
        if (num < -0.01) { arrow = '↓'; }
        return { color, arrow, formatted: num.toFixed(3) };
    };

    return (
        <div className="w-full min-h-screen bg-black text-gray-300 font-mono p-6 md:p-10 selection:bg-white/20">
            <div className="text-gray-500 text-xs mb-8 border-b border-dashed border-gray-800 pb-4 uppercase leading-relaxed">
                ================================================================================<br />
                C:\SYSTEM\GLOBAL_INDICES_MONITOR.EXE [UTC-5: {currentTime}]<br />
                STATUS: ONLINE | DATA SOURCE: GLOBAL FEED<br />
                LAST UPDATE: {data.metadata?.last_update || 'WAITING...'}
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-[600px] max-w-4xl">
                    <div className="flex text-xs font-bold text-white border-b-2 border-white/20 pb-2 mb-2 uppercase tracking-wider">
                        <div className="w-32 pl-2">ATIVO</div>
                        <div className="w-32 text-right border-l border-gray-800/50">1H</div>
                        <div className="w-32 text-right border-l border-gray-800/50">4H</div>
                        <div className="w-32 text-right border-l border-gray-800/50">DIÁRIO</div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        {sortedKeys.map((key) => {
                            const row = indices[key] || {};
                            const f1h = getFormat(row['1h']);
                            const f4h = getFormat(row['4h']);
                            const fD = getFormat(row['daily']);

                            return (
                                <div key={key} className="flex items-center text-sm hover:bg-white/5 py-1.5 border-b border-gray-900/50 transition-colors">
                                    <div className="w-32 pl-2 font-bold text-white tracking-wide">{key}</div>
                                    <div className={`w-32 text-right font-bold border-l border-gray-800/30 ${f1h.color}`}>
                                        {f1h.formatted} <span className="inline-block w-3 text-center ml-1 text-gray-400">{f1h.arrow}</span>
                                    </div>
                                    <div className={`w-32 text-right font-bold border-l border-gray-800/30 ${f4h.color}`}>
                                        {f4h.formatted} <span className="inline-block w-3 text-center ml-1 text-gray-400">{f4h.arrow}</span>
                                    </div>
                                    <div className={`w-32 text-right font-bold border-l border-gray-800/30 ${fD.color}`}>
                                        {fD.formatted} <span className="inline-block w-3 text-center ml-1 text-gray-400">{fD.arrow}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="mt-8 text-[10px] text-gray-600 animate-pulse">
                _ WAITING FOR NEXT TICK...
            </div>
        </div>
    );
};

export default MonitorIndices;