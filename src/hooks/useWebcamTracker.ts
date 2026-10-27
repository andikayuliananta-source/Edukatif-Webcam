import { useRef, useState, useEffect, useCallback } from 'react';
import { MotionDetectionState } from '../types';

export interface UseWebcamTrackerOptions {
  onConfirmAnswer?: (answer: boolean) => void;
  enabled?: boolean;
  sensitivity?: 'rendah' | 'sedang' | 'tinggi';
  holdDurationMs?: number;
}

export function useWebcamTracker({
  onConfirmAnswer,
  enabled = true,
  sensitivity = 'sedang',
  holdDurationMs = 800
}: UseWebcamTrackerOptions = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Persistent MediaStream reference
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);

  // Motion & Presence state
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

  // Tracking frames: Previous frame (motion) and Adaptive Background frame (presence)
  const prevFrameData = useRef<Uint8ClampedArray | null>(null);
  const bgFrameData = useRef<Float32Array | null>(null);

  // Zone hold tracking
  const currentActiveZone = useRef<'left' | 'right' | 'center' | 'none'>('none');
  const zoneHoldProgress = useRef<number>(0);
  const lastFrameTime = useRef<number>(performance.now());
  const hasTriggeredRef = useRef<boolean>(false);

  // Helper: Attach stream to video element
  const attachStreamToVideo = useCallback(() => {
    const video = videoRef.current;
    const stream = streamRef.current;

    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    video.muted = true;
    video.playsInline = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsCameraActive(true);
          setIsCameraLoading(false);
          setHasCameraPermission(true);
        })
        .catch((err) => {
          console.warn('Autoplay error:', err);
        });
    }
  }, []);

  // Request & Start Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsCameraLoading(true);

    try {
      if (streamRef.current && streamRef.current.active) {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        if (videoTrack && videoTrack.readyState === 'live') {
          attachStreamToVideo();
          return;
        }
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser ini tidak mendukung akses kamera webcam.');
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });
      } catch (firstErr) {
        console.warn('Fallback to basic video:', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      attachStreamToVideo();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Kamera tidak dapat diakses';
      console.warn('Camera access issue:', errMsg);
      setCameraError(errMsg);
      setHasCameraPermission(false);
      setIsCameraActive(false);
      setIsCameraLoading(false);
    }
  }, [attachStreamToVideo]);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    setIsCameraActive(false);
    setIsCameraLoading(false);
  }, []);

  // Automatically attach stream if videoRef mounts while stream is already alive
  useEffect(() => {
    if (streamRef.current && videoRef.current && videoRef.current.srcObject !== streamRef.current) {
      attachStreamToVideo();
    }
  }, [attachStreamToVideo]);

  // Sensitivity thresholds
  const getThresholds = useCallback(() => {
    switch (sensitivity) {
      case 'tinggi':
        return {
          presenceDelta: 16,
          motionDelta: 14,
          leftThreshold: 0.46,
          rightThreshold: 0.54,
          dwellTimeMs: Math.max(500, holdDurationMs * 0.85)
        };
      case 'rendah':
        return {
          presenceDelta: 28,
          motionDelta: 24,
          leftThreshold: 0.40,
          rightThreshold: 0.60,
          dwellTimeMs: Math.round(holdDurationMs * 1.25)
        };
      case 'sedang':
      default:
        return {
          presenceDelta: 20,
          motionDelta: 18,
          leftThreshold: 0.44,
          rightThreshold: 0.56,
          dwellTimeMs: holdDurationMs
        };
    }
  }, [sensitivity, holdDurationMs]);

  // Calibrate current frame as neutral background baseline
  const calibrateBaseline = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    try {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frame.data;
      bgFrameData.current = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        bgFrameData.current[i] = data[i];
      }
    } catch {
      // quiet
    }
  }, []);

  // Reset answer trigger when a new question starts
  const resetTrigger = useCallback(() => {
    hasTriggeredRef.current = false;
    currentActiveZone.current = 'none';
    zoneHoldProgress.current = 0;
    setMotionState((prev) => ({
      ...prev,
      zone: 'none',
      zoneHoldProgress: 0
    }));
  }, []);

  // Main processing loop: Computer Vision Dual-Tracker (Motion + Presence Centroid)
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

    // 160x120 processing canvas for super smooth 60fps tracking
    const PROC_WIDTH = 160;
    const PROC_HEIGHT = 120;
    canvas.width = PROC_WIDTH;
    canvas.height = PROC_HEIGHT;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let isRunning = true;
    lastFrameTime.current = performance.now();

    const processFrame = () => {
      if (!isRunning) return;

      const now = performance.now();
      const deltaTime = Math.min(100, Math.max(10, now - lastFrameTime.current));
      lastFrameTime.current = now;

      if (video.readyState >= 2 && !video.paused && !video.ended) {
        // Draw mirrored video to processing canvas
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -PROC_WIDTH, 0, PROC_WIDTH, PROC_HEIGHT);
        ctx.restore();

        const currentFrame = ctx.getImageData(0, 0, PROC_WIDTH, PROC_HEIGHT);
        const currData = currentFrame.data;
        const prevData = prevFrameData.current;

        // Initialize background model if not yet set
        if (!bgFrameData.current) {
          bgFrameData.current = new Float32Array(currData.length);
          for (let i = 0; i < currData.length; i++) {
            bgFrameData.current[i] = currData[i];
          }
        }

        const bgData = bgFrameData.current;
        const { presenceDelta, motionDelta, leftThreshold, rightThreshold, dwellTimeMs } = getThresholds();

        const leftBoundary = PROC_WIDTH * leftThreshold;
        const rightBoundary = PROC_WIDTH * rightThreshold;

        let leftMass = 0;
        let rightMass = 0;
        let centerMass = 0;

        let weightedXSum = 0;
        let weightedYSum = 0;
        let totalActiveWeight = 0;

        // Step by 2 pixels for max efficiency & high accuracy
        for (let i = 0; i < currData.length; i += 4 * 2) {
          const pixelIdx = i / 4;
          const x = pixelIdx % PROC_WIDTH;
          const y = Math.floor(pixelIdx / PROC_WIDTH);

          // 1. Frame-to-frame delta (active motion / jump)
          let motionDiff = 0;
          if (prevData) {
            const mr = Math.abs(currData[i] - prevData[i]);
            const mg = Math.abs(currData[i + 1] - prevData[i + 1]);
            const mb = Math.abs(currData[i + 2] - prevData[i + 2]);
            motionDiff = (mr + mg + mb) / 3;
          }

          // 2. Background delta (body presence even when standing still!)
          const pr = Math.abs(currData[i] - bgData[i]);
          const pg = Math.abs(currData[i + 1] - bgData[i + 1]);
          const pb = Math.abs(currData[i + 2] - bgData[i + 2]);
          const presenceDiff = (pr + pg + pb) / 3;

          // Slowly adapt background where motion is low
          if (motionDiff < motionDelta) {
            bgData[i] = bgData[i] * 0.98 + currData[i] * 0.02;
            bgData[i + 1] = bgData[i + 1] * 0.98 + currData[i + 1] * 0.02;
            bgData[i + 2] = bgData[i + 2] * 0.98 + currData[i + 2] * 0.02;
          }

          // Combined score gives strong weight to BOTH active movement and holding position!
          const isPresent = presenceDiff > presenceDelta;
          const isMoving = motionDiff > motionDelta;

          if (isPresent || isMoving) {
            const weight = (isPresent ? presenceDiff : 0) + (isMoving ? motionDiff * 1.5 : 0);

            weightedXSum += x * weight;
            weightedYSum += y * weight;
            totalActiveWeight += weight;

            if (x < leftBoundary) {
              leftMass += weight;
            } else if (x > rightBoundary) {
              rightMass += weight;
            } else {
              centerMass += weight;
            }
          }
        }

        // Calculate body/hand spatial centroid (0.0 = far left, 1.0 = far right)
        const centroidX = totalActiveWeight > 100 ? weightedXSum / totalActiveWeight / PROC_WIDTH : 0.5;
        const centroidY = totalActiveWeight > 100 ? weightedYSum / totalActiveWeight / PROC_HEIGHT : 0.5;

        // Normalize masses for UI gauges
        const normalizedLeft = Math.min(100, Math.round((leftMass / 4000) * 100));
        const normalizedRight = Math.min(100, Math.round((rightMass / 4000) * 100));

        // DETERMINING CURRENT ZONE:
        // A player is in the LEFT zone if:
        // - Centroid is shifted to the left (centroidX < leftThreshold)
        // - OR left side presence mass clearly dominates right side
        // Same for RIGHT zone.
        let detectedZone: 'left' | 'right' | 'center' | 'none' = 'none';

        if (centroidX < leftThreshold || (leftMass > rightMass * 1.4 && leftMass > 150)) {
          detectedZone = 'left';
        } else if (centroidX > rightThreshold || (rightMass > leftMass * 1.4 && rightMass > 150)) {
          detectedZone = 'right';
        } else if (totalActiveWeight > 80) {
          detectedZone = 'center';
        }

        // DWELL ACCUMULATOR & HYSTERESIS:
        // When in a zone, charge smoothly.
        // If a single frame flickers, decay smoothly instead of wiping to 0!
        if (detectedZone === 'left' || detectedZone === 'right') {
          if (currentActiveZone.current === detectedZone) {
            // Increment progress based on real elapsed ms
            const increment = deltaTime / dwellTimeMs;
            zoneHoldProgress.current = Math.min(1, zoneHoldProgress.current + increment);

            // Trigger when filled
            if (zoneHoldProgress.current >= 1 && !hasTriggeredRef.current) {
              hasTriggeredRef.current = true;
              const chosenAnswer = detectedZone === 'right'; // right = BENAR (true), left = SALAH (false)
              if (onConfirmAnswer) {
                onConfirmAnswer(chosenAnswer);
              }
            }
          } else {
            // Switch active zone smoothly starting from 0%
            currentActiveZone.current = detectedZone;
            zoneHoldProgress.current = 0;
          }
        } else {
          // If in center or none, decay progress smoothly rather than sudden cliff
          if (zoneHoldProgress.current > 0) {
            zoneHoldProgress.current = Math.max(0, zoneHoldProgress.current - (deltaTime / 300));
          }
          if (zoneHoldProgress.current === 0) {
            currentActiveZone.current = 'none';
          }
        }

        setMotionState({
          zone: detectedZone,
          zoneHoldProgress: zoneHoldProgress.current,
          isDetected: totalActiveWeight > 50,
          confidence: Math.min(1, totalActiveWeight / 2000),
          motionEnergyLeft: normalizedLeft,
          motionEnergyRight: normalizedRight,
          centroidX,
          centroidY
        });

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
    isCameraLoading,
    hasCameraPermission,
    cameraError,
    motionState,
    startCamera,
    stopCamera,
    calibrateBaseline,
    resetTrigger
  };
}
