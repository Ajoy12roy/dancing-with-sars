export interface YouTubeEmbedOptions {
  autoplay?: boolean;
  mute?: boolean;
}

export function buildYouTubeEmbedUrl(id: string, options?: YouTubeEmbedOptions): string {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    throw new Error(`Invalid YouTube video ID: ${id}`);
  }
  const autoplay = options?.autoplay === false ? 0 : 1;
  const muteParam = options?.mute ? '&mute=1' : '';
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=${autoplay}${muteParam}&rel=0&modestbranding=1&playsinline=1&cc_load_policy=1`;
}
