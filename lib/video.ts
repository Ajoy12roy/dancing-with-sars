export const YOUTUBE_PRIVACY_HOST = 'https://www.youtube-nocookie.com';
export const YOUTUBE_IFRAME_API_URL = 'https://www.youtube.com/iframe_api';

export const PLAY_VISIBILITY_THRESHOLD = 0.5;
export const PAUSE_VISIBILITY_THRESHOLD = 0.25;

export interface YouTubeEmbedOptions {
  autoplay?: boolean;
  mute?: boolean;
}

export interface YouTubePlayerVars {
  controls: 1;
  rel: 0;
  modestbranding: 1;
  playsinline: 1;
  cc_load_policy: 1;
  enablejsapi: 1;
}

export interface ScrollPlaybackState {
  isPlaying: boolean;
  pausedByScroll: boolean;
  userPaused: boolean;
}

export function assertValidYouTubeId(id: string): string {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    throw new Error(`Invalid YouTube video ID: ${id}`);
  }
  return id;
}

export function buildYouTubeEmbedUrl(id: string, options?: YouTubeEmbedOptions): string {
  assertValidYouTubeId(id);
  const autoplay = options?.autoplay === false ? 0 : 1;
  const muteParam = options?.mute ? '&mute=1' : '';
  return `${YOUTUBE_PRIVACY_HOST}/embed/${id}?autoplay=${autoplay}${muteParam}&rel=0&modestbranding=1&playsinline=1&cc_load_policy=1`;
}

export function buildYouTubePlayerVars(id: string): YouTubePlayerVars {
  assertValidYouTubeId(id);
  return {
    controls: 1,
    rel: 0,
    modestbranding: 1,
    playsinline: 1,
    cc_load_policy: 1,
    enablejsapi: 1,
  };
}

/**
 * Pure visibility threshold state transition for scroll-driven play/pause.
 * - ratio >= 0.5 and canAutoplay and !userPaused -> play muted
 * - ratio < 0.25 and isPlaying -> pause (marked pausedByScroll)
 * - 0.25 <= ratio < 0.5 -> hysteresis zone, keep current state
 */
export function decideScrollPlaybackAction(
  ratio: number,
  state: ScrollPlaybackState,
  canAutoplay: boolean
): { action: 'play_muted' | 'pause_scroll' | 'none'; nextState: ScrollPlaybackState } {
  if (ratio < PAUSE_VISIBILITY_THRESHOLD) {
    if (state.isPlaying) {
      return {
        action: 'pause_scroll',
        nextState: {
          isPlaying: false,
          pausedByScroll: true,
          userPaused: state.userPaused,
        },
      };
    }
    return { action: 'none', nextState: state };
  }

  if (ratio >= PLAY_VISIBILITY_THRESHOLD && canAutoplay) {
    if (!state.isPlaying && !state.userPaused) {
      return {
        action: 'play_muted',
        nextState: {
          isPlaying: true,
          pausedByScroll: false,
          userPaused: false,
        },
      };
    }
  }

  return { action: 'none', nextState: state };
}

/**
 * Pure handler for YouTube IFrame API onStateChange events.
 * - Playing (1): clears userPaused
 * - Paused (2) while ratio >= 0.25: counts as manual user pause
 * - Paused (2) while ratio < 0.25: counts as scroll pause
 * - Ended (0): resets playing state
 */
export function handlePlayerStateChange(
  ytState: number,
  currentRatio: number,
  state: ScrollPlaybackState
): ScrollPlaybackState {
  if (ytState === 1) {
    return {
      isPlaying: true,
      pausedByScroll: false,
      userPaused: false,
    };
  }

  if (ytState === 2) {
    if (currentRatio >= PAUSE_VISIBILITY_THRESHOLD) {
      return {
        isPlaying: false,
        pausedByScroll: false,
        userPaused: true,
      };
    }
    return {
      isPlaying: false,
      pausedByScroll: true,
      userPaused: state.userPaused,
    };
  }

  if (ytState === 0) {
    return {
      isPlaying: false,
      pausedByScroll: false,
      userPaused: false,
    };
  }

  return state;
}
