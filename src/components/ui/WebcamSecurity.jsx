import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { ShieldAlert, VideoOff, Smartphone, Bug, EyeOff } from 'lucide-react';

// Require TensorFlow.js backend-cpu and backend-webgl so we can force WebGL for speed
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';

// Configure TensorFlow
import * as tf from '@tensorflow/tfjs-core';

const WebcamSecurity = ({ onThreatDetected, onThreatCleared, onError }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const [model, setModel] = useState(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [threatActive, setThreatActive] = useState(false);
    const [threatType, setThreatType] = useState(null); // 'phone' | 'multiple-faces'
    const [penaltyTimeLeft, setPenaltyTimeLeft] = useState(0);

    // References to keep AI detached from UI renders
    const penaltyTimeRef = useRef(0);
    const showDebugRef = useRef(true);
    const isProcessingFrame = useRef(false);

    // Debug states
    const [showDebugState, setShowDebugState] = useState(true);
    const [currentDetections, setCurrentDetections] = useState([]);

    const threatCountRef = useRef(0);
    const activeRafRef = useRef(null);
    const penaltyTimerRef = useRef(null);

    // Sync state to refs for high-speed AI loop
    useEffect(() => {
        showDebugRef.current = showDebugState;
    }, [showDebugState]);

    useEffect(() => {
        penaltyTimeRef.current = penaltyTimeLeft;
    }, [penaltyTimeLeft]);

    // Clear penalty timer on unmount
    useEffect(() => {
        return () => {
            if (penaltyTimerRef.current) clearInterval(penaltyTimerRef.current);
        }
    }, []);

    const triggerPenalty = (type) => {
        setThreatActive(true);
        setThreatType(type);
        setPenaltyTimeLeft(15);
        penaltyTimeRef.current = 15;

        if (onThreatDetected) onThreatDetected(type);

        if (penaltyTimerRef.current) clearInterval(penaltyTimerRef.current);
        penaltyTimerRef.current = setInterval(() => {
            setPenaltyTimeLeft((prev) => {
                const next = prev - 1;
                penaltyTimeRef.current = next;
                if (next <= 0) {
                    clearInterval(penaltyTimerRef.current);
                    return 0;
                }
                return next;
            });
        }, 1000);
    };

    // Initialize TensorFlow and load COCO-SSD
    useEffect(() => {
        let isMounted = true;

        const initTF = async () => {
            try {
                await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'));
                await tf.ready();

                // Upgrade from lite to standard mobilenet_v2. It is smarter at edge cases.
                const loadedModel = await cocoSsd.load({
                    base: 'mobilenet_v2'
                });

                if (isMounted) {
                    setModel(loadedModel);
                }
            } catch (err) {
                console.error("TF Init Error:", err);
                if (isMounted && onError) onError("Failed to load security model.");
            }
        };

        initTF();
        return () => { isMounted = false; };
    }, [onError]);

    // Request Webcam Access
    useEffect(() => {
        let stream = null;

        const startWebcam = async () => {
            try {
                // SUPERCHARGE SPEED: 320x240 is extremely fast for object detection models designed for mobile
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',
                        width: { ideal: 320 },
                        height: { ideal: 240 }
                    }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setPermissionGranted(true);
                }
            } catch (err) {
                if (onError) onError("Secure viewing requires webcam access. Please grant permission.");
            }
        };

        if (model) {
            startWebcam();
        }

        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
            if (activeRafRef.current) cancelAnimationFrame(activeRafRef.current);
        };
    }, [model, onError]);

    // Main Detection Loop (Using Refs so it NEVER recreates or stops)
    const detectFrame = useCallback(async () => {
        if (!model || !videoRef.current || videoRef.current.readyState < 2) {
            activeRafRef.current = requestAnimationFrame(detectFrame);
            return;
        }

        // Prevent piling up frames if ML gets slow
        if (isProcessingFrame.current) {
            activeRafRef.current = requestAnimationFrame(detectFrame);
            return;
        }

        isProcessingFrame.current = true;

        try {
            const predictions = await model.detect(videoRef.current);
            setCurrentDetections(predictions);

            let phoneDetected = false;
            let personCount = 0;

            // Draw debug canvas if active
            if (showDebugRef.current && canvasRef.current && videoRef.current && videoRef.current.videoWidth > 0) {
                const ctx = canvasRef.current.getContext('2d');
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;

                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.drawImage(videoRef.current, 0, 0, ctx.canvas.width, ctx.canvas.height);

                predictions.forEach(prediction => {
                    const [x, y, width, height] = prediction.bbox;
                    const text = `${prediction.class} (${Math.round(prediction.score * 100)}%)`;

                    ctx.strokeStyle = prediction.class === 'cell phone' ? '#ef4444' : '#3b82f6';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(x, y, width, height);

                    ctx.fillStyle = prediction.class === 'cell phone' ? '#ef4444' : '#3b82f6';
                    const textWidth = ctx.measureText(text).width;
                    ctx.fillRect(x, y - 24, textWidth + 10, 24);

                    ctx.fillStyle = '#ffffff';
                    ctx.font = '16px Arial';
                    ctx.fillText(text, x + 5, y - 6);
                });
            }

            // 🚨 HYPER-AGGRESSIVE DEVICE DETECTION 🚨
            // Added book, cup, and bottle because custom cases drastically distort the shape profile
            const hostileDevices = ['cell phone', 'remote', 'laptop', 'mouse', 'tablet', 'tv', 'book', 'cup', 'bottle'];

            const personBoxes = [];

            predictions.forEach(prediction => {
                // Device detection stays ultra-sensitive
                if (hostileDevices.includes(prediction.class) && prediction.score >= 0.015) {
                    phoneDetected = true;
                }

                // Person detection needs to be STRICT (65%) to avoid mistaking an arm for a second person
                if (prediction.class === 'person' && prediction.score > 0.65) {
                    const [nx, ny, nw, nh] = prediction.bbox;
                    let isOverlapping = false;

                    // Check if this new "person" box is just overlapping another (like a hand in front of a chest)
                    for (let box of personBoxes) {
                        const [ox, oy, ow, oh] = box;
                        // Calculate Intersection over Union (IoU) roughly
                        const xOverlap = Math.max(0, Math.min(nx + nw, ox + ow) - Math.max(nx, ox));
                        const yOverlap = Math.max(0, Math.min(ny + nh, oy + oh) - Math.max(ny, oy));
                        const overlapArea = xOverlap * yOverlap;

                        const nArea = nw * nh;
                        const oArea = ow * oh;
                        const unionArea = nArea + oArea - overlapArea;

                        // If boxes overlap by more than 30%, it's probably the same person
                        if ((overlapArea / unionArea) > 0.30) {
                            isOverlapping = true;
                            break;
                        }
                    }

                    if (!isOverlapping) {
                        personBoxes.push(prediction.bbox);
                        personCount++;
                    }
                }
            });

            // 🚨 Dark Frame / Blocked Camera Detection 🚨
            let isCameraBlocked = false;
            if (canvasRef.current && videoRef.current && videoRef.current.videoWidth > 0) {
                const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
                // We draw the video to the hidden canvas specifically to read its pixels
                ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                
                try {
                    const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
                    const data = imageData.data;
                    let totalLuma = 0;
                    
                    // Sample every 4th pixel to save CPU milliseconds
                    for (let i = 0; i < data.length; i += 16) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        // Standard discrete RGB luma formula
                        const luma = 0.299 * r + 0.587 * g + 0.114 * b; 
                        totalLuma += luma;
                    }
                    
                    const avgLuma = totalLuma / (data.length / 16);
                    
                    // If average luma is less than 12 (out of 255), it's completely dark (hand over lens)
                    if (avgLuma < 12) {
                        isCameraBlocked = true;
                        if (showDebugRef.current) console.log("Camera blocked! Avg Luma:", avgLuma);
                    }
                } catch (e) {
                    // Ignore DOMException if video not fully loaded across origins
                }
            }


            // Threat Logic
            let currentThreat = null;
            if (isCameraBlocked) {
                currentThreat = 'camera-blocked';
            } else if (phoneDetected) {
                currentThreat = 'phone';
            } else if (personCount > 1) {
                currentThreat = 'multiple-faces';
            }

            if (currentThreat) {
                if (penaltyTimeRef.current === 0) {
                    triggerPenalty(currentThreat);
                } else {
                    // Already active penalty, if we STILL see a camera, reset the timer back to 15!
                    triggerPenalty(currentThreat);
                }
            } else {
                if (penaltyTimeRef.current <= 0) {
                    setThreatActive(prev => {
                        if (prev) {
                            setThreatType(null);
                            if (onThreatCleared) onThreatCleared();
                            return false;
                        }
                        return prev;
                    });
                }
            }
        } catch (err) { }

        isProcessingFrame.current = false;
        activeRafRef.current = requestAnimationFrame(detectFrame);
    }, [model, onThreatDetected, onThreatCleared]);

    useEffect(() => {
        if (permissionGranted && model) {
            setIsInitializing(false);
            activeRafRef.current = requestAnimationFrame(detectFrame);
        }
        return () => {
            if (activeRafRef.current) cancelAnimationFrame(activeRafRef.current);
        }
    }, [permissionGranted, model, detectFrame]);


    return (
        <>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="hidden"
                onLoadedMetadata={() => {
                    if (videoRef.current) videoRef.current.play().catch(e => console.error("Play error:", e));
                }}
            />

            {isInitializing && (
                <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center">
                    <div className="p-8 bg-slate-800 rounded-xl border border-blue-900/50 flex flex-col items-center shadow-2xl max-w-md text-center animate-pulse">
                        <ShieldAlert className="h-16 w-16 text-blue-500 mb-6" />
                        <h2 className="text-2xl font-bold text-white mb-2">Initializing Security AI</h2>
                        <p className="text-slate-400 mb-6 font-medium">Please allow webcam access when prompted. This document is under visual protection.</p>
                        <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-1/2 animate-ping"></div>
                        </div>
                    </div>
                </div>
            )}



            {(!isInitializing && threatActive) && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-3xl flex flex-col items-center justify-center pointer-events-none">
                    <div className="p-10 bg-slate-800 rounded-2xl border-2 border-red-500/50 flex flex-col items-center shadow-[0_0_100px_rgba(239,68,68,0.2)] max-w-lg text-center transform transition-all duration-300 scale-100 pointer-events-auto">
                        <div className="bg-red-500/20 p-6 rounded-full mb-6 relative">
                            {threatType === 'phone' ? (
                                <Smartphone className="h-16 w-16 text-red-500 animate-bounce" />
                            ) : threatType === 'camera-blocked' ? (
                                <EyeOff className="h-16 w-16 text-red-500 animate-pulse" />
                            ) : (
                                <VideoOff className="h-16 w-16 text-red-500 animate-pulse" />
                            )}
                            <div className="absolute inset-0 border-4 border-red-500 rounded-full animate-ping opacity-20"></div>
                        </div>

                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                            {threatType === 'phone' ? 'Recording Device Detected' : 
                             threatType === 'camera-blocked' ? 'Camera Blocked' : 
                             'Multiple People Detected'}
                        </h2>

                        <p className="text-lg text-slate-300 mb-6 font-medium">
                            {threatType === 'phone' ? 'Please put down your phone/camera to continue reading.' : 
                             threatType === 'camera-blocked' ? 'Please uncover your webcam lens to continue viewing.' : 
                             'Only the authorized user is allowed to view this document.'}
                        </p>

                        {/* Penalty Timer UI */}
                        {penaltyTimeLeft > 0 && (
                            <div className="bg-slate-900 border border-red-500/30 rounded-xl p-4 w-full flex flex-col items-center mb-4">
                                <p className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-2">
                                    PENALTY LOCKDOWN
                                </p>
                                <div className="text-5xl font-mono font-black text-red-500 tracking-tighter">
                                    00:{penaltyTimeLeft.toString().padStart(2, '0')}
                                </div>
                                <div className="w-full bg-slate-800 h-1 mt-4 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                                        style={{ width: `${(penaltyTimeLeft / 15) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-red-400/60 uppercase tracking-widest font-bold mt-2">
                            Document Access Suspended
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default WebcamSecurity;
