import { useCallback, useEffect, useMemo, useState } from 'react';
import { VocabularyAudioPlayer } from '../../../lib/vocabularyAudio';

export function useVocabularyAudio(
  identity: string,
  audioUrl: string | null | undefined,
  refreshUrl: () => Promise<string | null>,
  onError: (message: string) => void,
) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const player = useMemo(
    () => new VocabularyAudioPlayer(setIsSpeaking, onError),
    [identity, onError],
  );
  useEffect(() => () => player.stop(), [player, audioUrl]);
  const speak = useCallback(() => { void player.play(audioUrl, refreshUrl); }, [player, audioUrl, refreshUrl]);
  return { speak, isSpeaking };
}
