import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const SOURCES: Record<string, number> = {
  warning: require('../assets/sounds/warning.wav'),
  bedtime: require('../assets/sounds/bedtime.wav'),
};

export type SoundName = keyof typeof SOURCES;

let player: AudioPlayer | null = null;

/** Play a bundled alarm sound. Used for previews and the in-app alarm screen. */
export function playSound(name: SoundName, loop = false): void {
  stopSound();
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  const source = SOURCES[name] ?? SOURCES.bedtime;
  player = createAudioPlayer(source);
  player.loop = loop;
  player.play();
}

export function stopSound(): void {
  if (player) {
    try {
      player.remove();
    } catch {
      // ignore
    }
    player = null;
  }
}
