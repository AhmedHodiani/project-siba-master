import React, { useEffect, useRef, useCallback } from 'react';
import { GoldenLayout } from 'golden-layout';
import 'golden-layout/dist/css/goldenlayout-base.css';
import 'golden-layout/dist/css/themes/goldenlayout-dark-theme.css';
import './GoldenLayoutWrapper.css';

interface GoldenLayoutWrapperProps {
  config: any;
  onLayoutCreated?: (layout: any) => void;
  children?: React.ReactNode;
}

const GoldenLayoutWrapper: React.FC<GoldenLayoutWrapperProps> = ({
  config,
  onLayoutCreated,
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<any>(null);

  const initializeLayout = useCallback(() => {
    if (!containerRef.current) return;

    try {
      // Create the layout
      const layout = new GoldenLayout(config, containerRef.current);

      // Register React component renderer
      layout.registerComponent('react-component', function(container: any, componentState: any) {
        const componentId = componentState.componentId;
        const element = document.getElementById(componentId);
        
        if (element) {
          // Move the React component into the Golden Layout container
          container.getElement().append(element);
          element.style.display = 'block';
          element.style.width = '100%';
          element.style.height = '100%';
        }

        // Handle resize
        container.on('resize', () => {
          if (element) {
            element.style.width = '100%';
            element.style.height = '100%';
          }
        });

        // Handle destroy
        container.on('destroy', () => {
          if (element && element.parentNode) {
            // Move element back to hidden container
            const hiddenContainer = document.getElementById('hidden-react-components');
            if (hiddenContainer) {
              hiddenContainer.appendChild(element);
              element.style.display = 'none';
            }
          }
        });
      });

      layout.init();
      layoutRef.current = layout;

      if (onLayoutCreated) {
        onLayoutCreated(layout);
      }

      // Handle window resize
      const handleResize = () => {
        if (layoutRef.current) {
          layoutRef.current.updateSize();
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (layoutRef.current) {
          layoutRef.current.destroy();
        }
      };
    } catch (error) {
      console.error('Error initializing Golden Layout:', error);
    }
  }, [config, onLayoutCreated]);

  useEffect(() => {
    const cleanup = initializeLayout();
    return cleanup;
  }, [initializeLayout]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {/* Hidden container for React components */}
      <div id="hidden-react-components" style={{ display: 'none' }}>
        {children}
      </div>
    </div>
  );
};

export default GoldenLayoutWrapper;