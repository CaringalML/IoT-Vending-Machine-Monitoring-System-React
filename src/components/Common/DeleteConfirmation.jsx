// src/components/Common/DeleteConfirmation.jsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import Modal from './Modal';
import './DeleteConfirmation.css';

const DeleteConfirmation = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Delete Item",
  message = "Are you sure you want to delete this item?",
  itemName = "",
  type = "item",
  warningText = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  showInput = false,
  inputPlaceholder = "Type 'DELETE' to confirm",
  requireExactMatch = true,
  confirmationWord = "DELETE",
  variant = "danger", // danger, warning
  size = "small",
  icon = null
}) => {
  const [loading, setLoading] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [error, setError] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    // Validate input if required
    if (showInput) {
      const inputValue = confirmInput.trim();
      const expectedValue = requireExactMatch ? confirmationWord : confirmationWord.toLowerCase();
      const actualValue = requireExactMatch ? inputValue : inputValue.toLowerCase();
      
      if (actualValue !== expectedValue) {
        setError(`Please type "${confirmationWord}" to confirm`);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      await onConfirm();
      handleClose();
    } catch (err) {
      setError(err.message || 'An error occurred while deleting');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setConfirmInput('');
      setError('');
      onClose();
    }
  };

  const handleInputChange = (e) => {
    setConfirmInput(e.target.value);
    if (error) setError('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isConfirmDisabled) {
      handleConfirm();
    }
  };

  const isConfirmDisabled = () => {
    if (loading) return true;
    if (showInput) {
      const inputValue = confirmInput.trim();
      const expectedValue = requireExactMatch ? confirmationWord : confirmationWord.toLowerCase();
      const actualValue = requireExactMatch ? inputValue : inputValue.toLowerCase();
      return actualValue !== expectedValue;
    }
    return false;
  };

  const getIcon = () => {
    if (icon) return icon;
    return variant === 'warning' ? <AlertTriangle size={48} /> : <AlertTriangle size={48} />;
  };

  const getInputValidationClass = () => {
    if (!showInput || !confirmInput) return '';
    
    const inputValue = confirmInput.trim();
    const expectedValue = requireExactMatch ? confirmationWord : confirmationWord.toLowerCase();
    const actualValue = requireExactMatch ? inputValue : inputValue.toLowerCase();
    
    return actualValue === expectedValue ? 'valid' : 'invalid';
  };

  if (!isOpen) return null;

  return (
    <Modal 
      title={title} 
      onClose={handleClose} 
      size={size}
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      showCloseButton={!loading}
    >
      <div className="delete-confirmation">
        <div className="delete-icon">
          {getIcon()}
        </div>

        <div className="delete-content">
          <p className="delete-message">{message}</p>
          
          {itemName && (
            <div className="delete-item-name">
              <strong>"{itemName}"</strong>
            </div>
          )}

          <p className="delete-warning">{warningText}</p>

          {error && (
            <div className="delete-error">
              <X size={16} />
              {error}
            </div>
          )}

          {showInput && (
            <div className="delete-input-group">
              <label htmlFor="confirmInput" className="delete-input-label">
                Type <strong>{confirmationWord}</strong> to confirm:
              </label>
              <input
                type="text"
                id="confirmInput"
                value={confirmInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={inputPlaceholder}
                className={`delete-input ${getInputValidationClass()}`}
                disabled={loading}
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="delete-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={isConfirmDisabled()}
          >
            {loading ? (
              <div className="delete-loading-content">
                <div className="delete-loading-spinner"></div>
                <span>Deleting...</span>
              </div>
            ) : (
              <>
                <Trash2 size={16} />
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Quick delete confirmation without input
export const QuickDeleteConfirmation = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName,
  type = "item"
}) => {
  return (
    <DeleteConfirmation
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Delete ${type}`}
      message={`Are you sure you want to delete this ${type}?`}
      itemName={itemName}
      showInput={false}
      size="small"
    />
  );
};

// Secure delete confirmation with typed confirmation
export const SecureDeleteConfirmation = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName,
  type = "item",
  confirmationWord = "DELETE"
}) => {
  return (
    <DeleteConfirmation
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Delete ${type}`}
      message={`This will permanently delete this ${type}. This action cannot be undone.`}
      itemName={itemName}
      warningText={`Type "${confirmationWord}" below to confirm deletion.`}
      showInput={true}
      confirmationWord={confirmationWord}
      requireExactMatch={true}
      size="medium"
    />
  );
};

// Bulk delete confirmation
export const BulkDeleteConfirmation = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  count,
  type = "items"
}) => {
  return (
    <DeleteConfirmation
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Delete ${count} ${type}`}
      message={`Are you sure you want to delete ${count} ${type}?`}
      warningText="This action cannot be undone and will delete all selected items."
      confirmText={`Delete ${count} ${type}`}
      showInput={count > 5} // Require confirmation for bulk operations
      confirmationWord="DELETE ALL"
      size="medium"
    />
  );
};

export default DeleteConfirmation;