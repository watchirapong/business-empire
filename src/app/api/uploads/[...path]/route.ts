import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const filePath = join(process.cwd(), 'public', 'uploads', ...resolvedParams.path);
    
    if (!existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const fileName = resolvedParams.path[resolvedParams.path.length - 1];
    
    // Set content type based on file extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext) {
      const mimeTypes: { [key: string]: string } = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf',
        'zip': 'application/zip',
        'rar': 'application/vnd.rar',
        '7z': 'application/x-7z-compressed',
        'txt': 'text/plain',
        'json': 'application/json',
        'xml': 'application/xml',
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'mp4': 'video/mp4',
        'avi': 'video/x-msvideo',
        'blend': 'application/octet-stream',
        'unitypackage': 'application/octet-stream',
        'fbx': 'application/octet-stream',
        'obj': 'text/plain',
        'mtl': 'text/plain',
        'gltf': 'model/gltf+json',
        'glb': 'model/gltf-binary'
      };
      contentType = mimeTypes[ext] || 'application/octet-stream';
    }

    // Set headers
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000'
    };

    // Force download for certain file types
    if (['application/pdf', 'application/zip', 'application/octet-stream'].includes(contentType)) {
      headers['Content-Disposition'] = `attachment; filename="${fileName}"`;
    }

    return new NextResponse(fileBuffer as any, { headers });
    
  } catch (error) {
    console.error('File serving error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
