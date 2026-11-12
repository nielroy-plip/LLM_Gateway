export interface SanitizationResult {
    sanitizedText: string;
    hasRedactedData: boolean;
    redactedTypes: string[];
}

export class PiiSanitizer {
    private static patterns = [
        { type: 'CPF', regex: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b/g },
        { type: 'EMAIL', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
        { type: 'CREDIT_CARD', regex: /\b(?:\d[ -]*?){13,16}\b/g },
        { type: 'API_KEY', regex: /(bearer\s+[a-zA-Z0-9_\-\.]+|sk-[a-zA-Z0-9]{32,})/gi }
    ];

    static sanitize(text: string): SanitizationResult {
        let sanitizedText = text;
        const redactedTypes: string[] = [];

        for (const pattern of this.patterns) {
            if (pattern.regex.test(sanitizedText)) {
                redactedTypes.push(pattern.type);
                sanitizedText = sanitizedText.replace(pattern.regex, `[REDACTED_${pattern.type}]`);
            }
        }

        return {
            sanitizedText,
            hasRedactedData: redactedTypes.length > 0,
            redactedTypes: Array.from(new Set(redactedTypes))
        }
    }
}