/**
 * VideoPlayer - Unified video component supporting multiple platforms
 * Supports: MP4 files, YouTube, Vimeo, Loom
 */

import { useEffect, useRef, useState } from 'react';
import { getEmbedUrl, getEmbedParams, type VideoType } from '@/lib/videoUtils';

export interface VideoPlayerProps {
  /** Video URL (original URL, not embed URL) */
  videoUrl: string;
  /** Video type (auto-detected if not provided) */
  videoType?: VideoType;
  /** Poster/thumbnail image URL */
  posterUrl?: string;
  /** Whether to autoplay the video */
  autoPlay?: boolean;
  /** Whether to start muted (required for autoplay on some platforms) */
  muted?: boolean;
  /** Callback when video ends */
  onEnd?: () => void;
  /** Callback with current time and duration for progress tracking */
  onProgress?: (currentTime: number, duration: number) => void;
  /** Additional CSS classes */
  className?: string;
}

export function VideoPlayer({
  videoUrl,
  videoType,
  posterUrl,
  autoPlay = false,
  muted = false,
  onEnd,
  onProgress,
  className = '',
}: VideoPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<number>();

  // Auto-detect type if not provided
  const detectedType = videoType || (videoUrl ? detectTypeFromUrl(videoUrl) : null);

  useEffect(() => {
    if (detectedType === 'mp4' && videoRef.current) {
      const video = videoRef.current;

      // Set up event listeners for MP4
      const handleEnded = () => {
        onEnd?.();
      };

      const handleTimeUpdate = () => {
        if (onProgress && video.duration) {
          onProgress(video.currentTime, video.duration);
        }
      };

      const handleLoadMetadata = () => {
        setIsLoaded(true);
        if (autoPlay) {
          video.play().catch(console.error);
        }
      };

      video.addEventListener('ended', handleEnded);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleLoadMetadata);

      // Start progress polling interval for smoother updates
      if (onProgress) {
        progressIntervalRef.current = window.setInterval(() => {
          if (video.duration && !video.paused) {
            onProgress(video.currentTime, video.duration);
          }
        }, 1000);
      }

      return () => {
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleLoadMetadata);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }
  }, [detectedType, autoPlay, onEnd, onProgress]);

  // Helper to detect type from URL
  function detectTypeFromUrl(url: string): VideoType {
    const normalized = url.toLowerCase();
    if (normalized.includes('youtube.com') || normalized.includes('youtu.be')) return 'youtube';
    if (normalized.includes('vimeo.com')) return 'vimeo';
    if (normalized.includes('loom.com')) return 'loom';
    if (normalized.endsWith('.mp4')) return 'mp4';
    return null;
  }

  // Render error state
  if (!detectedType) {
    return (
      <div className={`flex items-center justify-center bg-slate-800 ${className}`}>
        <p className="text-slate-400">Unsupported video format</p>
      </div>
    );
  }

  // MP4: Use HTML5 video element
  if (detectedType === 'mp4') {
    return (
      <video
        ref={videoRef}
        className={`h-full w-full ${className}`}
        poster={posterUrl}
        controls
        muted={muted}
        playsInline
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    );
  }

  // YouTube, Vimeo, Loom: Use iframe embed
  const embedUrl = getEmbedUrl(videoUrl, detectedType);
  const params = getEmbedParams(autoPlay, muted);
  const fullEmbedUrl = `${embedUrl}?${params}`;

  return (
    <div className={`relative h-full w-full ${className}`}>
      {!isLoaded && posterUrl && (
        <img
          src={posterUrl}
          alt="Video poster"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <iframe
        src={fullEmbedUrl}
        className="h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onLoad={() => setIsLoaded(true)}
        title={detectedType === 'youtube' ? 'YouTube video player' : 'Video player'}
      />
    </div>
  );
}

/**
 * VideoPreview - Smaller preview version for admin interface
 */
export interface VideoPreviewProps {
  videoUrl: string;
  videoType?: VideoType;
  posterUrl?: string;
  className?: string;
}

export function VideoPreview({
  videoUrl,
  videoType,
  posterUrl,
  className = '',
}: VideoPreviewProps) {
  return (
    <div className={`aspect-video w-full overflow-hidden rounded-lg bg-slate-800 ${className}`}>
      <VideoPlayer
        videoUrl={videoUrl}
        videoType={videoType}
        posterUrl={posterUrl}
        autoPlay={false}
        muted={true}
        className="h-full w-full"
      />
    </div>
  );
}
