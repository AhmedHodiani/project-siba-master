import { useState, useEffect, useCallback } from 'react';

interface UseTextSelectionResult {
  selectedText: string;
  selectionRect: DOMRect | null;
  isSelecting: boolean;
  clearSelection: () => void;
}

export function useTextSelection(containerId?: string): UseTextSelectionResult {
  const [selectedText, setSelectedText] = useState('');
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const clearSelection = useCallback(() => {
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
    setSelectedText('');
    setSelectionRect(null);
    setIsSelecting(false);
  }, []);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection) return;

    const text = selection.toString().trim();
    
    if (text.length > 0) {
      // Check if selection is within the specified container
      if (containerId) {
        const container = document.getElementById(containerId);
        if (container && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const isWithinContainer = container.contains(range.commonAncestorContainer);
          
          if (!isWithinContainer) {
            setSelectedText('');
            setSelectionRect(null);
            setIsSelecting(false);
            return;
          }
        }
      }

      setSelectedText(text);
      setIsSelecting(true);

      // Get selection position for tooltip/button positioning
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionRect(rect);
      }
    } else {
      setSelectedText('');
      setSelectionRect(null);
      setIsSelecting(false);
    }
  }, [containerId]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  return {
    selectedText,
    selectionRect,
    isSelecting,
    clearSelection,
  };
}