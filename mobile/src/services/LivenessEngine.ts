import {analyzeChallengeWithNativeMediaPipe} from '../native/MediaPipeFaceLandmarker';
import {ChallengeResult, LivenessChallenge} from '../types';

const challenges: LivenessChallenge[] = [
  'blink',
  'smile',
  'turnLeft',
  'turnRight',
];

const labels: Record<LivenessChallenge, string> = {
  blink: 'Blink once',
  smile: 'Smile clearly',
  turnLeft: 'Turn head left',
  turnRight: 'Turn head right',
};

export class LivenessEngine {
  nextChallenge(): LivenessChallenge {
    return challenges[Math.floor(Math.random() * challenges.length)];
  }

  labelFor(challenge: LivenessChallenge) {
    return labels[challenge];
  }

  async evaluate(
    challenge: LivenessChallenge,
    spoofMode: boolean,
  ): Promise<ChallengeResult> {
    const result = await analyzeChallengeWithNativeMediaPipe(
      challenge,
      spoofMode,
    );

    return {
      challenge,
      passed: result.passed,
      score: result.score,
      evidence: result.evidence,
    };
  }
}
