/**
 * Video utility functions for detecting and processing video URLs
 * Supports YouTube, Vimeo, Loom, and direct MP4 files
 */

export type VideoType = 'youtube' | 'vimeo' | 'loom' | 'mp4' | null;

/**
 * Auto-detects the video platform from a URL
 * @param url - The video URL to analyze
 * @returns The detected video type or null if not recognized
 */
export function detectVideoType(url: string): VideoType {
  if (!url) return null;

  const normalizedUrl = url.trim().toLowerCase();

  // YouTube patterns
  if (
    normalizedUrl.includes('youtube.com/watch') ||
    normalizedUrl.includes('youtu.be/') ||
    normalizedUrl.includes('youtube.com/embed/')
  ) {
    return 'youtube';
  }

  // Vimeo patterns
  if (
    normalizedUrl.includes('vimeo.com/') &&
    !normalizedUrl.includes('/review/')
  ) {
    return 'vimeo';
  }

  // Loom patterns
  if (normalizedUrl.includes('loom.com/')) {
    return 'loom';
  }

  // Direct MP4 file
  if (normalizedUrl.endsWith('.mp4') || normalizedUrl.includes('.mp4?')) {
    return 'mp4';
  }

  return null;
}

/**
 * Extracts the video ID from various platform URLs
 * @param url - The video URL
 * @param type - The video type (from detectVideoType)
 * @returns The video ID or null if extraction fails
 */
export function extractVideoId(url: string, type: VideoType): string | null {
  if (!url || !type) return null;

  try {
    const urlObj = new URL(url);

    switch (type) {
      case 'youtube': {
        // Handle youtube.com/watch?v=ID
        if (urlObj.hostname.includes('youtube.com')) {
          if (urlObj.pathname === '/watch') {
            return urlObj.searchParams.get('v');
          }
          // Handle youtube.com/embed/ID
          if (urlObj.pathname.startsWith('/embed/')) {
            return urlObj.pathname.split('/embed/')[1]?.split('?')[0];
          }
        }
        // Handle youtu.be/ID
        if (urlObj.hostname === 'youtu.be') {
          return urlObj.pathname.slice(1)?.split('?')[0];
        }
        return null;
      }

      case 'vimeo': {
        // Extract numeric ID from vimeo.com/ID or vimeo.com/channels/ID/ID
        const pathMatch = urlObj.pathname.match(/\/(\d+)/);
        return pathMatch ? pathMatch[1] : null;
      }

      case 'loom': {
        // Extract ID from loom.com/share/ID
        const pathMatch = urlObj.pathname.match(/\/share\/([a-f0-9]+)/);
        return pathMatch ? pathMatch[1] : null;
      }

      case 'mp4':
        // No ID extraction needed for MP4 files
        return url;

      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Converts a video URL to its embed format
 * @param url - The original video URL
 * @param type - The video type (from detectVideoType)
 * @returns The embed URL or the original URL if no embed format exists
 */
export function getEmbedUrl(url: string, type: VideoType): string {
  if (!url || !type) return url;

  const videoId = extractVideoId(url, type);
  if (!videoId) return url;

  switch (type) {
    case 'youtube':
      return `https://www.youtube.com/embed/${videoId}`;

    case 'vimeo':
      return `https://player.vimeo.com/video/${videoId}`;

    case 'loom':
      // Loom embed URL format
      return `https://www.loom.com/embed/${videoId}`;

    case 'mp4':
    default:
      return url;
  }
}

/**
 * Generates a thumbnail URL for videos when possible
 * Currently only works reliably for YouTube
 * @param url - The video URL
 * @param type - The video type (from detectVideoType)
 * @returns The thumbnail URL or null if not available
 */
export function getThumbnailUrl(url: string, type: VideoType): string | null {
  if (!url || !type) return null;

  const videoId = extractVideoId(url, type);
  if (!videoId) return null;

  switch (type) {
    case 'youtube':
      // YouTube provides maxresdefault, hqdefault, mqdefault thumbnails
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    case 'vimeo':
    case 'loom':
    case 'mp4':
    default:
      // Other platforms don't provide reliable thumbnail URLs
      // Admin should upload poster images manually
      return null;
  }
}

/**
 * Validates if a URL is a supported video format
 * @param url - The URL to validate
 * @returns true if the URL is a supported video format
 */
export function isValidVideoUrl(url: string): boolean {
  return detectVideoType(url) !== null;
}

/**
 * Generates embed parameters for iframe video players
 * @param autoplay - Whether to autoplay the video
 * @param muted - Whether to start muted (required for autoplay on some platforms)
 * @returns Query parameters string
 */
export function getEmbedParams(autoplay = false, muted = false): string {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    muted: muted ? '1' : '0',
    playsinline: '1', // Better mobile support
    rel: '0', // Hide related videos (YouTube)
  });

  return params.toString();
}

/**
 * Video platform metadata for UI display
 */
export const VIDEO_PLATFORMS = {
  youtube: {
    name: 'YouTube',
    icon: '📺',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  vimeo: {
    name: 'Vimeo',
    icon: '🎬',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  loom: {
    name: 'Loom',
    icon: '🎥',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  mp4: {
    name: 'Video File',
    icon: '🎞️',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
} as const;
