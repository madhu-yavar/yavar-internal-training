/**
 * Script to restore slide images and illustrations to Supabase storage
 * Run with: bun run cloud/restore-images.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// Supabase credentials - using original project where courses were created
const SUPABASE_URL = 'https://ybxmrtrogmuwzmjjmnpc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlieG1ydHJvZ211d3ptamptbnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjIwOTg0NiwiZXhwIjoyMDk3Nzg1ODQ2fQ._cSlsJKpDRHcnztE4Ijw7uF4mOmPvt1k_Sj5glFWMO4';
const BUCKET = 'course-uploads';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface UploadResult {
  file: string;
  success: boolean;
  path?: string;
  error?: string;
}

async function uploadFiles() {
  const baseDir = './cloud';
  const results: UploadResult[] = [];

  // Get all course IDs from folder names
  const slideFolders = readdirSync(baseDir)
    .filter(d => d.startsWith('bucket-course-uploads-files-slides-') && statSync(join(baseDir, d)).isDirectory())
    .map(d => ({
      type: 'slides',
      courseId: d.replace('bucket-course-uploads-files-slides-', ''),
      path: join(baseDir, d)
    }));

  const illustrationFolders = readdirSync(baseDir)
    .filter(d => d.startsWith('bucket-course-uploads-files-illustrations-') && statSync(join(baseDir, d)).isDirectory())
    .map(d => ({
      type: 'illustrations',
      courseId: d.replace('bucket-course-uploads-files-illustrations-', ''),
      path: join(baseDir, d)
    }));

  const allFolders = [...slideFolders, ...illustrationFolders];

  console.log(`Found ${allFolders.length} folders to upload`);
  console.log('Starting upload...\n');

  for (const folder of allFolders) {
    const files = readdirSync(folder.path);
    const courseId = folder.courseId;

    for (const file of files) {
      const filePath = join(folder.path, file);
      const fileExt = file.split('.').pop();

      // Skip non-image files
      if (!fileExt.match(/^(jpg|jpeg|png|gif|webp)$/i)) continue;

      // Determine target path
      let targetPath: string;
      if (folder.type === 'slides') {
        // Files are named: {timestamp}-{index}.jpg
        // Target: {courseId}/slides/{timestamp}-{index}.jpg
        targetPath = `${courseId}/slides/${file}`;
      } else {
        // Files are named: {uuid}-{timestamp}.png
        // Target: {courseId}/illustrations/{uuid}-{timestamp}.png
        targetPath = `${courseId}/illustrations/${file}`;
      }

      try {
        const fileData = Buffer.from(require('fs').readFileSync(filePath));

        const { data, error } = await supabase.storage
          .from(BUCKET)
          .upload(targetPath, fileData, {
            upsert: true,
          });

        if (error) {
          results.push({ file: filePath, success: false, error: error.message });
          console.error(`✗ Failed: ${file} - ${error.message}`);
        } else {
          results.push({ file: filePath, success: true, path: targetPath });
          console.log(`✓ Uploaded: ${targetPath}`);
        }
      } catch (err) {
        results.push({ file: filePath, success: false, error: String(err) });
        console.error(`✗ Error: ${filePath}`);
      }
    }
  }

  // Summary
  const success = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n=== Upload Complete ===`);
  console.log(`✓ Success: ${success}`);
  console.log(`✗ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed files:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.file}: ${r.error}`);
    });
  }
}

uploadFiles().catch(console.error);
