import { useState, useCallback } from 'react';
import { ollamaService, type ChatMessage } from '../lib/services/ollama';

export interface UseOllamaReturn {
  isLoading: boolean;
  error: string | null;
  isAvailable: boolean | null;
  models: string[];
  askQuestion: (question: string, systemMessage?: string, model?: string) => Promise<string>;
  translateGerman: (text: string, model?: string) => Promise<string>;
  chat: (model: string, messages: ChatMessage[]) => Promise<string>;
  checkAvailability: () => Promise<boolean>;
  loadModels: () => Promise<void>;
  clearError: () => void;
}

export const useOllama = (): UseOllamaReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [models, setModels] = useState<string[]>([]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkAvailability = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const available = await ollamaService.isAvailable();
      setIsAvailable(available);
      return available;
    } catch (err: any) {
      setError(err.message);
      setIsAvailable(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadModels = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const modelList = await ollamaService.listModels();
      setModels(modelList);
    } catch (err: any) {
      setError(err.message);
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const askQuestion = useCallback(async (
    question: string,
    systemMessage?: string,
    model?: string
  ): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await ollamaService.askQuestion(question, systemMessage, model);
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const translateGerman = useCallback(async (
    text: string,
    model?: string
  ): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await ollamaService.translateGermanToEnglish(text, model);
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const chat = useCallback(async (
    model: string,
    messages: ChatMessage[]
  ): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await ollamaService.chat(model, messages);
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    isAvailable,
    models,
    askQuestion,
    translateGerman,
    chat,
    checkAvailability,
    loadModels,
    clearError,
  };
};

export default useOllama;