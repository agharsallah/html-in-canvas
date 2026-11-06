/**
 * Roll 10 diorama: the vault door locks a little further on every line.
 * The "never painted" line slams the redaction bars down, the "painted on
 * purpose" line highlights the safe lines, and the Leak's lines fire sparks
 * that die on the bars.
 */
import { createVaultScene } from '../../scenes/vault-scene';
import type { ChapterModule } from '../shared/chapter';
import { story } from './story';

export const diorama: NonNullable<ChapterModule['diorama']> = (host, roll) => {
  const scene = createVaultScene(host, roll.process);
  return {
    onLine: (index, total) => {
      const line = story[index];
      scene.setLock(index / Math.max(1, total - 1));
      const id = line?.concept?.id;
      if (id === 'vault-never-painted' || id === 'vault-channels' || index > 4) scene.redact();
      if (id === 'vault-not-sensitive' || index > 6) scene.reveal();
      if (line?.speaker === 'foe' || id === 'vault-channels') scene.leak();
    },
    destroy: () => scene.destroy(),
  };
};
