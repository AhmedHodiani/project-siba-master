import { ElectronHandler } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler & {
      ollamaIsAvailable: () => Promise<boolean>;
      ollamaListModels: () => Promise<string[]>;
      ollamaChat: (model: string, messages: any[]) => Promise<string>;
      ollamaTranslate: (text: string, model?: string) => Promise<string>;
    };
  }
}

export {};
