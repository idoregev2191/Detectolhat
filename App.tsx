import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Prediction } from './types';
import PredictionBar from './components/PredictionBar';

// Teachable Machine's global `tmImage` and `tf` objects are loaded from script tags in index.html.
// We declare them here to inform TypeScript about their existence on the window object.
declare global {
    interface Window {
        tmImage: any;
        tf: any;
    }
}

const MODEL_URL = "https://teachablemachine.withgoogle.com/models/WaHRZl6S7/";

const App: React.FC = () => {
    const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true);
    const [isStartingWebcam, setIsStartingWebcam] = useState<boolean>(false);
    const [webcamActive, setWebcamActive] = useState<boolean>(false);
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [error, setError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const modelRef = useRef<any | null>(null);
    const requestAnimationFrameRef = useRef<number>(0);

    const loadModel = async () => {
        // Ensure Teachable Machine and TensorFlow.js libraries are loaded
        if (!window.tmImage || !window.tf) {
            setError("Required AI libraries not loaded. Please check your internet connection and refresh.");
            setIsLoadingModel(false);
            return;
        }

        try {
            const modelURL = MODEL_URL + "model.json";
            const metadataURL = MODEL_URL + "metadata.json";
            const model = await window.tmImage.load(modelURL, metadataURL);
            modelRef.current = model;
            const classNames = model.getClassLabels();
            const initialPredictions = classNames.map((name: string) => ({
                className: name,
                probability: 0
            }));
            setPredictions(initialPredictions);
        } catch (err) {
            console.error("Failed to load model:", err);
            setError("Could not load the AI model. Please check your connection and try again.");
        } finally {
            setIsLoadingModel(false);
        }
    };

    const startWebcam = async () => {
        if (webcamActive || isStartingWebcam) return;
        setIsStartingWebcam(true);
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await new Promise((resolve) => {
                    if (videoRef.current) {
                        videoRef.current.onloadedmetadata = () => resolve(true);
                    }
                });
                setWebcamActive(true);
            }
        } catch (err) {
            console.error("Failed to start webcam:", err);
            setError("Could not access the camera. Please grant permission and try again.");
        } finally {
            setIsStartingWebcam(false);
        }
    };

    const predictLoop = useCallback(async () => {
        if (modelRef.current && videoRef.current && videoRef.current.readyState >= 3) {
            // Pass `true` as the second argument to flip the webcam image horizontally.
            // This is necessary because the Teachable Machine training UI shows a mirrored view.
            const predictionResult = await modelRef.current.predict(videoRef.current, true);
            setPredictions(predictionResult);
        }
        requestAnimationFrameRef.current = requestAnimationFrame(predictLoop);
    }, []);

    useEffect(() => {
        loadModel();
    }, []);

    useEffect(() => {
        if (webcamActive && modelRef.current) {
            requestAnimationFrameRef.current = requestAnimationFrame(predictLoop);
        }
        return () => {
            if (requestAnimationFrameRef.current) {
                cancelAnimationFrame(requestAnimationFrameRef.current);
            }
        };
    }, [webcamActive, predictLoop]);

    useEffect(() => {
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const topPrediction = predictions.reduce(
        (prev, current) => (prev.probability > current.probability ? prev : current),
        { className: '', probability: 0 }
    );
    
    return (
        <main className="bg-gray-50 text-gray-900 min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 font-sans">
            <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
                <header className="text-center mb-8">
                    <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-800">Detectolhat</h1>
                </header>

                <div className="w-full aspect-video bg-gray-200 rounded-3xl overflow-hidden shadow-lg border border-gray-200 flex items-center justify-center relative">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-500 ${webcamActive ? 'opacity-100' : 'opacity-0'}`}
                        aria-label="Webcam Feed"
                    />
                    {!webcamActive && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-500 p-4">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.55a2 2 0 01.45 2.12l-1.5 5.25A2 2 0 0116.5 19H7.5a2 2 0 01-2-2V7.5a2 2 0 012-2H13m2 2l-2.5-2.5M15 10v4.5" />
                           </svg>
                           <p className="text-sm sm:text-base">Camera feed will appear here</p>
                       </div>
                    )}
                    {(isLoadingModel || isStartingWebcam) && (
                        <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center backdrop-blur-md z-10 rounded-3xl">
                           <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                           <p className="mt-4 text-gray-600">
                            {isLoadingModel ? 'Loading AI Model...' : 'Starting Camera...'}
                           </p>
                        </div>
                    )}
                </div>

                <div className="w-full mt-8">
                    {!webcamActive ? (
                        <button
                            onClick={startWebcam}
                            disabled={isLoadingModel || isStartingWebcam}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 text-lg shadow-lg shadow-blue-500/30 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                        >
                           {isLoadingModel ? 'Model Loading...' : 'Start Camera'}
                        </button>
                    ) : (
                        <div className="bg-white/60 backdrop-blur-lg border border-gray-200 p-4 sm:p-5 rounded-2xl shadow-md">
                            {predictions.length > 0 ? (
                                predictions.map((p) => (
                                    <PredictionBar 
                                        key={p.className} 
                                        prediction={p}
                                        isTopPrediction={p.probability > 0.6 && p.className === topPrediction.className} 
                                    />
                                ))
                            ) : (
                                <p className="text-gray-500 text-center">Awaiting prediction...</p>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 text-center bg-red-100 border border-red-200 text-red-800 p-3 rounded-lg text-sm" role="alert">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default App;