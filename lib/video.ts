export function buildYouTubeEmbedUrl(id: string): string {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    throw new Error(`Invalid YouTube video ID: ${id}`);
  }
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&cc_load_policy=1`;
}
