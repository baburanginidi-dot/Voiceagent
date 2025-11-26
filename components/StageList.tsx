import React from 'react';
import { STAGES } from '../constants';

/**
 * @interface StageListProps
 * @property {number} currentStage - The ID of the current active stage.
 */
interface StageListProps {
  currentStage: number;
}

/**
 * StageList component displays the list of stages in the conversation,
 * highlighting the current stage and indicating completed stages.
 *
 * @param {StageListProps} props - The props for the StageList component.
 * @returns {JSX.Element} The rendered StageList component.
 */
export const StageList: React.FC<StageListProps> = ({ currentStage }) => {
  return (
    <div className="flex flex-col space-y-4 w-full">
      {STAGES.map((stage) => {
        const isActive = stage.id === currentStage;
        const isCompleted = stage.id < currentStage;

        return (
          <div
            key={stage.id}
            className={`relative flex items-center p-4 rounded-[24px] transition-all duration-500 ${
              isActive
                ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] scale-[1.02]'
                : isCompleted
                ? 'opacity-50'
                : 'opacity-30 grayscale'
            }`}
          >
            {/* Number Indicator */}
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold mr-4 transition-colors duration-300 ${
                isActive
                  ? 'bg-black text-white'
                  : isCompleted
                  ? 'bg-[#E6ECFF] text-black'
                  : 'bg-[#F2F2F2] text-[#4F4F4F]'
              }`}
            >
              {isCompleted ? '✓' : stage.id}
            </div>

            {/* Content */}
            <div className="flex flex-col">
              <span
                className={`text-[15px] font-semibold tracking-tight ${
                  isActive ? 'text-black' : 'text-[#4F4F4F]'
                }`}
              >
                {stage.title}
              </span>
              {isActive && (
                <span className="text-[13px] text-[#4F4F4F] mt-1 leading-snug animate-fadeIn">
                  {stage.description}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
