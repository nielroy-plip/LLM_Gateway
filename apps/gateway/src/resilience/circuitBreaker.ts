import CircuitBreaker from 'opossum';
import { OllamaService, ChatMessage } from '../services/ollamaService';
import { CloudLlmService } from '../services/cloudLlmService';

export interface ExecutionResult {
    content: string;
    provider: 'OLLAMA_LOCAL' | 'CLOUD_FALLBACK';
    latencyMs: number;
}

const options: CircuitBreaker.Options = {
    timeout: 60000, // 60 segundos (evita falso-positivo na primeira carga do modelo)
    errorThresholdPercentage: 50, //Se 50% das requisições falharem, abre o circuido
    resetTimeout: 10000 // Após 10s, tenta fechar o circuito novamente (half-open) 
};

// A ação principal envolvida pelo Circuit Breaker é a chamada ao Ollama
const breaker = new CircuitBreaker(
    async (messages: ChatMessage[]) => await OllamaService.generateCompletion(messages),
    options
);

// Define a função de FALLBACK acionada quando o circuito abre ou dá erro
breaker.fallback(async (messages: ChatMessage[], err: Error) => {
    console.warn(`Ollama falhou ou timed-out (${err?.message}). Acionando Fallback Cloud...`);
    return await CloudLlmService.generateCompletion(messages);
});

export class ResilienceModule {
    static async executeChat(messages: ChatMessage[]): Promise<ExecutionResult> {
        const startTime = Date.now();
        let provider: 'OLLAMA_LOCAL' | 'CLOUD_FALLBACK' = 'OLLAMA_LOCAL';

        // Handler para checar se a resposta veio via fallback
        if (breaker.opened) {
            provider = 'CLOUD_FALLBACK';
        }

        try {
            const content = await breaker.fire(messages);
            const latencyMs = Date.now() - startTime;

            // Se o circuito não estava explicitamente aberto mas ainda assim usou fallback no erro atual
            if ((typeof options.timeout === 'number' && latencyMs > options.timeout) || breaker.stats.failures > 0) {
                provider = breaker.opened ? 'CLOUD_FALLBACK' : provider;
            }

            return {
                content,
                provider,
                latencyMs
            };
        } catch (error) {
            return {
                content: 'Ocorreu um erro crítico em todos os provedores de LLM',
                provider: 'CLOUD_FALLBACK',
                latencyMs: Date.now() - startTime
            };
        }
    }

    static getStatus() {
        return {
            state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
            stats: breaker.stats
        };
    };

    static forceOpen() {
        breaker.open();
    }

    static forceClose() {
        breaker.close();
    }
}