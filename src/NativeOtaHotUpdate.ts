import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  setupBundlePath(path: string, extension: string): Promise<boolean>;
  deleteBundle(i: number): Promise<boolean>;
  restart(): void;
  getCurrentVersion(a: number): Promise<string>;
  setCurrentVersion(version: string): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('OtaHotUpdate');
