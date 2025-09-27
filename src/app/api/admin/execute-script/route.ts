import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { script, type } = await request.json();

    if (!script) {
      return NextResponse.json(
        { error: 'Script is required' },
        { status: 400 }
      );
    }

    // Create a temporary file for the script
    const tempDir = '/tmp';
    const tempFile = path.join(tempDir, `script-${Date.now()}.js`);
    
    // Write the script to temporary file
    fs.writeFileSync(tempFile, script);

    try {
      // Execute the script
      const { stdout, stderr } = await execAsync(`node ${tempFile}`);
      
      // Clean up the temporary file
      fs.unlinkSync(tempFile);

      if (stderr) {
        console.error('Script stderr:', stderr);
        return NextResponse.json(
          { error: 'Script execution failed', details: stderr },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Script executed successfully',
        output: stdout,
        type: type || 'unknown'
      });

    } catch (execError) {
      // Clean up the temporary file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      
      throw execError;
    }

  } catch (error) {
    console.error('Error executing script:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute script', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
