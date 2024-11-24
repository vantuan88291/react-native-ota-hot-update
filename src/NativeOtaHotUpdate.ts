import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  setupBundlePath(path: string, extension?: string): Promise<boolean>;
  deleteBundle(): Promise<void>;
  restart(): void;
  getCurrentVersion(): Promise<string>;
  setCurrentVersion(version: string): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('OtaHotUpdate');
