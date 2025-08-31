import React from 'react';
import './IframeTranslationWidget.css';

interface IframeTranslationWidgetProps {
  text: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  isVisible: boolean;
}

export const IframeTranslationWidget: React.FC<IframeTranslationWidgetProps> = ({
  text,
  sourceLanguage = 'de',
  targetLanguage = 'en',
  isVisible,
}) => {
  if (!isVisible || !text) {
    return null;
  }

  const translationUrl = `https://www.bing.com/translator/?from=${sourceLanguage}&to=${targetLanguage}&text=${encodeURIComponent(text)}`;

  return (
    <div className="iframe-translation-widget">
      <div className="translation-overlay-top" />
      <div className="translation-overlay-bottom" />
      <iframe
        src={translationUrl}
        className="translation-iframe"
        title="Translation"
      />
    </div>
  );
};

export default IframeTranslationWidget;