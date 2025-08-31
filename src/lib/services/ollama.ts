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

class OllamaRendererService implements OllamaServiceInterface {
  async isAvailable(): Promise<boolean> {
    try {
      return await window.electron.ollamaIsAvailable();
    } catch (error) {
      console.error('Error checking Ollama availability:', error);
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      return await window.electron.ollamaListModels();
    } catch (error) {
      console.error('Error listing models:', error);
      throw new Error('Failed to list models');
    }
  }

  async chat(model: string, messages: ChatMessage[]): Promise<string> {
    try {
      return await window.electron.ollamaChat(model, messages);
    } catch (error) {
      console.error('Error in chat:', error);
      throw new Error('Failed to generate response');
    }
  }

  async translateGermanToEnglish(text: string, model?: string): Promise<string> {
    try {
      return await window.electron.ollamaTranslate(text, model);
    } catch (error) {
      console.error('Error in translation:', error);
      throw new Error('Failed to translate text');
    }
  }

  // Legacy methods for compatibility
  async askQuestion(question: string, systemMessage?: string, model?: string): Promise<string> {
    const messages: ChatMessage[] = [
      ...(systemMessage ? [{ role: 'system' as const, content: systemMessage }] : []),
      { role: 'user' as const, content: question }
    ];
    return this.chat(model || 'llama3.2:latest', messages);
  }

  setDefaultModel(model: string): void {
    // This is now handled per-request
    console.log(`Default model would be set to: ${model}`);
  }

  getDefaultModel(): string {
    return 'llama3.2:latest';
  }
}

export const ollamaService = new OllamaRendererService();
export default ollamaService;