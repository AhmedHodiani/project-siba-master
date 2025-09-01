/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { promises as fs } from 'fs';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { ollamaMainService } from './ollama-service';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.handle('open-video-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      {
        name: 'Video Files',
        extensions: ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm', 'm4v']
      }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('open-subtitle-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      {
        name: 'Subtitle Files',
        extensions: ['srt', 'vtt', 'ass', 'ssa']
      }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('read-subtitle-file', async (_, filePath: string) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading subtitle file:', error);
    return null;
  }
});

ipcMain.handle('file-exists', async (_, filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
});

ipcMain.handle('extract-video-frames', async (_, videoPath: string, count: number = 10) => {
  try {
    // Use ffmpeg to extract frames at different timestamps
    const { spawn } = require('child_process');
    const path = require('path');
    const os = require('os');
    
    // Get video duration first
    const getDuration = () => {
      return new Promise((resolve, reject) => {
        const ffprobe = spawn('ffprobe', [
          '-v', 'quiet',
          '-print_format', 'json',
          '-show_format',
          videoPath
        ]);
        
        let output = '';
        ffprobe.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });
        
        ffprobe.on('close', (code: number) => {
          if (code === 0) {
            try {
              const info = JSON.parse(output);
              const duration = parseFloat(info.format.duration);
              resolve(duration);
            } catch (e) {
              reject(e);
            }
          } else {
            reject(new Error('ffprobe failed'));
          }
        });
      });
    };

    const duration = await getDuration() as number;
    const frames: string[] = [];
    const tempDir = os.tmpdir();
    
    // Extract frames at evenly distributed timestamps
    for (let i = 0; i < count; i++) {
      const timestamp = (duration / (count + 1)) * (i + 1);
      const outputPath = path.join(tempDir, `frame_${i}_${Date.now()}.jpg`);
      
      await new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-ss', timestamp.toString(),
          '-i', videoPath,
          '-vframes', '1',
          '-q:v', '2',
          '-y',
          outputPath
        ]);
        
        ffmpeg.on('close', (code: number) => {
          if (code === 0) {
            // Convert to base64
            fs.readFile(outputPath)
              .then(data => {
                const base64 = `data:image/jpeg;base64,${data.toString('base64')}`;
                frames.push(base64);
                // Clean up temp file
                fs.unlink(outputPath).catch(() => {});
                resolve(base64);
              })
              .catch(reject);
          } else {
            reject(new Error('ffmpeg failed'));
          }
        });
      });
    }
    
    return { frames, duration };
  } catch (error) {
    console.error('Error extracting video frames:', error);
    return { frames: [], duration: 0 };
  }
});

// Ollama IPC handlers
ipcMain.handle('ollama-is-available', async () => {
  try {
    return await ollamaMainService.isAvailable();
  } catch (error) {
    console.error('Error checking Ollama availability:', error);
    return false;
  }
});

ipcMain.handle('ollama-list-models', async () => {
  try {
    return await ollamaMainService.listModels();
  } catch (error) {
    console.error('Error listing Ollama models:', error);
    throw error;
  }
});

ipcMain.handle('ollama-chat', async (_, model: string, messages: any[]) => {
  try {
    return await ollamaMainService.chat(model, messages);
  } catch (error) {
    console.error('Error in Ollama chat:', error);
    throw error;
  }
});

ipcMain.handle('ollama-chat-with-context', async (_, model: string, message: string, conversationHistory: any[]) => {
  try {
    return await ollamaMainService.chatWithContext(model, message, conversationHistory);
  } catch (error) {
    console.error('Error in Ollama chat with context:', error);
    throw error;
  }
});

ipcMain.handle('ollama-translate', async (_, text: string, model?: string) => {
  try {
    return await ollamaMainService.translateGermanToEnglish(text, model);
  } catch (error) {
    console.error('Error in Ollama translation:', error);
    throw error;
  }
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      webSecurity: !isDebug, // Allow local file access in development
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
