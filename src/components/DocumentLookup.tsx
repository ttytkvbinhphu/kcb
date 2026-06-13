import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Loader2,
  AlertCircle, Highlighter,
  ChevronRight, ChevronLeft, X, Edit3, BookOpen, Link2,
  Filter, SlidersHorizontal, RotateCcw, Calendar, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';
import { db, collection, onSnapshot, query, orderBy } from '../firebase';
import { SAMPLE_DOCUMENTS, ClinicalDocument } from '../lib/sampleDocs';

const extractDriveId = (input: string): string => {
  if (!input) return "";
  const trimmed = input.trim();
  
  // Try to match standard URL file/d/{ID}
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];
  
  // Try to match open?id={ID} or uc?id={ID}
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

  // Try to match file/{ID} (as user typed "https://drive.google.com/file/{ID}")
  const fileMatch = trimmed.match(/\/file\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1] && fileMatch[1] !== 'd') return fileMatch[1];
  
  return trimmed;
};

const formatDrivePreviewUrl = (urlOrId?: string): string => {
  if (!urlOrId) return "";
  const trimmed = urlOrId.trim();
  const isDrive = trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com');
  const isRawId = !trimmed.includes('/') && !trimmed.includes('.') && trimmed.length >= 15;
  
  if (isDrive || isRawId) {
    const id = extractDriveId(trimmed);
    if (id) {
      return `https://drive.google.com/file/d/${id}/preview`;
    }
  }
  return trimmed;
};

const formatDriveViewUrl = (urlOrId?: string): string => {
  if (!urlOrId) return "";
  const trimmed = urlOrId.trim();
  const isDrive = trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com');
  const isRawId = !trimmed.includes('/') && !trimmed.includes('.') && trimmed.length >= 15;
  
  if (isDrive || isRawId) {
    const id = extractDriveId(trimmed);
    if (id) {
      return `https://drive.google.com/file/d/${id}/view`;
    }
  }
  return trimmed;
};

const getCategoryBadgeColor = (category: string) => {
  const normalized = (category || '').trim();
  const lower = normalized.toLowerCase();
  
  if (lower.includes('chỉ đạo')) {
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
  }
  if (lower.includes('khám chữa bệnh')) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
  }
  if (lower.includes('phác đồ') || lower.includes('điều trị')) {
    return "bg-violet-500/10 text-violet-500 border border-violet-500/20";
  }
  if (lower.includes('dược') || lower.includes('thuốc') || lower.includes('dược thư')) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
  }
  if (lower.includes('quy chế') || lower.includes('luật') || lower.includes('thông tư') || lower.includes('nghị định') || lower.includes('bộ luật') || lower.includes('chỉ thị')) {
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
  }
  if (lower.includes('quy trình') || lower.includes('kỹ thuật') || lower.includes('sơ đồ') || lower.includes('thao tác')) {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20";
  }
  if (lower.includes('hướng dẫn') || lower.includes('quy chuẩn') || lower.includes('tiêu chuẩn')) {
    return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20";
  }
  if (lower.includes('báo cáo') || lower.includes('nghiên cứu') || lower.includes('đánh giá')) {
    return "bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20";
  }

  // Consistent hashing for custom categories
  const colors = [
    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
    "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
    "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20",
    "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
    "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
  ];

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

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
      
      // Sort: newest decisionDate first (descending). Fallback to createdAt desc if decisionDate is missing.
      const sortedDocs = [...visibleDocs].sort((a, b) => {
        const dateA = a.decisionDate ? a.decisionDate.trim() : '';
        const dateB = b.decisionDate ? b.decisionDate.trim() : '';
        if (dateA && dateB) {
          return dateB.localeCompare(dateA);
        }
        if (dateA) return -1;
        if (dateB) return 1;
        
        const parseTime = (doc: ClinicalDocument) => {
          if (!doc.createdAt) return 0;
          if (typeof doc.createdAt === 'string') {
            return new Date(doc.createdAt).getTime() || 0;
          }
          const anyCreated = doc.createdAt as any;
          if (anyCreated && typeof anyCreated.seconds === 'number') {
            return anyCreated.seconds * 1000;
          }
          return 0;
        };
        return parseTime(b) - parseTime(a);
      });

      setDocuments(sortedDocs);
      setIsLoadingDocs(false);
    }, (error) => {
      console.warn("Failed to retrieve docs from Firebase, loading medical samples instead:", error);
      const visibleSamples = SAMPLE_DOCUMENTS.filter(d => !d.isHidden);
      
      const sortedSamples = [...visibleSamples].sort((a, b) => {
        const dateA = a.decisionDate ? a.decisionDate.trim() : '';
        const dateB = b.decisionDate ? b.decisionDate.trim() : '';
        if (dateA && dateB) {
          return dateB.localeCompare(dateA);
        }
        if (dateA) return -1;
        if (dateB) return 1;
        
        const parseTime = (doc: ClinicalDocument) => {
          if (!doc.createdAt) return 0;
          if (typeof doc.createdAt === 'string') {
            return new Date(doc.createdAt).getTime() || 0;
          }
          const anyCreated = doc.createdAt as any;
          if (anyCreated && typeof anyCreated.seconds === 'number') {
            return anyCreated.seconds * 1000;
          }
          return 0;
        };
        return parseTime(b) - parseTime(a);
      });

      setDocuments(sortedSamples);
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

  // Detailed filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'expired'>('all');
  const [selectedScope, setSelectedScope] = useState<'all' | 'internal' | 'public'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [showDetailedFilters, setShowDetailedFilters] = useState<boolean>(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Reset page when any filter details change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedStatus, selectedScope, selectedYear, selectedTag, leftSearch]);

  // Dynamic filter values
  const availableCategories = Array.from(new Set(allowedDocuments.map(d => d.category).filter(Boolean))).sort();
  const availableYears = Array.from(new Set(allowedDocuments.map(d => {
    if (d.decisionDate && d.decisionDate.length >= 4) {
      return d.decisionDate.substring(0, 4);
    }
    return '';
  }).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  
  const availableTags = Array.from(new Set(allowedDocuments.flatMap(d => 
    d.tagKey ? d.tagKey.split(',').map(t => t.trim()) : []
  ).filter(t => t && t.trim().length > 0))).sort();

  const isAnyFilterActive = selectedCategory !== 'all' || 
                            selectedStatus !== 'all' || 
                            selectedScope !== 'all' || 
                            selectedYear !== 'all' || 
                            selectedTag !== '';

  const handleClearFilters = () => {
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedScope('all');
    setSelectedYear('all');
    setSelectedTag('');
    setLeftSearch('');
  };

  const filteredDocuments = allowedDocuments.filter(doc => {
    // 1. Search keyword filter
    if (leftSearch) {
      const sTerm = leftSearch.toLowerCase();
      const matchSearch = doc.title.toLowerCase().includes(sTerm) ||
                          doc.category.toLowerCase().includes(sTerm) ||
                          (doc.tagKey || '').toLowerCase().includes(sTerm) ||
                          (doc.decisionNo || '').toLowerCase().includes(sTerm);
      if (!matchSearch) return false;
    }

    // 2. Category filter
    if (selectedCategory && selectedCategory !== 'all') {
      if (doc.category !== selectedCategory) return false;
    }

    // 3. Status filter (Tình trạng)
    if (selectedStatus && selectedStatus !== 'all') {
      const isExpired = !!(doc.expiryDate || doc.expiryDecision);
      if (selectedStatus === 'active' && isExpired) return false;
      if (selectedStatus === 'expired' && !isExpired) return false;
    }

    // 4. Scope filter (Phạm vi)
    if (selectedScope && selectedScope !== 'all') {
      if (selectedScope === 'internal' && !doc.isInternal) return false;
      if (selectedScope === 'public' && doc.isInternal) return false;
    }

    // 5. Year filter (Năm ban hành)
    if (selectedYear && selectedYear !== 'all') {
      const year = doc.decisionDate ? doc.decisionDate.substring(0, 4) : '';
      if (year !== selectedYear) return false;
    }

    // 6. Selected Tag filter
    if (selectedTag) {
      const tags = doc.tagKey ? doc.tagKey.split(',').map(t => t.trim().toLowerCase()) : [];
      if (!tags.includes(selectedTag.toLowerCase())) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage) || 1;
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Highlights derived directly from selected document y văn (read-only for normal users)
  const highlights = selectedDoc?.highlights || [];

  // Active attachment state and attachments list helper
  const [activeAttachmentIdx, setActiveAttachmentIdx] = useState<number>(0);
  
  const getAttachmentsList = (doc: ClinicalDocument | null) => {
    if (!doc) return [];
    const list: { title: string; url: string; isPdf: boolean }[] = [];
    if (doc.pdfUrl) {
      list.push({
        title: "Tập tin PDF Hướng dẫn điều trị",
        url: doc.pdfUrl,
        isPdf: true
      });
    }
    if (doc.attachedUrls && doc.attachedUrls.length > 0) {
      doc.attachedUrls.forEach((url, uidx) => {
        if (url) {
          list.push({
            title: `Tài liệu kèm theo #${uidx + 1}`,
            url: url,
            isPdf: url.toLowerCase().includes('.pdf') || url.includes('drive.google.com')
          });
        }
      });
    } else if (doc.attachedUrl) {
      list.push({
        title: "Tài liệu kèm theo",
        url: doc.attachedUrl,
        isPdf: doc.attachedUrl.toLowerCase().includes('.pdf') || doc.attachedUrl.includes('drive.google.com')
      });
    }
    return list;
  };

  const attachmentsList = selectedDoc ? getAttachmentsList(selectedDoc) : [];

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'info' | 'highlights' | 'attachments'>('highlights');
  const [mobileTab, setMobileTab] = useState<'pdf' | 'text' | 'highlights' | 'info' | 'attachments'>('pdf');
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

  const handleMobileTabClick = (tab: 'pdf' | 'text' | 'highlights' | 'info' | 'attachments') => {
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
    return formatDrivePreviewUrl(url);
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
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center pb-6 border-b border-slate-200 dark:border-slate-800 w-full mb-1">
              <div className="flex flex-col sm:flex-row gap-3 w-full md:max-w-3xl flex-1">
                <div className="relative flex-1">
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

                <div className="flex gap-2 shrink-0">
                  {/* Toggle Detailed Filters Button */}
                  <button
                    onClick={() => setShowDetailedFilters(!showDetailedFilters)}
                    className={cn(
                      "p-3 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer relative",
                      showDetailedFilters
                        ? "bg-[#8b5cf6] border-[#8b5cf6] text-white shadow-md animate-none"
                        : isDarkMode
                          ? "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
                    )}
                    title="Bộ lọc chi tiết"
                  >
                    <SlidersHorizontal size={14} />
                    {isAnyFilterActive && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white dark:border-slate-950 animate-pulse" />
                    )}
                  </button>

                  {/* Clear Filters Button (Shows only when filters are active) */}
                  {isAnyFilterActive && (
                    <button
                      onClick={handleClearFilters}
                      className={cn(
                        "p-3 rounded-2xl border transition-all text-rose-500 hover:bg-rose-500/10 cursor-pointer",
                        isDarkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white shadow-sm"
                      )}
                      title="Xóa tất cả các bộ lọc"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#8b5cf6] bg-[#8b5cf6]/5 px-3 py-1.5 rounded-xl border border-[#8b5cf6]/10">
                  Kết quả: {filteredDocuments.length}
                </span>
              </div>
            </div>

            {/* Detailed Filters Panel */}
            <AnimatePresence>
              {showDetailedFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mb-4"
                >
                  <div className={cn(
                    "grid grid-cols-1 md:grid-cols-4 gap-4 p-5 mt-4 rounded-2xl border text-xs font-bold",
                    isDarkMode ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/50 border-slate-100 shadow-sm"
                  )}>
                    {/* Filter Category */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Phân loại văn bản</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className={cn(
                          "w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] font-bold text-xs cursor-pointer",
                          isDarkMode ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                        )}
                      >
                        <option value="all">Tất cả phân loại</option>
                        {availableCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Status (Tình trạng) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Tình trạng</label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as any)}
                        className={cn(
                          "w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] font-bold text-xs cursor-pointer",
                          isDarkMode ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                        )}
                      >
                        <option value="all">Tất cả tình trạng</option>
                        <option value="active">Đang hiệu lực</option>
                        <option value="expired">Hết hiệu lực</option>
                      </select>
                    </div>

                    {/* Filter Scope (Phạm vi) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Phạm vi áp dụng</label>
                      <select
                        value={selectedScope}
                        onChange={(e) => setSelectedScope(e.target.value as any)}
                        className={cn(
                          "w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] font-bold text-xs cursor-pointer",
                          isDarkMode ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                        )}
                      >
                        <option value="all">Tất cả phạm vi</option>
                        <option value="public">Công khai / Toàn bộ</option>
                        {canSeeInternalDocs && <option value="internal">Tài liệu nội bộ</option>}
                      </select>
                    </div>

                    {/* Filter Year (Năm ban hành) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Năm ban hành</label>
                      <div className="relative">
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className={cn(
                            "w-full px-3 py-2 pl-8 pr-4 rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] font-bold text-xs appearance-none cursor-pointer",
                            isDarkMode ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                          )}
                        >
                          <option value="all">Tất cả các năm</option>
                          {availableYears.map(yr => (
                            <option key={yr} value={yr}>Năm {yr}</option>
                          ))}
                        </select>
                        <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    {/* Filter Tag list section */}
                    {availableTags.length > 0 && (
                      <div className="col-span-1 md:col-span-4 pt-4 border-t border-slate-200/5 dark:border-slate-800 mt-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2 font-black">Lọc theo từ khóa (Tag):</span>
                        <div className="flex flex-wrap gap-1.5">
                          {availableTags.map((tag) => {
                            const isSelected = selectedTag.toLowerCase() === tag.toLowerCase();
                            return (
                              <button
                                key={tag}
                                onClick={() => setSelectedTag(isSelected ? '' : tag)}
                                className={cn(
                                  "px-2.5 py-1 rounded-xl text-[9px] border font-black uppercase transition-all tracking-wider flex items-center gap-1 cursor-pointer",
                                  isSelected
                                    ? "bg-[#8b5cf6] border-[#8b5cf6] text-white shadow-sm"
                                    : isDarkMode
                                      ? "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400"
                                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-500 shadow-sm"
                                )}
                              >
                                <Tag size={9} />
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Document Index Table - Desktop Only */}
            <div className="hidden md:block overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className={cn(
                    "border-b text-[10px] font-black uppercase tracking-widest text-slate-400",
                    isDarkMode ? "border-slate-800" : "border-slate-100"
                  )}>
                    <th className="pb-3 pl-4 w-[160px]">Phân loại văn bản</th>
                    <th className="pb-3 pl-4 w-[130px]">Số &amp; Ngày QĐ</th>
                    <th className="pb-3 pl-4">Tên văn bản</th>
                    <th className="pb-3 pl-4 w-[220px]">Tag key</th>
                    <th className="pb-3 pl-4 w-[110px]">Tình trạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/5">
                  {isLoadingDocs ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Loader2 size={24} className="text-[#8b5cf6] animate-spin" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Đang tải tài nguyên học thuật...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                        Không tìm thấy tài liệu phù hợp
                      </td>
                    </tr>
                  ) : (
                    paginatedDocuments.map((docItem) => {
                      const badgeColor = getCategoryBadgeColor(docItem.category);
                      const isExpired = !!(docItem.expiryDate || docItem.expiryDecision);

                      return (
                        <tr
                          key={docItem.id}
                          onClick={() => handleLoadDocument(docItem)}
                          className={cn(
                            "group cursor-pointer text-xs font-semibold hover:bg-slate-500/5 transition-all"
                          )}
                        >
                          <td className="py-4 pl-4 whitespace-nowrap font-sans" id="lookup_td_category">
                            <div className="flex flex-col items-start gap-1">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                badgeColor
                              )}>
                                {docItem.category}
                              </span>
                              {docItem.isInternal && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 whitespace-nowrap w-fit">
                                  Nội bộ
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 pl-4 text-slate-400 font-bold whitespace-nowrap">
                            <div className="font-mono text-[13px]">{docItem.decisionNo || "---"}</div>
                            <div className="text-[11px] text-slate-400/70 font-sans mt-0.5 font-semibold">
                              {docItem.decisionDate 
                                ? docItem.decisionDate.split('-').reverse().join('/') 
                                : ""}
                            </div>
                          </td>
                          <td className="py-4 pl-4 max-w-[480px]">
                            <div className={cn(
                              "font-black text-xs group-hover:text-[#8b5cf6] transition-colors leading-snug",
                              isDarkMode ? "text-slate-200" : "text-slate-800"
                            )}>
                              {docItem.title}
                            </div>
                          </td>
                          <td className="py-4 pl-4 max-w-[220px]">
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
                          <td className="py-4 pl-4 whitespace-nowrap">
                            {isExpired ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                Hết hiệu lực
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Đang hiệu lực
                              </span>
                            )}
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
              ) : filteredDocuments.length === 0 ? (
                <div className="py-12 text-center text-xs font-black uppercase tracking-widest text-slate-400">
                  Không tìm thấy tài liệu phù hợp
                </div>
              ) : (
                paginatedDocuments.map((docItem) => {
                  const badgeColor = getCategoryBadgeColor(docItem.category);

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
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={cn(
                            "px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider shrink-0",
                            badgeColor
                          )}>
                            {docItem.category}
                          </span>
                          {docItem.expiryDate || docItem.expiryDecision ? (
                            <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                              Hết hiệu lực
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                              Đang hiệu lực
                            </span>
                          )}
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-slate-200/10 dark:border-slate-800/60 font-sans">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Hiển thị <span className={cn(isDarkMode ? "text-slate-200" : "text-slate-700")}>{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredDocuments.length)}</span> trong tổng số <span className={cn(isDarkMode ? "text-slate-200" : "text-slate-700")}>{filteredDocuments.length}</span> tài liệu
                </span>
                
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  {/* First page button */}
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(1);
                      document.getElementById("view_doc_lookup")?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={cn(
                      "px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase transition-all tracking-wider flex items-center gap-1 cursor-pointer",
                      currentPage === 1
                        ? "opacity-30 cursor-not-allowed bg-transparent border-slate-200 dark:border-slate-850 text-slate-550"
                        : isDarkMode
                          ? "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-350 hover:bg-slate-850"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm"
                    )}
                  >
                    Trang đầu
                  </button>

                  {/* Previous page button */}
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(prev => Math.max(prev - 1, 1));
                      document.getElementById("view_doc_lookup")?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={cn(
                      "p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center",
                      currentPage === 1
                        ? "opacity-30 cursor-not-allowed bg-transparent border-slate-200 dark:border-slate-850 text-slate-550"
                        : isDarkMode
                          ? "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-350 hover:bg-slate-850"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm"
                    )}
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {/* Number page list */}
                  {(() => {
                    const pages: (number | string)[] = [];
                    const maxVisible = 5;
                    if (totalPages <= maxVisible) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      let start = Math.max(2, currentPage - 1);
                      let end = Math.min(totalPages - 1, currentPage + 1);
                      
                      if (currentPage <= 2) {
                        end = 4;
                      }
                      if (currentPage >= totalPages - 1) {
                        start = totalPages - 3;
                      }
                      
                      if (start > 2) pages.push('...');
                      for (let i = start; i <= end; i++) pages.push(i);
                      if (end < totalPages - 1) pages.push('...');
                      pages.push(totalPages);
                    }

                    return pages.map((p, idx) => {
                      if (p === '...') {
                        return (
                          <span key={`dots-${idx}`} className="px-2 text-slate-400 font-extrabold text-xs select-none">
                            ...
                          </span>
                        );
                      }
                      const isSelected = p === currentPage;
                      return (
                        <button
                          key={`page-${p}`}
                          type="button"
                          onClick={() => {
                            setCurrentPage(p as number);
                            document.getElementById("view_doc_lookup")?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={cn(
                            "w-8 h-8 rounded-xl text-xs font-black transition-all flex items-center justify-center cursor-pointer",
                            isSelected
                              ? "bg-[#8b5cf6] text-white font-black shadow-md shadow-violet-500/10"
                              : isDarkMode
                                ? "bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-350 hover:bg-slate-850"
                                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm"
                          )}
                        >
                          {p}
                        </button>
                      );
                    });
                  })()}

                  {/* Next page button */}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(prev => Math.min(prev + 1, totalPages));
                      document.getElementById("view_doc_lookup")?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={cn(
                      "p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center",
                      currentPage === totalPages
                        ? "opacity-30 cursor-not-allowed bg-transparent border-slate-200 dark:border-slate-850 text-slate-550"
                        : isDarkMode
                          ? "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-350 hover:bg-slate-850"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm"
                    )}
                  >
                    <ChevronRight size={14} />
                  </button>

                  {/* Last page button */}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(totalPages);
                      document.getElementById("view_doc_lookup")?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={cn(
                      "px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase transition-all tracking-wider flex items-center gap-1 cursor-pointer",
                      currentPage === totalPages
                        ? "opacity-30 cursor-not-allowed bg-transparent border-slate-200 dark:border-slate-850 text-slate-550"
                        : isDarkMode
                          ? "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-350 hover:bg-slate-850"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm"
                    )}
                  >
                    Trang cuối
                  </button>
                </div>
              </div>
            )}
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
                {(selectedDoc.expiryDate || selectedDoc.expiryDecision) && (
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500/15 border border-rose-500/20 text-rose-500 whitespace-nowrap">
                      HẾT HIỆU LỰC: {selectedDoc.expiryDate ? selectedDoc.expiryDate.split('-').reverse().join('/') : ""} {selectedDoc.expiryDecision ? `(${selectedDoc.expiryDecision})` : ""}
                    </span>
                    <div className="w-1 h-3 bg-slate-350 dark:bg-slate-800 rounded-full hidden sm:block" />
                  </div>
                )}
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
              <button
                onClick={() => handleMobileTabClick('attachments')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer inline-flex shrink-0",
                  mobileTab === 'attachments'
                    ? "bg-[#8b5cf6] text-white shadow font-extrabold font-sans"
                    : isDarkMode 
                      ? "text-slate-400 hover:text-slate-200" 
                      : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Link2 size={11} />
                Tài liệu kèm
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
                {(selectedDoc.pdfUrl || selectedDoc.attachedUrl || (selectedDoc.attachedUrls && selectedDoc.attachedUrls.length > 0)) && (
                  <div className={cn(
                    "p-4 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all-custom",
                    isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-lg shadow-slate-200/20",
                    viewMode === 'text' ? "hidden lg:flex" : "flex"
                  )}>
                    {/* Desktop view switcher (two tabs) */}
                    {selectedDoc.pdfUrl && (
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
                    )}
  
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                      {selectedDoc.pdfUrl && (
                        <a
                          href={formatDrivePreviewUrl(selectedDoc.pdfUrl)}
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
                          Mở PDF ↗
                        </a>
                      )}
                    </div>
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
                    <Markdown remarkPlugins={[remarkGfm]}>{selectedDoc.text}</Markdown>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar highlights workspace notes */}
            <div className={cn(
              "lg:col-span-5 xl:col-span-5 space-y-4",
              (mobileTab === 'highlights' || mobileTab === 'info' || mobileTab === 'attachments') ? "block" : "hidden lg:block"
            )}>
              <div className={cn(
                "p-4 sm:p-5 rounded-3xl border flex flex-col transition-all",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/40"
              )}
              style={{ height: (window.innerWidth < 1024) ? 'auto' : `${viewerHeight}px` }}>
                {/* Header Tabs switcher (desktop split view only) */}
                <div className="hidden lg:flex border-b border-slate-200/20 shrink-0">
                  {(['highlights', 'info', 'attachments'] as const).map((tab) => {
                    const isLocked = tab === 'highlights' && !canSeeHighlights;
                    const labelSet = {
                      highlights: "Điểm nhấn (" + (isLocked ? "🔒" : highlights.length) + ")",
                      info: "Thông tin",
                      attachments: "Tài liệu kèm theo"
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

                    {activeTab === 'attachments' && (
                      <motion.div
                        key="attachments-tab"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4 text-left"
                      >
                        {/* Primary PDF Guideline with External Link (No preview iframe) */}
                        <div className={cn(
                          "p-5 rounded-2xl border transition-all",
                          isDarkMode ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-200"
                        )}>
                          <div className="flex items-center gap-1.5 mb-3">
                            <FileText size={14} className="text-amber-500" />
                            <h4 className="font-extrabold text-[11px] text-[#8b5cf6] uppercase tracking-widest">
                              Liên kết tập tin ngoài
                            </h4>
                          </div>

                          {selectedDoc.pdfUrl ? (
                            <div className="space-y-4">
                              <p className={cn("text-[10px] font-semibold leading-relaxed", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Vui lòng nhấn vào tập tin dưới đây để mở file.
                              </p>
                              
                              <a
                                href={formatDriveViewUrl(selectedDoc.pdfUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "w-full flex items-center justify-between p-3.5 rounded-xl border transition-all active:scale-[0.99] hover:shadow-md",
                                  isDarkMode 
                                    ? "bg-slate-900 border-slate-800 hover:border-amber-500/30 hover:bg-slate-900/80 group text-slate-200" 
                                    : "bg-white border-slate-200 hover:border-amber-500/20 shadow-sm shadow-slate-100 group text-slate-800"
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform duration-200">
                                    <FileText size={15} />
                                  </div>
                                  <div className="min-w-0 text-left">
                                    <p className="text-[10px] font-black uppercase tracking-wider">Tập tin đang xem</p>
                                    <p className="text-[9px] text-slate-400 font-mono truncate max-w-[280px] sm:max-w-md" title={selectedDoc.pdfUrl}>
                                      {selectedDoc.pdfUrl}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider transition-colors hover:bg-amber-600 ml-2 whitespace-nowrap">
                                  Mở liên kết ↗
                                </div>
                              </a>
                            </div>
                          ) : (
                            <p className="text-[10px] font-semibold text-slate-500 italic">
                              Tài liệu này hiện không đính kèm tệp PDF hướng dẫn gốc.
                            </p>
                          )}
                        </div>

                        {/* Other attachments / links without visual previews */}
                        <div className={cn(
                          "p-4 rounded-2xl border",
                          isDarkMode ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-200"
                        )}>
                          <div className="flex items-center gap-1.5 mb-3">
                            <Link2 size={13} className="text-emerald-500" />
                            <h4 className="font-extrabold text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                              Tài liệu kèm theo khác
                            </h4>
                          </div>

                          {(() => {
                            const otherLinks = Array.from(new Set([
                              ...(selectedDoc.attachedUrls || []),
                              selectedDoc.attachedUrl
                            ].map(u => u?.trim()).filter(Boolean)))
                             .filter(url => url !== selectedDoc.pdfUrl);

                            if (otherLinks.length === 0) {
                              return (
                                <p className="text-[10px] font-semibold text-slate-500 italic">
                                  Không có tài liệu hoặc liên kết kèm theo nào khác.
                                </p>
                              );
                            }

                            return (
                              <div className="space-y-2">
                                {otherLinks.map((url, idx) => {
                                  // Determine the file type classification info and custom title
                                  let typeKey = '';
                                  let customTitle = '';
                                  if (selectedDoc.attachedUrls) {
                                    const origIdx = selectedDoc.attachedUrls.indexOf(url);
                                    if (origIdx !== -1) {
                                      if (selectedDoc.attachedTypes && selectedDoc.attachedTypes[origIdx]) {
                                        typeKey = selectedDoc.attachedTypes[origIdx];
                                      }
                                      if (selectedDoc.attachedTitles && selectedDoc.attachedTitles[origIdx]) {
                                        customTitle = selectedDoc.attachedTitles[origIdx];
                                      }
                                    }
                                  }

                                  if (!typeKey) {
                                    const lowercase = url.toLowerCase().split('?')[0];
                                    if (lowercase.endsWith('.pdf')) typeKey = 'pdf';
                                    else if (lowercase.endsWith('.doc') || lowercase.endsWith('.docx')) typeKey = 'docx';
                                    else if (lowercase.endsWith('.xls') || lowercase.endsWith('.xlsx')) typeKey = 'xlsx';
                                    else if (lowercase.endsWith('.ppt') || lowercase.endsWith('.pptx')) typeKey = 'pptx';
                                    else if (lowercase.endsWith('.png') || lowercase.endsWith('.jpg') || lowercase.endsWith('.jpeg') || lowercase.endsWith('.gif') || lowercase.endsWith('.webp') || lowercase.endsWith('.svg')) typeKey = 'image';
                                    else if (lowercase.includes('drive.google.com') || lowercase.includes('docs.google.com')) typeKey = 'drive';
                                    else typeKey = 'website';
                                  }

                                  let typeLabel = 'Liên kết Website';
                                  let typeColorClass = 'bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/20 dark:bg-[#8b5cf6]/5';
                                  let typeBadge = 'LINK';

                                  if (typeKey === 'pdf') {
                                    typeLabel = 'Tài liệu PDF';
                                    typeColorClass = 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/5';
                                    typeBadge = 'PDF';
                                  } else if (typeKey === 'docx') {
                                    typeLabel = 'Văn bản Word';
                                    typeColorClass = 'bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-500/5';
                                    typeBadge = 'DOCX';
                                  } else if (typeKey === 'xlsx') {
                                    typeLabel = 'Bảng tính Excel';
                                    typeColorClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/5';
                                    typeBadge = 'EXCEL';
                                  } else if (typeKey === 'pptx') {
                                    typeLabel = 'Trình chiếu PowerPoint';
                                    typeColorClass = 'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/5';
                                    typeBadge = 'PPT';
                                  } else if (typeKey === 'image') {
                                    typeLabel = 'Tệp hình ảnh';
                                    typeColorClass = 'bg-teal-500/10 text-teal-500 border-teal-500/20 dark:bg-teal-500/5';
                                    typeBadge = 'IMAGE';
                                  } else if (typeKey === 'drive') {
                                    typeLabel = 'Google Drive / Docs';
                                    typeColorClass = 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 dark:bg-yellow-500/5';
                                    typeBadge = 'DRIVE';
                                  }

                                  return (
                                    <div 
                                      key={idx} 
                                      className={cn(
                                        "p-3 rounded-xl border transition-all duration-200",
                                        isDarkMode 
                                          ? "border-slate-850 bg-slate-900/50 hover:border-[#8b5cf6]/20" 
                                          : "border-slate-200/50 bg-white hover:border-[#8b5cf6]/10 shadow-sm"
                                      )}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 w-full min-w-0">
                                          <div className={cn(
                                            "p-1.5 rounded-lg shrink-0 border",
                                            typeColorClass
                                          )}>
                                            {typeKey === 'pdf' || typeKey === 'docx' || typeKey === 'drive' ? <FileText size={12} /> : <Link2 size={12} />}
                                          </div>
                                          <div className="min-w-0 text-left">
                                            <div className="flex items-center gap-2">
                                              <p className={cn("text-[10px] font-black uppercase tracking-wider", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                                                {customTitle ? customTitle : `Tài liệu kèm theo #${idx + 1}`}
                                              </p>
                                              <span className={cn(
                                                "px-1 py-0.2 rounded text-[7px] font-black tracking-widest border shrink-0",
                                                typeColorClass
                                              )}>
                                                {typeBadge}
                                              </span>
                                            </div>
                                            <p className={cn("text-[9px] font-bold mt-0.5", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                              Phân loại: {typeLabel}
                                            </p>
                                            <p className="text-[9px] text-slate-400/80 font-mono truncate max-w-[200px] sm:max-w-lg mt-0.5" title={url}>
                                              {url}
                                            </p>
                                          </div>
                                        </div>
                                        <a
                                          href={formatDriveViewUrl(url)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 text-[#8b5cf6] text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ml-2"
                                        >
                                          Mở liên kết ↗
                                        </a>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
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
