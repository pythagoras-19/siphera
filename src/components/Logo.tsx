import React from 'react';
import './Logo.css';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 40, className = '', showText = true }) => {
  return (
    <div className={`logo-container ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="siphera-logo"
      >
        {/* Background circle with gradient */}
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a90e2" />
            <stop offset="50%" stopColor="#357abd" />
            <stop offset="100%" stopColor="#4caf50" />
          </linearGradient>
          <linearGradient id="innerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f0f0f0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Main circle background */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="url(#logoGradient)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="2"
          filter="url(#glow)"
        />
        
        {/* Inner circle */}
        <circle
          cx="50"
          cy="50"
          r="35"
          fill="url(#innerGradient)"
          opacity="0.9"
        />
        
        {/* Communication waves */}
        <g stroke="#4a90e2" strokeWidth="2" fill="none" opacity="0.8">
          {/* Left wave */}
          <path d="M 25 40 Q 20 50 25 60" />
          <path d="M 20 45 Q 15 50 20 55" />
          
          {/* Right wave */}
          <path d="M 75 40 Q 80 50 75 60" />
          <path d="M 80 45 Q 85 50 80 55" />
        </g>
        
        {/* Central communication symbol */}
        <g fill="#4a90e2">
          {/* Phone/communication icon */}
          <rect x="42" y="35" width="16" height="30" rx="8" fill="url(#logoGradient)" />
          <rect x="44" y="37" width="12" height="26" rx="6" fill="url(#innerGradient)" />
          
          {/* Signal dots */}
          <circle cx="35" cy="45" r="2" fill="#4caf50" />
          <circle cx="35" cy="50" r="2" fill="#4caf50" />
          <circle cx="35" cy="55" r="2" fill="#4caf50" />
          
          <circle cx="65" cy="45" r="2" fill="#4caf50" />
          <circle cx="65" cy="50" r="2" fill="#4caf50" />
          <circle cx="65" cy="55" r="2" fill="#4caf50" />
        </g>
        
        {/* Security lock overlay */}
        <g fill="#4caf50" opacity="0.9">
          <rect x="45" y="42" width="10" height="8" rx="2" />
          <rect x="47" y="40" width="6" height="4" rx="1" />
        </g>
      </svg>
      
      {showText && (
        <div className="logo-text">
          <span className="logo-title">Siphera</span>
        </div>
      )}
    </div>
  );
};

export default Logo; 