import { randomUUID } from 'crypto';

export type ProviderType = 'OLLAMA_LOCAL' | 'CLOUD_FALLBACK' | 'CLOUD_DIRECT';

export interface RequestLog {
  id: string;
  timestamp: string;
  provider: ProviderType;
  routingReason: string;
  latencyMs: number;
  piiSanitized: boolean;
  piiTypes: string[];
  estimatedTokens: number;
  savedCostUsd: number;
  fallbackCostUsd: number;
  promptPreview: string;
}

class MetricsStore {
  private logs: RequestLog[] = [];
  private readonly MAX_LOGS = 100;
  private readonly CLOUD_COST_PER_1K_TOKENS = 0.005;

  private totalRequests = 0;
  private localRequests = 0;
  private fallbackRequests = 0;
  private directCloudRequests = 0;
  private totalPiiBlocked = 0;
  private totalLatencyMs = 0;
  private totalSavedUsd = 0;
  private totalFallbackCostUsd = 0;

  recordRequest(params: {
    provider: ProviderType;
    routingReason: string;
    latencyMs: number;
    piiSanitized: boolean;
    piiTypes: string[];
    promptText: string;
    responseText: string;
  }): RequestLog {
    const totalChars = params.promptText.length + params.responseText.length;
    const estimatedTokens = Math.max(1, Math.ceil(totalChars / 4));
    const costIfCloud = (estimatedTokens / 1000) * this.CLOUD_COST_PER_1K_TOKENS;

    const savedCostUsd =
      params.provider === 'OLLAMA_LOCAL' ? Number(costIfCloud.toFixed(6)) : 0;

    // Contabiliza custo tanto em fallback quanto em roteamento direto para nuvem
    const fallbackCostUsd =
      params.provider !== 'OLLAMA_LOCAL' ? Number(costIfCloud.toFixed(6)) : 0;

    this.totalRequests++;
    this.totalLatencyMs += params.latencyMs;
    this.totalSavedUsd += savedCostUsd;
    this.totalFallbackCostUsd += fallbackCostUsd;

    if (params.provider === 'OLLAMA_LOCAL') {
      this.localRequests++;
    } else if (params.provider === 'CLOUD_FALLBACK') {
      this.fallbackRequests++;
    } else {
      this.directCloudRequests++;
    }

    if (params.piiSanitized) {
      this.totalPiiBlocked += params.piiTypes.length;
    }

    const logEntry: RequestLog = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      provider: params.provider,
      routingReason: params.routingReason,
      latencyMs: params.latencyMs,
      piiSanitized: params.piiSanitized,
      piiTypes: params.piiTypes,
      estimatedTokens,
      savedCostUsd,
      fallbackCostUsd,
      promptPreview:
        params.promptText.length > 80
          ? `${params.promptText.slice(0, 80)}...`
          : params.promptText
    };

    this.logs.unshift(logEntry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.pop();
    }

    return logEntry;
  }

  getStats() {
    const avgLatencyMs =
      this.totalRequests > 0 ? Math.round(this.totalLatencyMs / this.totalRequests) : 0;

    const localRoutingRate =
      this.totalRequests > 0
        ? Number(((this.localRequests / this.totalRequests) * 100).toFixed(1))
        : 100;

    const totalCloudRequests = this.fallbackRequests + this.directCloudRequests;
    const fallbackRate =
      this.totalRequests > 0
        ? Number(((totalCloudRequests / this.totalRequests) * 100).toFixed(1))
        : 0;

    return {
      totalRequests: this.totalRequests,
      localRequests: this.localRequests,
      fallbackRequests: this.fallbackRequests,
      directCloudRequests: this.directCloudRequests,
      localRoutingRate,
      fallbackRate,
      avgLatencyMs,
      totalPiiBlocked: this.totalPiiBlocked,
      totalSavedUsd: Number(this.totalSavedUsd.toFixed(5)),
      totalFallbackCostUsd: Number(this.totalFallbackCostUsd.toFixed(5))
    };
  }

  getLogs(limit = 25): RequestLog[] {
    return this.logs.slice(0, limit);
  }
}

export const metricsStore = new MetricsStore();