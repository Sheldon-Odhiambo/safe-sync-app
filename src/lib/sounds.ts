import { Vibration } from "react-native";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";

// Put siren.wav in src/assets/sounds/ (this file lives in src/lib/).
const SIREN_SOURCE = require("../assets/sounds/siren.wav");

let player: AudioPlayer | null = null;
let audioModeSet = false;
// Lets stopSiren() win if it is called while a start is still loading.
let wanted = false;

async function getPlayer(): Promise<AudioPlayer> {
  if (!audioModeSet) {
    audioModeSet = true;
    try {
      // Play even when the phone is on silent (iOS).
      await setAudioModeAsync({ playsInSilentMode: true });
    } catch {
      /* not fatal */
    }
  }

  if (!player) player = createAudioPlayer(SIREN_SOURCE);
  return player;
}

/** One siren (about 3 seconds). For "responder assigned" / "responder arrived". */
export async function playSiren(): Promise<void> {
  wanted = true;
  try {
    const p = await getPlayer();
    if (!wanted) return;
    p.loop = false;
    await p.seekTo(0);
    p.play();
    Vibration.vibrate([0, 400, 200, 400]);
  } catch {
    /* sound is a bonus; never break the screen */
  }
}

/** Siren on repeat until stopSiren(). For an incoming emergency offer. */
export async function startSirenLoop(): Promise<void> {
  wanted = true;
  try {
    const p = await getPlayer();
    if (!wanted) return;
    p.loop = true;
    await p.seekTo(0);
    p.play();
    Vibration.vibrate([0, 600, 400], true);
  } catch {
    /* sound is a bonus; never break the screen */
  }
}

export function stopSiren(): void {
  wanted = false;
  try {
    player?.pause();
    player?.seekTo(0);
  } catch {
    /* ignore */
  }
  Vibration.cancel();
}