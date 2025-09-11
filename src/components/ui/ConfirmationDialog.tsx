import React, { useState } from 'react';
import { Button } from './Button';
import './ConfirmationDialog.css';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  requireTextConfirmation?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger';
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  requireTextConfirmation,
  onConfirm,
  onCancel,
  variant = 'default',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (requireTextConfirmation) {
      if (inputValue !== requireTextConfirmation) {
        setError(`You must type "${requireTextConfirmation}" exactly to confirm.`);
        return;
      }
    }
    
    setInputValue('');
    setError('');
    onConfirm();
  };

  const handleCancel = () => {
    setInputValue('');
    setError('');
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="confirmation-dialog-overlay">
      <div className="confirmation-dialog">
        <div className="confirmation-dialog-header">
          <h3 className={`confirmation-title ${variant === 'danger' ? 'confirmation-title--danger' : ''}`}>
            {title}
          </h3>
        </div>
        
        <div className="confirmation-dialog-content">
          <div className="confirmation-message">
            {message.split('\n').map((line, index) => (
              <div key={index} className="message-line">
                {line}
              </div>
            ))}
          </div>
          
          {requireTextConfirmation && (
            <div className="confirmation-input-section">
              <label className="confirmation-input-label">
                Type "{requireTextConfirmation}" to confirm:
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setError('');
                }}
                className="confirmation-input"
                placeholder={requireTextConfirmation}
                autoFocus
              />
              {error && (
                <div className="confirmation-error">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="confirmation-dialog-footer">
          <Button onClick={handleCancel} variant="secondary">
            {cancelText}
          </Button>
          <Button 
            onClick={handleConfirm} 
            variant={variant === 'danger' ? 'danger' : 'primary'}
            disabled={!!requireTextConfirmation && inputValue !== requireTextConfirmation}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
