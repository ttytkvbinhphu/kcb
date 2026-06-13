import fs from 'fs';
const filepath = '/app/applet/src/components/DrugDirectory.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// Normalize line endings to find the content regardless of LF / CRLF
const target = [
  "                                        </div>",
  "                                      </div>",
  "                                    </div>",
  "                                  </div>",
  "",
  "                                  {/* Right aspect: move actions & delete, perfectly aligned */}"
].join('\n');

const replacement = [
  "                                        </div>",
  "                                      </div>",
  "                                    </div>",
  "",
  "                                  {/* Right aspect: move actions & delete, perfectly aligned */}"
].join('\n');

// Try replacing with LF
if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filepath, content, 'utf8');
  console.log('Successfully replaced with LF!');
} else {
  // Try replacing with CRLF
  const targetCRLF = target.replace(/\n/g, '\r\n');
  const replacementCRLF = replacement.replace(/\n/g, '\r\n');
  if (content.includes(targetCRLF)) {
    content = content.replace(targetCRLF, replacementCRLF);
    fs.writeFileSync(filepath, content, 'utf8');
    console.log('Successfully replaced with CRLF!');
  } else {
    console.error('Target content NOT found in file! Printing surrounding area to diagnose:');
    // Find closest match to show
    const lines = content.split(/\r?\n/);
    const index = lines.findIndex(line => line.includes('Right aspect: move actions'));
    if (index !== -1) {
      console.log('Found line at index', index);
      for (let i = Math.max(0, index - 8); i <= Math.min(lines.length - 1, index + 4); i++) {
        console.log(`${i}: [${lines[i]}]`);
      }
    } else {
      console.log('Could not find the comment line in the file.');
    }
  }
}
