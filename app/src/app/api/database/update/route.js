import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execAsync = util.promisify(exec);

export async function POST(request) {
  try {
    const importScript = path.resolve('./scripts/import-new-files.mjs');
    const cleanScript = path.resolve('./scripts/clean-database.mjs');
    
    // 1. Run the import script
    const { stdout: importOut, stderr: importErr } = await execAsync(`node "${importScript}"`);
    console.log('Import Script Output:', importOut);
    if (importErr) console.error('Import Script Error:', importErr);
    
    // 2. Run the clean script
    const { stdout: cleanOut, stderr: cleanErr } = await execAsync(`node "${cleanScript}"`);
    console.log('Clean Script Output:', cleanOut);
    if (cleanErr) console.error('Clean Script Error:', cleanErr);
    
    return NextResponse.json({
      success: true,
      message: 'Database updated successfully!',
      details: {
        importOutput: importOut,
        cleanOutput: cleanOut
      }
    });
  } catch (error) {
    console.error('Update failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
