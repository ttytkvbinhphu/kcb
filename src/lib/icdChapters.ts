export interface ICD10ChapterDef {
  id: string; // Roman numeral 'I', 'II', ..., 'XXII'
  roman: string;
  codeRange: string;
  name: string;
  shortName: string;
  colorName: string;
  badgeClass: string;
  activeClass: string;
  dotColor: string;
}

export const ICD10_CHAPTERS: ICD10ChapterDef[] = [
  {
    id: 'I',
    roman: 'I',
    codeRange: 'A00 - B99',
    name: 'Một số bệnh nhiễm trùng và ký sinh trùng',
    shortName: 'Nhiễm trùng & Ký sinh trùng',
    colorName: 'emerald',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
    activeClass: 'bg-emerald-600 text-white',
    dotColor: 'bg-emerald-500'
  },
  {
    id: 'II',
    roman: 'II',
    codeRange: 'C00 - D48',
    name: 'Khối u (U bướu ác tính & lành tính)',
    shortName: 'U bướu / Khối u',
    colorName: 'rose',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/50',
    activeClass: 'bg-rose-600 text-white',
    dotColor: 'bg-rose-500'
  },
  {
    id: 'III',
    roman: 'III',
    codeRange: 'D50 - D89',
    name: 'Bệnh của máu, cơ quan tạo máu và miễn dịch',
    shortName: 'Bệnh máu & Miễn dịch',
    colorName: 'red',
    badgeClass: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800/50',
    activeClass: 'bg-red-600 text-white',
    dotColor: 'bg-red-500'
  },
  {
    id: 'IV',
    roman: 'IV',
    codeRange: 'E00 - E90',
    name: 'Bệnh nội tiết, dinh dưỡng và chuyển hoá',
    shortName: 'Nội tiết & Chuyển hoá',
    colorName: 'amber',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
    activeClass: 'bg-amber-600 text-white',
    dotColor: 'bg-amber-500'
  },
  {
    id: 'V',
    roman: 'V',
    codeRange: 'F00 - F99',
    name: 'Các rối loạn tâm thần và hành vi',
    shortName: 'Tâm thần & Hành vi',
    colorName: 'purple',
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
    activeClass: 'bg-purple-600 text-white',
    dotColor: 'bg-purple-500'
  },
  {
    id: 'VI',
    roman: 'VI',
    codeRange: 'G00 - G99',
    name: 'Bệnh của hệ thần kinh',
    shortName: 'Bệnh hệ thần kinh',
    colorName: 'violet',
    badgeClass: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800/50',
    activeClass: 'bg-violet-600 text-white',
    dotColor: 'bg-violet-500'
  },
  {
    id: 'VII',
    roman: 'VII',
    codeRange: 'H00 - H59',
    name: 'Bệnh của mắt và phần phụ',
    shortName: 'Mắt & Phần phụ',
    colorName: 'cyan',
    badgeClass: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/50',
    activeClass: 'bg-cyan-600 text-white',
    dotColor: 'bg-cyan-500'
  },
  {
    id: 'VIII',
    roman: 'VIII',
    codeRange: 'H60 - H95',
    name: 'Bệnh của tai và xương chũm',
    shortName: 'Tai - Xương chũm',
    colorName: 'sky',
    badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/50',
    activeClass: 'bg-sky-600 text-white',
    dotColor: 'bg-sky-500'
  },
  {
    id: 'IX',
    roman: 'IX',
    codeRange: 'I00 - I99',
    name: 'Bệnh của hệ tuần hoàn (Tim mạch...)',
    shortName: 'Hệ tuần hoàn / Tim mạch',
    colorName: 'blue',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
    activeClass: 'bg-blue-600 text-white',
    dotColor: 'bg-blue-500'
  },
  {
    id: 'X',
    roman: 'X',
    codeRange: 'J00 - J99',
    name: 'Bệnh của hệ hô hấp',
    shortName: 'Bệnh hệ hô hấp',
    colorName: 'teal',
    badgeClass: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800/50',
    activeClass: 'bg-teal-600 text-white',
    dotColor: 'bg-teal-500'
  },
  {
    id: 'XI',
    roman: 'XI',
    codeRange: 'K00 - K93',
    name: 'Bệnh của hệ tiêu hoá',
    shortName: 'Bệnh hệ tiêu hoá',
    colorName: 'orange',
    badgeClass: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800/50',
    activeClass: 'bg-orange-600 text-white',
    dotColor: 'bg-orange-500'
  },
  {
    id: 'XII',
    roman: 'XII',
    codeRange: 'L00 - L99',
    name: 'Bệnh của da và mô dưới da',
    shortName: 'Da & Mô dưới da',
    colorName: 'pink',
    badgeClass: 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border-pink-200 dark:border-pink-800/50',
    activeClass: 'bg-pink-600 text-white',
    dotColor: 'bg-pink-500'
  },
  {
    id: 'XIII',
    roman: 'XIII',
    codeRange: 'M00 - M99',
    name: 'Bệnh hệ cơ - xương - khớp & mô liên kết',
    shortName: 'Cơ - Xương - Khớp',
    colorName: 'indigo',
    badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50',
    activeClass: 'bg-indigo-600 text-white',
    dotColor: 'bg-indigo-500'
  },
  {
    id: 'XIV',
    roman: 'XIV',
    codeRange: 'N00 - N99',
    name: 'Bệnh của hệ sinh dục - tiết niệu',
    shortName: 'Hệ sinh dục - Tiết niệu',
    colorName: 'fuchsia',
    badgeClass: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800/50',
    activeClass: 'bg-fuchsia-600 text-white',
    dotColor: 'bg-fuchsia-500'
  },
  {
    id: 'XV',
    roman: 'XV',
    codeRange: 'O00 - O99',
    name: 'Thai nghén, sinh đẻ và thời kỳ hậu sản',
    shortName: 'Sản khoa & Sinh đẻ',
    colorName: 'rose',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/50',
    activeClass: 'bg-rose-600 text-white',
    dotColor: 'bg-rose-500'
  },
  {
    id: 'XVI',
    roman: 'XVI',
    codeRange: 'P00 - P96',
    name: 'Một số tình trạng xuất phát thời kỳ chu sinh',
    shortName: 'Thời kỳ chu sinh (Sơ sinh)',
    colorName: 'lime',
    badgeClass: 'bg-lime-50 text-lime-700 dark:bg-lime-950/40 dark:text-lime-300 border-lime-200 dark:border-lime-800/50',
    activeClass: 'bg-lime-600 text-white',
    dotColor: 'bg-lime-500'
  },
  {
    id: 'XVII',
    roman: 'XVII',
    codeRange: 'Q00 - Q99',
    name: 'Dị tật bẩm sinh, biến dạng & bất thường NST',
    shortName: 'Dị tật bẩm sinh & NST',
    colorName: 'emerald',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
    activeClass: 'bg-emerald-600 text-white',
    dotColor: 'bg-emerald-500'
  },
  {
    id: 'XVIII',
    roman: 'XVIII',
    codeRange: 'R00 - R99',
    name: 'Triệu chứng, dấu hiệu và kết quả bất thường',
    shortName: 'Triệu chứng & Dấu hiệu',
    colorName: 'slate',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    activeClass: 'bg-slate-700 text-white',
    dotColor: 'bg-slate-500'
  },
  {
    id: 'XIX',
    roman: 'XIX',
    codeRange: 'S00 - T98',
    name: 'Vết thương, ngộ độc & hậu quả ngoại sinh',
    shortName: 'Chấn thương & Ngộ độc',
    colorName: 'amber',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
    activeClass: 'bg-amber-600 text-white',
    dotColor: 'bg-amber-500'
  },
  {
    id: 'XX',
    roman: 'XX',
    codeRange: 'V01 - Y98',
    name: 'Nguyên nhân ngoại sinh của bệnh tật và tử vong',
    shortName: 'Nguyên nhân ngoại sinh',
    colorName: 'stone',
    badgeClass: 'bg-stone-100 text-stone-700 dark:bg-stone-800/60 dark:text-stone-300 border-stone-200 dark:border-stone-700',
    activeClass: 'bg-stone-700 text-white',
    dotColor: 'bg-stone-500'
  },
  {
    id: 'XXI',
    roman: 'XXI',
    codeRange: 'Z00 - Z99',
    name: 'Yếu tố ảnh hưởng sức khoẻ & tiếp xúc y tế',
    shortName: 'Yếu tố sức khoẻ & Y tế',
    colorName: 'teal',
    badgeClass: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800/50',
    activeClass: 'bg-teal-600 text-white',
    dotColor: 'bg-teal-500'
  },
  {
    id: 'XXII',
    roman: 'XXII',
    codeRange: 'U00 - U49',
    name: 'Mã sử dụng cho mục đích đặc biệt (COVID-19...)',
    shortName: 'Mục đích đặc biệt (U)',
    colorName: 'zinc',
    badgeClass: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
    activeClass: 'bg-zinc-700 text-white',
    dotColor: 'bg-zinc-500'
  }
];

/**
 * Returns the WHO / Vietnam Ministry of Health ICD-10 Chapter ID ('I' - 'XXII')
 * for a given ICD-10 code string and optional chapterName.
 */
export function getIcdChapterId(code?: string, chapterName?: string): string {
  if (!code && !chapterName) return '';

  if (code) {
    const clean = code.trim().toUpperCase();
    const first = clean[0];
    const num = parseInt(clean.slice(1, 3), 10);

    if (first === 'A' || first === 'B') return 'I';
    if (first === 'C') return 'II';
    if (first === 'D') {
      if (!isNaN(num) && num >= 50) return 'III';
      return 'II'; // D00 - D48
    }
    if (first === 'E') return 'IV';
    if (first === 'F') return 'V';
    if (first === 'G') return 'VI';
    if (first === 'H') {
      if (!isNaN(num) && num >= 60) return 'VIII';
      return 'VII'; // H00 - H59
    }
    if (first === 'I') return 'IX';
    if (first === 'J') return 'X';
    if (first === 'K') return 'XI';
    if (first === 'L') return 'XII';
    if (first === 'M') return 'XIII';
    if (first === 'N') return 'XIV';
    if (first === 'O') return 'XV';
    if (first === 'P') return 'XVI';
    if (first === 'Q') return 'XVII';
    if (first === 'R') return 'XVIII';
    if (first === 'S' || first === 'T') return 'XIX';
    if (first === 'V' || first === 'W' || first === 'X' || first === 'Y') return 'XX';
    if (first === 'Z') return 'XXI';
    if (first === 'U') return 'XXII';
  }

  // Fallback to chapterName if code didn't match
  if (chapterName) {
    const nameLower = chapterName.toLowerCase();
    for (const chap of ICD10_CHAPTERS) {
      if (
        nameLower.includes(`chương ${chap.roman.toLowerCase()}:`) ||
        nameLower.includes(`chương ${chap.roman.toLowerCase()} `) ||
        nameLower.includes(chap.roman.toLowerCase()) ||
        nameLower.includes(chap.codeRange.toLowerCase())
      ) {
        return chap.id;
      }
    }
  }

  return '';
}
