/**
 * Performance Validation UI Component
 * Requirements: 1.1, 1.3, 1.4, 2.5, 4.5, 5.5, 6.4, 8.4
 * 
 * Provides UI for running performance validation tests and viewing results
 */

import { useState } from 'react';
import type { ValidationReport, PerformanceMeasurement, FeatureCost } from '@/performance/validation';
import { PerformanceValidator } from '@/performance/validation';

interface PerformanceValidationProps {
    onClose: () => void;
}

export const PerformanceValidation = ({ onClose }: PerformanceValidationProps) => {
    const [isRunning, setIsRunning] = useState(false);
    const [currentStage, setCurrentStage] = useState('');
    const [progress, setProgress] = useState(0);
    const [report, setReport] = useState<ValidationReport | null>(null);

    const validator = new PerformanceValidator();

    const runValidation = async () => {
        setIsRunning(true);
        setReport(null);

        try {
            const validationReport = await validator.generateValidationReport(
                (stage, prog) => {
                    setCurrentStage(stage);
                    setProgress(prog);
                }
            );

            setReport(validationReport);
        } catch (error) {
            console.error('Validation failed:', error);
        } finally {
            setIsRunning(false);
            setCurrentStage('');
            setProgress(0);
        }
    };

    const downloadReport = () => {
        if (!report) return;

        const json = validator.exportReport(report);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-validation-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatFPS = (fps: number): string => {
        return fps.toFixed(1);
    };

    const formatFrameTime = (ms: number): string => {
        return ms.toFixed(2);
    };

    const getFPSColor = (fps: number): string => {
        if (fps >= 75) return 'text-green-400';
        if (fps >= 60) return 'text-yellow-400';
        if (fps >= 30) return 'text-orange-400';
        return 'text-red-400';
    };

    const getTargetIcon = (met: boolean): string => {
        return met ? '✓' : '✗';
    };

    const getTargetColor = (met: boolean): string => {
        return met ? 'text-green-400' : 'text-red-400';
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-black/90 border border-white/20 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-black/95 border-b border-white/20 p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Performance Validation</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Description */}
                    <div className="text-sm text-gray-400 space-y-2">
                        <p>
                            This tool measures baseline performance and individual feature costs
                            to validate that the system meets performance targets.
                        </p>
                        <p className="text-xs">
                            <strong>Note:</strong> The validation will take approximately 30-40 seconds to complete.
                            Please do not interact with the simulation during this time.
                        </p>
                    </div>

                    {/* Run Button */}
                    {!isRunning && !report && (
                        <button
                            onClick={runValidation}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition-colors font-medium"
                        >
                            Run Performance Validation
                        </button>
                    )}

                    {/* Progress */}
                    {isRunning && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">{currentStage}</span>
                                <span className="text-sm font-mono text-blue-400">
                                    {Math.round(progress * 100)}%
                                </span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-300"
                                    style={{ width: `${progress * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Results */}
                    {report && (
                        <div className="space-y-6">
                            {/* Device Info */}
                            <div className="bg-white/5 rounded-lg p-4 space-y-2">
                                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                                    Device Information
                                </h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">Device Type:</span>
                                        <span className="ml-2 text-white">
                                            {report.deviceInfo.isMobile ? 'Mobile' : 'Desktop'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Pixel Ratio:</span>
                                        <span className="ml-2 text-white font-mono">
                                            {report.deviceInfo.devicePixelRatio}x
                                        </span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-gray-500">Resolution:</span>
                                        <span className="ml-2 text-white font-mono">
                                            {report.deviceInfo.screenResolution}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Targets */}
                            <div className="bg-white/5 rounded-lg p-4 space-y-3">
                                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                                    Performance Targets
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">
                                            Baseline 75 FPS (All Features Off)
                                        </span>
                                        <span className={`font-mono ${getTargetColor(report.meetsTargets.baseline75FPS)}`}>
                                            {getTargetIcon(report.meetsTargets.baseline75FPS)} {formatFPS(report.baselineMeasurement.averageFPS)} FPS
                                        </span>
                                    </div>
                                    {report.deviceInfo.isMobile && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">
                                                Mobile 60 FPS Target
                                            </span>
                                            <span className={`font-mono ${getTargetColor(report.meetsTargets.mobile60FPS)}`}>
                                                {getTargetIcon(report.meetsTargets.mobile60FPS)} {formatFPS(report.baselineMeasurement.averageFPS)} FPS
                                            </span>
                                        </div>
                                    )}
                                    {!report.deviceInfo.isMobile && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">
                                                Desktop 120 FPS Target
                                            </span>
                                            <span className={`font-mono ${getTargetColor(report.meetsTargets.desktop120FPS)}`}>
                                                {getTargetIcon(report.meetsTargets.desktop120FPS)} {formatFPS(report.baselineMeasurement.averageFPS)} FPS
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Baseline Performance */}
                            <div className="bg-white/5 rounded-lg p-4 space-y-3">
                                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                                    Baseline Performance
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <div className="text-gray-500 text-xs mb-1">Average FPS</div>
                                        <div className={`font-mono text-lg ${getFPSColor(report.baselineMeasurement.averageFPS)}`}>
                                            {formatFPS(report.baselineMeasurement.averageFPS)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 text-xs mb-1">Min FPS</div>
                                        <div className={`font-mono text-lg ${getFPSColor(report.baselineMeasurement.minFPS)}`}>
                                            {formatFPS(report.baselineMeasurement.minFPS)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 text-xs mb-1">Max FPS</div>
                                        <div className={`font-mono text-lg ${getFPSColor(report.baselineMeasurement.maxFPS)}`}>
                                            {formatFPS(report.baselineMeasurement.maxFPS)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 text-xs mb-1">Avg Frame Time</div>
                                        <div className="font-mono text-lg text-blue-400">
                                            {formatFrameTime(report.baselineMeasurement.averageFrameTimeMs)}ms
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 text-xs mb-1">P95 Frame Time</div>
                                        <div className="font-mono text-lg text-blue-400">
                                            {formatFrameTime(report.baselineMeasurement.p95FrameTimeMs)}ms
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-500 text-xs mb-1">P99 Frame Time</div>
                                        <div className="font-mono text-lg text-blue-400">
                                            {formatFrameTime(report.baselineMeasurement.p99FrameTimeMs)}ms
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Feature Costs */}
                            <div className="bg-white/5 rounded-lg p-4 space-y-3">
                                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                                    Individual Feature Costs
                                </h3>
                                <div className="space-y-2">
                                    {report.featureCosts.map((cost) => (
                                        <div
                                            key={cost.featureName}
                                            className="bg-white/5 rounded p-3 space-y-2"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">{cost.featureName}</span>
                                                <span className={`font-mono text-sm ${cost.fpsImpact < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                    {cost.fpsImpact > 0 ? '+' : ''}{formatFPS(cost.fpsImpact)} FPS
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                <div>
                                                    <span className="text-gray-500">Baseline:</span>
                                                    <span className="ml-1 font-mono text-white">
                                                        {formatFPS(cost.baselineFPS)} FPS
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">With Feature:</span>
                                                    <span className="ml-1 font-mono text-white">
                                                        {formatFPS(cost.featureEnabledFPS)} FPS
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Impact:</span>
                                                    <span className={`ml-1 font-mono ${Math.abs(cost.percentageImpact) > 30 ? 'text-red-400' : Math.abs(cost.percentageImpact) > 15 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                        {cost.percentageImpact.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Frame time impact: +{formatFrameTime(cost.frameTimeImpactMs)}ms
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div className="bg-white/5 rounded-lg p-4 space-y-3">
                                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                                    Recommendations
                                </h3>
                                <div className="space-y-2 text-sm">
                                    {report.recommendations.map((rec, index) => (
                                        <div
                                            key={index}
                                            className={`p-2 rounded ${rec.startsWith('✓') ? 'bg-green-500/10 text-green-400' :
                                                    rec.startsWith('⚠️') ? 'bg-yellow-500/10 text-yellow-400' :
                                                        'bg-blue-500/10 text-blue-400'
                                                }`}
                                        >
                                            {rec}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={downloadReport}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                                >
                                    Download Report (JSON)
                                </button>
                                <button
                                    onClick={runValidation}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                                >
                                    Run Again
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
