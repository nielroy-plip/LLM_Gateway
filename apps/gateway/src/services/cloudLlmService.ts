import axios from 'axios';
import { ChatMessage } from './ollamaService';

export class CloudLlmService {
    private static OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

    static async generateCompletion(messages: ChatMessage[]): Promise<string> {
        // Exemplo usando a API pública/compatível OpenAI
        if (!this.OPENAI_API_KEY) {
            //Fallback de contingência caso não haja API Key configurada
            return '[FALLBACK RESPONSE] O modelo local esteve indisponível e não há chave de API externa configurada';
        }

        const response =await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: messages
            },
            {
                headers: {Authorization: `Bearer ${this.OPENAI_API_KEY}`},
                timeout: 8000
            }
        );

        return response.data.choices[0].message.content;
    }
}