import { createRoot } from 'react-dom/client';
import App from './App';

// Polyfill deprecated mutation events with MutationObserver
// This provides backward compatibility for libraries like golden-layout
if (typeof window !== 'undefined' && typeof EventTarget !== 'undefined') {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
  
  // Map to store MutationObserver instances for each element
  const observerMap = new WeakMap<EventTarget, { observer: MutationObserver; listeners: Map<string, Set<EventListener>> }>();
  
  EventTarget.prototype.addEventListener = function(type: string, listener: EventListener, options?: boolean | AddEventListenerOptions) {
    // Handle deprecated mutation events by converting them to MutationObserver
    if (type === 'DOMNodeInserted' || type === 'DOMNodeRemoved' || type === 'DOMSubtreeModified') {
      // Only apply to Node instances (Elements, Documents, etc.)
      if (!(this instanceof Node)) {
        return;
      }
      
      if (!observerMap.has(this)) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            // Convert MutationObserver events to old-style events
            if (type === 'DOMNodeInserted' && mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const event = new Event('DOMNodeInserted', { bubbles: true, cancelable: false });
                  Object.defineProperty(event, 'target', { value: node, enumerable: true });
                  if (typeof listener === 'function') {
                    listener.call(this, event);
                  }
                }
              });
            }
            
            if (type === 'DOMNodeRemoved' && mutation.type === 'childList') {
              mutation.removedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const event = new Event('DOMNodeRemoved', { bubbles: true, cancelable: false });
                  Object.defineProperty(event, 'target', { value: node, enumerable: true });
                  if (typeof listener === 'function') {
                    listener.call(this, event);
                  }
                }
              });
            }
            
            if (type === 'DOMSubtreeModified') {
              const event = new Event('DOMSubtreeModified', { bubbles: true, cancelable: false });
              Object.defineProperty(event, 'target', { value: mutation.target, enumerable: true });
              if (typeof listener === 'function') {
                listener.call(this, event);
              }
            }
          });
        });
        
        // Start observing with comprehensive options
        const nodeToObserve = this instanceof Document ? this.documentElement : this as Node;
        observer.observe(nodeToObserve, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeOldValue: true,
          characterData: true,
          characterDataOldValue: true
        });
        
        observerMap.set(this, { observer, listeners: new Map() });
      }
      
      // Store the listener for potential removal later
      const observerData = observerMap.get(this);
      if (observerData) {
        if (!observerData.listeners.has(type)) {
          observerData.listeners.set(type, new Set());
        }
        observerData.listeners.get(type)?.add(listener);
      }
      
      return; // Don't call the original addEventListener for deprecated events
    }
    
    // For all other events, use the original implementation
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  EventTarget.prototype.removeEventListener = function(type: string, listener: EventListener, options?: boolean | EventListenerOptions) {
    // Handle removal of deprecated mutation event listeners
    if (type === 'DOMNodeInserted' || type === 'DOMNodeRemoved' || type === 'DOMSubtreeModified') {
      const observerData = observerMap.get(this);
      if (observerData && observerData.listeners.has(type)) {
        observerData.listeners.get(type)?.delete(listener);
        
        // If no more listeners for any deprecated events, disconnect the observer
        const hasAnyListeners = Array.from(observerData.listeners.values())
          .some((listenerSet: Set<EventListener>) => listenerSet.size > 0);
        
        if (!hasAnyListeners) {
          observerData.observer.disconnect();
          observerMap.delete(this);
        }
      }
      return;
    }
    
    // For all other events, use the original implementation
    return originalRemoveEventListener.call(this, type, listener, options);
  };
}

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<App />);

// calling IPC exposed from preload script
window.electron?.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);
});
window.electron?.ipcRenderer.sendMessage('ipc-example', ['ping']);
