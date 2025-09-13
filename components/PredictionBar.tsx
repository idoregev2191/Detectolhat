import React from 'react';
import type { Prediction } from '../types';

interface PredictionBarProps {
  prediction: Prediction;
  isTopPrediction: boolean;
}

const PredictionBar: React.FC<PredictionBarProps> = ({ prediction, isTopPrediction }) => {
  const percentage = (prediction.probability * 100).toFixed(0);

  return (
    <div className="w-full mb-3 last:mb-0">
      <div className="flex justify-between items-center mb-1.5 text-sm font-medium text-gray-600">
        <span className="font-semibold">{prediction.className}</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ease-in-out ${isTopPrediction ? 'bg-blue-500' : 'bg-gray-400'}`}
          style={{ width: `${percentage}%` }}
          aria-valuenow={Number(percentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
          aria-label={`${prediction.className} confidence`}
        ></div>
      </div>
    </div>
  );
};

export default PredictionBar;