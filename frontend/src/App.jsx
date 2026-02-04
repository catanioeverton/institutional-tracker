import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import CurrencyMonitor from './components/CurrencyMonitor';
import Terminal from './components/Terminal';
import MonitorIndices from './components/MonitorIndices';
import HistoricoIndices from './components/HistoricoIndices';
import GestaoUsuarios from './components/GestaoUsuarios';
// Adicionando a imagem de fundo que você mostrou no print, se houver, 
// mas mantendo o foco nos textos que você pediu.

export default function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('aovivo');

  // Persistência no F5
  useEffect(() => {
    const savedUser = localStorage.getItem('app_user');
    const savedTab = localStorage.getItem('app_activeTab');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      if (savedTab) setActiveTab(savedTab);
    }
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem('app_activeTab', activeTab);
  }, [activeTab, user]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('app_user', JSON.stringify(userData));
    setShowLogin(false);
    setActiveTab('aovivo');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('app_user');
    localStorage.removeItem('app_activeTab');
    setActiveTab('aovivo');
  };

  if (user) {
    return (
      <div className="min-h-screen bg-[#050a14] text-white font-sans selection:bg-cyan-500/30">
        <header className="bg-[#0a1120] border-b border-white/5 sticky top-0 z-50">
          <div className="max-w-[1600px] mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-xl font-black tracking-tighter uppercase">
              INSTITUTIONAL <span className="text-[#22d3ee]">TRACKER</span>
            </h1>

            <nav className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5">
              {[
                { id: 'aovivo', label: 'Ao Vivo', icon: '📊', perm: user.permissions?.aovivo },
                { id: 'terminal', label: 'Terminal', icon: '🖥️', perm: user.permissions?.terminal },
                { id: 'monitor', label: 'Monitor Índices', icon: '🌐', perm: user.permissions?.monitor },
                { id: 'historico', label: 'Histórico Índices', icon: '🕒', perm: user.permissions?.historico },
                { id: 'usuarios', label: 'Gestão Usuários', icon: '👥', perm: user.role === 'admin' },
              ].map((tab) => tab.perm && (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id
                      ? 'bg-[#22d3ee] text-[#050a14] shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span className="text-xs">{tab.icon}</span> {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                BEM-VINDO, {user.username} {user.role === 'admin' && <span className="text-[#22d3ee] ml-1">(ADMIN)</span>}
              </span>
              <button onClick={handleLogout} className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg text-[10px] font-black text-red-500 hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest">
                Sair
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto p-6">
          {activeTab === 'aovivo' && <CurrencyMonitor />}
          {activeTab === 'terminal' && <Terminal />}
          {activeTab === 'monitor' && <MonitorIndices />}
          {activeTab === 'historico' && <HistoricoIndices />}
          {activeTab === 'usuarios' && user.role === 'admin' && <GestaoUsuarios />}
        </main>
      </div>
    );
  }

  // --- LANDING PAGE (TEXTOS ATUALIZADOS) ---
  return (
    <div className="min-h-screen bg-[#050a14] text-white font-sans">
      <header className="flex justify-between p-6 max-w-7xl mx-auto items-center">
        <h1 className="text-xl font-black uppercase">INSTITUTIONAL <span className="text-[#22d3ee]">TRACKER</span></h1>
        <button onClick={() => setShowLogin(true)} className="border border-[#22d3ee]/40 px-5 py-2 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-cyan-500/10 transition-colors">🔒 ACESSO EXCLUSIVO</button>
      </header>

      <main className="flex flex-col items-center justify-center text-center mt-20 px-4">
        {/* Subtítulo de impacto */}
        <h2 className="text-[#10b981] text-[10px] font-bold tracking-[0.4em] mb-4 uppercase">ECOSSISTEMA DE INTELIGÊNCIA INSTITUCIONAL</h2>

        {/* Headline Principal - Mais agressiva */}
        <h3 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
          Não Opere Gráficos.<br />
          Rastreie o <span className="text-[#22d3ee]">Smart Money.</span>
        </h3>

        {/* Descrição - Focada na vantagem técnica */}
        <p className="max-w-2xl text-gray-400 text-sm mb-10 leading-relaxed">
          A fusão definitiva entre a matemática da <strong>Força Relativa</strong> e a precisão dos <strong>Conceitos ICT</strong>.
          Enxergue a liquidez oculta e posicione-se onde os grandes bancos estão montando suas ordens.
        </p>

        <button onClick={() => setShowLogin(true)} className="bg-[#22d3ee] px-10 py-4 rounded-full font-black text-[#050a14] text-sm uppercase shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:scale-105 transition-all">
          ENTRAR NO SISTEMA ➔
        </button>
      </main>

      {/* Cards de Features - Copywriting Técnico */}
      <section className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 px-6 mt-32 pb-20">

        <div className="bg-[#0a1120] border border-white/5 p-10 rounded-2xl relative overflow-hidden group hover:border-[#22d3ee]/30 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#22d3ee] opacity-50"></div>
          <div className="text-[#22d3ee] text-2xl mb-6">⚡</div>
          <h4 className="text-xl font-bold mb-4">Algoritmo de Força Relativa</h4>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Esqueça indicadores atrasados. Nosso motor processa milhares de ticks em tempo real para calcular matematicamente qual moeda está dominando o fluxo, entregando a <strong>vantagem estatística pura</strong> antes do movimento acontecer.
          </p>
        </div>

        <div className="bg-[#0a1120] border border-white/5 p-10 rounded-2xl relative overflow-hidden group hover:border-[#10b981]/30 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#10b981] opacity-50"></div>
          <div className="text-[#10b981] text-2xl mb-6">🏛️</div>
          <h4 className="text-xl font-bold mb-4">Mapeamento de Liquidez (ICT)</h4>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Decodificamos a narrativa institucional. Identificação automática de <strong>Order Blocks</strong> e <strong>Fair Value Gaps</strong> para que você pare de ser a liquidez e comece a operar junto com os Market Makers.
          </p>
        </div>

      </section>

      {showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050a14]/90 backdrop-blur-md p-4">
          <Login onClose={() => setShowLogin(false)} onLoginSuccess={handleLoginSuccess} />
        </div>
      )}
    </div>
  );
}