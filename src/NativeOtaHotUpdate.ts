import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  setupBundlePath(path: string, extension: string): Promise<boolean>;
  setExactBundlePath(path: string): Promise<boolean>;
  deleteBundle(i: number): Promise<boolean>;
  restart(): void;
  getCurrentVersionCode(): Promise<string>;
  setCurrentVersionCode(versionCode: string): Promise<boolean>;
  getCurrentVersionName(): Promise<string>;
  setCurrentVersionName(versionName: string): Promise<boolean>;
  getUpdateMetadata(a: number): Promise<string>;
  setUpdateMetadata(metadata: string): Promise<boolean>;
  rollbackToPreviousBundle(a: number): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('OtaHotUpdate');
