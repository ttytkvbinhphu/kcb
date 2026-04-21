import fs from 'fs';

const appPath = 'src/App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

const target = /onClick=\{\(\) => \{\s+setIsProfileModalOpen\(false\);\s+setGuestView\('terms'\);\s+\}\}/m;
const replacement = "onClick={() => {\n                        setGuestView('terms');\n                      }}";

const newContent = content.replace(target, replacement);

if (newContent !== content) {
    fs.writeFileSync(appPath, newContent);
    console.log("Fixed settings button handler.");
} else {
    console.log("No match found for settings button handler.");
}
