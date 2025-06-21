// src/components/Common/LoadingSpinner.jsx
import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
  size = 'medium', 
  text = '',
  color, // e.g., '#FFCA28' (Firebase Yellow), '#4285F4' (Blue), '#DB4437' (Red), or 'white'
  className = ''
}) => {
  
  const containerClasses = `loading-container ${size} ${className}`;
  
  // Map size prop to SVG dimensions
  const sizeMap = {
    small: { width: '28px', height: '28px', stroke: '3' },
    medium: { width: '48px', height: '48px', stroke: '4' },
    large: { width: '64px', height: '64px', stroke: '4' },
    xlarge: { width: '80px', height: '80px', stroke: '5' },
  };

  const dimensions = sizeMap[size] || sizeMap.medium;

  // Custom style for the spinner path color
  const spinnerStyle = color ? { stroke: color } : {};

  return (
    <div className={containerClasses}>
      <div className="firebase-spinner-container" style={{ width: dimensions.width, height: dimensions.height }}>
        <svg className="firebase-spinner" viewBox="25 25 50 50" style={{ animationDuration: '2s' }}>
          <circle
            className="firebase-spinner-path"
            cx="50"
            cy="50"
            r="20"
            fill="none"
            strokeWidth={dimensions.stroke}
            strokeMiterlimit="10"
            style={spinnerStyle}
          />
        </svg>
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
