import React from 'react';

interface BlackHoleControlsProps {
  schwarzschildRadius: number;
  onRadiusChange: (radius: number) => void;
  distortionStrength: number;
  onDistortionChange: (strength: number) => void;
}

export const BlackHoleControls: React.FC<BlackHoleControlsProps> = ({
  schwarzschildRadius,
  onRadiusChange,
  distortionStrength,
  onDistortionChange,
}) => {
  return (
    <div className="mt-4 p-4 bg-gray-800 rounded-lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-200">
            Schwarzschild Radius
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={schwarzschildRadius}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm text-gray-300">{schwarzschildRadius.toFixed(1)}</span>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-200">
            Distortion Strength
          </label>
          <input
            type="range"
            min="1.0"
            max="4.0"
            step="0.1"
            value={distortionStrength}
            onChange={(e) => onDistortionChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm text-gray-300">{distortionStrength.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};