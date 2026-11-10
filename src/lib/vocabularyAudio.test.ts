import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { VocabularyAudioPlayer } from './vocabularyAudio';

class FakeAudio {
  static instances: FakeAudio[] = [];
  static failures: Error[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  pause = vi.fn();
  removeAttribute = vi.fn();
  load = vi.fn();
  constructor(public src: string) { FakeAudio.instances.push(this); }
  play = vi.fn(async () => {
    const error = FakeAudio.failures.shift();
    if (error) throw error;
  });
}

beforeEach(() => {
  FakeAudio.instances = [];
  FakeAudio.failures = [];
  vi.stubGlobal('Audio', FakeAudio);
});
afterEach(() => vi.unstubAllGlobals());

it('plays the supplied MP3, finishes, and supports replay', async () => {
  const busy = vi.fn();
  const player = new VocabularyAudioPlayer(busy, vi.fn());
  await player.play('https://audio.example/sugar.mp3');
  expect(FakeAudio.instances[0].src).toBe('https://audio.example/sugar.mp3');
  expect(busy).toHaveBeenLastCalledWith(true);
  FakeAudio.instances[0].onended?.();
  expect(busy).toHaveBeenLastCalledWith(false);
  await player.play('https://audio.example/sugar.mp3');
  expect(FakeAudio.instances).toHaveLength(2);
});

it('does not invent audio when audioUrl is null', async () => {
  await new VocabularyAudioPlayer(vi.fn(), vi.fn()).play(null);
  expect(FakeAudio.instances).toHaveLength(0);
});

it('stops the old word when the new word starts', async () => {
  const player = new VocabularyAudioPlayer(vi.fn(), vi.fn());
  await player.play('sugar.mp3');
  await player.play('apple.mp3');
  expect(FakeAudio.instances[0].pause).toHaveBeenCalled();
  expect(FakeAudio.instances[0].onended).toBeNull();
  expect(FakeAudio.instances[1].src).toBe('apple.mp3');
});

it('renews a failed URL once and plays the renewed URL', async () => {
  FakeAudio.failures = [new Error('Expired URL')];
  const refresh = vi.fn(async () => 'sugar-new.mp3');
  const error = vi.fn();
  await new VocabularyAudioPlayer(vi.fn(), error).play('sugar-old.mp3', refresh);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(FakeAudio.instances[1].src).toBe('sugar-new.mp3');
  expect(error).not.toHaveBeenCalled();
});

it('does not loop when the refreshed URL also fails', async () => {
  FakeAudio.failures = [new Error('Expired'), new Error('Still inaccessible')];
  const error = vi.fn();
  const refresh = vi.fn(async () => 'new.mp3');
  await new VocabularyAudioPlayer(vi.fn(), error).play('old.mp3', refresh);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(error).toHaveBeenCalledTimes(1);
});

it('does not renew URLs when browser permissions block playback', async () => {
  const blocked = new Error('Gesture required');
  blocked.name = 'NotAllowedError';
  FakeAudio.failures = [blocked];
  const refresh = vi.fn();
  const error = vi.fn();
  await new VocabularyAudioPlayer(vi.fn(), error).play('sugar.mp3', refresh);
  expect(refresh).not.toHaveBeenCalled();
  expect(error).toHaveBeenCalledTimes(1);
});

it('does not replay an old word after navigating during URL renewal', async () => {
  let resolveUrl!: (url: string) => void;
  const refresh = () => new Promise<string>((resolve) => { resolveUrl = resolve; });
  FakeAudio.failures = [new Error('Expired')];
  const player = new VocabularyAudioPlayer(vi.fn(), vi.fn());
  const pending = player.play('sugar-old.mp3', refresh);
  await vi.waitFor(() => expect(resolveUrl).toBeDefined());
  player.stop();
  resolveUrl('sugar-new.mp3');
  await pending;
  expect(FakeAudio.instances).toHaveLength(1);
});

it('renews a URL when the media element fails after play resolved', async () => {
  const refresh = vi.fn(async () => 'new.mp3');
  const player = new VocabularyAudioPlayer(vi.fn(), vi.fn());
  await player.play('old.mp3', refresh);
  FakeAudio.instances[0].onerror?.();
  await vi.waitFor(() => expect(FakeAudio.instances).toHaveLength(2));
  expect(FakeAudio.instances[1].src).toBe('new.mp3');
});
