import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Loader2,
  AlertCircle, Highlighter,
  ChevronRight, X, Edit3, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';
import { db, collection, onSnapshot, query, orderBy } from '../firebase';
import { SAMPLE_DOCUMENTS, ClinicalDocument } from '../lib/sampleDocs';

interface DocumentLookupProps {
  isDarkMode: boolean;
  currentUserUid: string;
  currentUserName: string;
  userRole?: string;
  onNavigateToTab?: (tabId: string) => void;
  featureSettings?: any;
  userPowerPoints?: number;
}

interface HighlightItem {
  id: string;
  text: string;
  color: 'green' | 'red' | 'orange' | 'blue';
  category: string;
  note: string;
  createdAt: string;
}

export default function DocumentLookup({ 
  isDarkMode, 
  currentUserUid, 
  currentUserName,
  userRole,
  onNavigateToTab,
  featureSettings,
  userPowerPoints = 0
}: DocumentLookupProps) {
  const isPrivileged = userRole && ['admin', 'operator', 'operator_doctor', 'operator_pharmacist'].includes(userRole);

  const showInternalDocsMinPower = featureSettings?.showInternalDocsMinPower ?? 0;
  const showSummaryMinPower = featureSettings?.showSummaryMinPower ?? 0;
  const showHighlightsMinPower = featureSettings?.showHighlightsMinPower ?? 0;

  const canSeeInternalDocs = userPowerPoints >= showInternalDocsMinPower;
  const canSeeSummary = userPowerPoints >= showSummaryMinPower;
  const canSeeHighlights = userPowerPoints >= showHighlightsMinPower;

  // Dynamic viewport-adaptive height calculations to perfectly fit any screen height without page scrollbars
  const [viewerHeight, setViewerHeight] = useState<number>(650);

  useEffect(() => {
    const handleResize = () => {
      const windowHeight = window.innerHeight;
      const isMobile = window.innerWidth < 1024; // lg breakpoint in Tailwind
      
      if (isMobile) {
        // Mobile view - stack columns: dynamic comfortable viewing height bounded between 350px and 650px (reduced height)
        setViewerHeight(Math.max(350, Math.min(650, Math.round(windowHeight * 0.55))));
      } else {
        // Desktop view - side-by-side layout: subtract KCB header and additional space to decrease iframe height
        setViewerHeight(Math.max(450, windowHeight - 260));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // DB list of documents
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const allowedDocuments = documents.filter(doc => !doc.isInternal || canSeeInternalDocs);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);

  // Load from collection y_khoa_documents
  useEffect(() => {
    setIsLoadingDocs(true);
    const q = query(collection(db, 'y_khoa_documents'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsList: ClinicalDocument[] = [];
      snapshot.forEach(docSnap => {
        docsList.push({
          id: docSnap.id,
          ...docSnap.data()
        } as ClinicalDocument);
      });
      
      const finalDocs = docsList.length > 0 ? docsList : SAMPLE_DOCUMENTS;
      const visibleDocs = finalDocs.filter(d => !d.isHidden);
      setDocuments(visibleDocs);
      setIsLoadingDocs(false);
    }, (error) => {
      console.warn("Failed to retrieve docs from Firebase, loading medical samples instead:", error);
      const visibleSamples = SAMPLE_DOCUMENTS.filter(d => !d.isHidden);
      setDocuments(visibleSamples);
      setIsLoadingDocs(false);
    });

    return () => unsubscribe();
  }, []);
  
  // Active viewing document states
  const [selectedDoc, setSelectedDoc] = useState<ClinicalDocument | null>(null);
  const [docTitle, setDocTitle] = useState<string>('');
  const [docText, setDocText] = useState<string>('');
  const [docSource, setDocSource] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchMatches, setSearchMatches] = useState<number>(0);
  const [leftSearch, setLeftSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'text' | 'pdf'>('pdf');

  // Highlights derived directly from selected document y văn (read-only for normal users)
  const highlights = selectedDoc?.highlights || [];

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'info' | 'highlights'>('highlights');
  const [mobileTab, setMobileTab] = useState<'pdf' | 'text' | 'highlights' | 'info'>('pdf');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!canSeeHighlights && activeTab === 'highlights') {
      setActiveTab('info');
    }
  }, [canSeeHighlights, activeTab]);

  useEffect(() => {
    if (!canSeeSummary && viewMode === 'text') {
      setViewMode('pdf');
      if (mobileTab === 'text') {
        setMobileTab('pdf');
      }
    }
  }, [canSeeSummary, viewMode, mobileTab]);

  const handleMobileTabClick = (tab: 'pdf' | 'text' | 'highlights' | 'info') => {
    setMobileTab(tab);
    if (tab === 'pdf' || tab === 'text') {
      setViewMode(tab);
    } else {
      setActiveTab(tab);
    }
  };

  // Counter effect for active matches count within text
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2 || !docText) {
      setSearchMatches(0);
      return;
    }
    try {
      const sTerm = searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(sTerm, 'gi');
      const matches = docText.match(regex);
      setSearchMatches(matches ? matches.length : 0);
    } catch (e) {
      setSearchMatches(0);
    }
  }, [searchTerm, docText]);

  // Load selected document details
  const handleLoadDocument = (docItem: ClinicalDocument) => {
    setSelectedDoc(docItem);
    setDocTitle(docItem.title);
    setDocText(docItem.text);
    setDocSource(docItem.category);
    setErrorMessage(null);
    setSearchTerm('');
    setViewMode(docItem.pdfUrl ? 'pdf' : 'text');
    setMobileTab(docItem.pdfUrl ? 'pdf' : 'text');
  };

  // Check for auto-select if redirected to lookup tab
  useEffect(() => {
    if (allowedDocuments.length > 0) {
      const viewDocId = localStorage.getItem('viewDocId');
      if (viewDocId) {
        const found = allowedDocuments.find(d => d.id === viewDocId);
        if (found) {
          handleLoadDocument(found);
        }
        localStorage.removeItem('viewDocId');
      }
    }
  }, [allowedDocuments]);

  const getEmbedUrl = (url?: string) => {
    if (!url) return "";
    const cleanUrl = url.trim();

    // Check if it's a Google Drive link
    if (cleanUrl.includes('drive.google.com')) {
      // 1. Check for standard folder or preview already formatted (e.g., .../file/d/[ID]/...)
      if (cleanUrl.includes('/file/d/')) {
        const match = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          return `https://drive.google.com/file/d/${match[1]}/preview`;
        }
      }
      
      // 2. Check for open?id=[id] or uc?id=[id]
      if (cleanUrl.includes('?id=')) {
        const match = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          return `https://drive.google.com/file/d/${match[1]}/preview`;
        }
      }
    }

    // Direct PDF or other external URL
    return cleanUrl;
  };

  // Convert raw text into highlights mapped HTML, with italic Căn cứ paragraphs
  const getRenderedContent = () => {
    if (!docText) return "";

    const colorsMap: Record<string, string> = {
      green: "background-color:#d1fae5;color:#065f46;border-bottom:2px solid #10b981;",
      red: "background-color:#ffe4e6;color:#9f1239;border-bottom:2px solid #f43f5e;",
      orange: "background-color:#fef3c7;color:#92400e;border-bottom:2px solid #f59e0b;",
      blue: "background-color:#e0f2fe;color:#075985;border-bottom:2px solid #0ea5e9;"
    };

    // Split into paragraphs for per-paragraph processing
    const paragraphs = docText.split(/\n\n+/);

    const processedParagraphs = paragraphs.map(para => {
      let escaped = para
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // Apply search highlight
      if (searchTerm && searchTerm.trim().length >= 2) {
        try {
          const escapedTerm = searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(`(${escapedTerm})`, 'gi');
          escaped = escaped.replace(regex, `<mark style="background:#fde047;color:#1e293b;border-radius:2px;padding:0 2px;font-weight:700;">$1</mark>`);
        } catch (e) { /* safe skip */ }
      }

      // Apply custom highlights
      const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);
      for (const hl of sortedHighlights) {
        const hlEscaped = hl.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        if (hlEscaped.trim().length > 3) {
          const colorCSS = colorsMap[hl.color] || "background-color:#fef9c3;border-bottom:2px solid #eab308;";
          if (escaped.includes(hlEscaped)) {
            escaped = escaped.split(hlEscaped).join(
              `<span style="${colorCSS}padding:0 2px;border-radius:2px;cursor:pointer;" title="[${hl.category}]: ${hl.note || 'Không có mô tả'}">${hlEscaped}</span>`
            );
          }
        }
      }

      // Handle inner newlines
      const html = escaped.replace(/\n/g, '<br/>');

      // Detect if paragraph starts with "Căn cứ" → italic style
      const trimmed = para.trimStart();
      const isCanCu = /^[\s\u00a0]*C[aă]n c[ứu]/i.test(trimmed);

      const paraStyle = [
        "text-align:justify",
        "text-indent:2em",
        "margin-bottom:0.75em",
        "font-family:'Times New Roman',Times,serif",
        "font-size:18px",
        "line-height:2",
        isCanCu ? "font-style:italic" : ""
      ].filter(Boolean).join(';');

      return `<p style="${paraStyle}">${html}</p>`;
    });

    return processedParagraphs.join('');
  };

  const formatDecisionDateLong = (dateStr?: string) => {
    if (!dateStr) return "ngày ... tháng ... năm ...";
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        return `ngày ${day} tháng ${month} năm ${year}`;
      }
    } catch (e) {
      // safe skip
    }
    return "ngày ... tháng ... năm ...";
  };


  return (
    <div className="w-full max-w-none px-4 lg:px-8 pt-5 lg:pt-8 space-y-6 animate-fadeIn" id="view_doc_lookup">
      {errorMessage && (
        <div className="p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {selectedDoc === null ? (
        // ==========================================
        // SCREEN 1: LIST VIEW TABLE OF DOCUMENTS
        // ==========================================
        <div className="space-y-6">
          <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className={cn(
                "text-base lg:text-lg font-black flex items-center gap-2 uppercase tracking-widest text-[#8b5cf6]",
              )}>
                <div className="w-1.5 h-6 bg-[#8b5cf6] rounded-full" />
                Tra cứu &amp; Đọc hiểu Văn bản Y khoa
                <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-500 text-[10px] border border-violet-500/20 font-black animate-pulse ml-2">
                  VĂN BẢN ĐIỆN TỬ
                </span>
              </h2>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wide">
                Tra cứu hướng dẫn điều trị lâm sàng, dược thư quốc gia và quy chế chuyên môn
              </p>
            </div>
          </div>

          <div className={cn(
            "p-6 rounded-3xl border transition-all",
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/40"
          )}>
            {/* Search and results header */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center pb-6 border-b border-slate-255 dark:border-slate-800">
              <div className="relative w-full md:max-w-xl">
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên văn bản, phân loại, số quyết định hoặc từ khóa..."
                  value={leftSearch}
                  onChange={(e) => setLeftSearch(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-10 py-3 rounded-2xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] transition-all",
                    isDarkMode 
                      ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:bg-slate-900" 
                      : "bg-slate-50 border-slate-200 placeholder-slate-400 focus:bg-white shadow-sm"
                  )}
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                {leftSearch && (
                  <button
                    onClick={() => setLeftSearch('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-500/5 px-3 py-1.5 rounded-xl border border-slate-200/5">
                  Kết quả: {allowedDocuments.filter(doc => 
                    doc.title.toLowerCase().includes(leftSearch.toLowerCase()) ||
                    doc.category.toLowerCase().includes(leftSearch.toLowerCase()) ||
                    (doc.tagKey || '').toLowerCase().includes(leftSearch.toLowerCase()) ||
                    (doc.decisionNo || '').toLowerCase().includes(leftSearch.toLowerCase())
                  ).length}
                </span>
              </div>
            </div>

            {/* Document Index Table - Desktop Only */}
            <div className="hidden md:block overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className={cn(
                    "border-b text-[10px] font-black uppercase tracking-widest text-slate-400",
                    isDarkMode ? "border-slate-800" : "border-slate-100"
                  )}>
                    <th className="pb-3 pl-4">Phân loại văn bản</th>
                    <th className="pb-3 pl-4">Tên văn bản</th>
                    <th className="pb-3 pl-4">Tag key</th>
                    <th className="pb-3 pl-4">Số QĐ</th>
                    <th className="pb-3 pl-4">Ngày QĐ</th>
                    <th className="pb-3 pr-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/5">
                  {isLoadingDocs ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Loader2 size={24} className="text-[#8b5cf6] animate-spin" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Đang tải tài nguyên học thuật...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : allowedDocuments.filter(doc => 
                    doc.title.toLowerCase().includes(leftSearch.toLowerCase()) ||
                    doc.category.toLowerCase().includes(leftSearch.toLowerCase()) ||
                    (doc.tagKey || '').toLowerCase().includes(leftSearch.toLowerCase()) ||
                    (doc.decisionNo || '').toLowerCase().includes(leftSearch.toLowerCase())
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                        Không tìm thấy tài liệu phù hợp
                      </td>
                    </tr>
                  ) : (
                    allowedDocuments.filter(doc => 
                      doc.title.toLowerCase().includes(leftSearch.toLowerCase()) ||
                      doc.category.toLowerCase().includes(leftSearch.toLowerCase()) ||
                      (doc.tagKey || '').toLowerCase().includes(leftSearch.toLowerCase()) ||
                      (doc.decisionNo || '').toLowerCase().includes(leftSearch.toLowerCase())
                    ).map((docItem) => {
                      const isGuide = docItem.category.toLowerCase().includes('phác đồ');
                      const isPharma = docItem.category.toLowerCase().includes('dược');
                      const badgeColor = isGuide 
                        ? "bg-violet-500/10 text-violet-500 border border-violet-500/20" 
                        : isPharma 
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                          : "bg-blue-500/10 text-blue-500 border border-blue-500/20";

                      return (
                        <tr
                          key={docItem.id}
                          onClick={() => handleLoadDocument(docItem)}
                          className={cn(
                            "group cursor-pointer text-xs font-semibold hover:bg-slate-500/5 transition-all"
                          )}
                        >
                          <td className="py-4 pl-4 whitespace-nowrap font-sans" id="lookup_td_category">
                            <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                              badgeColor
                            )}>
                              {docItem.category}
                            </span>
                              {docItem.isInternal && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 whitespace-nowrap">
                                  Nội bộ
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 pl-4 max-w-[320px]">
                            <div className={cn(
                              "font-black text-xs group-hover:text-[#8b5cf6] transition-colors leading-snug",
                              isDarkMode ? "text-slate-200" : "text-slate-800"
                            )}>
                              {docItem.title}
                            </div>
                          </td>
                          <td className="py-4 pl-4">
                            <div className="flex flex-wrap gap-1">
                              {docItem.tagKey ? (
                                docItem.tagKey.split(',').map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded-md text-[8px] font-bold border",
                                      isDarkMode 
                                        ? "bg-slate-950 border-slate-800 text-slate-400" 
                                        : "bg-white border-slate-200 text-slate-500"
                                    )}
                                  >
                                    {tag.trim()}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[9px] text-slate-400 italic font-medium">---</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 pl-4 font-mono font-bold text-slate-400 whitespace-nowrap">
                            {docItem.decisionNo || "---"}
                          </td>
                          <td className="py-4 pl-4 text-slate-400 font-bold whitespace-nowrap">
                            {docItem.decisionDate 
                              ? docItem.decisionDate.split('-').reverse().join('/') 
                              : "---"}
                          </td>
                          <td className="py-4 pr-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoadDocument(docItem);
                                }}
                                className={cn(
                                  "flex items-center gap-1 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider hover:scale-[1.03] transition-all",
                                  isDarkMode 
                                    ? "bg-slate-950 border-slate-800 text-[#8b5cf6] hover:bg-[#8b5cf6]/20" 
                                    : "bg-white border-slate-200 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 shadow-sm"
                                )}
                              >
                                <span>Đọc</span>
                                <ChevronRight size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Document Index Cards - Mobile Only */}
            <div className="md:hidden grid grid-cols-1 gap-4 mt-4">
              {isLoadingDocs ? (
                <div className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Loader2 size={24} className="text-[#8b5cf6] animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Đang tải tài nguyên học thuật...
                    </p>
                  </div>
                </div>
              ) : allowedDocuments.filter(doc => 
                doc.title.toLowerCase().includes(leftSearch.toLowerCase()) ||
                doc.category.toLowerCase().includes(leftSearch.toLowerCase()) ||
                (doc.tagKey || '').toLowerCase().includes(leftSearch.toLowerCase()) ||
                (doc.decisionNo || '').toLowerCase().includes(leftSearch.toLowerCase())
              ).length === 0 ? (
                <div className="py-12 text-center text-xs font-black uppercase tracking-widest text-slate-400">
                  Không tìm thấy tài liệu phù hợp
                </div>
              ) : (
                allowedDocuments.filter(doc => 
                  doc.title.toLowerCase().includes(leftSearch.toLowerCase()) ||
                  doc.category.toLowerCase().includes(leftSearch.toLowerCase()) ||
                  (doc.tagKey || '').toLowerCase().includes(leftSearch.toLowerCase()) ||
                  (doc.decisionNo || '').toLowerCase().includes(leftSearch.toLowerCase())
                ).map((docItem) => {
                  const isGuide = docItem.category.toLowerCase().includes('phác đồ');
                  const isPharma = docItem.category.toLowerCase().includes('dược');
                  const badgeColor = isGuide 
                    ? "bg-violet-500/10 text-violet-500 border border-violet-500/20" 
                    : isPharma 
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                      : "bg-blue-500/10 text-blue-500 border border-blue-500/20";

                  return (
                    <div
                      key={docItem.id}
                      onClick={() => handleLoadDocument(docItem)}
                      className={cn(
                        "p-5 rounded-3xl border transition-all active:scale-[0.98] cursor-pointer flex flex-col gap-3 text-left",
                        isDarkMode 
                          ? "bg-slate-950/40 border-slate-800 hover:border-slate-700" 
                          : "bg-slate-50/50 border-slate-100 hover:border-slate-200 shadow-sm"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider shrink-0",
                            badgeColor
                          )}>
                            {docItem.category}
                          </span>
                          {docItem.isInternal && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 whitespace-nowrap">
                              Nội bộ
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-mono font-bold text-slate-400 truncate max-w-[150px]">
                          {docItem.decisionNo ? `Số ${docItem.decisionNo}` : "Không số QĐ"}
                        </span>
                      </div>

                      <div className={cn(
                        "font-extrabold text-[13px] leading-snug font-sans",
                        isDarkMode ? "text-slate-200" : "text-slate-800"
                      )}>
                        {docItem.title}
                      </div>

                      {docItem.tagKey && (
                        <div className="flex flex-wrap gap-1">
                          {docItem.tagKey.split(',').map((tag, idx) => (
                            <span
                              key={idx}
                              className={cn(
                                "px-1.5 py-0.5 rounded-md text-[8px] font-semibold border",
                                isDarkMode 
                                  ? "bg-slate-950 border-slate-800 text-slate-400" 
                                  : "bg-white border-slate-200 text-slate-500 shadow-sm"
                              )}
                            >
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-slate-200/10 pt-3 mt-1 text-[10px] text-slate-400 font-bold">
                        <span>
                          {docItem.decisionDate 
                            ? "Ban hành: " + docItem.decisionDate.split('-').reverse().join('/') 
                            : ""}
                        </span>
                        <span className="text-[#8b5cf6] font-black flex items-center gap-0.5 uppercase tracking-wider text-[10px]">
                          Xem tài liệu <ChevronRight size={11} />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        // ==========================================
        // SCREEN 2: A4 DOCUMENT VIEWER WITH WORKSPACE
        // ==========================================
        <div className="space-y-6">
          {/* Header Action Menu */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/10">
            <div className="flex-1 min-w-0 pr-4 space-y-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-bold tracking-wider uppercase mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Ngày ban hành:</span>
                  <span className={cn("font-extrabold", isDarkMode ? "text-slate-200" : "text-slate-700")}>
                    {selectedDoc.decisionDate ? selectedDoc.decisionDate.split('-').reverse().join('/') : 'Nêu ở văn bản'}
                  </span>
                </div>
                <div className="w-1 h-3 bg-slate-350 dark:bg-slate-800 rounded-full hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Số chứng từ:</span>
                  <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-extrabold border bg-violet-500/10 border-violet-500/20 text-[#8b5cf6]")}>
                    {selectedDoc.decisionNo || 'Chưa cập nhật'}
                  </span>
                </div>
                {selectedDoc.isInternal && (
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-500 whitespace-nowrap">
                      VĂN BẢN NỘI BỘ
                    </span>
                    <div className="w-1 h-3 bg-slate-350 dark:bg-slate-800 rounded-full hidden sm:block" />
                  </div>
                )}

                {selectedDoc.signer && (
                  <>
                    <div className="w-1 h-3 bg-slate-350 dark:bg-slate-800 rounded-full hidden sm:block" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Người ký:</span>
                      <span className={cn("font-extrabold", isDarkMode ? "text-slate-200" : "text-slate-700")}>
                        {selectedDoc.signer}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <span className={cn(
                "text-[18px] font-bold font-jakarta block whitespace-normal break-words",
                isDarkMode ? "text-white" : "text-black"
              )}>
                <span className="text-slate-400 font-medium mr-1.5 text-[13px] uppercase tracking-widest block sm:inline">Tiêu đề:</span>
                {selectedDoc.title}
              </span>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={() => setSelectedDoc(null)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all active:scale-95",
                  isDarkMode 
                    ? "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200" 
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"
                )}
              >
                <span>← Quay lại</span>
              </button>

              {isPrivileged && (
                <button
                  onClick={() => {
                    localStorage.setItem('editDocId', selectedDoc.id);
                    onNavigateToTab?.('manage_doc_lookup');
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all active:scale-95",
                    isDarkMode 
                      ? "bg-slate-900 border-slate-800 hover:bg-slate-800 text-sky-400 hover:bg-sky-400/20" 
                      : "bg-white border-slate-200 hover:bg-slate-50 text-sky-600 shadow-sm"
                  )}
                  title="Chỉnh sửa văn bản này"
                >
                  <Edit3 size={13} />
                  <span>Sửa</span>
                </button>
              )}
            </div>
          </div>

          {/* Universal Mobile Switcher Tab Bar (only visible on mobile, lg:hidden) */}
          <div className={cn(
            "flex lg:hidden p-1 rounded-2xl border transition-all overflow-x-auto whitespace-nowrap scrollbar-none gap-1 w-full shadow-md z-10",
            isDarkMode 
              ? "bg-slate-900 border-slate-800" 
              : "bg-slate-100 border-slate-200/50"
          )}>
            {selectedDoc.pdfUrl && (
              <button
                onClick={() => handleMobileTabClick('pdf')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer inline-flex shrink-0",
                  mobileTab === 'pdf'
                    ? "bg-[#8b5cf6] text-white shadow font-extrabold font-sans"
                    : isDarkMode 
                      ? "text-slate-400 hover:text-slate-200" 
                      : "text-slate-500 hover:text-slate-800"
                )}
              >
                <FileText size={11} />
                Văn bản
              </button>
            )}
            <button
              onClick={() => {
                if (!canSeeSummary) return;
                handleMobileTabClick('text');
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer inline-flex shrink-0",
                mobileTab === 'text'
                  ? "bg-[#8b5cf6] text-white shadow font-extrabold font-sans"
                  : isDarkMode 
                    ? "text-slate-400 hover:text-slate-200" 
                    : "text-slate-500 hover:text-slate-800",
                !canSeeSummary && "opacity-45 cursor-not-allowed"
              )}
            >
              <FileText size={11} />
              Tóm tắt {!canSeeSummary && "🔒"}
            </button>
            <button
              onClick={() => {
                if (!canSeeHighlights) return;
                handleMobileTabClick('highlights');
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer inline-flex shrink-0",
                mobileTab === 'highlights'
                  ? "bg-[#8b5cf6] text-white shadow font-extrabold font-sans"
                  : isDarkMode 
                    ? "text-slate-400 hover:text-slate-200" 
                    : "text-slate-500 hover:text-slate-800",
                !canSeeHighlights && "opacity-45 cursor-not-allowed"
              )}
            >
              <Highlighter size={11} />
              Điểm nhấn {!canSeeHighlights ? "🔒" : `(${highlights.length})`}
            </button>
              <button
                onClick={() => handleMobileTabClick('info')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer inline-flex shrink-0",
                  mobileTab === 'info'
                    ? "bg-[#8b5cf6] text-white shadow font-extrabold font-sans"
                    : isDarkMode 
                      ? "text-slate-400 hover:text-slate-200" 
                      : "text-slate-500 hover:text-slate-800"
                )}
              >
                <BookOpen size={11} />
                Thông tin
              </button>
            </div>
  
            {/* Document & Notes Panel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* A4 Document Frame Container */}
              <div className={cn(
                "lg:col-span-7 xl:col-span-7 space-y-4",
                (mobileTab === 'pdf' || mobileTab === 'text') ? "block" : "hidden lg:block"
              )}>
                {/* Interactive controls panel */}
                {selectedDoc.pdfUrl && (
                  <div className={cn(
                    "p-4 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all-custom",
                    isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-lg shadow-slate-200/20",
                    viewMode === 'text' ? "hidden lg:flex" : "flex"
                  )}>
                    {/* Desktop view switcher (two tabs) */}
                    <div className={cn(
                      "hidden lg:flex p-1 rounded-2xl border transition-all",
                      isDarkMode 
                        ? "bg-slate-950 border-slate-800" 
                        : "bg-slate-100 border-slate-200/50"
                    )}>
                      <button
                        onClick={() => {
                          setViewMode('pdf');
                          setMobileTab('pdf');
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer",
                          viewMode === 'pdf'
                            ? "bg-[#8b5cf6] text-white shadow font-extrabold"
                            : isDarkMode 
                              ? "text-slate-400 hover:text-slate-200" 
                              : "text-slate-500 hover:text-slate-800"
                        )}
                      >
                        Văn bản
                      </button>
                      <button
                        onClick={() => {
                          if (!canSeeSummary) return;
                          setViewMode('text');
                          setMobileTab('text');
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer",
                          viewMode === 'text'
                            ? "bg-[#8b5cf6] text-white shadow font-extrabold"
                            : isDarkMode 
                              ? "text-slate-400 hover:text-slate-200" 
                              : "text-slate-500 hover:text-slate-800",
                          !canSeeSummary && "opacity-45 cursor-not-allowed"
                        )}
                      >
                        Tóm tắt {!canSeeSummary && "🔒"}
                      </button>
                    </div>
  
                    <a
                      href={selectedDoc.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all shrink-0 self-start sm:self-auto w-full sm:w-auto justify-center",
                        isDarkMode
                          ? "bg-slate-950 border-slate-800 text-amber-400 hover:bg-slate-900"
                          : "bg-white border-slate-200 text-amber-655 hover:bg-slate-50 shadow-sm"
                      )}
                    >
                      <FileText size={12} />
                      Mở ↗
                    </a>
                  </div>
                )}

              {/* === VIEW PORT CONTAINER ============================================== */}
              <div
                className={cn(
                  "relative flex flex-col border overflow-hidden transition-all",
                  viewMode === 'pdf' && selectedDoc.pdfUrl ? "rounded-none" : "rounded-3xl",
                  isDarkMode ? "bg-[#1e2030] border-slate-800" : "bg-white border-slate-200 shadow-md"
                )}
                style={{ 
                  height: (window.innerWidth < 1024 && (viewMode === 'text' || !selectedDoc.pdfUrl))
                    ? 'auto'
                    : `${viewerHeight}px`
                }}
              >
                {viewMode === 'pdf' && selectedDoc.pdfUrl ? (
                  <iframe
                    src={getEmbedUrl(selectedDoc.pdfUrl)}
                    className="w-full h-full border-none rounded-none"
                    title="Google Drive PDF Preview"
                    allow="autoplay"
                  />
                ) : !canSeeSummary ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-6">
                    <AlertCircle className="w-12 h-12 text-amber-500 mb-4 animate-bounce shrink-0" />
                    <h3 className="text-sm font-black uppercase tracking-wider mb-2">QUYỀN HẠN HẠN CHẾ</h3>
                    <p className="text-xs text-slate-400 max-w-md leading-relaxed font-semibold">
                      Bạn không có đủ điểm quyền lực tối thiểu ({showSummaryMinPower}) để xem nội dung tóm tắt văn bản này. Vui lòng liên hệ ban quản trị hoặc tích lũy điểm chuyên môn để mở khóa.
                    </p>
                  </div>
                ) : (
                  <div className={cn(
                    "flex-1 overflow-y-auto px-4 py-8 sm:p-12 select-text text-left font-times whitespace-normal break-words shadow-inner w-full h-full custom-scrollbar",
                    isDarkMode ? "bg-slate-950 text-slate-200 border-slate-850" : "bg-white text-slate-900 border-slate-200",
                    "[&_h1]:text-base sm:[&_h1]:text-lg [&_h1]:font-black [&_h1]:mt-4 sm:[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-center [&_h1]:uppercase [&_h1]:tracking-wide [&_h1]:border-b [&_h1]:pb-2",
                    isDarkMode 
                      ? "[&_h1]:text-white [&_h1]:border-slate-800 [&_h2]:text-slate-300 [&_h2]:border-slate-800 [&_p]:text-slate-300 [&_ul]:text-slate-300 [&_ol]:text-slate-300 [&_strong]:text-white" 
                      : "[&_h1]:text-slate-900 [&_h1]:border-slate-300 [&_h2]:text-slate-800 [&_h2]:border-slate-100 [&_p]:text-slate-800 [&_ul]:text-slate-800 [&_ol]:text-slate-800 [&_strong]:text-slate-900",
                    "[&_h2]:text-xs sm:[&_h2]:text-sm [&_h2]:font-extrabold [&_h2]:mt-4 sm:[&_h2]:mt-5 [&_h2]:mb-2",
                    "[&_h3]:text-[11px] sm:[&_h3]:text-xs [&_h3]:font-bold [&_h3]:mt-3 sm:[&_h3]:mt-4 [&_h3]:mb-1",
                    "[&_p]:mb-3 sm:[&_p]:mb-4 [&_p]:leading-relaxed sm:[&_p]:leading-loose [&_p]:text-justify [&_p]:text-[12px] sm:[&_p]:text-[13px] [&_p]:indent-4 sm:[&_p]:indent-8",
                    "[&_ul]:list-disc [&_ul]:pl-5 sm:[&_ul]:pl-6 [&_ul]:mb-3 sm:[&_ul]:mb-4 [&_ul]:space-y-1 sm:[&_ul]:space-y-1.5 [&_ul]:text-[12px] sm:[&_ul]:text-[13px]",
                    "[&_ol]:list-decimal [&_ol]:pl-5 sm:[&_ol]:pl-6 [&_ol]:mb-3 sm:[&_ol]:mb-4 [&_ol]:space-y-1 sm:[&_ol]:space-y-1.5 [&_ol]:text-[12px] sm:[&_ol]:text-[13px]",
                    "[&_li]:mb-1",
                    "[&_strong]:font-black",
                    "[&_hr]:my-4 sm:[&_hr]:my-6 [&_hr]:border-t [&_hr]:border-slate-300/35",
                    "[&_table]:block [&_table]:overflow-x-auto [&_table]:whitespace-nowrap [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_table]:text-[11px] sm:[&_table]:text-[12px]",
                    "[&_th]:border [&_th]:border-slate-300 [&_th]:p-1.5 sm:[&_th]:p-2 [&_th]:bg-slate-500/10 [&_th]:font-bold",
                    "[&_td]:border [&_td]:border-slate-300 [&_td]:p-1.5 sm:[&_td]:p-2"
                  )}>
                    <Markdown>{selectedDoc.text}</Markdown>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar highlights workspace notes */}
            <div className={cn(
              "lg:col-span-5 xl:col-span-5 space-y-4",
              (mobileTab === 'highlights' || mobileTab === 'info') ? "block" : "hidden lg:block"
            )}>
              <div className={cn(
                "p-4 sm:p-5 rounded-3xl border flex flex-col transition-all",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/40"
              )}
              style={{ height: (window.innerWidth < 1024) ? 'auto' : `${viewerHeight}px` }}>
                {/* Header Tabs switcher (desktop split view only) */}
                <div className="hidden lg:flex border-b border-slate-200/20 shrink-0">
                  {(['highlights', 'info'] as const).map((tab) => {
                    const isLocked = tab === 'highlights' && !canSeeHighlights;
                    const labelSet = {
                      highlights: "Điểm nhấn (" + (isLocked ? "🔒" : highlights.length) + ")",
                      info: "Thông tin"
                    };
                    return (
                      <button
                        key={tab}
                        disabled={isLocked && activeTab === tab}
                        onClick={() => {
                          if (isLocked) return;
                          setActiveTab(tab);
                        }}
                        className={cn(
                          "flex-1 text-center py-2 text-[10.5px] font-black uppercase tracking-widest border-b-2 -mb-[2px] transition-all",
                          activeTab === tab
                            ? "border-[#8b5cf6] text-[#8b5cf6]"
                            : "border-transparent text-slate-400 hover:text-slate-200",
                          isLocked && "opacity-45 cursor-not-allowed"
                        )}
                      >
                        {labelSet[tab]}
                      </button>
                    );
                  })}
                </div>

                {/* Panel main contents area */}
                <div className="flex-1 overflow-y-auto pt-4 pr-1 scrollbar-thin">
                  <AnimatePresence mode="wait">
                    {activeTab === 'info' && (
                      <motion.div
                        key="info-tab"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4 text-left"
                      >
                        <div className={cn(
                          "p-4 rounded-2xl border text-[11px]",
                          isDarkMode ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-200"
                        )}>
                          <h4 className="font-extrabold text-[11px] text-[#8b5cf6] mb-3 uppercase tracking-widest flex items-center gap-1.5">
                            <BookOpen size={12} />
                            Thông Tin Tài Liệu
                          </h4>
                          <div className="space-y-2 font-semibold text-slate-400">
                            <div>
                                <span className="opacity-60 block text-[9px] uppercase">Tiêu đề:</span>
                                <span className={cn("font-bold text-xs", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                                  {selectedDoc.title}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <div>
                                <span className="opacity-60 block text-[9px] uppercase">Chuyên Mục:</span>
                                <span className="text-violet-500 font-extrabold">{selectedDoc.category}</span>
                              </div>
                              <div>
                                <span className="opacity-60 block text-[9px] uppercase">Độ Dài:</span>
                                <span className={isDarkMode ? "text-slate-200" : "text-slate-800"}>
                                  {selectedDoc.text.length.toLocaleString()} ký tự
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={cn(
                          "p-4 rounded-2xl border text-[11px] leading-relaxed",
                          isDarkMode ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-200"
                        )}>
                          <h4 className="font-extrabold text-[11px] text-[#8b5cf6] mb-2 uppercase tracking-widest flex items-center gap-1.5">
                            <Highlighter size={12} />
                            Điểm Nhấn Y Văn Lâm Sàng
                          </h4>
                          <p className="opacity-80 font-medium text-slate-400">
                            Các điểm nhấn y văn cốt lõi giúp bác sĩ tra cứu nhanh và chính xác các hướng dẫn thực hành lâm sàng quan trọng:
                          </p>
                          <ul className="list-disc pl-4 mt-2 space-y-1.5 text-slate-400 opacity-90 font-medium">
                            <li>Thông tin được phân loại rõ ràng theo từng chủ đề chuyên môn.</li>
                            <li>Được ban điều hành cấu hình trực tiếp từ tài liệu gốc.</li>
                            <li>Hỗ trợ bác sĩ đưa ra quyết định lâm sàng nhanh chóng.</li>
                          </ul>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'highlights' && (
                      <motion.div
                        key="highlights-tab"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                      >
                        {!canSeeHighlights ? (
                          <div className="text-center py-16 text-slate-400 font-bold uppercase tracking-widest text-[9px] space-y-2 px-4">
                            <AlertCircle size={28} className="mx-auto opacity-70 text-amber-500 animate-pulse" />
                            <p>Quyên hạn hạn chế</p>
                            <p className="text-[8px] text-slate-500 lowercase leading-relaxed">
                              Bạn không có đủ điểm quyền lực tối thiểu ({showHighlightsMinPower}) để xem nội dung Điểm nhấn y văn của tài liệu này.
                            </p>
                          </div>
                        ) : highlights.length === 0 ? (
                          <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-[9px] space-y-2">
                            <Highlighter size={28} className="mx-auto opacity-30 text-[#8b5cf6]" />
                            <p>Không có điểm nhấn nào cho văn bản này</p>
                            <p className="text-[8px] text-slate-500 lowercase leading-relaxed">
                              Ban điều hành chưa thiết lập điểm nhấn y văn cho tài liệu này.
                            </p>
                          </div>
                        ) : (
                          highlights.map((hl) => {
                            const styleSet = {
                              green: "border-l-4 border-emerald-500 bg-emerald-500/5",
                              red: "border-l-4 border-rose-500 bg-rose-500/5",
                              orange: "border-l-4 border-amber-500 bg-amber-500/5",
                              blue: "border-l-4 border-sky-500 bg-sky-500/5"
                            };
                            return (
                              <div
                                key={hl.id}
                                className={cn("p-3 rounded-xl border border-slate-200/20 text-left space-y-2 relative group", styleSet[hl.color])}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6]">
                                    [{hl.category}]
                                  </span>
                                </div>

                                <p className={cn("text-[10px] leading-relaxed italic font-semibold line-clamp-3", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                                  "{hl.text}"
                                </p>

                                {hl.note && hl.note.trim() !== "" && (
                                  <p className="text-[10px] font-semibold text-slate-400 border-t border-slate-200/10 pt-1.5 font-roboto-serif leading-relaxed" style={{ fontFamily: "'Roboto Serif', serif" }}>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-1">Ghi chú:</span>
                                    <span className={cn(isDarkMode ? "text-slate-300" : "text-slate-600")}>{hl.note}</span>
                                  </p>
                                )}
                              </div>
                            );
                          })
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
