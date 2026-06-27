-- Add video support to slides table
-- This enables hybrid courses with both static slides and video content

ALTER TABLE public.slides
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_type TEXT DEFAULT 'mp4' CHECK (video_type IN ('mp4', 'youtube', 'vimeo', 'loom')),
  ADD COLUMN IF NOT EXISTS video_poster_url TEXT,
  ADD COLUMN IF NOT EXISTS video_duration_ms INT;

-- Add comment for documentation
COMMENT ON COLUMN public.slides.video_url IS 'URL to video content (MP4 file, YouTube, Vimeo, or Loom)';
COMMENT ON COLUMN public.slides.video_type IS 'Type of video source: mp4 (uploaded file), youtube, vimeo, or loom';
COMMENT ON COLUMN public.slides.video_poster_url IS 'Thumbnail/cover image for video (shown before playback)';
COMMENT ON COLUMN public.slides.video_duration_ms IS 'Video duration in milliseconds for progress tracking';

-- Create storage bucket for video uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-videos', 'course-videos', false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

-- Drop existing policies if they exist (ignore errors)
DROP POLICY IF EXISTS "admins manage course-videos" ON storage.objects;
DROP POLICY IF EXISTS "auth read course-videos" ON storage.objects;

-- Grant permissions for video storage
CREATE POLICY "admins manage course-videos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "auth read course-videos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'course-videos');
