import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import './TranslationModal.css';

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

const LANGUAGES = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
];

function TranslationModal({
  isOpen,
  onClose,
  selectedText,
  sourceLanguage = 'auto',
  targetLanguage = 'en',
}: TranslationModalProps) {
  const [fromLang, setFromLang] = useState(sourceLanguage);
  const [toLang, setToLang] = useState(targetLanguage);
  const [iframeKey, setIframeKey] = useState(0);

  // Update iframe when languages or text change
  useEffect(() => {
    if (isOpen && selectedText) {
      setIframeKey((prev) => prev + 1);
    }
  }, [fromLang, toLang, selectedText, isOpen]);

  const translatorUrl = `https://www.bing.com/translator/?from=${fromLang}&to=${toLang}&text=${encodeURIComponent(selectedText)}`;

  const swapLanguages = () => {
    if (fromLang !== 'auto') {
      setFromLang(toLang);
      setToLang(fromLang);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleOverlayClick = () => {
    onClose();
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <div
      className="translation-modal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div
        className="translation-modal"
        onClick={handleModalClick}
        onKeyDown={handleKeyDown}
        role="document"
        tabIndex={-1}
      >
        <div className="translation-modal-header">
          <h3>Translate Text</h3>
          <Button
            onClick={onClose}
            variant="secondary"
            size="small"
            className="close-btn"
          >
            ✕
          </Button>
        </div>

        <div className="translation-controls">
          <div className="language-selector">
            <label htmlFor="from-lang">From:</label>
            <select
              id="from-lang"
              value={fromLang}
              onChange={(e) => setFromLang(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={swapLanguages}
            variant="secondary"
            size="small"
            disabled={fromLang === 'auto'}
            className="swap-btn"
          >
            ⇄
          </Button>

          <div className="language-selector">
            <label htmlFor="to-lang">To:</label>
            <select
              id="to-lang"
              value={toLang}
              onChange={(e) => setToLang(e.target.value)}
            >
              {LANGUAGES.filter((lang) => lang.code !== 'auto').map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="selected-text">
          <strong>Selected text:</strong> &ldquo;{selectedText}&rdquo;
        </div>

        <div className="translation-content">
          <iframe
            key={iframeKey}
            src={translatorUrl}
            title="Bing Translator"
            className="translation-iframe"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>

        <div className="translation-modal-footer">
          <Button onClick={onClose} variant="primary">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TranslationModal;