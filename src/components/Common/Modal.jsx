// src/components/Common/Modal.jsx
import React, { useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import './Modal.css';

const Modal = ({ 
  title, 
  children, 
  onClose, 
  size = 'medium',
  showIcon = false,
  icon = null,
  variant = 'default', // default, confirmation
  loading = false,
  className = '',
  headerClassName = '',
  contentClassName = '',
  footerClassName = '',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true
}) => {
  
  // Handle escape key press
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    if (closeOnEscape) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.classList.add('modal-open');
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.classList.remove('modal-open');
    };
  }, [closeOnEscape, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };

  // Get modal classes
  const getModalClasses = () => {
    const classes = ['modal', size];
    if (variant) classes.push(variant);
    if (className) classes.push(className);
    return classes.join(' ');
  };

  // Render loading state
  if (loading) {
    return (
      <div 
        className="modal-overlay" 
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className={getModalClasses()}>
          <div className="modal-loading">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="modal-overlay" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={getModalClasses()}>
        {/* Header */}
        <div className={`modal-header ${headerClassName}`}>
          <h2 id="modal-title" className="modal-title">
            {showIcon && (icon || <Bell size={20} />)}
            {title}
          </h2>
          {showCloseButton && (
            <button
              className="modal-close"
              onClick={onClose}
              aria-label="Close modal"
              type="button"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className={`modal-content ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Confirmation Modal Component
export const ConfirmationModal = ({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning', // warning, danger, success, info
  icon,
  loading = false,
  ...props
}) => {
  const getIcon = () => {
    if (icon) return icon;
    
    switch (variant) {
      case 'danger':
        return <X size={24} />;
      case 'success':
        return <Bell size={24} />;
      case 'info':
        return <Bell size={24} />;
      default:
        return <Bell size={24} />;
    }
  };

  return (
    <Modal
      title={title}
      variant="confirmation"
      size="small"
      onClose={onCancel}
      loading={loading}
      {...props}
    >
      <div className="modal-body">
        <div className={`modal-icon ${variant}`}>
          {getIcon()}
        </div>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button 
            className={`btn btn-${variant === 'danger' ? 'danger' : 'primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <div className="loading-spinner small"></div>}
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Modal Body Component for easier content structuring
export const ModalBody = ({ children, className = '', padding = 'default' }) => {
  const getPaddingClass = () => {
    switch (padding) {
      case 'compact':
        return 'modal-body compact';
      case 'spacious':
        return 'modal-body spacious';
      default:
        return 'modal-body';
    }
  };

  return (
    <div className={`${getPaddingClass()} ${className}`}>
      {children}
    </div>
  );
};

// Modal Footer Component
export const ModalFooter = ({ 
  children, 
  className = '', 
  justify = 'end' // start, center, end, space-between
}) => {
  return (
    <div className={`modal-footer ${justify} ${className}`}>
      {children}
    </div>
  );
};

export default Modal;