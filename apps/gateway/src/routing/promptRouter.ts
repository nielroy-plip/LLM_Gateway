import { ChatMessage } from '../services/ollamaService';

export type RoutingStrategy = 'auto' | 'local' | 'cloud';
export type TargetProvider = 'OLLAMA_LOCAL' | 'CLOUD_DIRECT';

export interface RoutingDecision {
    target: TargetProvider;
    reason: string;
}

const COMPLEX_KEYWORDS = [
    'arquitetura', 'architecture', 'refatore', 'refactor',
    'otimize', 'optimize', 'sql complexo', 'complex sql', 'algoritmo',
    'debug', 'análise profunda', 'passo a passo detalhado'
];

export function evaluatePromptRoute(
    messages: ChatMessage[],
    requestedStrategy: RoutingStrategy = 'auto'
): RoutingDecision {
    // 1. Se o cliente forçou explicitamente o destino
    if (requestedStrategy === 'local') {
        return { target: 'OLLAMA_LOCAL', reason: 'FORCED_LOCAL'};
    }
    if (requestedStrategy === 'cloud') {
        return { target: 'CLOUD_DIRECT', reason: 'FORCED_CLOUD'};
    }

    // 2. Modo 'auto': avalia tamanho e complexidade do último prompt do usuário
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const lowerContent = lastUserMsg.toLowerCase();

    // Critétio A: Prompts muito longos (> 1200 caracteres) exigem janela maior e raciocícnio mais denso
    if (lastUserMsg.length > 1200) {
        return { target: 'CLOUD_DIRECT', reason: 'PROMPT_LENGTH_THRESHOLD' };
    }

    // Critério B: Presença de blocos de código exttensos ou palavras-chave de alta complexidade
    const hasCodeBlock = (lastUserMsg.match(/```/g) || []).length >= 2;
    const hasComplexKeyword = COMPLEX_KEYWORDS.some((kw) => lowerContent.includes(kw));

    if (hasCodeBlock || hasComplexKeyword) {
        return { target: 'CLOUD_DIRECT', reason: 'HIGH_COMPLEXITY_TASK' };
    }

    // Caso padrão: Roteia para o Ollama local (custo zero + privacidade)
    return { target: 'OLLAMA_LOCAL', reason: 'DEFAULT_COST_OPTIMIZED' };
}