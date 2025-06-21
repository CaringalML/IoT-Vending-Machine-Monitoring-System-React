// src/components/Common/LoadingSpinner.jsx
import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
  size = 'medium', 
  text = 'Loading...', 
  variant = 'primary',
  animation = 'spin', // spin, pulse, dots
  fullscreen = false,
  inline = false,
  showProgress = false,
  progress = 0,
  progressText = '',
  className = ''
}) => {
  
  // Get spinner classes
  const getSpinnerClasses = () => {
    const classes = ['spinner', size, variant];
    if (animation !== 'spin') classes.push(animation);
    return classes.join(' ');
  };

  // Get container classes
  const getContainerClasses = () => {
    const classes = [];
    
    if (fullscreen) {
      classes.push('loading-fullscreen');
    } else if (inline) {
      classes.push('spinner-inline');
    } else {
      classes.push('loading-container', size);
    }
    
    if (className) classes.push(className);
    return classes.join(' ');
  };

  // Render progress bar if enabled
  const renderProgress = () => {
    if (!showProgress) return null;
    
    return (
      <div className="loading-with-progress">
        <div className="loading-progress">
          <div 
            className="loading-progress-bar" 
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        {progressText && (
          <div className="loading-progress-text">{progressText}</div>
        )}
      </div>
    );
  };

  return (
    <div className={getContainerClasses()}>
      <div className={getSpinnerClasses()}></div>
      {text && <p className="loading-text">{text}</p>}
      {renderProgress()}
    </div>
  );
};

// Inline spinner for buttons and other components
export const InlineSpinner = ({ 
  size = 'small', 
  variant = 'white',
  text = '',
  className = ''
}) => {
  return (
    <LoadingSpinner 
      size={size}
      variant={variant}
      text={text}
      inline={true}
      className={className}
    />
  );
};

// Fullscreen loading overlay
export const FullscreenLoader = ({ 
  text = 'Loading...', 
  size = 'large',
  variant = 'primary',
  dark = false,
  showProgress = false,
  progress = 0,
  progressText = '',
  className = ''
}) => {
  return (
    <LoadingSpinner 
      size={size}
      variant={variant}
      text={text}
      fullscreen={true}
      showProgress={showProgress}
      progress={progress}
      progressText={progressText}
      className={`${dark ? 'dark' : ''} ${className}`}
    />
  );
};

// Skeleton loading component
export const SkeletonLoader = ({ 
  type = 'line', // line, title, paragraph, circle
  width = '100%',
  height,
  count = 1,
  className = ''
}) => {
  const getHeight = () => {
    if (height) return height;
    switch (type) {
      case 'title': return '24px';
      case 'paragraph': return '12px';
      case 'circle': return '40px';
      default: return '16px';
    }
  };

  const getWidth = () => {
    if (type === 'circle') return getHeight();
    return width;
  };

  const skeletons = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className={`loading-skeleton ${type} ${className}`}
      style={{
        width: getWidth(),
        height: getHeight(),
      }}
    />
  ));

  return <>{skeletons}</>;
};

// Loading dots component
export const LoadingDots = ({ 
  size = 'medium',
  variant = 'primary',
  className = ''
}) => {
  return (
    <div className={`spinner dots ${size} ${variant} ${className}`}></div>
  );
};

// Progress loader
export const ProgressLoader = ({
  progress = 0,
  text = 'Loading...',
  progressText = '',
  size = 'medium',
  className = ''
}) => {
  return (
    <LoadingSpinner
      size={size}
      text={text}
      showProgress={true}
      progress={progress}
      progressText={progressText}
      className={className}
    />
  );
};

export default LoadingSpinner;