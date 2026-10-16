import React from 'react';

interface FamartLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
}

export const FamartLogo: React.FC<FamartLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textColor = 'text-slate-900',
}) => {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textMap = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Famart Clinic Logo Mark */}
      <svg
        viewBox="0 0 100 100"
        className={`${sizeMap[size]} shrink-0 transition-transform duration-200 hover:scale-105`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Famart Clinic Logo"
      >
        <defs>
          {/* Crimson Red Gradient */}
          <linearGradient id="famartRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="50%" stopColor="#B91C1C" />
            <stop offset="100%" stopColor="#7F1D1D" />
          </linearGradient>

          {/* Sapphire Blue Gradient */}
          <linearGradient id="famartBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="40%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>

          {/* Deep Dark Red Shadow */}
          <linearGradient id="famartDarkRed" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#991B1B" />
            <stop offset="100%" stopColor="#450A0A" />
          </linearGradient>
        </defs>

        {/* Top Arm (Red) */}
        <path
          d="M36,6 C44,2 56,2 64,6 C72,10 72,24 68,34 C60,33 40,33 32,34 C28,24 28,10 36,6 Z"
          fill="url(#famartRedGrad)"
        />

        {/* Left Arm (Red) */}
        <path
          d="M6,36 C2,44 2,56 6,64 C10,72 24,72 34,68 C33,60 33,40 34,32 C24,28 10,28 6,36 Z"
          fill="url(#famartRedGrad)"
        />

        {/* Bottom Arm (Red) */}
        <path
          d="M36,94 C44,98 56,98 64,94 C72,90 72,76 68,66 C60,67 40,67 32,66 C28,76 28,90 36,94 Z"
          fill="url(#famartDarkRed)"
        />

        {/* Right Arm (Blue Petal) */}
        <path
          d="M66,32 C67,40 67,60 66,68 C76,72 90,72 94,64 C98,56 98,44 94,36 C90,28 76,28 66,32 Z"
          fill="url(#famartBlueGrad)"
        />

        {/* Center Humanoid Embrace Figure (White Care Emblem) */}
        {/* Head Circle */}
        <circle cx="50" cy="22" r="7.5" fill="#FFFFFF" />

        {/* Embracing Body & Flowing Care Wings */}
        <path
          d="M50,33 C42,33 34,40 28,48 C24,47 21,43 23,39 C25,35 29,36 30,38 C35,46 44,48 50,48 C56,48 65,46 70,38 C71,36 75,35 77,39 C79,43 76,47 72,48 C66,40 58,33 50,33 Z"
          fill="#FFFFFF"
        />

        {/* Dynamic Center Swirl Body */}
        <path
          d="M44,46 C48,58 52,70 60,82 C63,86 67,86 68,82 C69,78 65,72 61,64 C55,54 50,44 48,36 Z"
          fill="#FFFFFF"
        />

        {/* Left red accent dot */}
        <circle cx="25" cy="40" r="3" fill="#991B1B" />
        {/* Right blue accent dot */}
        <circle cx="75" cy="40" r="3" fill="#1E40AF" />
        {/* Bottom red accent dot */}
        <circle cx="63" cy="85" r="4.5" fill="url(#famartDarkRed)" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`font-bold tracking-tight ${textMap[size]} ${textColor}`}>
              FAMART
            </span>
            <span className="text-xs uppercase font-semibold tracking-wider text-red-600 bg-red-50 border border-red-200/60 px-1.5 py-0.5 rounded">
              CLINIC
            </span>
          </div>
          <span className="text-[10px] tracking-wide text-slate-500 font-medium mt-0.5">
            EMR & CLINICAL SYSTEM
          </span>
        </div>
      )}
    </div>
  );
};
