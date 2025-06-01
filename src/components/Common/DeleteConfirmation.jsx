import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import Modal from '../Common/Modal';
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
  showInput = false,
  inputPlaceholder = "Type 'DELETE' to confirm"
}) => {
  const [loading, setLoading] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (showInput && confirmInput !== 'DELETE') {
      setError('Please type "DELETE" to confirm');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onConfirm();
      onClose();
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

  const isConfirmDisabled = loading || (showInput && confirmInput !== 'DELETE');

  if (!isOpen) return null;

  return (
    <Modal title={title} onClose={handleClose} size="small">
      <div className="delete-confirmation">
        <div className="delete-icon">
          <AlertTriangle size={48} />
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
              {error}
            </div>
          )}

          {showInput && (
            <div className="delete-input-group">
              <label htmlFor="confirmInput" className="delete-input-label">
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                id="confirmInput"
                value={confirmInput}
                onChange={(e) => {
                  setConfirmInput(e.target.value);
                  if (error) setError('');
                }}
                placeholder={inputPlaceholder}
                className="delete-input"
                disabled={loading}
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
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
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

export default DeleteConfirmation;