export class VocabularyAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private generation = 0;

  constructor(
    private readonly onBusy: (busy: boolean) => void,
    private readonly onError: (message: string) => void,
  ) {}

  private release() {
    if (!this.audio) return;
    this.audio.onended = null;
    this.audio.onerror = null;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.audio = null;
  }

  stop() {
    this.generation++;
    this.release();
    this.onBusy(false);
  }

  async play(url: string | null | undefined, refreshUrl?: () => Promise<string | null>) {
    this.stop();
    if (!url?.trim()) return;
    const generation = this.generation;
    this.onBusy(true);

    const attempt = async (source: string, renewed: boolean): Promise<void> => {
      if (generation !== this.generation) return;
      const audio = new Audio(source);
      this.audio = audio;
      let handled = false;

      const fail = async (error: unknown) => {
        if (handled || generation !== this.generation) return;
        handled = true;
        this.release();
        if (error instanceof Error && error.name === 'NotAllowedError') {
          this.onBusy(false);
          this.onError('Trình duyệt chặn âm thanh. Hãy nhấn nút loa để thử lại.');
          return;
        }
        if (!renewed && refreshUrl) {
          try {
            const freshUrl = await refreshUrl();
            if (generation !== this.generation) return;
            if (freshUrl) {
              await attempt(freshUrl, true);
              return;
            }
          } catch {
            // Report once after one URL renewal attempt.
          }
        }
        if (generation !== this.generation) return;
        this.onBusy(false);
        this.onError('Không thể phát âm thanh của từ này. Vui lòng thử lại.');
      };

      audio.onended = () => {
        if (generation !== this.generation) return;
        handled = true;
        this.release();
        this.onBusy(false);
      };
      audio.onerror = () => { void fail(new Error('Audio could not be loaded')); };
      try {
        await audio.play();
      } catch (error) {
        await fail(error);
      }
    };

    await attempt(url, false);
  }
}
