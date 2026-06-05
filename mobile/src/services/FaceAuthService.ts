import {FaceEmbeddingAdapter} from './FaceEmbeddingAdapter';
import {
  MiniFasAntiSpoofAdapter,
  MiniFasResult,
} from './MiniFasAntiSpoofAdapter';
import {
  ScrfdDetectionResult,
  ScrfdFaceDetectorAdapter,
} from './ScrfdFaceDetectorAdapter';
import {
  FaceImageAnalysis,
  analyzePhotoWithNativeMediaPipe,
} from '../native/MediaPipeFaceLandmarker';
import {
  ChallengeResult,
  LivenessChallenge,
  VerificationResult,
  WorkerProfile,
} from '../types';
import {makeId, isoNow} from '../utils/ids';
import {cosineSimilarity} from '../utils/vector';

const MATCH_THRESHOLD = 0.68;
const MIN_ENROLL_FACE_FRAMES = 2;
const MIN_CHALLENGE_SCORE = 0.35;
const INPUT_TENSOR_LENGTH = 1 * 3 * 112 * 112;

type PipelineAnalysis = FaceImageAnalysis & {
  scrfd: ScrfdDetectionResult;
  miniFas: MiniFasResult;
};

export class FaceAuthService {
  private embeddingAdapter = new FaceEmbeddingAdapter();
  private scrfdDetector = new ScrfdFaceDetectorAdapter();
  private antiSpoof = new MiniFasAntiSpoofAdapter();

  async enroll(params: {
    personnelId: string;
    name: string;
    deviceId: string;
    photoPaths: string[];
  }): Promise<WorkerProfile> {
    const analyses = await this.analyzePipeline('smile', params.photoPaths);
    const humanFaceFrames = analyses.filter(hasHumanFace);

    if (humanFaceFrames.length < MIN_ENROLL_FACE_FRAMES) {
      throw new Error(
        `Enrollment needs a centered human face. ${pipelineSummary(analyses)}`,
      );
    }

    const embeddings = await Promise.all(
      humanFaceFrames.map((analysis, index) =>
        this.embeddingAdapter.embed({
          personnelId: params.personnelId,
          name: params.name,
          frameSeed: `enroll-${index}`,
          tensor: analysis.tensor,
        }),
      ),
    );
    const embedding = averageEmbeddings(embeddings);

    return {
      id: makeId('worker'),
      personnelId: params.personnelId.trim(),
      name: params.name.trim(),
      embedding,
      enrolledAt: isoNow(),
      sourceDeviceId: params.deviceId,
      modelVersion: 'mobilefacenet-arcface-quantized-adapter',
    };
  }

  async verify(params: {
    profiles: WorkerProfile[];
    selectedPersonnelId?: string;
    photoPaths: string[];
    challenge: LivenessChallenge;
    spoofMode: boolean;
  }): Promise<VerificationResult> {
    const started = Date.now();
    const auditEventId = makeId('audit');
    const claimedProfile = params.selectedPersonnelId
      ? params.profiles.find(
          profile => profile.personnelId === params.selectedPersonnelId,
        )
      : undefined;

    const analyses = await this.analyzePipeline(
      params.challenge,
      params.photoPaths,
    );
    const challengeResults = toChallengeResults(
      params.challenge,
      analyses,
      params.spoofMode,
    );
    const humanFaceFrames = analyses.filter(hasHumanFace);
    const bestAnalysis = bestHumanFaceAnalysis(analyses);
    const livenessPassed =
      !params.spoofMode &&
      Boolean(bestAnalysis) &&
      humanFaceFrames.length >= 2 &&
      (
        challengeResults.some(result => result.passed) ||
        faceSizeConsistent(humanFaceFrames)
      ) &&
      faceSizeConsistent(analyses.filter(hasDetectedFace));

    if (!bestAnalysis) {
      return {
        matchedUserId: null,
        personnelId: null,
        workerName: null,
        similarity: 0,
        livenessPassed: false,
        challengeResults,
        latencyMs: Date.now() - started,
        reasonCode: 'no_face',
        auditEventId,
      };
    }

    if (!livenessPassed) {
      return {
        matchedUserId: null,
        personnelId: null,
        workerName: null,
        similarity: 0,
        livenessPassed: false,
        challengeResults,
        latencyMs: Date.now() - started,
        reasonCode: params.spoofMode ? 'spoof_demo_failed' : 'liveness_failed',
        auditEventId,
      };
    }

    if (params.selectedPersonnelId && !claimedProfile) {
      return {
        matchedUserId: null,
        personnelId: null,
        workerName: null,
        similarity: 0,
        livenessPassed: true,
        challengeResults,
        latencyMs: Date.now() - started,
        reasonCode: 'no_match',
        auditEventId,
      };
    }

    const liveEmbeddings = await Promise.all(
      humanFaceFrames.map((analysis, index) =>
        this.embeddingAdapter.embed({
          personnelId: 'live-camera-capture',
          frameSeed: `${auditEventId}-${index}`,
          tensor: analysis.tensor,
        }),
      ),
    );

    const profilesToCompare = claimedProfile ? [claimedProfile] : params.profiles;
    const ranked = profilesToCompare
      .map(profile => ({
        profile,
        similarity: bestSimilarity(profile.embedding, liveEmbeddings),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    const best = ranked[0];
    const passed = Boolean(best && best.similarity >= MATCH_THRESHOLD);

    return {
      matchedUserId: passed ? best.profile.id : null,
      personnelId: passed ? best.profile.personnelId : null,
      workerName: passed ? best.profile.name : null,
      similarity: Number((best?.similarity ?? 0).toFixed(4)),
      livenessPassed: true,
      challengeResults,
      latencyMs: Date.now() - started,
      reasonCode: passed ? 'passed' : 'no_match',
      auditEventId,
    };
  }

  private async analyzePipeline(
    challenge: LivenessChallenge,
    photoPaths: string[],
  ): Promise<PipelineAnalysis[]> {
    const analyses = await Promise.all(
      photoPaths.map(photoPath =>
        analyzePhotoWithNativeMediaPipe(challenge, photoPath, false),
      ),
    );

    return Promise.all(
      analyses.map(async analysis => ({
        ...analysis,
        scrfd: await this.scrfdDetector.detect({
          tensor: analysis.scrfdTensor,
          mediaPipeFacePresent: analysis.facePresent,
        }),
        miniFas: await this.antiSpoof.evaluate(analysis.antiSpoofTensor),
      })),
    );
  }
}

function hasTensor(analysis: FaceImageAnalysis) {
  return analysis.tensor?.length === INPUT_TENSOR_LENGTH;
}

function hasDetectedFace(analysis: FaceImageAnalysis) {
  return hasTensor(analysis) && analysis.facePresent;
}

function hasHumanFace(analysis: PipelineAnalysis) {
  return (
    hasDetectedFace(analysis) &&
    analysis.scrfd.facePresent &&
    analysis.scrfd.confidence >= 0.35
  );
}

function hasAcceptedPipelineFace(analysis: PipelineAnalysis) {
  return hasHumanFace(analysis);
}

function bestHumanFaceAnalysis(analyses: PipelineAnalysis[]) {
  const usable = analyses.filter(hasHumanFace);
  if (!usable.length) {
    return undefined;
  }

  return usable.sort((a, b) => {
    const confidenceDelta = b.scrfd.confidence - a.scrfd.confidence;
    if (Math.abs(confidenceDelta) > 0.05) {
      return confidenceDelta;
    }

    return b.score - a.score;
  })[0];
}

function toChallengeResults(
  challenge: LivenessChallenge,
  analyses: PipelineAnalysis[],
  spoofMode: boolean,
): ChallengeResult[] {
  if (!analyses.length) {
    return [
      {
        challenge,
        passed: false,
        score: 0,
        evidence: 'No camera captures were available for liveness analysis.',
      },
    ];
  }

  const stable = faceSizeConsistent(analyses.filter(hasAcceptedPipelineFace));
  const stableHumanFrames = analyses.filter(hasAcceptedPipelineFace).length;
  return analyses.map((analysis, index) => ({
    challenge,
    passed:
      hasAcceptedPipelineFace(analysis) &&
      (analysis.score >= MIN_CHALLENGE_SCORE || stableHumanFrames >= 2) &&
      stable &&
      !spoofMode,
    score: analysis.score,
    evidence: `Frame ${index + 1}: ${analysis.evidence}${
      analysis.preprocess === 'center-crop-fallback'
        ? ' Center crop fallback is not accepted as a real face.'
        : ''
    }${
      stable
        ? ''
        : ' Face-size changed across captured frames.'
    }${
      hasDetectedFace(analysis) && analysis.score < MIN_CHALLENGE_SCORE
        ? stableHumanFrames >= 2
          ? ' Challenge score is low; stable multi-frame face presence is used.'
          : ' Liveness challenge score is below threshold.'
        : ''
    }${
      analysis.scrfd.facePresent
        ? ` ${analysis.scrfd.evidence}`
        : ` SCRFD rejected frame: ${analysis.scrfd.evidence}`
    }${
      analysis.miniFas.live
        ? ` MiniFAS advisory passed: ${analysis.miniFas.evidence}`
        : ` MiniFAS advisory warning: ${analysis.miniFas.evidence}`
    }${
      spoofMode
        ? ' Spoof demo is enabled, so liveness is forced to fail.'
        : ''
    }`,
  }));
}

function faceSizeConsistent(analyses: FaceImageAnalysis[]) {
  const areas = analyses
    .map(analysis => analysis.faceBox)
    .filter(Boolean)
    .map(box => (box?.width ?? 0) * (box?.height ?? 0))
    .filter(area => area > 0);

  if (areas.length < 2) {
    return true;
  }

  const minArea = Math.min(...areas);
  const maxArea = Math.max(...areas);
  return maxArea / minArea <= 1.8;
}

function pipelineSummary(analyses: PipelineAnalysis[]) {
  if (!analyses.length) {
    return 'No camera frames were captured.';
  }

  const bestMediaPipe = analyses.some(hasDetectedFace);
  const bestScrfd = analyses.reduce(
    (best, analysis) => Math.max(best, analysis.scrfd.confidence),
    0,
  );
  const bestMiniFas = analyses.reduce(
    (best, analysis) => Math.max(best, analysis.miniFas.liveScore),
    0,
  );
  const evidence = analyses
    .slice(0, 2)
    .map(
      (analysis, index) =>
        `Frame ${index + 1}: MediaPipe ${analysis.facePresent ? 'face' : 'no face'}, SCRFD ${analysis.scrfd.confidence.toFixed(2)}, MiniFAS real ${analysis.miniFas.liveScore.toFixed(2)}.`,
    )
    .join(' ');

  return `Best: MediaPipe ${bestMediaPipe ? 'face' : 'no face'}, SCRFD ${bestScrfd.toFixed(2)}, MiniFAS advisory real ${bestMiniFas.toFixed(2)}. ${evidence}`;
}

function averageEmbeddings(embeddings: number[][]) {
  const dimensions = embeddings[0]?.length ?? 0;
  const averaged = Array.from({length: dimensions}, (_, index) => {
    const sum = embeddings.reduce((total, embedding) => total + embedding[index], 0);
    return sum / embeddings.length;
  });
  const magnitude =
    Math.sqrt(averaged.reduce((sum, value) => sum + value * value, 0)) || 1;
  return averaged.map(value => Number((value / magnitude).toFixed(6)));
}

function bestSimilarity(profileEmbedding: number[], liveEmbeddings: number[][]) {
  if (!liveEmbeddings.length) {
    return 0;
  }

  return liveEmbeddings.reduce(
    (best, liveEmbedding) =>
      Math.max(best, cosineSimilarity(profileEmbedding, liveEmbedding)),
    0,
  );
}
