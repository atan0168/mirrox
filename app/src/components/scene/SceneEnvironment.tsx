import React from 'react';
import { SceneAsset } from './SceneAsset';
import { SceneEnvironmentConfig } from '../../scene/assetConfig';

export type SceneEnvironmentProps = {
  config: SceneEnvironmentConfig;
};

export function SceneEnvironment({ config }: SceneEnvironmentProps) {
  return (
    <group>
      {config.assets.map((a, idx) => (
        <SceneAsset key={(a.assetKey || 'asset') + '_' + idx} {...a} />
      ))}
    </group>
  );
}

export default SceneEnvironment;
