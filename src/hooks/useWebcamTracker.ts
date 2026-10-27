import { useRef, useState, useEffect, useCallback } from 'react';
import { MotionDetectionState } from '../types';

export interface UseWebcamTrackerOptions {
  onConfirmAnswer?: (answer: boolean) => void;
  enabled?: boolean;
  sensitivity?: 'rendah' | 'sedang' | 'tinggi';
  holdDurationMs?: number; // Time in ms to hold/dwell in zone before locking answer
}

export function useWebcamTracker({
  onConfirmAnswer,
  enabled = true,
  sensitivity = 'sedang',
  holdDurationMs = 700
}: UseWebcamTrackerOptions = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Motion state
  const [motionState, setMotionState] = useState<MotionDetectionState>({
    zone: 'none',
    zoneHoldProgress: 0,
    isDetected: false,
    confidence: 0,
    motionEnergyLeft: 0,
    motionEnergyRight: 0,
    centroidX: 0.5,
    centroidY: 0.5
  });

  // Internal tracking refs for smooth continuous processing
  const prevFrameData = useRef<Uint8ClampedArray | null>(null);
  const baselineFrameData = useRef<Uint8ClampedArray | null>(null);
  const currentActiveZone = useRef<'left' | 'right' | 'center' | 'none'>('none');
  const zoneHoldStartTime = useRef<number | null>(null);
  const hasTriggeredRef = useRef<boolean>(false);

  // Sensitivity thresholds
  const getThresholds = useCallback(() => {
    switch (sensitivity) {
      case 'tinggi':
        return { motionDelta: 18, energyThreshold: 12, dwellTime: Math.max(450, holdDurationMs * 0.75) };
      case 'rendah':
        return { motionDelta: 32, energyThreshold: 28, dwellTime: holdDurationMs * 1.3 };
      case 'sedang':
      default:
        return { motionDelta: 24, energyThreshold: 20, dwellTime: holdDurationMs };
    }
  }, [sensitivity, holdDurationMs]);

  // Request & Start Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera webcam.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
          setIsCameraActive(true);
          setHasCameraPermission(true);
        };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Kamera tidak dapat diakses';
      console.warn('Camera access issue:', errMsg);
      setCameraError(errMsg);
      setHasCameraPermission(false);
      setIsCameraActive(false);
    }
  }, []);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Calibrate current frame as neutral baseline
  const calibrateBaseline = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    try {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      baselineFrameData.current = new Uint8ClampedArray(frame.data);
    } catch {
      // quiet
    }
  }, []);

  // Reset answer trigger when a new question starts
  const resetTrigger = useCallback(() => {
    hasTriggeredRef.current = false;
    currentActiveZone.current = 'none';
    zoneHoldStartTime.current = null;
    setMotionState((prev) => ({
      ...prev,
      zone: 'none',
      zoneHoldProgress: 0
    }));
  }, []);

  // Main processing loop
  useEffect(() => {
    if (!enabled || !isCameraActive) {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Small processing canvas dimensions for high 60fps tracking
    const PROC_WIDTH = 160;
    const PROC_HEIGHT = 120;
    canvas.width = PROC_WIDTH;
    canvas.height = PROC_HEIGHT;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let isRunning = true;

    const processFrame = () => {
      if (!isRunning) return;

      if (video.readyState >= 2 && !video.paused && !video.ended) {
        // Draw mirrored video to processing canvas
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -PROC_WIDTH, 0, PROC_WIDTH, PROC_HEIGHT);
        ctx.restore();

        const currentFrame = ctx.getImageData(0, 0, PROC_WIDTH, PROC_HEIGHT);
        const currData = currentFrame.data;
        const prevData = prevFrameData.current;

        const { motionDelta, energyThreshold, dwellTime } = getThresholds();

        if (prevData) {
          let leftEnergy = 0;
          let rightEnergy = 0;
          let centerEnergy = 0;

          let motionPixelCount = 0;
          let weightedXSum = 0;
          let weightedYSum = 0;

          // Split width boundaries: Left zone (0 - 38%), Center (38% - 62%), Right zone (62% - 100%)
          const leftBoundary = PROC_WIDTH * 0.38;
          const rightBoundary = PROC_WIDTH * 0.62;

          for (let i = 0; i < currData.length; i += 4 * 2) {
            // sample every 2nd pixel
            const rDiff = Math.abs(currData[i] - prevData[i]);
            const gDiff = Math.abs(currData[i + 1] - prevData[i + 1]);
            const bDiff = Math.abs(currData[i + 2] - prevData[i + 2]);
            const diff = (rDiff + gDiff + bDiff) / 3;

            if (diff > motionDelta) {
              const pixelIndex = i / 4;
              const x = pixelIndex % PROC_WIDTH;
              const y = Math.floor(pixelIndex / PROC_WIDTH);

              motionPixelCount++;
              weightedXSum += x;
              weightedYSum += y;

              if (x < leftBoundary) {
                leftEnergy += diff;
              } else if (x > rightBoundary) {
                rightEnergy += diff;
              } else {
                centerEnergy += diff;
              }
            }
          }

          // Normalize energies
          const normalizedLeft = Math.min(100, Math.round((leftEnergy / (PROC_WIDTH * PROC_HEIGHT * 0.38)) * 8));
          const normalizedRight = Math.min(100, Math.round((rightEnergy / (PROC_WIDTH * PROC_HEIGHT * 0.38)) * 8));

          // Motion centroid (0 to 1)
          const centroidX = motionPixelCount > 15 ? weightedXSum / motionPixelCount / PROC_WIDTH : 0.5;
          const centroidY = motionPixelCount > 15 ? weightedYSum / motionPixelCount / PROC_HEIGHT : 0.5;

          // Determine current zone based on energy differential and centroid
          let detectedZone: 'left' | 'right' | 'center' | 'none' = 'none';

          if (normalizedLeft > energyThreshold && normalizedLeft > normalizedRight * 1.35) {
            detectedZone = 'left';
          } else if (normalizedRight > energyThreshold && normalizedRight > normalizedLeft * 1.35) {
            detectedZone = 'right';
          } else if (centroidX < 0.36 && normalizedLeft > 8) {
            detectedZone = 'left';
          } else if (centroidX > 0.64 && normalizedRight > 8) {
            detectedZone = 'right';
          } else if (motionPixelCount > 20) {
            detectedZone = 'center';
          }

          // Dwell / Confirmation accumulator
          const now = performance.now();
          let progress = 0;

          if (detectedZone === 'left' || detectedZone === 'right') {
            if (currentActiveZone.current === detectedZone) {
              if (zoneHoldStartTime.current) {
                const elapsed = now - zoneHoldStartTime.current;
                progress = Math.min(1, elapsed / dwellTime);

                // If progress reaches 100% and has not triggered yet
                if (progress >= 1 && !hasTriggeredRef.current) {
                  hasTriggeredRef.current = true;
                  // Left is SALAH (false), Right is BENAR (true)
                  const chosenAnswer = detectedZone === 'right'; // right = true, left = false
                  if (onConfirmAnswer) {
                    onConfirmAnswer(chosenAnswer);
                  }
                }
              }
            } else {
              currentActiveZone.current = detectedZone;
              zoneHoldStartTime.current = now;
              progress = 0.05;
            }
          } else {
            // Decaying / reset if player returned to center
            if (currentActiveZone.current !== 'none') {
              currentActiveZone.current = 'none';
              zoneHoldStartTime.current = null;
            }
            progress = 0;
          }

          setMotionState({
            zone: detectedZone,
            zoneHoldProgress: progress,
            isDetected: motionPixelCount > 10,
            confidence: Math.min(1, Math.max(normalizedLeft, normalizedRight) / 50),
            motionEnergyLeft: normalizedLeft,
            motionEnergyRight: normalizedRight,
            centroidX,
            centroidY
          });
        }

        // Store frame for next iteration
        prevFrameData.current = new Uint8ClampedArray(currData);
      }

      animFrameId.current = requestAnimationFrame(processFrame);
    };

    animFrameId.current = requestAnimationFrame(processFrame);

    return () => {
      isRunning = false;
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [enabled, isCameraActive, getThresholds, onConfirmAnswer]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    isCameraActive,
    hasCameraPermission,
    cameraError,
    motionState,
    startCamera,
    stopCamera,
    calibrateBaseline,
    resetTrigger
  };
}
