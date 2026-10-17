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
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-12',
    xl: 'h-16',
  };

  const textMap = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={`${import.meta.env.BASE_URL}famart-logo.png`}
        alt="Famart Clinic logo"
        decoding="async"
        className={`${sizeMap[size]} w-auto shrink-0 object-contain transition-transform duration-200 hover:scale-105`}
      />

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`font-bold tracking-tight ${textMap[size]} ${textColor}`}>
              FAMART
            </span>
            <span className="text-xs uppercase font-semibold tracking-wider text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
              CLINIC
            </span>
          </div>
          <span className="text-[10px] tracking-wide text-slate-400 font-medium mt-0.5">
            EMR &amp; CLINICAL SYSTEM
          </span>
        </div>
      )}
    </div>
  );
};
