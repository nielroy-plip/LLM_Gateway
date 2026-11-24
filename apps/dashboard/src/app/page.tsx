'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  DollarSign,
  RefreshCw,
  Terminal,
  TrendingUp,
  Lock,
  Server,
  Radio,
  Play,
  Flame,
  ShieldAlert,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

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

  // Estados do Playground
  const [promptInput, setPromptInput] = useState('Resuma em 2 linhas o que é um Circuit Breaker em microsserviços.');
  const [routingStrategy, setRoutingStrategy] = useState<'auto' | 'local' | 'cloud'>('auto');
  const [isSending, setIsSending] = useState(false);
  const [lastResponse, setLastResponse] = useState<{
    provider: string;
    reason: string;
    latency: number;
    pii: string[];
    content: string;
  } | null>(null);

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
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleRunPlayground = async () => {
    if (!promptInput.trim() || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch('http://localhost:3001/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-gateway-dev-2026'
        },
        body: JSON.stringify({
          routing: routingStrategy,
          messages: [{ role: 'user', content: promptInput }]
        })
      });

      const data = await res.json();
      if (res.ok) {
        setLastResponse({
          provider: data.providerUsed,
          reason: data.routingReason,
          latency: data.latencyMs,
          pii: data.piiTypesDetected || [],
          content: data.message?.content || ''
        });
        await fetchData();
      } else {
        setLastResponse({
          provider: 'ERROR',
          reason: data.error || 'REQUEST_FAILED',
          latency: 0,
          pii: [],
          content: data.message || 'Erro ao executar requisição.'
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleChaos = async (action: 'OPEN' | 'CLOSE') => {
    try {
      await fetch('http://localhost:3001/api/chaos/circuit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      await fetchData();
    } catch (err) {
      console.error('Erro ao acionar simulação de caos:', err);
    }
  };

  const getCircuitBadge = (state?: string) => {
    if (state === 'CLOSED') return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        CLOSED (Saudável)
      </span>
    );
    if (state === 'HALF_OPEN') return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
        HALF-OPEN (Testando)
      </span>
    );
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
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

  // Dados preparados para o Recharts
  const latencyChartData = [...logs]
    .reverse()
    .map((log) => ({
      time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      latency: log.latencyMs,
      provider: log.provider
    }));

  const distributionData = [
    { name: 'Ollama Local', value: stats?.metrics.localRequests || 0, color: '#10b981' },
    { name: 'Cloud Direct', value: stats?.metrics.directCloudRequests || 0, color: '#6366f1' },
    { name: 'Cloud Fallback', value: stats?.metrics.fallbackRequests || 0, color: '#f59e0b' }
  ].filter((item) => item.value > 0);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-200 selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[250px] bg-indigo-600/5 blur-[120px] pointer-events-none rounded-full" />

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Server className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-white">LLM Resilience Gateway</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">v1.1</span>
            </div>
            <p className="text-xs text-slate-400 pl-11">Observabilidade de infraestrutura, roteamento híbrido, PII & FinOps em tempo real</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
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
          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider">Circuit Breaker</span>
              <Cpu className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="my-1">{getCircuitBadge(stats?.circuit.state)}</div>
            <p className="text-[11px] text-slate-500 mt-3">Proteção ativa contra falhas do Ollama</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider">Eficiência Local</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">{stats?.metrics.localRoutingRate ?? 100}%</span>
              <span className="text-xs font-mono text-slate-500">local</span>
            </div>
            <p className="text-[11px] text-emerald-400/90 mt-2 font-medium">
              {stats?.metrics.localRequests ?? 0} locais / {(stats?.metrics.fallbackRequests ?? 0) + (stats?.metrics.directCloudRequests ?? 0)} cloud
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider">Latência Média</span>
              <Terminal className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-white">{stats?.metrics.avgLatencyMs ?? 0}</span>
              <span className="text-xs font-mono text-slate-400">ms</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Média ponderada gateway + inferência</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider">Dados PII Mascarados</span>
              <Lock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">{stats?.metrics.totalPiiBlocked ?? 0}</span>
              <span className="text-xs font-mono text-cyan-400">itens</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">CPFs, e-mails e cartões protegidos</p>
          </div>
        </div>

        {/* Grid FinOps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                Custo Incorrido (Cloud Direct + Fallback)
              </span>
              <div className="text-3xl font-extrabold font-mono text-white tracking-tight mt-1">
                ${stats?.metrics.totalFallbackCostUsd ?? 0} <span className="text-xs font-normal text-slate-400 font-sans">USD</span>
              </div>
              <p className="text-xs text-slate-400 pt-0.5">Gasto acumulado em requisições roteadas para nuvem</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Gráficos Temporais & Distribuição (Item 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 shadow-xl">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white">Histórico de Latência (ms)</h3>
              <p className="text-xs text-slate-400">Variação do tempo de resposta nas últimas requisições</p>
            </div>
            <div className="h-56 w-full">
              {latencyChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                  Aguardando requisições para plotar latência...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={latencyChartData}>
                    <defs>
                      <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px', fontSize: '12px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Area type="monotone" dataKey="latency" name="Latência (ms)" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#latencyGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Distribuição de Rotas</h3>
              <p className="text-xs text-slate-400">Proporção entre Local, Direct e Fallback</p>
            </div>
            <div className="h-44 w-full">
              {distributionData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                  Sem tráfego registrado
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {distributionData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3 text-[11px] font-mono pt-2 border-t border-slate-800/60">
              <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Local ({stats?.metrics.localRequests ?? 0})</span>
              <span className="flex items-center gap-1.5 text-indigo-400"><span className="w-2 h-2 rounded-full bg-indigo-500"></span>Direct ({stats?.metrics.directCloudRequests ?? 0})</span>
              <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Fallback ({stats?.metrics.fallbackRequests ?? 0})</span>
            </div>
          </div>
        </div>

        {/* Playground Interativo & Chaos Engineering (Item 1) */}
        <div className="p-5 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-indigo-500/20 shadow-xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Playground Interativo & Chaos Engineering</h2>
                <p className="text-xs text-slate-400">Teste prompts, sanitização de PII e simule falhas do Ollama diretamente do painel</p>
              </div>
            </div>

            {/* Controles de Chaos Engineering */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleChaos('OPEN')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 transition-colors"
              >
                <Flame className="w-3.5 h-3.5" />
                Simular Queda Ollama (OPEN)
              </button>
              <button
                onClick={() => handleToggleChaos('CLOSE')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Restaurar Circuito (CLOSED)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 space-y-3">
              {/* Presets rápidos */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono text-slate-500">Cenários:</span>
                <button
                  onClick={() => {
                    setRoutingStrategy('auto');
                    setPromptInput('Olá, meu nome é Lucas, meu CPF é 123.456.789-00 e meu e-mail é lucas@empresa.com.br. Gere um resumo de boas-vindas.');
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
                >
                  + Vazamento de PII (CPF/Email)
                </button>
                <button
                  onClick={() => {
                    setRoutingStrategy('auto');
                    setPromptInput('Crie a arquitetura detalhada de um sistema distribuído de pagamentos com RabbitMQ e refatore o fluxo de dead-letter queue.');
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors"
                >
                  + Tarefa Complexa (Auto → Cloud)
                </button>
                <button
                  onClick={() => {
                    setRoutingStrategy('local');
                    setPromptInput('Explique o conceito de idempotência em APIs REST em uma frase.');
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition-colors"
                >
                  + Tarefa Simples (Local Ollama)
                </button>
              </div>

              <textarea
                rows={3}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Digite um prompt para testar o gateway..."
                className="w-full rounded-xl bg-[#090c14] border border-slate-800 focus:border-indigo-500/60 focus:outline-none p-3 text-xs font-mono text-slate-200 placeholder-slate-600"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Estratégia:</span>
                  <select
                    value={routingStrategy}
                    onChange={(e) => setRoutingStrategy(e.target.value as any)}
                    className="rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
                  >
                    <option value="auto">auto (Semântico)</option>
                    <option value="local">local (Forçar Ollama)</option>
                    <option value="cloud">cloud (Forçar Nuvem)</option>
                  </select>
                </div>

                <button
                  onClick={handleRunPlayground}
                  disabled={isSending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {isSending ? 'Processando no Gateway...' : 'Disparar Requisição'}
                </button>
              </div>
            </div>

            {/* Resultado da execução */}
            <div className="lg:col-span-5 rounded-xl bg-[#090c14] border border-slate-800/90 p-4 flex flex-col justify-between">
              {!lastResponse ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-6">
                  <ShieldAlert className="w-6 h-6 text-slate-600 mb-2" />
                  <p className="text-xs">Dispare um teste ao lado para inspecionar a decisão de roteamento, sanitização e resposta em tempo real.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      {getProviderBadge(lastResponse.provider)}
                      <span className="text-[10px] font-mono text-slate-400">{lastResponse.reason}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-300">{lastResponse.latency} ms</span>
                  </div>

                  {lastResponse.pii.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono">
                      <Lock className="w-3 h-3" />
                      PII Mascarado: {lastResponse.pii.join(', ')}
                    </div>
                  )}

                  <div className="text-xs text-slate-300 font-mono leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap">
                    {lastResponse.content}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabela de Auditoria */}
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
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500 text-xs">
                      Nenhuma requisição registrada ainda. Use o Playground acima para testar.
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
                          <span className="text-[10px] font-mono text-slate-500">
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