import {NativeModules, Platform} from 'react-native';
import {LivenessChallenge} from '../types';

type NativeResult = {
  challenge: LivenessChallenge;
  passed: boolean;
  score: number;
  evidence: string;
  facePresent: boolean;
  adapter: 'mediapipe' | 'fallback';
};

export type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
};

export type FaceImageAnalysis = NativeResult & {
  tensor: number[];
  tensorShape: number[];
  antiSpoofTensor?: number[];
  antiSpoofTensorShape?: number[];
  scrfdTensor?: number[];
  scrfdTensorShape?: number[];
  faceBox?: FaceBox;
  preprocess?: 'mediapipe-face-crop' | 'center-crop-fallback';
};

type NativeMediaPipeModule = {
  analyzeChallenge: (
    challenge: LivenessChallenge,
    spoofMode: boolean,
  ) => Promise<NativeResult>;
  analyzeJpegBase64?: (
    challenge: LivenessChallenge,
    jpegBase64: string,
  ) => Promise<NativeResult>;
  analyzePhotoFile?: (
    challenge: LivenessChallenge,
    photoPath: string,
    requireChallenge: boolean,
  ) => Promise<FaceImageAnalysis>;
  getStatus: () => Promise<{
    available: boolean;
    adapter: string;
    modelAsset: string;
    notes: string;
  }>;
};

const nativeModule = NativeModules.MediaPipeFaceLandmarker as
  | NativeMediaPipeModule
  | undefined;

export async function analyzeChallengeWithNativeMediaPipe(
  challenge: LivenessChallenge,
  spoofMode: boolean,
): Promise<NativeResult> {
  if (Platform.OS !== 'android' || !nativeModule?.analyzeChallenge) {
    return fallbackChallenge(challenge, spoofMode);
  }

  try {
    return await nativeModule.analyzeChallenge(challenge, spoofMode);
  } catch {
    return fallbackChallenge(challenge, spoofMode);
  }
}

export async function getMediaPipeStatus() {
  if (Platform.OS !== 'android' || !nativeModule?.getStatus) {
    return {
      available: false,
      adapter: 'fallback',
      modelAsset: 'face_landmarker.task',
      notes: 'Android native MediaPipe module is not available in this runtime.',
    };
  }

  return nativeModule.getStatus();
}

export async function analyzeJpegWithNativeMediaPipe(
  challenge: LivenessChallenge,
  jpegBase64: string,
): Promise<NativeResult> {
  if (Platform.OS !== 'android' || !nativeModule?.analyzeJpegBase64) {
    return fallbackChallenge(challenge, false);
  }

  return nativeModule.analyzeJpegBase64(challenge, jpegBase64);
}

export async function analyzePhotoWithNativeMediaPipe(
  challenge: LivenessChallenge,
  photoPath: string,
  requireChallenge: boolean,
): Promise<FaceImageAnalysis> {
  if (Platform.OS !== 'android' || !nativeModule?.analyzePhotoFile) {
    return {
      ...fallbackChallenge(challenge, false),
      tensor: [],
      tensorShape: [1, 3, 112, 112],
    };
  }

  return nativeModule.analyzePhotoFile(challenge, photoPath, requireChallenge);
}

function fallbackChallenge(
  challenge: LivenessChallenge,
  spoofMode: boolean,
): NativeResult {
  return {
    challenge,
    passed: !spoofMode,
    score: spoofMode ? 0.18 : 0.91,
    evidence: spoofMode
      ? 'Demo spoof path: challenge motion was not detected.'
      : 'Fallback challenge state passed. Native MediaPipe module is used on Android builds.',
    facePresent: !spoofMode,
    adapter: 'fallback',
  };
}
