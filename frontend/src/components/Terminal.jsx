import React, { useState, useEffect } from 'react';
import axios from 'axios';

// URL DO SERVIDOR (Agora apontando para a nuvem Vercel)
const API_URL = 'https://institutional-tracker-backend.vercel.app/api';

const Terminal = () => {
    const [history, setHistory] = useState([]);
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
                const res = await axios.get(`${API_URL}/get-strength-history`);
                setHistory(res.data || []);
            } catch (err) { console.error(err); }
        };
        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, []);

    if (history.length === 0) return <div className="bg-black text-gray-500 font-mono p-10 h-full">INITIALIZING SYSTEM...</div>;

    const latest = history[0].data || {};

    // Função de Renderização Vertical
    const renderSection = (title, dataKey, scoreKey) => {
        const data = latest[dataKey] || {};
        const scores = latest[scoreKey] || {};
        const sorted = Object.entries(data).sort(([, a], [, b]) => b - a);

        return (
            <div className="mb-8 w-full max-w-2xl">
                <div className="text-white mb-2 font-bold text-sm uppercase tracking-wider border-b border-gray-800 pb-1 inline-block">
                    [ {title} ]
                </div>
                <div className="flex flex-col">
                    {sorted.map(([curr, val]) => {
                        const score = scores[curr] !== undefined ? scores[curr] : 0;
                        const arrow = val > 0.005 ? '↑' : val < -0.005 ? '↓' : '→';

                        return (
                            <div key={curr} className="flex items-center text-sm font-mono hover:bg-white/10 py-0.5">
                                <span className="w-12 font-bold text-white">{curr}:</span>
                                <span className="w-20 text-right text-white">{val.toFixed(3)}</span>
                                <span className="mx-4 text-gray-600">|</span>
                                <span className="w-24 text-gray-400">
                                    Score: <span className="text-white ml-1">{String(score).padStart(2, ' ')}</span>
                                </span>
                                <span className="text-white ml-2">{arrow}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="w-full min-h-screen bg-black text-gray-300 font-mono p-8 selection:bg-white/20">
            <div className="text-gray-500 text-xs mb-8 border-b border-dashed border-gray-800 pb-4 uppercase">
                ================================================================================
                <br />
                C:\SYSTEM\INSTITUTIONAL_TRACKER.EXE [UTC-5: {currentTime}]
            </div>

            <div className="flex flex-col items-start">
                {renderSection('1 HORA', 'h1', 'scores_h1')}
                {renderSection('4 HORAS', 'h4', 'scores_h4')}
                {renderSection('DIÁRIO', 'daily', 'scores_daily')}
            </div>

            <div className="mt-8 pt-4 border-t border-dashed border-gray-800 w-full max-w-4xl">
                <div className="text-xs text-yellow-600 font-bold mb-3 uppercase tracking-widest">[ SETUPS DETECTADOS ]</div>
                <div className="flex flex-wrap gap-10 text-sm font-bold font-mono">
                    <div className="flex items-center gap-3">
                        <span className="text-orange-600">⚡ 1H .....</span>
                        <span className="text-yellow-500">{latest.setup_h1 || '...'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-orange-600">⚡ 4H .....</span>
                        <span className="text-yellow-500">{latest.setup_h4 || '...'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-orange-600">⚡ DAILY ..</span>
                        <span className="text-yellow-500">{latest.setup_daily || '...'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Terminal;