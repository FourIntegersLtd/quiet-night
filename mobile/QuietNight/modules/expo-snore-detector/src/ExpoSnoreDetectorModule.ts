import { NativeModule, requireNativeModule } from 'expo';

import { ExpoSnoreDetectorModuleEvents } from './ExpoSnoreDetector.types';

declare class ExpoSnoreDetectorModule extends NativeModule<ExpoSnoreDetectorModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ExpoSnoreDetectorModule>('ExpoSnoreDetector');
