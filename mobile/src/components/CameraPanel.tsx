import React, {forwardRef, useEffect, useImperativeHandle, useRef} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';
import {
  Camera,
  CameraRef,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';
import {colors} from '../theme';

export type CameraPanelHandle = {
  takePhoto: () => Promise<string | null>;
};

type CameraPanelProps = {
  height?: number;
  label?: string;
  hint?: string;
  status?: 'idle' | 'scanning' | 'ready' | 'success' | 'error';
  scanActive?: boolean;
};

export const CameraPanel = forwardRef<CameraPanelHandle, CameraPanelProps>(
  function CameraPanelInner(
    {
      height = 220,
      label = 'Live camera',
      hint,
      status = 'idle',
      scanActive = false,
    }: CameraPanelProps,
    ref,
  ) {
  const cameraRef = useRef<CameraRef>(null);
  const scanValue = useRef(new Animated.Value(0)).current;
  const animationActive = scanActive || status === 'scanning';
  const device = useCameraDevice('front');
  const {hasPermission, requestPermission} = useCameraPermission();
  const photoOutput = usePhotoOutput({
    containerFormat: 'jpeg',
    quality: 0.85,
    qualityPrioritization: 'speed',
  });

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (!animationActive) {
      scanValue.stopAnimation();
      scanValue.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanValue, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scanValue, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [animationActive, scanValue]);

  useImperativeHandle(ref, () => ({
    async takePhoto() {
      if (!hasPermission || !device) {
        return null;
      }

      const photo = await photoOutput.capturePhotoToFile(
        {flashMode: 'off'},
        {},
      );
      return photo.filePath;
    },
  }), [device, hasPermission, photoOutput]);

  if (!hasPermission || !device) {
    return (
      <View style={[styles.cameraFrame, {height}]}>
        <Text style={styles.mockTitle}>Camera unavailable</Text>
        <Text style={styles.mockText}>
          Grant camera permission from Android settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.cameraFrame, {height}]}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        outputs={[photoOutput]}
        isActive
      />
      <View style={styles.scrim} />
      <View pointerEvents="none" style={styles.scanOverlay}>
        <View style={styles.scanFrame}>
          <View style={[styles.cornerLine, styles.cornerTopLeftH]} />
          <View style={[styles.cornerLine, styles.cornerTopLeftV]} />
          <View style={[styles.cornerLine, styles.cornerTopRightH]} />
          <View style={[styles.cornerLine, styles.cornerTopRightV]} />
          <View style={[styles.cornerLine, styles.cornerBottomLeftH]} />
          <View style={[styles.cornerLine, styles.cornerBottomLeftV]} />
          <View style={[styles.cornerLine, styles.cornerBottomRightH]} />
          <View style={[styles.cornerLine, styles.cornerBottomRightV]} />
          {scanLines.map(line => (
            <View
              key={line.key}
              style={[
                styles.scanFaceLine,
                {
                  left: `${line.left}%`,
                  top: `${line.top}%`,
                  width: `${line.width}%`,
                  transform: [{rotate: line.rotate}],
                },
              ]}
            />
          ))}
          {scanPoints.map(point => (
            <View
              key={point.key}
              style={[
                styles.scanPoint,
                point.large ? styles.scanPointLarge : null,
                {
                  left: `${point.left}%`,
                  top: `${point.top}%`,
                },
              ]}
            />
          ))}
          {animationActive ? (
              <Animated.View
                style={[
                  styles.scanBand,
                  {
                    opacity: scanValue.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.18, 0.75, 0.18],
                    }),
                    transform: [
                      {
                        translateY: scanValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-height * 0.18, height * 0.18],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ) : null}
        </View>
      </View>
      <View style={styles.topLabel}>
        <Text style={styles.cameraLabel}>{label}</Text>
        {hint ? <Text style={styles.cameraHint}>{hint}</Text> : null}
      </View>
    </View>
  );
});

const scanPoints = [
  {key: 'temple-l', left: 25, top: 22, large: true},
  {key: 'temple-r', left: 75, top: 22, large: true},
  {key: 'brow-c', left: 50, top: 24, large: true},
  {key: 'brow-l', left: 35, top: 38},
  {key: 'brow-r', left: 65, top: 38},
  {key: 'cheek-l', left: 24, top: 52, large: true},
  {key: 'cheek-r', left: 76, top: 52, large: true},
  {key: 'nose', left: 50, top: 55},
  {key: 'jaw-l', left: 28, top: 72, large: true},
  {key: 'jaw-r', left: 72, top: 72, large: true},
  {key: 'mouth-l', left: 43, top: 78},
  {key: 'mouth-r', left: 57, top: 78},
  {key: 'chin', left: 50, top: 88},
];

const scanLines = [
  {key: 'top', left: 25, top: 22, width: 50, rotate: '0deg'},
  {key: 'left-side', left: 24, top: 23, width: 30, rotate: '86deg'},
  {key: 'right-side', left: 47, top: 23, width: 30, rotate: '-86deg'},
  {key: 'left-cheek', left: 24, top: 52, width: 27, rotate: '-36deg'},
  {key: 'right-cheek', left: 50, top: 52, width: 27, rotate: '36deg'},
  {key: 'nose-left', left: 35, top: 38, width: 24, rotate: '50deg'},
  {key: 'nose-right', left: 48, top: 38, width: 24, rotate: '-50deg'},
  {key: 'jaw-left', left: 28, top: 72, width: 28, rotate: '30deg'},
  {key: 'jaw-right', left: 47, top: 72, width: 28, rotate: '-30deg'},
];

const styles = StyleSheet.create({
  cameraFrame: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  mockTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  mockText: {
    color: colors.mutedOnInk,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 12, 20, 0.02)',
  },
  topLabel: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    gap: 4,
  },
  cameraLabel: {
    color: colors.white,
    backgroundColor: 'rgba(16, 42, 67, 0.72)',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '800',
    alignSelf: 'flex-start',
  },
  cameraHint: {
    color: colors.white,
    backgroundColor: 'rgba(16, 42, 67, 0.58)',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
  scanOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    position: 'absolute',
    width: '70%',
    aspectRatio: 0.82,
  },
  cornerLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  cornerTopLeftH: {
    left: 0,
    top: 0,
    width: '24%',
    height: 4,
  },
  cornerTopLeftV: {
    left: 0,
    top: 0,
    width: 4,
    height: '24%',
  },
  cornerTopRightH: {
    right: 0,
    top: 0,
    width: '24%',
    height: 4,
  },
  cornerTopRightV: {
    right: 0,
    top: 0,
    width: 4,
    height: '24%',
  },
  cornerBottomLeftH: {
    left: 0,
    bottom: 0,
    width: '24%',
    height: 4,
  },
  cornerBottomLeftV: {
    left: 0,
    bottom: 0,
    width: 4,
    height: '24%',
  },
  cornerBottomRightH: {
    right: 0,
    bottom: 0,
    width: '24%',
    height: 4,
  },
  cornerBottomRightV: {
    right: 0,
    bottom: 0,
    width: 4,
    height: '24%',
  },
  scanFaceLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.36)',
  },
  scanPoint: {
    position: 'absolute',
    width: 9,
    height: 9,
    marginLeft: -4.5,
    marginTop: -4.5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    shadowColor: '#FFFFFF',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 2,
  },
  scanPointLarge: {
    width: 17,
    height: 17,
    marginLeft: -8.5,
    marginTop: -8.5,
  },
  scanBand: {
    position: 'absolute',
    left: '-10%',
    right: '-10%',
    top: '28%',
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    shadowColor: '#FFFFFF',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.85,
    shadowRadius: 18,
    elevation: 3,
  },
});
