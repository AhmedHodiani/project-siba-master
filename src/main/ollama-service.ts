import { Ollama } from 'ollama';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaServiceInterface {
  listModels(): Promise<string[]>;
  chatWithContext(model: string, message: string, conversationHistory: ChatMessage[]): Promise<string>;
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

  async chatWithContext(model: string, message: string, conversationHistory: ChatMessage[]): Promise<string> {
    try {
      // Build conversation context with system message
      const systemPrompt = `You are a helpful AI assistant that can help with various tasks including German-English translation and general conversation. 

GENERAL GUIDELINES:
- Maintain context from previous messages in the conversation
- Reference earlier parts of the conversation when relevant
- If asked for "more examples" or "explain further", refer to what was previously discussed
- Be conversational and remember what the user has asked about

WHEN TRANSLATING GERMAN:
- Provide natural, fluent English translations
- Maintain the original meaning and tone
- Use contemporary, conversational English
- Preserve any cultural context or idioms with explanations when needed
- Highlight interesting grammatical structures
- Note any false friends or tricky vocabulary
- Explain compound words when present
- Point out modal verbs, separable verbs, or complex grammar

FORMAT YOUR RESPONSES FOR BETTER READABILITY LIKE THIS:
# Direct Translation
Nein, danke. Schon gut.
No, thank you. All good.
# Word-by-Word Breakdown
- Nein = No
- danke = thank you
- Schon gut = All good
# examples of different ways to say the same thing
- Nein, danke. Schon gut. = No, thank you. All good.
- Ich möchte das nicht. = I don't want that.
- Das ist nicht nötig. = That's not necessary.

Remember: You have access to the full conversation history, so always consider the context of what has been discussed before.`;

      // Check if conversation history already has a system message
      const hasSystemMessage = conversationHistory.some(msg => msg.role === 'system');
      
      // Prepare full conversation context
      const fullConversation: ChatMessage[] = [
        // Only add system prompt if there isn't one already
        ...(hasSystemMessage ? [] : [{ role: 'system' as const, content: systemPrompt }]),
        ...conversationHistory,
        { role: 'user', content: message }
      ];

      const response = await this.client.chat({
        model,
        messages: fullConversation,
        stream: false
      });
      
      return response.message?.content || '';
    } catch (error) {
      console.error('Error in chat with context:', error);
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

    try {
      const response = await this.client.chat({
        model,
        messages,
        stream: false
      });
      
      return response.message?.content || '';
    } catch (error) {
      console.error('Error in translation:', error);
      throw new Error('Failed to translate text');
    }
  }
}

export const ollamaMainService = new OllamaMainService();