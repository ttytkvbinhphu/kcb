import fs from 'fs';

const appPath = 'src/App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

// Extract the overlays
const startMarker = '{/* Guest View Overlay - Drugs & ICD10 (Full Modal) */}';
const endMarker = '        </AnimatePresence>'; // We need to be careful, there are two AnimatePresence blocks

// Using a more specific search to capture both AnimatePresence blocks
const overlayBlockStart = content.indexOf(startMarker);
// Find the first </AnimatePresence> after startMarker
const firstEnd = content.indexOf('</AnimatePresence>', overlayBlockStart);
// Find the second </AnimatePresence> after that
const secondEnd = content.indexOf('</AnimatePresence>', firstEnd + 1) + '</AnimatePresence>'.length;

const overlays = content.substring(overlayBlockStart, secondEnd);

// Insert these overlays before the end of the main app return
// The end is:
/*
2166:       </main>
2167:     </div>
2168:   );
2169: }
*/

const mainEndMarker = '      </main>\n    </div>\n  );\n}';
const mainEndIndex = content.lastIndexOf(mainEndMarker);

if (mainEndIndex !== -1) {
    const mainInsertionPoint = content.lastIndexOf('    </div>\n  );\n}', content.length);
    // Actually just right before </main> is fine too
    const mainContentEnd = content.lastIndexOf('      </main>');
    
    // Check if they are already there? (Just in case)
    if (!content.substring(mainContentEnd).includes('Guest View Overlay')) {
         content = content.substring(0, mainContentEnd) + '\n\n        ' + overlays + '\n' + content.substring(mainContentEnd);
    }
}

fs.writeFileSync(appPath, content);
console.log("Moved/Duplicated overlays to main app return.");
