import * as fs from 'fs';
import * as path from 'path';

function scanDir(dir: string, depth = 0) {
  if (depth > 4) return;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.lstatSync(fullPath);
      console.log('  '.repeat(depth) + `- ${file} (${stat.isDirectory() ? 'dir' : 'file'}: ${stat.size} bytes)`);
      if (stat.isDirectory()) {
        scanDir(fullPath, depth + 1);
      }
    }
  } catch (e: any) {
    console.log('Error reading ' + dir + ': ' + e.message);
  }
}

console.log("Scanning /.gemini recursively:");
scanDir('/.gemini');
