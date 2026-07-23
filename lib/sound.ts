import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';

/** Bundled alarm sounds (also usable as OS notification sounds). */
const BUILTIN: Record<string, number> = {
  warning: require('../assets/sounds/warning.wav'),
  bedtime: require('../assets/sounds/bedtime.wav'),
};

export const BUILTIN_SOUNDS = Object.keys(BUILTIN);

/**
 * A sound to play in-app: either a bundled clip (by name) or a custom file
 * (recorded/uploaded) referenced by URI. `uri` takes precedence when present.
 */
export interface SoundSpec {
  builtin?: string;
  uri?: string | null;
}

type PlayerSource = number | { uri: string };

function sourceFor(spec: SoundSpec): PlayerSource {
  if (spec.uri) return { uri: spec.uri };
  return BUILTIN[spec.builtin ?? 'bedtime'] ?? BUILTIN.bedtime;
}

let players: AudioPlayer[] = [];
let sequenceActive = false;

export function stopSound(): void {
  sequenceActive = false;
  for (const p of players) {
    try {
      p.remove();
    } catch {
      // ignore
    }
  }
  players = [];
}

/** Play a single sound (preview or single-child alarm). */
export function playSound(spec: SoundSpec, loop = false): void {
  stopSound();
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  const player = createAudioPlayer(sourceFor(spec));
  player.loop = loop;
  players.push(player);
  player.play();
}

/**
 * Play several sounds one after another. Used on the alarm screen when more
 * than one child's alarm fires at once so each child's distinct sound is heard
 * in turn. When `loop` is true the whole sequence repeats until stopped.
 */
export function playSequence(specs: SoundSpec[], loop = false): void {
  stopSound();
  if (specs.length === 0) return;
  // A single clip can just loop natively.
  if (specs.length === 1) {
    playSound(specs[0], loop);
    return;
  }
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  sequenceActive = true;
  let index = 0;

  const playNext = () => {
    if (!sequenceActive) return;
    if (index >= specs.length) {
      if (!loop) {
        sequenceActive = false;
        return;
      }
      index = 0;
    }
    const spec = specs[index];
    index += 1;
    const player = createAudioPlayer(sourceFor(spec));
    players.push(player);
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        sub.remove();
        try {
          player.remove();
        } catch {
          // ignore
        }
        players = players.filter((p) => p !== player);
        playNext();
      }
    });
    player.play();
  };

  playNext();
}

/** Copy a recorded/picked audio file into the app's document directory. */
export function persistAudio(uri: string): string {
  try {
    const dir = new Directory(Paths.document, 'sounds');
    if (!dir.exists) dir.create({ intermediates: true });
    const ext = uri.split('.').pop()?.split('?')[0] || 'm4a';
    const dest = new File(dir, `${Date.now()}.${ext}`);
    new File(uri).copySync(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

/** Let the user pick an mp3/audio file from their device; returns a stored URI. */
export async function pickAudioFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'audio/*',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return persistAudio(result.assets[0].uri);
}

/** Delete a stored custom sound file (best effort). */
export function deleteAudio(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // ignore
  }
}
