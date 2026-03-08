import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './ExpoSnoreDetector.types';

type ExpoSnoreDetectorModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class ExpoSnoreDetectorModule extends NativeModule<ExpoSnoreDetectorModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(ExpoSnoreDetectorModule, 'ExpoSnoreDetectorModule');
