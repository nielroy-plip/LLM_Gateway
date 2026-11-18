'use client';

import { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Cpu, 
  DollarSign, 
  AlertTriangle, 
  RefreshCw, 
  Terminal, 
  TrendingUp, 
  Zap, 
  Lock, 
  Server,
  Radio
} from 'lucide-react';

interface StatsData {
  circuit: {
    state: 'CLOSED' | 'HALF_OPEN' | 'OPEN';
    stats: {
      failures: number;
      fallbacks: number;
      successes: number;
      fires: number;
    };
  };
  metrics: {
    totalRequests: number;
    localRequests: number;
    fallbackRequests: number;
    directCloudRequests: number;
    localRoutingRate: number;
    fallbackRate: number;
    avgLatencyMs: number;
    totalPiiBlocked: number;
    totalSavedUsd: number;
    totalFallbackCostUsd: number;
  };
}

interface LogItem {
  id: string;
  timestamp: string;
  provider: 'OLLAMA_LOCAL' | 'CLOUD_FALLBACK' | 'CLOUD_DIRECT';
  routingReason: string;
  latencyMs: number;
  piiSanitized: boolean;
  piiTypes: string[];
  estimatedTokens: number;
  savedCostUsd: number;
  fallbackCostUsd: number;
  promptPreview: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch('http://localhost:3001/api/stats'),
        fetch('http://localhost:3001/api/logs?limit=20')
      ]);

      const statsData = await statsRes.json();
      const logsData = await logsRes.json();

      setStats(statsData);
      setLogs(logsData.logs || []);
    } catch (err) {
      console.error('Erro ao sincronizar com o Gateway:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const getCircuitBadge = (state?: string) => {
    if (state === 'CLOSED') return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        CLOSED (Saudável)
      </span>
    );
    if (state === 'HALF_OPEN') return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
        HALF-OPEN (Testando)
      </span>
    );
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
        OPEN (Fallback Ativo)
      </span>
    );
  };

  const getProviderBadge = (provider: string) => {
    switch (provider) {
      case 'OLLAMA_LOCAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">LOCAL</span>;
      case 'CLOUD_DIRECT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">DIRECT CLOUD</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">FALLBACK</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-200 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[250px] bg-indigo-600/5 blur-[120px] pointer-events-none rounded-full" />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Profissional */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Server className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-white">LLM Resilience Gateway</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">v1.0-PROD</span>
            </div>
            <p className="text-xs text-slate-400 pl-11">Observabilidade de infraestrutura, roteamento híbrido, PII & FinOps em tempo real</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300 font-medium">Gateway: <strong className="text-emerald-400 font-mono">Online</strong></span>
            </div>
            <button 
              onClick={fetchData} 
              className={`p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all text-slate-400 hover:text-white ${isRefreshing ? 'rotate-180 duration-500 text-indigo-400' : ''}`}
              title="Sincronizar métricas"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Grid de KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          
          {/* Card 1: Circuito */}
          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-xl group">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Circuit Breaker</span>
              <div className="p-1.5 rounded-lg bg-slate-800/50 text-indigo-400 group-hover:scale-110 transition-transform">
                <Cpu className="w-4 h-4" />
              </div>
            </div>
            <div className="my-1">{getCircuitBadge(stats?.circuit.state)}</div>
            <p className="text-[11px] text-slate-500 mt-3">Proteção ativa contra instabilidade do Ollama</p>
          </div>

          {/* Card 2: Roteamento */}
          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-xl group">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Eficiência Local</span>
              <div className="p-1.5 rounded-lg bg-slate-800/50 text-emerald-400 group-hover:scale-110 transition-transform">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">{stats?.metrics.localRoutingRate ?? 100}%</span>
              <span className="text-xs font-mono text-slate-500">local</span>
            </div>
            <p className="text-[11px] text-emerald-400/90 mt-2 font-medium">
              {stats?.metrics.localRequests ?? 0} locais / {stats?.metrics.fallbackRequests ?? 0} cloud
            </p>
          </div>

          {/* Card 3: Latência */}
          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-xl group">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Latência Média</span>
              <div className="p-1.5 rounded-lg bg-slate-800/50 text-purple-400 group-hover:scale-110 transition-transform">
                <Terminal className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-white">{stats?.metrics.avgLatencyMs ?? 0}</span>
              <span className="text-xs font-mono text-slate-400">ms</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Média ponderada gateway + inferência</p>
          </div>

          {/* Card 4: PII */}
          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-xl group">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Dados PII Mascarados</span>
              <div className="p-1.5 rounded-lg bg-slate-800/50 text-cyan-400 group-hover:scale-110 transition-transform">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">{stats?.metrics.totalPiiBlocked ?? 0}</span>
              <span className="text-xs font-mono text-cyan-400">itens</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">CPFs, e-mails e cartões protegidos</p>
          </div>

        </div>

        {/* Grid FinOps (Painel Financeiro) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/80 to-emerald-950/20 border border-emerald-500/20 shadow-xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Cost Avoidance (Economia Local)
              </span>
              <div className="text-3xl font-extrabold font-mono text-white tracking-tight mt-1">
                ${stats?.metrics.totalSavedUsd ?? 0} <span className="text-xs font-normal text-slate-400 font-sans">USD</span>
              </div>
              <p className="text-xs text-slate-400 pt-0.5">Capital preservado pelo roteamento ao Ollama</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-950/20 border border-amber-500/20 shadow-xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Custo Incorrido no Fallback
              </span>
              <div className="text-3xl font-extrabold font-mono text-white tracking-tight mt-1">
                ${stats?.metrics.totalFallbackCostUsd ?? 0} <span className="text-xs font-normal text-slate-400 font-sans">USD</span>
              </div>
              <p className="text-xs text-slate-400 pt-0.5">Gasto em nuvem durante janelas de failover</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* Tabela de Auditoria e Logs */}
        <div className="rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white text-sm">Auditoria de Requisições & Roteamento</h2>
              <p className="text-xs text-slate-400 mt-0.5">Log em tempo real com rastreabilidade de PII, latência e custos</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60 w-fit">
              <Radio className="w-3 h-3 text-indigo-400 animate-pulse" />
              Buffer: {logs.length} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0b0e17] text-slate-400 uppercase text-[10px] font-mono font-semibold tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Provedor & Rota</th>
                  <th className="px-5 py-3.5">Prompt Preview</th>
                  <th className="px-5 py-3.5">PII Detectado</th>
                  <th className="px-5 py-3.5">FinOps Impacto</th>
                  <th className="px-5 py-3.5 text-right">Latência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-sans">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Terminal className="w-6 h-6 text-slate-600 animate-bounce" />
                        <p className="text-xs">Nenhuma requisição ou evento capturado no buffer no momento.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getProviderBadge(log.provider)}
                          <span className="text-[10px] font-mono text-slate-500" title={log.routingReason}>
                            ({log.routingReason})
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 font-mono text-xs max-w-xs truncate group-hover:text-white transition-colors" title={log.promptPreview}>
                        {log.promptPreview}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {log.piiSanitized ? (
                          <div className="flex items-center gap-1">
                            {log.piiTypes.map((t, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded text-[10px] font-mono">
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap">
                        {log.provider === 'OLLAMA_LOCAL' ? (
                          <span className="text-emerald-400">-${log.savedCostUsd} (poupado)</span>
                        ) : (
                          <span className="text-amber-400">+${log.fallbackCostUsd} (nuvem)</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-300 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800/50 text-slate-300 border border-slate-700/40">
                          {log.latencyMs} ms
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}