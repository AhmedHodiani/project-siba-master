import React from 'react';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  details?: string[];
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  details = [],
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          headerColor: '#dc3545',
          confirmButtonVariant: 'danger' as const,
        };
      case 'warning':
        return {
          headerColor: '#ffc107',
          confirmButtonVariant: 'secondary' as const,
        };
      case 'info':
        return {
          headerColor: '#007bff',
          confirmButtonVariant: 'primary' as const,
        };
      default:
        return {
          headerColor: '#dc3545',
          confirmButtonVariant: 'danger' as const,
        };
    }
  };

  const { headerColor, confirmButtonVariant } = getVariantStyles();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #444',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid #333',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: headerColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px',
              fontSize: '14px',
              fontWeight: 'bold',
              color: 'white',
            }}
          >
            !
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#e0e0e0',
            }}
          >
            {title}
          </h3>
        </div>

        {/* Message */}
        <div
          style={{
            marginBottom: details.length > 0 ? '16px' : '24px',
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#ccc',
          }}
        >
          {message}
        </div>

        {/* Details */}
        {details.length > 0 && (
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid #333',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#888',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              What will be deleted:
            </div>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
              }}
            >
              {details.map((detail, index) => (
                <li
                  key={index}
                  style={{
                    fontSize: '13px',
                    color: '#e0e0e0',
                    marginBottom: '4px',
                    paddingLeft: '16px',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '0',
                      color: headerColor,
                      fontWeight: 'bold',
                    }}
                  >
                    •
                  </span>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <Button onClick={onCancel} variant="secondary">
            {cancelText}
          </Button>
          <Button onClick={onConfirm} variant={confirmButtonVariant}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};