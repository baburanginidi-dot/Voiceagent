import React from 'react';

/**
 * @interface NoiseWarningProps
 * @property {boolean} isVisible - Whether the noise warning is visible.
 * @property {() => void} onDismiss - Callback function to handle the dismissal of the warning.
 */
interface NoiseWarningProps {
  isVisible: boolean;
  onDismiss: () => void;
}

/**
 * NoiseWarning component displays a warning message to the user when high background noise is detected.
 *
 * @param {NoiseWarningProps} props - The props for the NoiseWarning component.
 * @returns {JSX.Element | null} The rendered NoiseWarning component or null if not visible.
 */
export const NoiseWarning: React.FC<NoiseWarningProps> = ({ isVisible, onDismiss }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slideIn max-w-sm">
      <div className="bg-amber-50 border border-amber-200 rounded-[16px] px-5 py-4 shadow-lg backdrop-blur-sm flex items-start gap-3">
        <div className="flex-shrink-0 pt-0.5">
          <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">Background noise detected</p>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            For better clarity, try moving to a quieter spot or using headphones.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-amber-400 hover:text-amber-600 transition-colors -mt-1 -mr-1"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};
