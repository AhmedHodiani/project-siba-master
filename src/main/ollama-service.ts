import { Ollama } from 'ollama';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaServiceInterface {
  listModels(): Promise<string[]>;
  chat(model: string, messages: ChatMessage[]): Promise<string>;
  translateGermanToEnglish(text: string, model?: string): Promise<string>;
  isAvailable(): Promise<boolean>;
}

class OllamaMainService implements OllamaServiceInterface {
  private client: Ollama;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Ollama({
      host: 'http://localhost:11434'
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.list();
      this.isConnected = true;
      return true;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.list();
      return response.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Error listing models:', error);
      throw new Error('Failed to list models');
    }
  }

  async chat(model: string, messages: ChatMessage[]): Promise<string> {
    try {
      // Add system message to encourage markdown formatting if not already present
      const hasSystemMessage = messages.some(msg => msg.role === 'system');
      if (!hasSystemMessage) {
        const systemPrompt = `You are a specialized German-English translator for language learning. Your task is to translate German text to English with the following guidelines:

TRANSLATION APPROACH:
- Provide natural, fluent English translations
- Maintain the original meaning and tone
- Use contemporary, conversational English
- Preserve any cultural context or idioms with explanations when needed

RESPONSE FORMAT:
- Primary translation on the first line
- Brief grammar explanation if the German structure is notable
- Alternative translations if multiple interpretations exist
- Cultural context if relevant

LANGUAGE LEARNING FOCUS:
- Highlight interesting grammatical structures
- Note any false friends or tricky vocabulary
- Explain compound words when present
- Point out modal verbs, separable verbs, or complex grammar

Keep responses concise but educational. Focus on helping the learner understand both the translation and the underlying German language patterns.

Format your responses using markdown for better readability.
Be very generous with double quotes - wrap ANY term in double quotes. This greatly improves readability and helps users distinguish between regular text and terms content. When in doubt, use double quotes!`;

        messages = [{ role: 'system', content: systemPrompt }, ...messages];
      }

      const response = await this.client.chat({
        model,
        messages,
        stream: false
      });
      
      return response.message?.content || '';
    } catch (error) {
      console.error('Error in chat:', error);
      throw new Error('Failed to generate response');
    }
  }

  async translateGermanToEnglish(text: string, model: string = 'llama3.2:latest'): Promise<string> {
    const systemPrompt = `You are a specialized German-English translator for language learning. Your task is to translate German text to English with the following guidelines:

TRANSLATION APPROACH:
- Provide natural, fluent English translations
- Maintain the original meaning and tone
- Use contemporary, conversational English
- Preserve any cultural context or idioms with explanations when needed

RESPONSE FORMAT:
- Primary translation on the first line
- Brief grammar explanation if the German structure is notable
- Alternative translations if multiple interpretations exist
- Cultural context if relevant

LANGUAGE LEARNING FOCUS:
- Highlight interesting grammatical structures
- Note any false friends or tricky vocabulary
- Explain compound words when present
- Point out modal verbs, separable verbs, or complex grammar

Keep responses concise but educational. Focus on helping the learner understand both the translation and the underlying German language patterns.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Translate this German text: "${text}"` }
    ];

    return this.chat(model, messages);
  }
}

export const ollamaMainService = new OllamaMainService();