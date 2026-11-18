export interface SanitizationResult {
    sanitizedText: string;
    wasSanitized: boolean;
    detectedTypes: string[];
}

const PII_PATTERNS: {type: string; regex: RegExp; mask: string}[] =[
    {
        type: 'CPF',
        regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
        mask: '[CPF_REDACTED]'
    },
    {
        type: 'CNPJ',
        regex: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
        mask: '[CNPJ_REDACTED]'
    },
    {
        type: 'EMAIL',
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        mask: '[EMAIL_REDACTED]'
    },
    {
        type: 'CREDIT_CARD',
        regex: /\b(?:\d[ -]*?){13,16}\b/g,
        mask: '[CARD_REDACTED]'
    },
    {
        type: 'PHONE_BR',
        regex: /\b(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})-?\d{4}\b/g,
        mask: '[PHONE_REDACTED]'
    }
];

export function sanitizePII(text: string): SanitizationResult {
    let sanitizedText = text;
    const detectedSet = new Set<string>();

    for (const pattern of PII_PATTERNS) {
        if (pattern.regex.test(sanitizedText)) {
            detectedSet.add(pattern.type);
            sanitizedText = sanitizedText.replace(pattern.regex, pattern.mask);
        }
    }

    return {
        sanitizedText,
        wasSanitized: detectedSet.size > 0,
        detectedTypes: Array.from(detectedSet)
    }
}