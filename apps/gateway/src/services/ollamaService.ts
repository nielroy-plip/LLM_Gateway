import axios from 'axios';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export class OllamaService {
    private static OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
    private static DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:latest';

    static async generateCompletion(messages: ChatMessage[]): Promise<string> {
        const response = await axios.post(
            `${this.OLLAMA_URL}/api/chat`,
            {
                model: this.DEFAULT_MODEL,
                messages: messages,
                stream: false,
                keep_alive: '10m', // Mantém a conexão ativa por 10 minutos
                options: {
                    num_predict: 150 // Limite de respostas a ~150 tokens para evitar latência
                }
            },
            {timeout: 28000} // Timeout estrito de 28s para evitar travamento
        );

        return response.data.message.content;
    }
}