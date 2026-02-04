import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LiveMonitor = () => {
    const [strengths, setStrengths] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('http://localhost:3001/api/get-strength');
                setStrengths(response.data.data || {});
            } catch (err) {
                console.error("Erro ao carregar monitor:", err);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // Atualiza a cada 5 segundos
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            {Object.entries(strengths).map(([currency, value]) => (
                <div key={currency} className="bg-[#0a1120] border border-[#22d3ee]/20 p-4 rounded-xl text-center">
                    <div className="text-[#22d3ee] text-xs font-bold mb-1 uppercase tracking-widest">{currency}</div>
                    <div className="text-2xl font-black text-white">{value.toFixed(1)}</div>
                    {/* Barra de progresso visual para facilitar a leitura rápida */}
                    <div className="w-full bg-gray-800 h-1.5 mt-3 rounded-full overflow-hidden">
                        <div
                            className="bg-[#22d3ee] h-full transition-all duration-500"
                            style={{ width: `${(value / 10) * 100}%` }}
                        ></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LiveMonitor;