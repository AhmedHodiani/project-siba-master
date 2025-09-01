// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'ipc-example';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  openVideoFile: () => ipcRenderer.invoke('open-video-file'),
  openSubtitleFile: () => ipcRenderer.invoke('open-subtitle-file'),
  readSubtitleFile: (filePath: string) => ipcRenderer.invoke('read-subtitle-file', filePath),
  fileExists: (filePath: string) => ipcRenderer.invoke('file-exists', filePath),
  extractVideoFrames: (videoPath: string, count?: number) => ipcRenderer.invoke('extract-video-frames', videoPath, count),
  // Ollama methods
  ollamaIsAvailable: () => ipcRenderer.invoke('ollama-is-available'),
  ollamaListModels: () => ipcRenderer.invoke('ollama-list-models'),
  ollamaChat: (model: string, messages: any[]) => ipcRenderer.invoke('ollama-chat', model, messages),
  ollmaChatWithContext: (model: string, message: string, conversationHistory: any[]) => ipcRenderer.invoke('ollama-chat-with-context', model, message, conversationHistory),
  ollamaTranslate: (text: string, model?: string) => ipcRenderer.invoke('ollama-translate', text, model),
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
