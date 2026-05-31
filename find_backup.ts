import * as fs from 'fs';
import * as path from 'path';

function searchFile(dir: string) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      let stat;
      try {
        stat = fs.lstatSync(fullPath);
      } catch (e) {
        continue;
      }
      if (stat.isDirectory()) {
        // Skip common large system dirs to speed up
        if (file === 'node_modules' || file === 'proc' || file === 'sys' || file === 'dev' || file === 'var' || file === 'etc') continue;
        searchFile(fullPath);
      } else if (file.includes('DrugDirectory.tsx')) {
        console.log(`Found matching file: ${fullPath} (Size: ${stat.size} bytes)`);
      }
    }
  } catch (e) {
    // Ignore
  }
}

console.log("Starting full system search for backups of DrugDirectory.tsx...");
searchFile('/');
console.log("Search finished.");
