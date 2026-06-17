import * as fs from 'fs';

const filePath = './src/components/DrugDirectory.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\r\n/g, '\n');

const targetStr = `                                                                 const val = e.target.value;`;
const replacementStr = `                                                                 const val = e.target.value.replace(/,/g, ".");`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated schedule decimal replacement in DrugDirectory.tsx!');
} else {
  console.log('Target string not found in DrugDirectory.tsx!');
}
