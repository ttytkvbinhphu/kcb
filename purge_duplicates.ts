import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'src', 'components', 'DrugDirectory.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Let's count how many times this specific exact pattern of lines appears:
// <div className="sm:col-span-2">\s*<label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Nội dung tác dụng phụ</label>
// or similar variants that were inserted during the prior turn.

// We will scan they file and find all indices of "Nội dung tác dụng phụ".
// Let's get all of them.

let searchStr = "Nội dung tác dụng phụ";
let indices: number[] = [];
let idx = content.indexOf(searchStr);
while (idx !== -1) {
  indices.push(idx);
  idx = content.indexOf(searchStr, idx + 1);
}

console.log(`Found ${indices.length} occurrences of "${searchStr}" at indices:`, indices);

// Let's print out lines around each occurrence of "Nội dung tác dụng phụ" to see what they are:
indices.forEach((index, i) => {
  const segment = content.substring(Math.max(0, index - 200), Math.min(content.length, index + 200));
  console.log(`\n--- OCCURRENCE ${i} (Index: ${index}) ---`);
  console.log(segment);
});
