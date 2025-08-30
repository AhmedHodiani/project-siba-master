import React from 'react';
import { Button } from './Button';
import './TranslateButton.css';

interface TranslateButtonProps {
  isVisible: boolean;
  position: { x: number; y: number } | null;
  onTranslate: () => void;
}

function TranslateButton({
  isVisible,
  position,
  onTranslate,
}: TranslateButtonProps) {
  if (!isVisible || !position) return null;

  const style = {
    position: 'fixed' as const,
    left: `${position.x}px`,
    top: `${position.y - 50}px`, // Position above the selection
    zIndex: 9999,
  };

  return (
    <div className="translate-button-container" style={style}>
      <Button
        onClick={onTranslate}
        variant="primary"
        size="small"
        className="translate-btn"
      >
        🌐 Translate
      </Button>
    </div>
  );
}

export default TranslateButton;