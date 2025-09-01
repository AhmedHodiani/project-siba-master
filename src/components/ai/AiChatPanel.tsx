import React, { useState, useEffect, useRef } from 'react';
import { Button, MarkdownRenderer } from '../ui';
import { useOllama } from '../../hooks/useOllama';
import './AiChatPanel.css';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metrics?: {
    tokensPerSecond?: number;
    responseTime?: number; // in milliseconds
    tokenCount?: number;
    model?: string;
  };
}

interface AiChatPanelProps {
  currentSubtitle?: string;
  onTranslateRequest?: (text: string) => void;
  onSelectTranslation?: (translation: string) => void;
  onInputFocusChange?: (isFocused: boolean) => void;
}

export const AiChatPanel: React.FC<AiChatPanelProps> = ({
  currentSubtitle,
  onTranslateRequest,
  onSelectTranslation,
  onInputFocusChange,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    isLoading,
    error,
    isAvailable,
    models,
    chatWithContext,
    checkAvailability,
    loadModels,
    clearError,
  } = useOllama();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check Ollama availability on mount
  useEffect(() => {
    const initializeOllama = async () => {
      const available = await checkAvailability();
      if (available) {
        await loadModels();
      }
    };
    initializeOllama();
  }, [checkAvailability, loadModels]);

  // Set default model when models are loaded
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      // Prefer llama3.2 or similar, fallback to first available
      const preferredModel = models.find(m => m.includes('llama3.2')) || models[0];
      setSelectedModel(preferredModel);
    }
  }, [models, selectedModel]);

  const addMessage = (role: 'user' | 'assistant', content: string, metrics?: ChatMessage['metrics']) => {
    // Ensure content is always a string
    const safeContent = content || '';
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      role,
      content: safeContent,
      timestamp: new Date(),
      metrics,
    };
    setMessages(prev => [...prev, message]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message
    addMessage('user', userMessage);
    
    try {
      const startTime = Date.now();
      let response: string;
      
      const conversationHistory = messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
      }));
      
      // Use context-aware chat that includes conversation history
      response = await chatWithContext(userMessage, conversationHistory, selectedModel);
      
      const endTime = Date.now();
      
      // Calculate metrics
      const responseTime = endTime - startTime;
      const tokenCount = response.split(/\s+/).length; // Rough token approximation
      const tokensPerSecond = responseTime > 0 ? (tokenCount / (responseTime / 1000)) : 0;
      
      addMessage('assistant', response, {
        tokensPerSecond: Math.round(tokensPerSecond * 10) / 10,
        responseTime,
        tokenCount,
        model: selectedModel
      });
    } catch (err) {
      addMessage('assistant', 'Sorry, I encountered an error while processing your request.');
    }
  };

  const handleTranslateSubtitle = async () => {
    if (!currentSubtitle || isLoading) return;
    
    const translateMessage = `Please translate this German text to English: "${currentSubtitle}"`;
    addMessage('user', translateMessage);
    
    try {
      const startTime = Date.now();
      
      // Get current conversation history
      const conversationHistory = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
      
      // Use context-aware chat for translation
      const translation = await chatWithContext(translateMessage, conversationHistory, selectedModel);
      const endTime = Date.now();
      
      // Calculate metrics
      const responseTime = endTime - startTime;
      const tokenCount = translation.split(/\s+/).length;
      const tokensPerSecond = responseTime > 0 ? (tokenCount / (responseTime / 1000)) : 0;
      
      addMessage('assistant', translation, {
        tokensPerSecond: Math.round(tokensPerSecond * 10) / 10,
        responseTime,
        tokenCount,
        model: selectedModel
      });
    } catch (err) {
      addMessage('assistant', 'Sorry, I encountered an error while translating.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="ai-chat-panel">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={clearError} className="error-close">✕</button>
        </div>
      )}

      {isAvailable === false && (
        <div className="unavailable-banner">
          <div className="unavailable-content">
            <p><strong>Ollama not available</strong></p>
            <p>Make sure Ollama is running on localhost:11434</p>
            <Button onClick={checkAvailability} variant="primary" size="small">
              Retry Connection
            </Button>
          </div>
        </div>
      )}

      <div className="chat-messages">
        {(
          messages.map((message) => (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="message-content">
                {message.role === 'assistant' ? (
                  <MarkdownRenderer 
                    content={message.content}
                    style={{backgroundColor: 'transparent'}}
                  />
                ) : (
                  message.content || ''
                )}
              </div>
              {message.role === 'assistant' && message.metrics && (
                <div className="message-metrics">
                  {message.metrics.tokensPerSecond && (
                    <span>{message.metrics.tokensPerSecond} tok/sec</span>
                  )}
                  {message.metrics.responseTime && (
                    <span> • {(message.metrics.responseTime / 1000).toFixed(2)}s</span>
                  )}
                  {message.metrics.tokenCount && (
                    <span> • {message.metrics.tokenCount} tokens</span>
                  )}
                  {message.metrics.model && (
                    <span> • {message.metrics.model}</span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        {currentSubtitle && (
          <div className="quick-translate">
            <span className="current-subtitle">"{currentSubtitle}"</span>
            <Button
              onClick={handleTranslateSubtitle}
              variant="secondary"
              size="small"
              disabled={isLoading}
            >
              Translate
            </Button>
          </div>
        )}
        
        <div className="chat-input">
          <textarea
            value={inputValue}
            style={{ fontSize: '16px', lineHeight: '1.5', fontFamily: "'SF Mono', 'Monaco', 'Cascadia Code', monospace" }}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            onFocus={() => onInputFocusChange?.(true)}
            onBlur={() => onInputFocusChange?.(false)}
            placeholder={isAvailable === false ? "Ollama not available..." : "Ask AI..."}
            disabled={isLoading || isAvailable === false}
            rows={1}
          />
          <Button
            onClick={handleSendMessage}
            variant="primary"
            disabled={!inputValue.trim() || isLoading || isAvailable === false}
          >
            {isLoading ? '⏳' : 'Send'}
          </Button>
            <Button
                onClick={clearChat}
                variant="secondary"
                disabled={isLoading || messages.length === 0}
                >
                clear
            </Button>
        </div>
      </div>
    </div>
  );
};

export default AiChatPanel;