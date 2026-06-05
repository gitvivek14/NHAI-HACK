import {NativeModules, Platform} from 'react-native';

type CopiedAsset = {
  path: string;
  sizeBytes: number;
  exists: boolean;
};

type FieldAuthAssetsModule = {
  copyModelAsset: (assetPath: string, fileName: string) => Promise<CopiedAsset>;
  assetExists: (assetPath: string) => Promise<boolean>;
};

const nativeModule = NativeModules.FieldAuthAssets as
  | FieldAuthAssetsModule
  | undefined;

export async function copyBundledModelAsset(
  assetPath: string,
  fileName: string,
): Promise<CopiedAsset | null> {
  if (Platform.OS !== 'android' || !nativeModule?.copyModelAsset) {
    return null;
  }

  return nativeModule.copyModelAsset(assetPath, fileName);
}

export async function bundledModelAssetExists(assetPath: string) {
  if (Platform.OS !== 'android' || !nativeModule?.assetExists) {
    return false;
  }

  return nativeModule.assetExists(assetPath);
}
