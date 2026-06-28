import React, { useState, useEffect } from 'react';
import { 
  FileText, Sparkles, Search, Trash2, Plus, Loader2, Edit3,
  CheckCircle, AlertCircle, ExternalLink, BookOpen, 
  RotateCcw, ChevronRight, Check, FileSearch, Upload, ArrowLeft, RefreshCw,
  X, Copy, Printer, Layers, MoreVertical, Eye, EyeOff, ArrowUp, ArrowDown, Link2,
  LayoutGrid, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';
import { db, collection, setDoc, deleteDoc, doc, onSnapshot, query, orderBy } from '../firebase';
import { SAMPLE_DOCUMENTS, ClinicalDocument } from '../lib/sampleDocs';
import ConfirmModal from './ConfirmModal';

const FILE_TYPE_OPTIONS = [
  { value: 'pdf', label: 'PDF (.pdf)' },
  { value: 'docx', label: 'Word (.doc, .docx)' },
  { value: 'xlsx', label: 'Excel (.xls, .xlsx)' },
  { value: 'pptx', label: 'PowerPoint (.ppt, .pptx)' },
  { value: 'image', label: 'Hình ảnh (JPEG, PNG...)' },
  { value: 'drive', label: 'Google Drive / Docs' },
  { value: 'website', label: 'Website / Link khác' },
];

const detectFileTypeFromUrl = (url: string): string => {
  if (!url) return 'website';
  const lowercase = url.toLowerCase().split('?')[0];
  if (lowercase.endsWith('.pdf')) return 'pdf';
  if (lowercase.endsWith('.doc') || lowercase.endsWith('.docx')) return 'docx';
  if (lowercase.endsWith('.xls') || lowercase.endsWith('.xlsx')) return 'xlsx';
  if (lowercase.endsWith('.ppt') || lowercase.endsWith('.pptx')) return 'pptx';
  if (lowercase.endsWith('.png') || lowercase.endsWith('.jpg') || lowercase.endsWith('.jpeg') || lowercase.endsWith('.gif') || lowercase.endsWith('.webp') || lowercase.endsWith('.svg')) return 'image';
  if (lowercase.includes('drive.google.com') || lowercase.includes('docs.google.com')) return 'drive';
  return 'website';
};

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

interface DocCategory {
  id: string;
  name: string;
}

interface DocumentManagementProps {
  isDarkMode: boolean;
  currentUserUid: string;
  currentUserName: string;
  onNavigateToTab?: (tab: string) => void;
}

export default function DocumentManagement({ 
  isDarkMode, 
  currentUserUid, 
  currentUserName,
  onNavigateToTab
}: DocumentManagementProps) {
  // DB & State
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<ClinicalDocument | null>(null);
  const [activeMenuDocId, setActiveMenuDocId] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Custom Delete Confirm State
  const [deleteConfirmData, setDeleteConfirmData] = useState<{
    type: 'category' | 'document';
    id: string;
    name: string;
    message: string;
  } | null>(null);
  
  // Create / Edit Form State
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingDoc, setEditingDoc] = useState<ClinicalDocument | null>(null);
  const [docTitle, setDocTitle] = useState<string>('');
  const [docCategory, setDocCategory] = useState<string>('Phác đồ điều trị');
  const [docText, setDocText] = useState<string>('');
  const [docPdfUrl, setDocPdfUrl] = useState<string>('');
  const [docAttachedUrl, setDocAttachedUrl] = useState<string>('');
  const [docAttachedUrls, setDocAttachedUrls] = useState<string[]>(['']);
  const [docAttachedTypes, setDocAttachedTypes] = useState<string[]>(['']);
  const [docAttachedTitles, setDocAttachedTitles] = useState<string[]>(['']);
  const [docTagKey, setDocTagKey] = useState<string>('');
  const [docDecisionNo, setDocDecisionNo] = useState<string>('');
  const [docDecisionDate, setDocDecisionDate] = useState<string>('');
  const [docParentOrg, setDocParentOrg] = useState<string>('');
  const [docIssuingOrg, setDocIssuingOrg] = useState<string>('');
  const [docIssuingLocation, setDocIssuingLocation] = useState<string>('');
  const [docAddressedTo, setDocAddressedTo] = useState<string>('');
  const [docRecipients, setDocRecipients] = useState<string>('');
  const [docDocType, setDocDocType] = useState<string>('Quyết định');
  const [docSigner, setDocSigner] = useState<string>('');
  const [docIsInternal, setDocIsInternal] = useState<boolean>(false);
  const [docExpiryDate, setDocExpiryDate] = useState<string>('');
  const [docExpiryDecision, setDocExpiryDecision] = useState<string>('');
  const [docTitleItalic, setDocTitleItalic] = useState<boolean>(true);
  const [docHighlights, setDocHighlights] = useState<any[]>([]);
  const [newHlText, setNewHlText] = useState<string>('');
  const [newHlColor, setNewHlColor] = useState<'green' | 'red' | 'orange' | 'blue'>('green');
  const [newHlCategory, setNewHlCategory] = useState<string>('Chỉ định');
  const [newHlNote, setNewHlNote] = useState<string>('');
  const [editingHighlightId, setEditingHighlightId] = useState<string | null>(null);
  
  // Custom Import tool states
  const [importTab, setImportTab] = useState<'upload' | 'url' | 'paste'>('upload');
  const [urlInput, setUrlInput] = useState<string>('');
  const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false);
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  
  // AI Helper states
  const [isAIOptimizing, setIsAIOptimizing] = useState<boolean>(false);
  const [isAIExtracting, setIsAIExtracting] = useState<boolean>(false);
  const [activeTypingField, setActiveTypingField] = useState<string | null>(null);
  const [aiAnalysisLog, setAiAnalysisLog] = useState<string>('');
  const [pendingExtractionText, setPendingExtractionText] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  
  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // View state (List or Grid)
  const [docsViewMode, setDocsViewMode] = useState<'grid' | 'list'>('grid');

  // Dynamic libraries load states (mammoth, pdfjs)
  useEffect(() => {
    const loadLibrary = (id: string, url: string): Promise<void> => {
      return new Promise((resolve) => {
        if (document.getElementById(id)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.id = id;
        script.src = url;
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.body.appendChild(script);
      });
    };

    const loadLibraries = async () => {
      try {
        await loadLibrary('mammoth-script', 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
        await loadLibrary('pdfjs-script', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js');
        if ((window as any).pdfjsLib) {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        }
      } catch (e) {
        console.warn("Could not prefetch document extraction helper scripts.", e);
      }
    };

    loadLibraries();
  }, []);

  // Fetch Documents
  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'y_khoa_documents'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsList: ClinicalDocument[] = [];
      snapshot.forEach(docSnap => {
        docsList.push({
          id: docSnap.id,
          ...docSnap.data()
        } as ClinicalDocument);
      });
      setDocuments(docsList);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore loading error:", error);
      setErrorMsg("Không thể đồng bộ danh mục từ máy chủ.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch / Sync Categories from Firestore
  useEffect(() => {
    const q = query(collection(db, 'y_khoa_categories'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial categories if DB is empty
        const defaultCats = [
          'Phác đồ điều trị',
          'Dược lý học',
          'Văn bản chỉ đạo',
          'Dược thư quốc gia',
          'Nghiên cứu học thuật',
          'Thông tin thuốc'
        ];
        
        for (const catName of defaultCats) {
          try {
            const slug = catName.trim().replace(/\s+/g, '_').toLowerCase();
            const catDocId = 'cat_' + slug;
            await setDoc(doc(db, 'y_khoa_categories', catDocId), {
              id: catDocId,
              name: catName,
              createdAt: new Date().toISOString()
            });
          } catch (e) {
            console.error("Error seeding default category:", catName, e);
          }
        }
      } else {
        const catsList: DocCategory[] = [];
        snapshot.forEach(catSnap => {
          const data = catSnap.data();
          if (data && data.name) {
            catsList.push({
              id: catSnap.id,
              name: data.name
            });
          }
        });
        
        catsList.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        setCategories(catsList);
      }
    }, (error) => {
      console.error("Firestore loading categories error:", error);
    });

    return () => unsubscribe();
  }, []);

  // Check for redirected edit document on mount / documents loaded
  useEffect(() => {
    if (!isLoading) {
      const editDocId = localStorage.getItem('editDocId');
      if (editDocId) {
        // Look in database documents first
        let found = documents.find(d => d.id === editDocId);
        // If not found in DB, look in SAMPLE_DOCUMENTS
        if (!found) {
          found = SAMPLE_DOCUMENTS.find(d => d.id === editDocId);
        }
        if (found) {
          handleEditInit(found);
        }
        localStorage.removeItem('editDocId');
      }
    }
  }, [documents, isLoading]);

  // Filter categories helper
  const uniqueCategories = Array.from(new Set(
    [...documents.map(d => d.category), ...SAMPLE_DOCUMENTS.map(d => d.category)]
  ));

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const showNotification = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4500);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // URL extraction proxy endpoint trigger
  const handleFetchUrl = async () => {
    if (!urlInput || !urlInput.trim()) return;
    setIsFetchingUrl(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/document/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Lỗi phản hồi từ trang web đích.");
      }
      const data = await response.json();
      if (data.text) {
        const titleFromUrl = urlInput.trim().replace(/https?:\/\/(www\.)?/, '').substring(0, 50) + "...";
        setDocTitle(titleFromUrl);
        setDocText(data.text);
        setPendingExtractionText(data.text);
        setPendingFileName("Liên kết: " + urlInput);
        showNotification('success', "Đã trích xuất văn bản liên kết thành công!");
      } else {
        throw new Error("Trang web trả về văn bản trống rỗng.");
      }
    } catch (e: any) {
      showNotification('error', e.message || "Không thể tải từ URL.");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Drag and drop processing
  const processUploadedFile = (file: File) => {
    if (!file) return;
    setIsParsingFile(true);
    setErrorMsg(null);

    const fileReader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'txt') {
      fileReader.onload = (e) => {
        const text = e.target?.result as string;
        setDocText(text);
        setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
        setPendingExtractionText(text);
        setPendingFileName(file.name);
        setIsParsingFile(false);
        showNotification('success', "Trích xuất văn bản .txt thành công!");
      };
      fileReader.readAsText(file);
    } 
    else if (extension === 'docx') {
      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!(window as any).mammoth) {
            throw new Error("Thư viện Word chưa sẵn sàng, vui lòng đợi thêm giây lát.");
          }
          const result = await (window as any).mammoth.extractRawText({ arrayBuffer });
          if (result && result.value) {
            setDocText(result.value);
            setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
            setPendingExtractionText(result.value);
            setPendingFileName(file.name);
            showNotification('success', "Đọc tệp tin Word (.docx) thành công!");
          } else {
            throw new Error("Văn bản Word rỗng hoặc mã hóa.");
          }
        } catch (err: any) {
          showNotification('error', err.message || "Lỗi cấu trúc tệp Word.");
        } finally {
          setIsParsingFile(false);
        }
      };
      fileReader.readAsArrayBuffer(file);
    } 
    else if (extension === 'pdf') {
      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const pdfjsLib = (window as any).pdfjsLib;
          if (!pdfjsLib) {
            throw new Error("Thư viện PDFJS chưa sẵn sàng, vui lòng thử lại.");
          }
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          let textBuilder = '';
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            textBuilder += pageText + '\n';
          }

          if (textBuilder.trim()) {
            setDocText(textBuilder);
            setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
            setPendingExtractionText(textBuilder);
            setPendingFileName(file.name);
            showNotification('success', "Đọc văn bản PDF thành công!");
          } else {
            throw new Error("Tệp PDF này không chứa văn bản (có thể là dạng scan ảnh).");
          }
        } catch (err: any) {
          showNotification('error', err.message || "Lỗi đọc tài liệu PDF.");
        } finally {
          setIsParsingFile(false);
        }
      };
      fileReader.readAsArrayBuffer(file);
    } 
    else {
      showNotification('error', "Định dạng tệp không được hỗ trợ (chỉ nhận .txt, .pdf, .docx).");
      setIsParsingFile(false);
    }
  };

  // AI Formatting and Summarization assistant
  const handleAIOptimize = async () => {
    let extractedText = "";
    
    setIsAIOptimizing(true);
    try {
      // 1. Check if there is a PDF link or external URL to read
      if (docPdfUrl && docPdfUrl.trim()) {
        const url = docPdfUrl.trim();
        showNotification('success', "Đang tải tệp/liên kết từ xa để AI phân tích...");
        
        const isPdf = url.toLowerCase().includes('.pdf') || url.includes('drive.google.com');
        
        if (isPdf) {
          // Fetch binary as base64
          const response = await fetch('/api/document/fetch-binary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Không thể tải tệp PDF từ đường dẫn.");
          }
          const data = await response.json();
          if (data.base64) {
            const pdfjsLib = (window as any).pdfjsLib;
            if (!pdfjsLib) {
              throw new Error("Trình đọc PDF tích hợp chưa tải xong, vui lòng thử lại sau vài giây.");
            }
            
            // Convert base64 to Uint8Array
            const binaryString = atob(data.base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Read PDF paragraphs
            const loadingTask = pdfjsLib.getDocument({ data: bytes.buffer });
            const pdf = await loadingTask.promise;
            let textBuilder = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(' ');
              textBuilder += pageText + '\n';
            }
            extractedText = textBuilder;
          } else {
            throw new Error("Dữ liệu tệp nhị phân trả về rỗng.");
          }
        } else {
          // Normal webpage crawler
          const response = await fetch('/api/document/fetch-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Không thể nạp nội dung trang web.");
          }
          const data = await response.json();
          extractedText = data.text || "";
        }
      } else {
        // Fallback to text area if no link provided
        extractedText = docText;
      }

      if (!extractedText || extractedText.trim().length < 30) {
        throw new Error("Nội dung tài liệu/liên kết quá ngắn hoặc trống để AI có thể tóm tắt.");
      }

      showNotification('success', "Đã nạp văn bản! Đang tiến hành tạo tóm tắt chuyên sâu bằng AI...");

      const prompt = `Bạn là Trợ lý biên tập văn bản lâm sàng chuyên nghiệp và chuyên gia y tế của Bộ Y Tế.
Vui lòng đọc chuỗi văn bản hướng dẫn/phác đồ y khoa sau đây và viết một bản tóm tắt nội dung y khoa chất lượng cao bằng Tiếng Việt dưới định dạng Markdown sạch sẽ.

Yêu cầu tóm tắt:
1. Đặt Tiêu đề chính trang nghiêm viết hoa, mô tả ngắn gọn nội dung tài liệu.
2. Mục đích cốt lõi, đối tượng thụ hưởng và phạm vi áp dụng.
3. Tóm tắt kỹ lưỡng phác đồ điều trị, phác đồ dùng thuốc, các liều dùng chính, các triệu chứng hoặc cảnh báo lâm sàng đặc biệt quan trọng (nếu có).
4. Phân tách danh mục rõ ràng (sử dụng 1., 2., 3., gạch đầu dòng) để bác sĩ và dược sĩ dễ tra cứu nhanh.

Văn bản gốc:
"${extractedText.substring(0, 15000)}"`;

      const { generateGeminiContent } = await import("../lib/gemini");
      const text = await generateGeminiContent(
        'gemini-3.5-flash',
        [{ parts: [{ text: prompt }] }],
        { temperature: 0.25 }
      );

      if (text) {
        setDocText(text);
        showNotification('success', "AI đã đọc nội dung tài liệu và tạo tóm tắt thành công!");
      } else {
        throw new Error("Không thể tạo tóm tắt tự động từ dữ liệu.");
      }
    } catch (e: any) {
      showNotification('error', e.message || "Gặp lỗi khi xử lý định dạng AI.");
    } finally {
      setIsAIOptimizing(false);
    }
  };

  // Helper for typing animation for inputs
  const typeText = (setter: (v: string) => void, finalVal: string) => {
    return new Promise<void>((resolve) => {
      if (!finalVal) {
        setter('');
        resolve();
        return;
      }
      let current = '';
      let i = 0;
      // Stagger speed based on string length to avoid taking too long
      const step = finalVal.length > 300 ? 12 : finalVal.length > 100 ? 5 : finalVal.length > 50 ? 3 : 1;
      const interval = setInterval(() => {
        if (i >= finalVal.length) {
          setter(finalVal);
          clearInterval(interval);
          resolve();
        } else {
          current += finalVal.substring(i, i + step);
          setter(current);
          i += step;
        }
      }, 15);
    });
  };

  const getFieldLabel = (key: string) => {
    switch (key) {
      case 'title': return 'Tiêu đề tài liệu';
      case 'category': return 'Nhóm phân loại';
      case 'tagKey': return 'Từ khóa';
      case 'decisionNo': return 'Số quyết định';
      case 'decisionDate': return 'Ngày ban hành';
      case 'parentOrg': return 'Cơ quan chủ quản';
      case 'issuingOrg': return 'Đơn vị ban hành';
      case 'issuingLocation': return 'Địa danh ban hành';
      case 'docType': return 'Phân loại văn bản';
      case 'signer': return 'Người ký tên';
      case 'expiryDecision': return 'Quyết định thay thế';
      case 'expiryDate': return 'Ngày hết hiệu lực';
      case 'text': return 'Nội dung tóm tắt y đức';
      default: return '';
    }
  };

  // Structured AI Extract and Form Filler
  const handleAIExtractFields = async (textToExtract?: string) => {
    const rawText = textToExtract || pendingExtractionText || docText;
    if (!rawText || rawText.trim().length < 30) {
      showNotification('error', "Nội dung văn bản quá ngắn để có thể trích xuất cấu trúc!");
      return;
    }

    setIsAIExtracting(true);
    setAiAnalysisLog("🔍 Đang đọc hiểu hệ thống văn bản và cấu trúc lâm sàng...");
    
    try {
      // Step tracker logs
      const logSteps = [
        "🔍 Đang phân tích toàn văn hướng dẫn điều trị y khoa...",
        "📊 Đang bóc tách thuộc tính hành chính (Cơ quan chủ quản, Ngày QĐ, Người ký...)...",
        "🎯 Đang tìm kiếm các Điểm nhấn y văn cốt lõi (liều dùng, chống chỉ định, lưu ý...)...",
        "✍ " + "Đang định dạng dữ liệu & chuẩn bị kết xuất JSON..."
      ];
      
      let logIndex = 0;
      const logTimer = setInterval(() => {
        if (logIndex < logSteps.length - 1) {
          logIndex++;
          setAiAnalysisLog(logSteps[logIndex]);
        }
      }, 2000);

      const prompt = `Bạn là Trợ lý số hóa văn bản y tế chuyên nghiệp của Bộ Y Tế.
Hãy đọc kỹ văn bản lâm sàng sau đây và phân tích, trích xuất tất cả các thông tin hành chính cốt lõi và các Điểm nhấn y văn lâm sàng (các cảnh báo đặc biệt, liều dùng, chỉ định hoặc tương tác quan trọng).

Nghiêm cấm viết lời mở đầu, giải thích hay lời kết. Chỉ trả về một đối tượng JSON phẳng nguyên mẫu có định cấu trúc chuẩn hóa như sau:

{
  "title": "QUY TRÌNH HƯỚNG DẪN CHẨN ĐOÁN VÀ ĐIỀU TRỊ...",
  "category": "Nhóm phân loại khớp nhất với văn bản này (Ví dụ: Phác đồ điều trị, Dược lý học, Văn bản chỉ đạo, Dược thư quốc gia, Nghiên cứu học thuật, Thông tin thuốc)",
  "tagKey": "Một vài từ khóa hoặc tag chính cách nhau bằng dấu phẩy, ví dụ: Sốt xuất huyết, Cấp cứu, Truyền dịch",
  "decisionNo": "Số Quyết Định hoặc Thông Tư nếu có (Ví dụ: 4815/QĐ-BYT). Nếu không thấy ghi số QĐ hãy điền là 'Chưa rõ'",
  "decisionDate": "Ngày ban hành định dạng YYYY-MM-DD (Ví dụ: 2023-12-30). Nếu không tìm thấy, hãy để rỗng ''",
  "expiryDecision": "Số quyết định mà văn bản này thay thế/ bãi bỏ nếu có ghi trong văn bản, hoặc rỗng ''",
  "expiryDate": "Ngày hết hiệu lực định dạng YYYY-MM-DD nếu có đề cập, hoặc rỗng ''",
  "parentOrg": "Cơ quan trực thuộc chủ quản viết hoa, ví dụ: BỘ Y TẾ",
  "issuingOrg": "Đơn vị ban hành viết hoa, ví dụ: CỤC QUẢN LÝ KHÁM CHỮA BỆNH",
  "issuingLocation": "Địa danh ban hành, ví dụ: Hà Nội",
  "docType": "Một trong các chuỗi chính xác sau đây: 'Quyết định' | 'Thông tư' | 'Công văn' | 'Chỉ thị' | 'Hướng dẫn điều trị' | 'Khác'",
  "signer": "Phần chức danh và họ tên người ký, ví dụ: Thứ trưởng Trần Văn Thuấn",
  "summary": "Bản tóm tắt y văn hoàn hảo bằng ngôn ngữ markdown chính xác (khoảng 300-500 từ), nêu bật ý nghĩa chuyên môn, quy chế điều trị hoặc phác đồ cốt lõi",
  "highlights": [
    {
      "text": "Câu trích dẫn chính xác nguyên văn 1 phân đoạn y bạ quan trọng (chỉ định/liều dùng/lưu ý) từ văn bản gốc",
      "category": "Chọn một: 'Chỉ định' | 'Chống chỉ định' | 'Liều lượng' | 'Cảnh báo' | 'Chẩn đoán'",
      "color": "Chọn tương ứng: 'green' cho Chỉ định/Điều trị, 'red' cho Chống chỉ định, 'orange' cho Cảnh báo, 'blue' cho Liều lượng",
      "note": "Phân tích y đức bổ sung ngắn gọn cho bác sĩ hiểu cách áp dụng điểm nhấn này"
    }
  ]
}

Bảo đảm định dạng JSON là tuyệt đối hợp lệ và không bị lỗi cú pháp.
Văn bản gốc:
"${rawText.substring(0, 15000)}"`;

      const { generateGeminiContent } = await import("../lib/gemini");
      const text = await generateGeminiContent(
        'gemini-3.5-flash',
        [{ parts: [{ text: prompt }] }],
        { responseMimeType: 'application/json', temperature: 0.15 }
      );

      clearInterval(logTimer);

      if (!text) throw new Error("AI không thể chiết xuất thông tin. Hãy kiểm tra văn bản.");

      let parsedData;
      try {
        let cleanText = text.trim();
        if (cleanText.includes('```')) {
          const match = cleanText.match(/```(?:json)?([\s\S]*?)```/);
          if (match && match[1]) cleanText = match[1].trim();
        }
        
        // Helper function for extremely robust parsing
        const robustParse = (str: string): any => {
          let textToParse = str.trim();
          
          // Try direct parse first
          try {
            return JSON.parse(textToParse);
          } catch (_) {}

          // If there are extra closing braces at the end (e.g. }}), try stripping them one by one
          while (textToParse.endsWith('}') && textToParse.length > 2) {
            try {
              return JSON.parse(textToParse);
            } catch (_) {
              // Try removing the last character if it is a closing brace
              textToParse = textToParse.slice(0, -1).trim();
            }
          }

          // Reset and try another robust method: finding the outer boundaries of { ... }
          textToParse = str.trim();
          const firstBrace = textToParse.indexOf('{');
          if (firstBrace !== -1) {
            // Find corresponding brace or try sub-strings ending on last '}'
            let lastBrace = textToParse.lastIndexOf('}');
            while (lastBrace > firstBrace) {
              try {
                const subStr = textToParse.substring(firstBrace, lastBrace + 1);
                return JSON.parse(subStr);
              } catch (_) {
                lastBrace = textToParse.lastIndexOf('}', lastBrace - 1);
              }
            }
          }

          // If standard attempts failed, do stack-based recovery like in DrugDirectory
          textToParse = str.trim();
          let fixed = textToParse;
          const stack: string[] = [];
          let inString = false;
          let escaped = false;

          for (let i = 0; i < fixed.length; i++) {
            const char = fixed[i];
            if (escaped) {
              escaped = false;
              continue;
            }
            if (char === "\\") {
              escaped = true;
              continue;
            }
            if (char === '"') {
              inString = !inString;
              continue;
            }
            if (!inString) {
              if (char === "{") stack.push("}");
              else if (char === "[") stack.push("]");
              else if (char === "}" || char === "]") {
                if (stack.length > 0 && stack[stack.length - 1] === char) {
                  stack.pop();
                }
              }
            }
          }

          if (inString) fixed += '"';
          while (stack.length > 0) {
            fixed += stack.pop();
          }

          return JSON.parse(fixed);
        };

        parsedData = robustParse(cleanText);
      } catch (err) {
        console.error("Parse JSON failed on content:", text, err);
        throw new Error("Không thể diễn giải cấu trúc JSON trả về từ AI. Vui lòng thử lại!");
      }

      setAiAnalysisLog("⚡ Đang bắt đầu khôi phục và tự động nhập liệu trực quan...");
      
      // Clear pending state banner since we are executing it
      setPendingExtractionText(null);
      setPendingFileName(null);

      // Simulation start
      const fieldsToType = [
        { key: 'title', value: parsedData.title, setter: setDocTitle },
        { key: 'category', value: parsedData.category, setter: setDocCategory, isSelect: true },
        { key: 'tagKey', value: parsedData.tagKey, setter: setDocTagKey },
        { key: 'decisionNo', value: parsedData.decisionNo, setter: setDocDecisionNo },
        { key: 'decisionDate', value: parsedData.decisionDate, setter: setDocDecisionDate, isDate: true },
        { key: 'parentOrg', value: parsedData.parentOrg, setter: setDocParentOrg },
        { key: 'issuingOrg', value: parsedData.issuingOrg, setter: setDocIssuingOrg },
        { key: 'issuingLocation', value: parsedData.issuingLocation, setter: setDocIssuingLocation },
        { key: 'docType', value: parsedData.docType, setter: setDocDocType, isSelect: true },
        { key: 'signer', value: parsedData.signer, setter: setDocSigner },
        { key: 'expiryDecision', value: parsedData.expiryDecision, setter: setDocExpiryDecision },
        { key: 'expiryDate', value: parsedData.expiryDate, setter: setDocExpiryDate, isDate: true },
        { key: 'text', value: parsedData.summary || parsedData.text || rawText, setter: setDocText, isTextArea: true },
      ];

      for (const field of fieldsToType) {
        if (field.value !== undefined && field.value !== null && field.value !== '') {
          setActiveTypingField(field.key);
          setAiAnalysisLog(`✍️ Đang điền trường: ${getFieldLabel(field.key)}...`);
          
          if (field.isSelect || field.isDate) {
            await new Promise(resolve => setTimeout(resolve, 300));
            field.setter(field.value);
          } else {
            await typeText(field.setter, field.value);
          }
        }
      }

      // Stagger highlights
      if (parsedData.highlights && Array.isArray(parsedData.highlights) && parsedData.highlights.length > 0) {
        setActiveTypingField('highlights');
        setAiAnalysisLog("🧠 Đang ghim Điểm nhấn lâm sàng quan trọng nhất vào hệ quản lý...");
        
        const newHls = parsedData.highlights.map((hl: any, idx: number) => ({
          id: 'hl_' + Math.random().toString(36).substring(2, 9) + '_' + idx,
          text: hl.text || '',
          category: hl.category || 'Chỉ định',
          color: hl.color || 'green',
          note: hl.note || ''
        }));

        await new Promise(resolve => setTimeout(resolve, 700));
        setDocHighlights(newHls);
      }

      setActiveTypingField(null);
      setAiAnalysisLog('');
      showNotification('success', "Chúc mừng! Đã phân tích văn bản và tự động điền toàn bộ trường thông tin thành công!");
    } catch (e: any) {
      showNotification('error', e.message || "Gặp lỗi trong tiến trình chiết xuất AI.");
    } finally {
      setIsAIExtracting(false);
      setActiveTypingField(null);
    }
  };

  // Save changes/Save new document
  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim() || !docText.trim()) {
      showNotification('error', "Vui lòng nhập đầy đủ Tiêu đề và Nội dung văn bản.");
      return;
    }

    const docId = editingDoc?.id || 'doc_' + Math.random().toString(36).substring(2, 9);
    
    const finalAttachedUrls: string[] = [];
    const finalAttachedTypes: string[] = [];
    const finalAttachedTitles: string[] = [];
    docAttachedUrls.forEach((url, idx) => {
      const trimmedUrl = url.trim();
      if (trimmedUrl) {
        finalAttachedUrls.push(trimmedUrl);
        const fileType = docAttachedTypes[idx]?.trim() || '';
        finalAttachedTypes.push(fileType);
        const fileTitle = docAttachedTitles[idx]?.trim() || '';
        finalAttachedTitles.push(fileTitle);
      }
    });

    const nextDoc = {
      id: docId,
      title: docTitle.trim(),
      category: docCategory,
      text: docText.trim(),
      pdfUrl: extractDriveId(docPdfUrl),
      attachedUrl: finalAttachedUrls[0] || '',
      attachedUrls: finalAttachedUrls,
      attachedTypes: finalAttachedTypes,
      attachedTitles: finalAttachedTitles,
      tagKey: docTagKey.trim(),
      decisionNo: docDecisionNo.trim(),
      decisionDate: docDecisionDate.trim(),
      parentOrg: docParentOrg.trim(),
      issuingOrg: docIssuingOrg.trim(),
      issuingLocation: docIssuingLocation.trim(),
      addressedTo: docAddressedTo.trim(),
      recipients: docRecipients.trim(),
      docType: docDocType,
      titleItalic: docTitleItalic,
      highlights: docHighlights,
      signer: docSigner.trim(),
      isInternal: docIsInternal,
      expiryDate: docExpiryDate.trim(),
      expiryDecision: docExpiryDecision.trim(),
      isHidden: editingDoc?.isHidden || false,
      createdBy: editingDoc?.createdBy || currentUserUid,
      creatorName: editingDoc?.creatorName || currentUserName,
      createdAt: editingDoc?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'y_khoa_documents', docId), nextDoc);
      showNotification('success', editingDoc ? "Đã cập nhật tài liệu thành công!" : "Đã tạo tài liệu y khoa mới thành công!");
      
      // Close forms & Reset states
      setIsFormOpen(false);
      setEditingDoc(null);
      setDocTitle('');
      setDocText('');
      setDocPdfUrl('');
      setDocAttachedUrl('');
      setDocAttachedUrls(['']);
      setDocAttachedTypes(['']);
      setDocAttachedTitles(['']);
      setDocTagKey('');
      setDocDecisionNo('');
      setDocDecisionDate('');
      setDocParentOrg('');
      setDocIssuingOrg('');
      setDocIssuingLocation('');
      setDocAddressedTo('');
      setDocRecipients('');
      setDocDocType('Quyết định');
      setDocSigner('');
      setDocIsInternal(false);
      setDocExpiryDate('');
      setDocExpiryDecision('');
      setDocTitleItalic(true);
      setDocHighlights([]);
      setNewHlText('');
      setNewHlNote('');
      setEditingHighlightId(null);
      setUrlInput('');
    } catch (err: any) {
      showNotification('error', "Ghi thất bại: " + (err.message || err));
    }
  };

  // Seed default templates to database
  const handleSeedDefaults = async () => {
    setIsLoading(true);
    try {
      let seededCount = 0;
      for (const sample of SAMPLE_DOCUMENTS) {
        // If it doesn't exist, we add
        const id = sample.id;
        await setDoc(doc(db, 'y_khoa_documents', id), {
          id: id,
          title: sample.title,
          category: sample.category,
          text: sample.text,
          pdfUrl: sample.pdfUrl || '',
          attachedUrl: sample.attachedUrl || '',
          attachedUrls: sample.attachedUrls || (sample.attachedUrl ? [sample.attachedUrl] : []),
          tagKey: sample.tagKey || '',
          decisionNo: sample.decisionNo || '',
          decisionDate: sample.decisionDate || '',
          parentOrg: sample.parentOrg || '',
          issuingOrg: sample.issuingOrg || '',
          issuingLocation: sample.issuingLocation || '',
          addressedTo: sample.addressedTo || '',
          recipients: sample.recipients || '',
          docType: sample.docType || '',
          highlights: sample.highlights || [],
          createdBy: 'system',
          creatorName: 'Hệ thống',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        seededCount++;
      }
      showNotification('success', `Đã đồng bộ thành công ${seededCount} tài liệu y bản mẫu vào dữ liệu!`);
    } catch (e: any) {
      showNotification('error', "Seeding error: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Manage Categories Actions
  const handleAddCategory = async () => {
    if (!newCategoryName || !newCategoryName.trim()) return;
    const name = newCategoryName.trim();
    
    const exists = categories.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      showNotification('error', 'Loại văn bản này đã tồn tại!');
      return;
    }

    try {
      const slug = name.replace(/\s+/g, '_').toLowerCase();
      const catId = 'cat_' + slug + '_' + Math.random().toString(36).substring(2, 6);
      await setDoc(doc(db, 'y_khoa_categories', catId), {
        id: catId,
        name: name,
        createdAt: new Date().toISOString()
      });
      setNewCategoryName('');
      showNotification('success', 'Đã thêm loại văn bản mới!');
    } catch (e: any) {
      console.error(e);
      showNotification('error', 'Lỗi khi thêm loại văn bản: ' + e.message);
    }
  };

  const handleUpdateCategory = async (id: string, oldName: string) => {
    if (!editingCategoryName || !editingCategoryName.trim()) return;
    const newName = editingCategoryName.trim();
    
    if (newName === oldName) {
      setEditingCategoryId(null);
      return;
    }

    const exists = categories.some((c) => c.id !== id && c.name.toLowerCase() === newName.toLowerCase());
    if (exists) {
      showNotification('error', 'Tên loại văn bản đã tồn tại!');
      return;
    }

    try {
      await setDoc(doc(db, 'y_khoa_categories', id), {
        name: newName
      }, { merge: true });

      const docsToUpdate = documents.filter(d => d.category === oldName);
      for (const d of docsToUpdate) {
        await setDoc(doc(db, 'y_khoa_documents', d.id), {
          category: newName
        }, { merge: true });
      }

      setEditingCategoryId(null);
      showNotification('success', `Đã đổi tên và cập nhật ${docsToUpdate.length} tài liệu liên quan.`);
    } catch (e: any) {
      console.error(e);
      showNotification('error', 'Có lỗi xảy ra khi đổi tên loại văn bản: ' + e.message);
    }
  };

  const handleDeleteCategory = (id: string, catName: string) => {
    const hasDocs = documents.some(d => d.category === catName);
    const message = hasDocs
      ? `Cảnh báo: Có tài liệu đang thuộc nhóm "${catName}". Bạn có chắc chắn muốn xóa không?`
      : `Bạn có chắc chắn muốn xóa nhóm loại văn bản "${catName}" không?`;
    setDeleteConfirmData({
      type: 'category',
      id,
      name: catName,
      message
    });
  };

  // Delete Document
  const handleDeleteDocument = (id: string, name: string) => {
    setDeleteConfirmData({
      type: 'document',
      id,
      name,
      message: `Bạn có chắc chắn muốn xóa tài liệu "${name}" khỏi cơ sở dữ liệu y khoa không? Hành động này không thể hoàn tác.`
    });
  };

  const executeDelete = async () => {
    if (!deleteConfirmData) return;
    const { type, id, name } = deleteConfirmData;

    try {
      if (type === 'category') {
        await deleteDoc(doc(db, 'y_khoa_categories', id));
        showNotification('success', `Đã xóa loại văn bản "${name}".`);
      } else {
        await deleteDoc(doc(db, 'y_khoa_documents', id));
        showNotification('success', "Đã gỡ bỏ tài liệu khỏi cơ sở dữ liệu.");
      }
    } catch (e: any) {
      console.error(e);
      showNotification('error', 'Không thể xóa: ' + e.message);
    }
  };

  // Toggle Hide/Show Document status
  const handleToggleHideDocument = async (docItem: ClinicalDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const isCurrentlyHidden = !!docItem.isHidden;
      await setDoc(doc(db, 'y_khoa_documents', docItem.id), {
        ...docItem,
        isHidden: !isCurrentlyHidden,
        updatedAt: new Date().toISOString()
      });
      showNotification('success', !isCurrentlyHidden ? `Đã ẩn tài liệu "${docItem.title}" thành công!` : `Đã mở ẩn tài liệu "${docItem.title}" thành công!`);
    } catch (err: any) {
      showNotification('error', "Lỗi cập nhật ẩn/hiện: " + (err.message || err));
    }
  };

  // Trigger editing callback
  const handleEditInit = (docItem: ClinicalDocument) => {
    setEditingDoc(docItem);
    setDocTitle(docItem.title);
    setDocCategory(docItem.category);
    setDocText(docItem.text);
    setDocPdfUrl(docItem.pdfUrl || '');
    setDocAttachedUrl(docItem.attachedUrl || '');
    const initialUrls = docItem.attachedUrls && docItem.attachedUrls.length > 0 ? docItem.attachedUrls : (docItem.attachedUrl ? [docItem.attachedUrl] : ['']);
    setDocAttachedUrls(initialUrls);
    const initialTypes = docItem.attachedTypes && docItem.attachedTypes.length > 0 
      ? docItem.attachedTypes 
      : initialUrls.map(() => '');
    setDocAttachedTypes(initialTypes);
    const initialTitles = docItem.attachedTitles && docItem.attachedTitles.length > 0
      ? docItem.attachedTitles
      : initialUrls.map(() => '');
    setDocAttachedTitles(initialTitles);
    setDocTagKey(docItem.tagKey || '');
    setDocDecisionNo(docItem.decisionNo || '');
    setDocDecisionDate(docItem.decisionDate || '');
    setDocParentOrg(docItem.parentOrg || '');
    setDocIssuingOrg(docItem.issuingOrg || '');
    setDocIssuingLocation(docItem.issuingLocation || '');
    setDocAddressedTo(docItem.addressedTo || '');
    setDocRecipients(docItem.recipients || '');
    setDocDocType(docItem.docType || 'Quyết định');
    setDocSigner(docItem.signer || '');
    setDocIsInternal(!!docItem.isInternal);
    setDocExpiryDate(docItem.expiryDate || '');
    setDocExpiryDecision(docItem.expiryDecision || '');
    setDocTitleItalic(docItem.titleItalic !== undefined ? docItem.titleItalic : true);
    setDocHighlights(docItem.highlights || []);
    setIsFormOpen(true);
  };

  return (
    <div className="w-full max-w-none px-4 lg:px-8 pt-5 lg:pt-8 space-y-6" id="manage_doc_lookup">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={cn(
            "text-base lg:text-lg font-black flex items-center gap-2 uppercase tracking-widest text-[#8b5cf6]",
          )}>
            <div className="w-1.5 h-6 bg-[#8b5cf6] rounded-full" />
            Quản lý Kho tài liệu Y tế
            <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-500 text-[10px] border border-violet-500/20 font-black">
              ADMIN CONTROL
            </span>
          </h2>
          <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wide">
            Thêm mới, nhập tự động, điều chỉnh và lưu trữ văn bản chỉ định lâm sàng của đơn vị
          </p>
        </div>

        {!isFormOpen && (
          <div className="flex flex-wrap items-center gap-2">
            {documents.length === 0 && (
              <button
                onClick={handleSeedDefaults}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 border",
                  isDarkMode
                    ? "bg-slate-900 border-slate-800 text-teal-400 hover:bg-slate-800"
                    : "bg-white border-slate-200 text-teal-600 hover:bg-slate-50"
                )}
              >
                <RefreshCw size={12} className="animate-spin" />
                Đồng bộ lại tài liệu mẫu
              </button>
            )}

            <button
              onClick={() => {
                setIsCategoryModalOpen(true);
              }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 border",
                isDarkMode 
                  ? "bg-slate-905 bg-slate-900 hover:bg-slate-800 border-slate-800 text-violet-400" 
                  : "bg-white hover:bg-slate-50 border-slate-200 text-[#8b5cf6]"
              )}
            >
              <Layers size={14} />
              Quản lý loại văn bản
            </button>

            <button
              onClick={() => {
                setEditingDoc(null);
                setDocTitle('');
                setDocText('');
                setDocPdfUrl('');
                setDocAttachedUrl('');
                setDocAttachedUrls(['']);
                setDocAttachedTypes(['']);
                setDocAttachedTitles(['']);
                setUrlInput('');
                setDocParentOrg('');
                setDocIssuingOrg('');
                setDocIssuingLocation('');
                setDocAddressedTo('');
                setDocRecipients('');
                setDocDocType('Quyết định');
                setDocSigner('');
                setDocIsInternal(false);
                setDocExpiryDate('');
                setDocExpiryDecision('');
                setDocHighlights([]);
                setNewHlText('');
                setNewHlNote('');
                setEditingHighlightId(null);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
            >
              <Plus size={14} />
              Thêm tài liệu mới
            </button>
          </div>
        )}
      </div>

      {/* Alert panels */}
      {successMsg && (
        <div className="p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400">
          <CheckCircle size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {isFormOpen ? (
          /* Creating/Editing form view */
          <motion.div
            key="editing-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className={cn(
              "p-6 rounded-3xl border space-y-6",
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-xl shadow-slate-200/40"
            )}
          >
            <div className="flex items-center justify-between border-b pb-4 border-slate-200/30">
              <button
                onClick={() => setIsFormOpen(false)}
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#8b5cf6]"
              >
                <ArrowLeft size={12} />
                Quay lại danh sách
              </button>
              <h3 className={cn("text-xs font-black uppercase tracking-widest", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                {editingDoc ? "Cập Nhật Tài Liệu" : "Thêm Tài Liệu Mới"}
              </h3>
            </div>

            {/* Quick Extraction Assist Panel, available both when creating and editing doc */}
            {true && (
              <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-amber-500 uppercase tracking-widest">
                  <Sparkles size={14} />
                  Nhập tự động &amp; Khôi phục nội dung trực quan
                </div>

                {/* Import method switches */}
                <div className="flex border-b border-amber-500/10">
                  {(['upload', 'url', 'paste'] as const).map((tab) => {
                    const labelSet = {
                      upload: "Tải lên tệp (.pdf, .docx, .txt)",
                      url: "Chèn đường dẫn Web y khoa",
                      paste: "Dán văn bản thủ công"
                    };
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setImportTab(tab)}
                        className={cn(
                          "px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 -mb-[2px] transition-all",
                          importTab === tab 
                            ? "border-amber-500 text-amber-600 dark:text-amber-400" 
                            : "border-transparent text-slate-400 hover:text-slate-200"
                        )}
                      >
                        {labelSet[tab]}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2">
                  {importTab === 'upload' && (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files) processUploadedFile(e.dataTransfer.files[0]); }}
                      className={cn(
                        "p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all min-h-[140px] cursor-pointer",
                        isDragOver
                          ? "border-amber-500 bg-amber-500/5"
                          : isDarkMode
                            ? "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300"
                      )}
                    >
                      <input 
                        type="file" 
                        id="form-upload-input" 
                        accept=".pdf,.docx,.txt" 
                        onChange={(e) => { if (e.target.files) processUploadedFile(e.target.files[0]); }}
                        className="hidden" 
                      />
                      {isParsingFile ? (
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-500">
                          <Loader2 size={16} className="animate-spin" />
                          Đang phân tách tệp lâm khoa...
                        </div>
                      ) : (
                        <label htmlFor="form-upload-input" className="cursor-pointer space-y-2">
                          <Upload size={24} className="mx-auto text-amber-500/70" />
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Thả tệp nghiên cứu hoặc <span className="text-amber-500 underline">nhấn để duyệt file</span>
                          </p>
                          <p className="text-[9px] text-slate-500">hỗ trợ .TXT, .PDF, .DOCX</p>
                        </label>
                      )}
                    </div>
                  )}

                  {importTab === 'url' && (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://moh.gov.vn/huong-dan-chan-doan-cap..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className={cn(
                          "flex-1 px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500",
                          isDarkMode 
                            ? "bg-slate-950 border-slate-800 text-white" 
                            : "bg-white border-slate-250 text-slate-800"
                        )}
                      />
                      <button
                        type="button"
                        onClick={handleFetchUrl}
                        disabled={isFetchingUrl || !urlInput.trim()}
                        className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                      >
                        {isFetchingUrl ? <Loader2 size={12} className="animate-spin" /> : "Trích xuất"}
                      </button>
                    </div>
                  )}

                  {importTab === 'paste' && (
                    <div className="space-y-3">
                      <textarea
                        placeholder="Nhập hoặc dán trực tiếp đoạn văn bản y văn thô tại đây..."
                        rows={5}
                        value={docText}
                        onChange={(e) => setDocText(e.target.value)}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500",
                          isDarkMode 
                            ? "bg-slate-950 border-slate-800 text-white" 
                            : "bg-white border-slate-200 text-slate-800"
                        )}
                      />
                      {docText.length > 50 && !pendingExtractionText && !isAIExtracting && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setPendingExtractionText(docText);
                              setPendingFileName("Văn bản dán tay");
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-amber-500/20 active:scale-95 transition-all"
                          >
                            <Sparkles size={11} />
                            🪄 Chiết xuất thông tin bằng AI
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Automated Extraction Banner */}
                {(pendingExtractionText || isAIExtracting) && (
                  <div className="mt-4 p-4 rounded-xl border border-amber-500 bg-amber-500/10 animate-fade-in space-y-3 shadow-md relative overflow-hidden">
                    {/* Background radial glow */}
                    <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        <Sparkles size={16} className={isAIExtracting ? "animate-spin" : "animate-bounce"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          {isAIExtracting ? "AI Đang Tự Động Nhập Liệu..." : "Trợ Lý Bóc Tách Y Văn AI Đã Sẵn Sàng!"}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5 font-sans whitespace-normal">
                          {isAIExtracting 
                            ? (aiAnalysisLog || "Đang bóc tách và tạo điểm nhấn...")
                            : `Nội dung từ "${pendingFileName}" đã được nạp thành công. Bạn có muốn sử dụng AI bóc tách toàn bộ thông tin hành chính, số hiệu và tạo Điểm Nhấn lâm sàng tự động không?`}
                        </p>
                      </div>
                    </div>

                    {isAIExtracting ? (
                      <div className="space-y-1.5">
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full animate-pulse" style={{ width: '85%' }} />
                        </div>
                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-amber-500/80">
                          <span>Trạng thái nhập liệu:</span>
                          <span className="animate-pulse">Đang điền các trường...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => { setPendingExtractionText(null); setPendingFileName(null); }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
                        >
                          Bỏ qua
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAIExtractFields()}
                          className="px-4 py-1.5 rounded-lg bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1 animate-pulse"
                        >
                          <Sparkles size={11} />
                          🪄 Tự động điền bằng AI
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Editing Form */}
            <form onSubmit={handleSaveDocument} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] flex items-center justify-between">
                    <span>Tiêu đề tài liệu y đức / văn bản hướng dẫn</span>
                    {activeTypingField === 'title' && (
                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse flex items-center gap-1">
                        <Sparkles size={8} /> AI đang gõ...
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Quy trình chẩn đoán suy tim sung huyết cấp..."
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] transition-all duration-300",
                      activeTypingField === 'title'
                        ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-[0_0_12px_rgba(245,158,11,0.2)] animate-pulse"
                        : isDarkMode 
                          ? "bg-slate-950 border-slate-800 text-white" 
                          : "bg-slate-50 border-slate-250 text-slate-800"
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] flex items-center justify-between">
                    <span>Nhóm phân loại</span>
                    {activeTypingField === 'category' && (
                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse flex items-center gap-1">
                        <Sparkles size={8} /> AI chọn...
                      </span>
                    )}
                  </label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] transition-all duration-300",
                      activeTypingField === 'category'
                        ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                        : isDarkMode 
                          ? "bg-slate-950 border-slate-800 text-white" 
                          : "bg-slate-50 border-slate-250 text-slate-800"
                    )}
                  >
                    {categories.length > 0 ? (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="Phác đồ điều trị">Phác đồ điều trị</option>
                        <option value="Dược lý học">Dược lý học</option>
                        <option value="Văn bản chỉ đạo">Văn bản chỉ đạo</option>
                        <option value="Dược thư quốc gia">Dược thư quốc gia</option>
                        <option value="Nghiên cứu học thuật">Nghiên cứu học thuật</option>
                        <option value="Thông tin thuốc">Thông tin thuốc</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] flex items-center gap-1.5">
                  ID Google Drive của tập tin PDF hướng dẫn (Tự động chuyển preview)
                  <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500 text-[8px] font-black uppercase">
                    Có thể tải/nhúng trực quan
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 14pQED9OlXOXzAzP4PIZq9b05OXfk2OQA (Dán link Drive bất kỳ hệ thống tự bóc tách ID)"
                  value={docPdfUrl}
                  onChange={(e) => setDocPdfUrl(e.target.value)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]",
                    isDarkMode 
                      ? "bg-slate-950 border-slate-800 text-white" 
                      : "bg-slate-50 border-slate-250 text-slate-800"
                  )}
                />
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                  Bạn nhập trực tiếp Mã ID hoặc dán đường dẫn Google Drive. Hệ thống sẽ lưu giữ Mã ID và tự động chuyển đổi thành đường dẫn xem trước <code className="text-[#8b5cf6]">/preview</code> trực quan khi hiển thị A4.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] flex items-center justify-between">
                    <span>Từ khóa / Tag Key / Gợi ý tra cứu</span>
                    {activeTypingField === 'tagKey' && (
                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse flex items-center gap-1">
                        <Sparkles size={8} /> AI điền...
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: CAP, Viêm phổi, Hạ sốt"
                    value={docTagKey}
                    onChange={(e) => setDocTagKey(e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] transition-all duration-300",
                      activeTypingField === 'tagKey'
                        ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                        : isDarkMode 
                          ? "bg-slate-950 border-slate-800 text-white" 
                          : "bg-slate-50 border-slate-250 text-slate-800"
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] flex items-center justify-between">
                    <span>Số Quyết Định (Số QĐ)</span>
                    {activeTypingField === 'decisionNo' && (
                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse flex items-center gap-1">
                        <Sparkles size={8} /> AI trích...
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 4815/QĐ-BYT"
                    value={docDecisionNo}
                    onChange={(e) => setDocDecisionNo(e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] transition-all duration-300",
                      activeTypingField === 'decisionNo'
                        ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-[0_0_12px_rgba(245,158,11,0.2)] animate-pulse"
                        : isDarkMode 
                          ? "bg-slate-950 border-slate-800 text-white" 
                          : "bg-slate-50 border-slate-250 text-slate-800"
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] flex items-center justify-between">
                    <span>Ngày Ban Hành Quyết Định (Ngày QĐ)</span>
                    {activeTypingField === 'decisionDate' && (
                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse flex items-center gap-1">
                        <Sparkles size={8} /> AI chọn...
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={docDecisionDate}
                    onChange={(e) => setDocDecisionDate(e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] transition-all duration-300",
                      activeTypingField === 'decisionDate'
                        ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                        : isDarkMode 
                          ? "bg-slate-950 border-slate-800 text-white" 
                          : "bg-slate-50 border-slate-250 text-slate-800"
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] flex items-center justify-between">
                    <span>Quyết định hết hiệu lực (Nếu có)</span>
                    {activeTypingField === 'expiryDecision' && (
                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse flex items-center gap-1">
                        <Sparkles size={8} /> AI điền...
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="Quyết định thay thế hoặc bãi bỏ số..."
                    value={docExpiryDecision}
                    onChange={(e) => setDocExpiryDecision(e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] transition-all duration-300",
                      activeTypingField === 'expiryDecision'
                        ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-[0_0_12px_rgba(245,158,11,0.2)] animate-pulse"
                        : isDarkMode 
                          ? "bg-slate-950 border-slate-800 text-white" 
                          : "bg-slate-50 border-slate-250 text-slate-800"
                    )}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] flex items-center justify-between">
                    <span>Ngày hết hiệu lực (Nếu có)</span>
                    {activeTypingField === 'expiryDate' && (
                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse flex items-center gap-1">
                        <Sparkles size={8} /> AI chọn...
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={docExpiryDate}
                    onChange={(e) => setDocExpiryDate(e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] transition-all duration-300",
                      activeTypingField === 'expiryDate'
                        ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                        : isDarkMode 
                          ? "bg-slate-950 border-slate-800 text-white" 
                          : "bg-slate-50 border-slate-250 text-slate-800"
                    )}
                  />
                </div>
              </div>

              {/* Toggle for Internal Document */}
              <div className={cn(
                "p-4 rounded-2xl border flex items-center gap-3 transition-colors",
                isDarkMode 
                  ? "bg-slate-950/40 border-slate-800 hover:border-slate-705 bg-slate-900" 
                  : "bg-amber-500/5 border-amber-500/10 hover:border-amber-500/20"
              )}>
                <input
                  type="checkbox"
                  id="docIsInternal"
                  checked={docIsInternal}
                  onChange={(e) => setDocIsInternal(e.target.checked)}
                  className="w-4 h-4 text-[#8b5cf6] border-slate-300 rounded focus:ring-[#8b5cf6] cursor-pointer"
                />
                <label htmlFor="docIsInternal" className="cursor-pointer select-none flex-1 font-sans">
                  <span className={cn("text-xs font-black uppercase tracking-wider block", isDarkMode ? "text-amber-400" : "text-amber-600")}>
                    Đánh dấu là văn bản nội bộ
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold block leading-tight mt-0.5 whitespace-normal">
                    Vui lòng chọn nếu đây là nghiên cứu/phác đồ nội bộ của cơ sở, hệ thống sẽ gán biểu tượng phân biệt
                  </span>
                </label>
              </div>

              {/* Administrative Details Section */}
              <div className="p-5 rounded-3xl bg-violet-500/5 border border-violet-500/10 space-y-4">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#8b5cf6] flex items-center gap-1.5 border-b border-[#8b5cf6]/10 pb-2">
                  <FileText size={14} />
                  Thông tin hành chính văn bản
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] flex items-center justify-between">
                      <span>Cơ quan trực thuộc (Cơ quan chủ quản)</span>
                      {activeTypingField === 'parentOrg' && (
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse flex items-center gap-1">
                          <Sparkles size={8} /> AI đang điền...
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: BỘ Y TẾ"
                      value={docParentOrg}
                      onChange={(e) => setDocParentOrg(e.target.value)}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] transition-all duration-300",
                        activeTypingField === 'parentOrg'
                          ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-[0_0_12px_rgba(245,158,11,0.2)] animate-pulse"
                          : isDarkMode 
                            ? "bg-slate-950 border-slate-800 text-white" 
                            : "bg-slate-50 border-slate-250 text-slate-800"
                      )}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] flex items-center justify-between">
                      <span>Đơn vị ban hành</span>
                      {activeTypingField === 'issuingOrg' && (
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse flex items-center gap-1">
                          <Sparkles size={8} /> AI đang điền...
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: CỤC QUẢN LÝ KHÁM CHỮA BỆNH"
                      value={docIssuingOrg}
                      onChange={(e) => setDocIssuingOrg(e.target.value)}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] transition-all duration-300",
                        activeTypingField === 'issuingOrg'
                          ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-[0_0_12px_rgba(245,158,11,0.2)] animate-pulse"
                          : isDarkMode 
                            ? "bg-slate-950 border-slate-800 text-white" 
                            : "bg-slate-50 border-slate-250 text-slate-800"
                      )}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] flex items-center justify-between">
                      <span>Địa danh ban hành</span>
                      {activeTypingField === 'issuingLocation' && (
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse flex items-center gap-1">
                          <Sparkles size={8} /> AI đang điền...
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Hà Nội"
                      value={docIssuingLocation}
                      onChange={(e) => setDocIssuingLocation(e.target.value)}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] transition-all duration-300",
                        activeTypingField === 'issuingLocation'
                          ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                          : isDarkMode 
                            ? "bg-slate-950 border-slate-800 text-white" 
                            : "bg-slate-50 border-slate-250 text-slate-800"
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] flex items-center justify-between">
                     <span>Phân loại văn bản (Thông tư, Quyết định, Công văn,...)</span>
                     {activeTypingField === 'docType' && (
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse flex items-center gap-1">
                          <Sparkles size={8} /> AI chọn...
                        </span>
                      )}
                    </label>
                    <select
                      value={docDocType}
                      onChange={(e) => setDocDocType(e.target.value)}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] transition-all duration-300",
                        activeTypingField === 'docType'
                          ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                          : isDarkMode 
                            ? "bg-slate-950 border-slate-800 text-white" 
                            : "bg-slate-50 border-slate-250 text-slate-800"
                      )}
                    >
                      <option value="Quyết định">Quyết định</option>
                      <option value="Thông tư">Thông tư</option>
                      <option value="Công văn">Công văn</option>
                      <option value="Chỉ thị">Chỉ thị</option>
                      <option value="Hướng dẫn điều trị">Hướng dẫn điều trị</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] flex items-center justify-between">
                      <span>Người ký</span>
                      {activeTypingField === 'signer' && (
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse flex items-center gap-1">
                          <Sparkles size={8} /> AI trích...
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: GS.TS. Nguyễn Thanh Long"
                      value={docSigner}
                      onChange={(e) => setDocSigner(e.target.value)}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] transition-all duration-300",
                        activeTypingField === 'signer'
                          ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-[0_0_12px_rgba(245,158,11,0.2)] animate-pulse"
                          : isDarkMode 
                            ? "bg-slate-950 border-slate-800 text-white" 
                            : "bg-slate-50 border-slate-250 text-slate-800"
                      )}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6]">
                      Kính gửi
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Các bệnh viện trực thuộc Bộ Y tế"
                      value={docAddressedTo}
                      onChange={(e) => setDocAddressedTo(e.target.value)}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]",
                        isDarkMode 
                          ? "bg-slate-950 border-slate-800 text-white" 
                          : "bg-slate-50 border-slate-250 text-slate-800"
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6]">
                    Nơi nhận (Mỗi dòng một mục, dùng dấu gạch đầu dòng '-')
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ví dụ:&#10;- Như trên;&#10;- Bộ trưởng (để b/c);&#10;- Lưu VT, PC."
                    value={docRecipients}
                    onChange={(e) => setDocRecipients(e.target.value)}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]",
                      isDarkMode 
                        ? "bg-slate-950 border-slate-800 text-white" 
                        : "bg-white border-slate-200 text-slate-800"
                    )}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-end">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] flex items-center gap-1.5">
                    <span>Nội dung hoặc Tóm tắt y văn</span>
                    {activeTypingField === 'text' && (
                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse flex items-center gap-1">
                        <Sparkles size={8} className="animate-spin" /> AI đang soạn thảo thông suốt...
                      </span>
                    )}
                  </label>
                  {((docPdfUrl && docPdfUrl.trim()) || (docText && docText.length > 20)) && (
                    <button
                      type="button"
                      onClick={handleAIOptimize}
                      disabled={isAIOptimizing}
                      className="flex items-center gap-1.5 px-3 py-1 bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#8b5cf6] hover:bg-[#8b5cf6]/20 rounded text-[9px] font-black uppercase tracking-widest transition-all duration-300"
                    >
                      {isAIOptimizing ? (
                        <>
                          <Loader2 size={10} className="animate-spin" />
                          Đang đọc & tóm tắt...
                        </>
                      ) : (
                        <>
                          <Sparkles size={10} />
                          AI tóm tắt
                        </>
                      )}
                    </button>
                  )}
                </div>
                <textarea
                  required
                  rows={15}
                  placeholder="Nhập nội dung đầy đủ của văn bản..."
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] transition-all duration-300 pb-16",
                    activeTypingField === 'text'
                      ? "border-amber-500 ring-4 ring-amber-500/10 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.15)] focus:ring-amber-500"
                      : isDarkMode 
                        ? "bg-slate-950 border-slate-800 text-white" 
                        : "bg-white border-slate-200 text-slate-800"
                  )}
                />
              </div>

              {/* Multiple attached URLs Section */}
              <div className="space-y-2 p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Link2 size={12} className="text-emerald-500" />
                    Đường dẫn tài liệu kèm theo (URL / Link nguồn gốc)
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase">
                      Chấp nhận nhiều liên kết
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setDocAttachedUrls([...docAttachedUrls, '']);
                      setDocAttachedTypes([...docAttachedTypes, '']);
                      setDocAttachedTitles([...docAttachedTitles, '']);
                    }}
                    className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 bg-emerald-500/5 px-2.5 py-1 rounded-xl transition-all active:scale-95 border border-emerald-500/15"
                  >
                    <Plus size={10} /> Thêm đường dẫn
                  </button>
                </div>

                <div className="space-y-4">
                  {docAttachedUrls.map((url, index) => (
                    <div key={index} className={cn(
                      "flex flex-col gap-2.5 p-3.5 rounded-2xl border transition-all",
                      isDarkMode 
                        ? "bg-slate-900/40 border-slate-800 focus-within:border-emerald-500/35" 
                        : "bg-slate-50/60 border-slate-200/60 focus-within:border-emerald-500/35"
                    )}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        {/* Title Display Column */}
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder={`Tiêu đề hiển thị (ví dụ: Quyết định 123/QĐ-BYT...) - Bỏ trống để dùng mặc định`}
                            value={docAttachedTitles[index] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updatedTitles = [...docAttachedTitles];
                              updatedTitles[index] = val;
                              setDocAttachedTitles(updatedTitles);
                            }}
                            className={cn(
                              "w-full px-4 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 block pr-10 transition-all",
                              isDarkMode 
                                ? "bg-slate-950 border-slate-800 text-white focus:border-emerald-500" 
                                : "bg-white border-slate-250 text-slate-800 focus:border-emerald-500"
                            )}
                          />
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                            <FileText size={12} />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-full sm:w-36 md:w-44">
                            <select
                              value={docAttachedTypes[index] || ''}
                              onChange={(e) => {
                                const updatedTypes = [...docAttachedTypes];
                                updatedTypes[index] = e.target.value;
                                setDocAttachedTypes(updatedTypes);
                              }}
                              className={cn(
                                "w-full px-2.5 py-2 rounded-xl border text-[11px] font-black uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer",
                                isDarkMode 
                                  ? "bg-slate-950 border-slate-800 text-slate-300 focus:border-emerald-500" 
                                  : "bg-white border-slate-250 text-slate-700 focus:border-emerald-500"
                              )}
                            >
                              <option value="">-- Loại File (Tự động) --</option>
                              {FILE_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {docAttachedUrls.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updatedUrls = docAttachedUrls.filter((_, i) => i !== index);
                                const updatedTypes = docAttachedTypes.filter((_, i) => i !== index);
                                const updatedTitles = docAttachedTitles.filter((_, i) => i !== index);
                                setDocAttachedUrls(updatedUrls);
                                setDocAttachedTypes(updatedTypes);
                                setDocAttachedTitles(updatedTitles);
                              }}
                              className="p-2 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/5 active:scale-95 transition-all duration-300 shrink-0"
                              title="Xóa đường dẫn này"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="relative">
                        <input
                          type="url"
                          placeholder={`Đường dẫn liên kết thứ ${index + 1}: https://moh.gov.vn/documents/huong-dan.docx`}
                          value={url}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updatedUrls = [...docAttachedUrls];
                            updatedUrls[index] = val;
                            setDocAttachedUrls(updatedUrls);

                            // Auto-detect type if not manually set yet
                            if (!docAttachedTypes[index]) {
                              const detected = detectFileTypeFromUrl(val);
                              const updatedTypes = [...docAttachedTypes];
                              updatedTypes[index] = detected;
                              setDocAttachedTypes(updatedTypes);
                            }
                          }}
                          className={cn(
                            "w-full px-4 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 block pr-10 transition-all text-slate-500",
                            isDarkMode 
                              ? "bg-slate-950 border-slate-800 text-slate-300 focus:border-emerald-500" 
                              : "bg-white border-slate-250 text-slate-600 focus:border-emerald-500"
                          )}
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                          <Link2 size={12} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  Đường dẫn liên kết chính thức hoặc tệp tài liệu đi kèm (Word, Excel, PDF, Website...) để tra cứu bổ sung. Hệ thống sẽ tự động phát hiện loại tệp, hoặc bạn có thể chọn thủ công.
                </p>
              </div>

              {/* Highlights (Điểm nhấn y văn) Configuration Section */}
              <div className="p-5 rounded-3xl bg-violet-500/5 border border-violet-500/10 space-y-4">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#8b5cf6] flex items-center gap-1.5 border-b border-[#8b5cf6]/10 pb-2">
                  <BookOpen size={14} className="text-[#8b5cf6]" />
                  Cấu hình điểm nhấn y văn lâm sàng
                  <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500 text-[8px] font-black uppercase ml-auto">
                    {docHighlights.length} Điểm nhấn
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                  Cấu hình các phân đoạn y văn quan trọng để hiển thị trực quan và hỗ trợ quyết định lâm sàng nhanh khi bác sĩ tra cứu tài liệu này.
                </p>

                {/* Add new Highlight sub-form */}
                <div className={cn(
                  "p-4 rounded-2xl border space-y-4 text-xs font-semibold",
                  isDarkMode ? "bg-slate-950/40 border-slate-850" : "bg-slate-50 border-slate-200"
                )}>
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                    {editingHighlightId ? <Edit3 size={12} /> : <Plus size={12} />}
                    {editingHighlightId ? "Cập nhật điểm nhấn y văn" : "Thêm điểm nhấn y văn mới"}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-slate-400">Đoạn văn bản y văn cốt lõi (Trích dẫn chính xác từ tài liệu)</label>
                    <textarea
                      rows={3}
                      placeholder="Sao chép và dán đoạn văn bản từ nội dung y văn phía trên..."
                      value={newHlText}
                      onChange={(e) => setNewHlText(e.target.value)}
                      className={cn(
                        "w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-800 text-white placeholder-slate-600" 
                          : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-slate-400">Phân loại / Danh mục chuyên môn</label>
                      <select
                        value={newHlCategory}
                        onChange={(e) => setNewHlCategory(e.target.value)}
                        className={cn(
                          "w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]",
                          isDarkMode 
                            ? "bg-slate-900 border-slate-800 text-white" 
                            : "bg-white border-slate-200 text-slate-800"
                        )}
                      >
                        <option value="Chỉ định">Chỉ định</option>
                        <option value="Chống chỉ định">Chống chỉ định</option>
                        <option value="Liều dùng">Liều dùng</option>
                        <option value="Tương tác">Tương tác</option>
                        <option value="ADR">ADR (Tác dụng phụ)</option>
                        <option value="Lưu ý">Lưu ý chuyên môn</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-slate-400">Màu sắc cảnh báo lâm sàng</label>
                      <div className="flex items-center gap-2 py-2">
                        {(['green', 'red', 'orange', 'blue'] as const).map((color) => {
                          const bgColors = {
                            green: "bg-emerald-500 ring-emerald-500/30",
                            red: "bg-rose-500 ring-rose-500/30",
                            orange: "bg-amber-500 ring-amber-500/30",
                            blue: "bg-sky-500 ring-sky-500/30"
                          };
                          const colorLabels = {
                            green: "Xanh lá (An toàn/Chỉ định)",
                            red: "Đỏ (Nguy hiểm/Chống chỉ định)",
                            orange: "Cam (Cảnh báo/Tương tác)",
                            blue: "Xanh dương (Thông tin/Liều lượng)"
                          };
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setNewHlColor(color)}
                              className={cn(
                                "w-6 h-6 rounded-full transition-all flex items-center justify-center",
                                bgColors[color],
                                newHlColor === color ? "ring-4 scale-110 shadow-md" : "opacity-60 hover:opacity-100"
                              )}
                              title={colorLabels[color]}
                            >
                              {newHlColor === color && <Check size={12} className="text-white font-black" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-slate-400">Ghi chú chuyên môn tóm tắt</label>
                      <input
                        type="text"
                        placeholder="Nhập ghi chú ngắn gọn để bác sĩ xem nhanh..."
                        value={newHlNote}
                        onChange={(e) => setNewHlNote(e.target.value)}
                        className={cn(
                          "w-full px-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]",
                          isDarkMode 
                            ? "bg-slate-900 border-slate-800 text-white" 
                            : "bg-white border-slate-200 text-slate-800"
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    {editingHighlightId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingHighlightId(null);
                          setNewHlText('');
                          setNewHlNote('');
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-500/10 text-slate-400 border border-slate-500/20 hover:bg-slate-500/20 transition-all text-[10px] font-black uppercase tracking-wider"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (!newHlText.trim()) {
                          showNotification('error', "Vui lòng nhập nội dung đoạn y văn cốt lõi.");
                          return;
                        }
                        if (editingHighlightId) {
                          setDocHighlights(docHighlights.map(hl => {
                            if (hl.id === editingHighlightId) {
                              return {
                                ...hl,
                                text: newHlText.trim(),
                                color: newHlColor,
                                category: newHlCategory,
                                note: newHlNote.trim()
                              };
                            }
                            return hl;
                          }));
                          setEditingHighlightId(null);
                          setNewHlText('');
                          setNewHlNote('');
                          showNotification('success', "Đã cập nhật điểm nhấn y văn thành công!");
                        } else {
                          const newHl = {
                            id: Math.random().toString(36).substring(2, 9),
                            text: newHlText.trim(),
                            color: newHlColor,
                            category: newHlCategory,
                            note: newHlNote.trim()
                          };
                          setDocHighlights([newHl, ...docHighlights]);
                          setNewHlText('');
                          setNewHlNote('');
                          showNotification('success', "Đã thêm điểm nhấn y văn thành công!");
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-violet-500/10 text-[#8b5cf6] border border-violet-500/20 hover:bg-[#8b5cf6] hover:text-white transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                    >
                      {editingHighlightId ? <Check size={12} /> : <Plus size={12} />}
                      {editingHighlightId ? "Cập nhật" : "Thêm vào danh sách"}
                    </button>
                  </div>
                </div>

                {/* Highlights listing inside edit form */}
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {docHighlights.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 font-bold uppercase tracking-widest text-[9px] border border-dashed border-slate-200/20 rounded-2xl">
                      Chưa cấu hình điểm nhấn nào cho văn bản này
                    </div>
                  ) : (
                    docHighlights.map((hl, index) => {
                      const styleSet = {
                        green: "border-l-4 border-emerald-500 bg-emerald-500/5",
                        red: "border-l-4 border-rose-500 bg-rose-500/5",
                        orange: "border-l-4 border-amber-500 bg-amber-500/5",
                        blue: "border-l-4 border-sky-500 bg-sky-500/5"
                      };
                      return (
                        <div
                          key={hl.id}
                          className={cn("p-3 rounded-xl border border-slate-200/10 text-left flex items-start justify-between gap-3", styleSet[hl.color as 'green' | 'red' | 'orange' | 'blue'] || "border-l-4 border-slate-500")}
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6]">
                                [{hl.category}]
                              </span>
                            </div>
                            <p className={cn("text-[10px] leading-relaxed italic font-semibold line-clamp-2", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                              "{hl.text}"
                            </p>
                            {hl.note && (
                              <p className="text-[9px] font-bold text-slate-500">
                                Ghi chú: {hl.note}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Reorder Buttons */}
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => {
                                if (index === 0) return;
                                const reordered = [...docHighlights];
                                const temp = reordered[index];
                                reordered[index] = reordered[index - 1];
                                reordered[index - 1] = temp;
                                setDocHighlights(reordered);
                              }}
                              className={cn(
                                "p-1.5 rounded-lg border transition-all active:scale-95 text-sky-500",
                                index === 0 
                                  ? "opacity-30 cursor-not-allowed border-transparent" 
                                  : isDarkMode
                                    ? "bg-slate-950 border-slate-800 hover:bg-slate-900"
                                    : "bg-sky-50 border-sky-100 hover:bg-white hover:shadow"
                              )}
                              title="Di chuyển lên"
                            >
                              <ArrowUp size={11} />
                            </button>

                            <button
                              type="button"
                              disabled={index === docHighlights.length - 1}
                              onClick={() => {
                                if (index === docHighlights.length - 1) return;
                                const reordered = [...docHighlights];
                                const temp = reordered[index];
                                reordered[index] = reordered[index + 1];
                                reordered[index + 1] = temp;
                                setDocHighlights(reordered);
                              }}
                              className={cn(
                                "p-1.5 rounded-lg border transition-all active:scale-95 text-sky-500",
                                index === docHighlights.length - 1 
                                  ? "opacity-30 cursor-not-allowed border-transparent" 
                                  : isDarkMode
                                    ? "bg-slate-950 border-slate-800 hover:bg-slate-900"
                                    : "bg-sky-50 border-sky-100 hover:bg-white hover:shadow"
                              )}
                              title="Di chuyển xuống"
                            >
                              <ArrowDown size={11} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingHighlightId(hl.id);
                                setNewHlText(hl.text);
                                setNewHlCategory(hl.category);
                                setNewHlColor(hl.color || 'green');
                                setNewHlNote(hl.note || '');
                              }}
                              className={cn(
                                "p-1.5 rounded-lg border transition-all active:scale-95 text-amber-500",
                                isDarkMode
                                  ? "bg-slate-950 border-slate-800 hover:bg-slate-900"
                                  : "bg-amber-50 border-amber-100 hover:bg-white hover:shadow"
                              )}
                              title="Sửa điểm nhấn"
                            >
                              <Edit3 size={11} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (editingHighlightId === hl.id) {
                                  setEditingHighlightId(null);
                                  setNewHlText('');
                                  setNewHlNote('');
                                }
                                setDocHighlights(docHighlights.filter(item => item.id !== hl.id));
                                showNotification('success', "Đã gỡ bỏ điểm nhấn y văn.");
                              }}
                              className={cn(
                                "p-1.5 rounded-lg border transition-all active:scale-95 text-rose-500",
                                isDarkMode
                                  ? "bg-slate-950 border-slate-800 hover:bg-slate-900"
                                  : "bg-rose-50 border-rose-100 hover:bg-white hover:shadow"
                              )}
                              title="Xóa điểm nhấn"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95",
                    isDarkMode
                      ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      : "bg-white border-slate-250 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Plus size={12} stopColor="white" />
                  Lưu tài liệu
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* Documents listings view */
          <motion.div
            key="list-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Search and Filters bar */}
            <div className="flex flex-col lg:flex-row items-center gap-4 justify-between">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-[320px]">
                  <input
                    type="text"
                    placeholder="Tìm theo tiêu đề, nội dung..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn(
                      "pl-10 pr-4 py-2.5 rounded-2xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] w-full",
                      isDarkMode 
                        ? "bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-[#8b5cf6]" 
                        : "bg-white border-slate-200 placeholder-slate-400 focus:border-[#8b5cf6]"
                    )}
                  />
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                {/* View switcher */}
                <div className={cn(
                  "p-1 rounded-xl border flex items-center gap-1 shrink-0 self-stretch sm:self-auto justify-center sm:justify-start",
                  isDarkMode ? "bg-slate-950 border-slate-850" : "bg-slate-100 border-slate-200"
                )}>
                  <button
                    onClick={() => setDocsViewMode('grid')}
                    className={cn(
                      "p-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 px-3 py-1 uppercase tracking-wider",
                      docsViewMode === 'grid'
                        ? "bg-[#8b5cf6] text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                    title="Dạng lưới"
                  >
                    <LayoutGrid size={12} />
                    Lưới
                  </button>
                  <button
                    onClick={() => setDocsViewMode('list')}
                    className={cn(
                      "p-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 px-3 py-1 uppercase tracking-wider",
                      docsViewMode === 'list'
                        ? "bg-[#8b5cf6] text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                    title="Dạng danh sách"
                  >
                    <List size={12} />
                    Danh sách
                  </button>
                </div>
              </div>

              {/* Tags filter list */}
              <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={cn(
                    "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all",
                    categoryFilter === 'all'
                      ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                      : isDarkMode
                        ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  Tất cả
                </button>
                {uniqueCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all",
                      categoryFilter === cat
                        ? "bg-[#8b5cf6] border-[#8b5cf6] text-white"
                        : isDarkMode
                          ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* List entries */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-20 space-y-3">
                <Loader2 size={32} className="text-[#8b5cf6] animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Đang đồng bộ cơ sở dữ liệu y tế...
                </p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className={cn(
                "p-12 text-center rounded-3xl border border-dashed text-slate-400 space-y-4",
                isDarkMode ? "bg-slate-900/10 border-slate-800" : "bg-slate-50 border-slate-200"
              )}>
                <FileSearch size={40} className="mx-auto text-slate-400/50" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold">Chưa có văn bản nào trong dữ liệu tìm kiếm</h4>
                  <p className="text-[10px] uppercase tracking-widest font-black text-slate-500">
                    Sử dụng phím thêm tài liệu y khoa mới hoặc nạp danh sách mẫu bên trên
                  </p>
                </div>
              </div>
            ) : (
              docsViewMode === 'list' ? (
                <div className="flex flex-col gap-4">
                  {filteredDocs.map((docItem) => (
                    <div
                      key={docItem.id}
                      onClick={() => setSelectedPreviewDoc(docItem)}
                      className={cn(
                        "p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 relative group overflow-visible cursor-pointer hover:shadow-lg",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-850 hover:border-[#8b5cf6]/40 hover:bg-slate-900/70" 
                          : "bg-white border-slate-100 hover:border-[#8b5cf6]/20 shadow-sm shadow-slate-200/20"
                      )}
                    >
                      {/* Left: Info details */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-[#8b5cf6]/10 text-[#8b5cf6]">
                            {docItem.category}
                          </span>
                          {docItem.docType && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-400">
                              {docItem.docType}
                            </span>
                          )}
                          <span className="text-[9px] font-mono text-slate-400">
                            {docItem.decisionNo || docItem.id.replace(/^doc_/, '#')}
                          </span>
                          {(docItem.expiryDate || docItem.expiryDecision) && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-red-600/15 text-red-500 whitespace-nowrap">
                              HẾT HIỆU LỰC
                            </span>
                          )}
                          {docItem.isHidden && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 whitespace-nowrap">
                              ĐÃ ẨN
                            </span>
                          )}
                        </div>

                        <h3 className={cn("text-xs sm:text-sm font-extrabold leading-snug group-hover:text-[#8b5cf6] transition-colors", isDarkMode ? "text-slate-100" : "text-slate-800")}>
                          {docItem.title}
                        </h3>

                        <p className="text-[10px] text-slate-400 line-clamp-2 md:line-clamp-1 font-medium">
                          {docItem.text}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                          <span className="text-[9px] text-slate-500 italic font-medium">
                            Bởi {docItem.creatorName || "Hệ thống"} • {new Date(docItem.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>

                      {/* Mid-Right: Attachments & badges */}
                      <div className="flex flex-row md:flex-col items-start gap-2 shrink-0 md:justify-center border-t md:border-t-0 md:border-l border-slate-200/20 pt-3 md:pt-0 md:pl-4">
                        {docItem.pdfUrl && (
                          <div className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-xl whitespace-nowrap">
                            <FileText size={10} />
                            PDF Đính Kèm
                          </div>
                        )}
                        {(docItem.attachedUrl || (docItem.attachedUrls && docItem.attachedUrls.length > 0)) && (
                          <div className="flex items-center gap-1 text-[9px] font-black uppercase text-[#8b5cf6] bg-[#8b5cf6]/10 px-2.5 py-1 rounded-xl whitespace-nowrap">
                            <Link2 size={10} />
                            {(docItem.attachedUrls && docItem.attachedUrls.length > 1) ? `${docItem.attachedUrls.length} Tài Liệu Kèm` : "Tài Liệu Kèm"}
                          </div>
                        )}
                        {!docItem.pdfUrl && !docItem.attachedUrl && (!docItem.attachedUrls || docItem.attachedUrls.length === 0) && (
                          <span className="text-[9px] font-mono text-slate-500 italic">Không tài liệu đính kèm</span>
                        )}
                      </div>

                      {/* Right: Actions button group */}
                      <div className="flex items-center gap-1.5 relative shrink-0 self-end md:self-auto border-t md:border-t-0 border-slate-200/10 pt-2 md:pt-0">
                        {onNavigateToTab && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              localStorage.setItem('viewDocId', docItem.id);
                              onNavigateToTab('view_doc_lookup');
                            }}
                            className={cn(
                              "p-2 rounded-xl border transition-all active:scale-95 flex items-center justify-center",
                              isDarkMode
                                ? "bg-slate-950 border-slate-800 text-violet-400 hover:bg-slate-900"
                                : "bg-violet-50 border-violet-100 text-violet-600 hover:bg-white hover:shadow"
                            )}
                            title="Xem chi tiết bản A4"
                          >
                            <BookOpen size={11} />
                          </button>
                        )}

                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuDocId(activeMenuDocId === docItem.id ? null : docItem.id);
                            }}
                            className={cn(
                              "p-2 rounded-xl border transition-all active:scale-95 flex items-center justify-center",
                              isDarkMode
                               ? "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                               : "bg-slate-55 border-slate-100 bg-slate-50 text-slate-500 hover:bg-white hover:shadow"
                            )}
                            title="Thao tác"
                          >
                            <MoreVertical size={11} />
                          </button>

                          {/* Dropdown Menu */}
                          {activeMenuDocId === docItem.id && (
                            <>
                              {/* Transparent overlay backdrop to dismiss menu on outer clicks */}
                              <div 
                                className="fixed inset-0 z-40"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuDocId(null);
                                }}
                              />
                              <div 
                                className={cn(
                                  "absolute right-0 bottom-full mb-2 w-36 rounded-2xl border shadow-2xl z-50 p-1 flex flex-col gap-0.5",
                                  isDarkMode
                                    ? "bg-slate-950 border-slate-800 text-slate-200"
                                    : "bg-white border-slate-100 text-slate-705 bg-white text-slate-700"
                                )}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditInit(docItem);
                                    setActiveMenuDocId(null);
                                  }}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold w-full text-left transition-colors",
                                    isDarkMode ? "hover:bg-slate-900 hover:text-sky-400" : "hover:bg-sky-50 hover:text-sky-600"
                                  )}
                                >
                                  <Edit3 size={11} />
                                  Chỉnh sửa
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleHideDocument(docItem);
                                    setActiveMenuDocId(null);
                                  }}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold w-full text-left transition-colors",
                                    docItem.isHidden
                                      ? (isDarkMode ? "hover:bg-slate-900 hover:text-emerald-400" : "hover:bg-emerald-50 hover:text-emerald-600")
                                      : (isDarkMode ? "hover:bg-slate-900 hover:text-amber-400" : "hover:bg-amber-50 hover:text-amber-600")
                                  )}
                                >
                                  {docItem.isHidden ? (
                                    <>
                                      <Eye size={11} />
                                      Hiện văn bản
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff size={11} />
                                      Ẩn văn bản
                                    </>
                                  )}
                                </button>

                                <div className={cn("h-px my-0.5", isDarkMode ? "bg-slate-850" : "bg-slate-100")} />

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDocument(docItem.id, docItem.title);
                                    setActiveMenuDocId(null);
                                  }}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold w-full text-left transition-colors",
                                    isDarkMode ? "hover:bg-slate-900 hover:text-rose-400" : "hover:bg-rose-50 hover:text-rose-600"
                                  )}
                                >
                                  <Trash2 size={11} />
                                  Xóa tài liệu
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredDocs.map((docItem) => (
                   <div
                     key={docItem.id}
                     onClick={() => setSelectedPreviewDoc(docItem)}
                     className={cn(
                       "p-6 rounded-3xl border flex flex-col justify-between transition-all duration-300 relative group overflow-visible cursor-pointer hover:-translate-y-1 hover:shadow-xl",
                       isDarkMode 
                         ? "bg-slate-900 border-slate-850 hover:border-[#8b5cf6]/40 hover:bg-slate-900/70" 
                         : "bg-white border-slate-100 hover:border-[#8b5cf6]/20 shadow-lg shadow-slate-100/50"
                     )}
                   >
                     <div className="space-y-2">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-1.5 flex-wrap">
                           <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-[#8b5cf6]/10 text-[#8b5cf6]">
                             {docItem.category}
                           </span>
                           {(docItem.expiryDate || docItem.expiryDecision) && (
                             <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-red-600/15 text-red-500 whitespace-nowrap">
                               HẾT HIỆU LỰC
                             </span>
                           )}
                           {docItem.isHidden && (
                             <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 whitespace-nowrap">
                               ĐÃ ẨN
                             </span>
                           )}
                         </div>
                         <span className="text-[8px] font-black uppercase text-slate-400">
                            {docItem.decisionNo || docItem.id.replace(/^doc_/, '#')}
                          </span>
                       </div>

                       <h3 className={cn("text-xs font-extrabold leading-relaxed line-clamp-2 group-hover:text-[#8b5cf6] transition-colors", isDarkMode ? "text-slate-100" : "text-slate-850")}>
                         {docItem.title}
                       </h3>

                       <div className="flex items-center gap-1.5 flex-wrap">
                         {docItem.pdfUrl && (
                           <div className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg w-max mb-1">
                             <FileText size={10} />
                             PDF Đính Kèm
                           </div>
                         )}
                         {(docItem.attachedUrl || (docItem.attachedUrls && docItem.attachedUrls.length > 0)) && (
                           <div className="flex items-center gap-1 text-[9px] font-black uppercase text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-0.5 rounded-lg w-max mb-1">
                             <Link2 size={10} />
                             {(docItem.attachedUrls && docItem.attachedUrls.length > 1) ? `${docItem.attachedUrls.length} Tài Liệu Kèm` : "Tài Liệu Kèm Theo"}
                           </div>
                         )}
                       </div>

                       <p className="text-[10px] text-slate-400 line-clamp-3 font-medium mt-1">
                         {docItem.text}
                       </p>
                     </div>

                     <div className="pt-4 mt-4 border-t border-slate-200/20 flex items-center justify-between">
                       <div className="text-[9px] text-slate-500 italic font-medium">
                         Bởi {docItem.creatorName || "Hệ thống"} • {new Date(docItem.createdAt).toLocaleDateString('vi-VN')}
                       </div>

                       <div className="flex items-center gap-1.5 relative">
                         {onNavigateToTab && (
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               localStorage.setItem('viewDocId', docItem.id);
                               onNavigateToTab('view_doc_lookup');
                             }}
                             className={cn(
                               "p-2 rounded-xl border transition-all active:scale-95 flex items-center justify-center",
                               isDarkMode
                                 ? "bg-slate-950 border-slate-800 text-violet-400 hover:bg-slate-900"
                                 : "bg-violet-50 border-violet-100 text-violet-600 hover:bg-white hover:shadow"
                             )}
                             title="Xem chi tiết bản A4"
                           >
                             <BookOpen size={11} />
                           </button>
                         )}

                         <div className="relative">
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               setActiveMenuDocId(activeMenuDocId === docItem.id ? null : docItem.id);
                             }}
                             className={cn(
                               "p-2 rounded-xl border transition-all active:scale-95 flex items-center justify-center",
                               isDarkMode
                                 ? "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                                 : "bg-slate-55 border-slate-100 bg-slate-50 text-slate-500 hover:bg-white hover:shadow"
                             )}
                             title="Thao tác"
                           >
                             <MoreVertical size={11} />
                           </button>

                           {/* Dropdown Menu */}
                           {activeMenuDocId === docItem.id && (
                             <>
                               {/* Transparent overlay backdrop to dismiss menu on outer clicks */}
                               <div 
                                 className="fixed inset-0 z-40"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setActiveMenuDocId(null);
                                 }}
                               />
                               <div 
                                 className={cn(
                                   "absolute right-0 bottom-full mb-2 w-36 rounded-2xl border shadow-2xl z-50 p-1 flex flex-col gap-0.5",
                                   isDarkMode
                                     ? "bg-slate-950 border-slate-800 text-slate-200"
                                     : "bg-white border-slate-100 text-slate-700"
                                 )}
                                 onClick={(e) => e.stopPropagation()}
                               >
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleEditInit(docItem);
                                     setActiveMenuDocId(null);
                                   }}
                                   className={cn(
                                     "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold w-full text-left transition-colors",
                                     isDarkMode ? "hover:bg-slate-900 hover:text-sky-400" : "hover:bg-sky-50 hover:text-sky-600"
                                   )}
                                 >
                                   <Edit3 size={11} />
                                   Chỉnh sửa
                                 </button>

                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleToggleHideDocument(docItem);
                                     setActiveMenuDocId(null);
                                   }}
                                   className={cn(
                                     "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold w-full text-left transition-colors",
                                     docItem.isHidden
                                       ? (isDarkMode ? "hover:bg-slate-900 hover:text-emerald-400" : "hover:bg-emerald-50 hover:text-emerald-600")
                                       : (isDarkMode ? "hover:bg-slate-900 hover:text-amber-400" : "hover:bg-amber-50 hover:text-amber-600")
                                   )}
                                 >
                                   {docItem.isHidden ? (
                                     <>
                                       <Eye size={11} />
                                       Hiện văn bản
                                     </>
                                   ) : (
                                     <>
                                       <EyeOff size={11} />
                                       Ẩn văn bản
                                     </>
                                   )}
                                 </button>

                                 <div className={cn("h-px my-0.5", isDarkMode ? "bg-slate-850" : "bg-slate-100")} />

                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleDeleteDocument(docItem.id, docItem.title);
                                     setActiveMenuDocId(null);
                                   }}
                                   className={cn(
                                     "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold w-full text-left transition-colors",
                                     isDarkMode ? "hover:bg-slate-900 hover:text-rose-400" : "hover:bg-rose-50 hover:text-rose-600"
                                   )}
                                 >
                                   <Trash2 size={11} />
                                   Xóa tài liệu
                                 </button>
                               </div>
                             </>
                           )}
                         </div>
                       </div>
                     </div>
                   </div>
                 ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Management Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsCategoryModalOpen(false);
                setEditingCategoryId(null);
              }}
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={cn(
                "relative w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]",
                isDarkMode 
                  ? "bg-slate-900 border-slate-800 text-white" 
                  : "bg-white border-slate-200 text-slate-800"
              )}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-violet-600/10 text-violet-500">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">Quản lý nhóm loại văn bản</h3>
                    <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Thêm mới, sửa đổi & cập nhật phân loại</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCategoryId(null);
                  }}
                  className="p-2 rounded-xl border border-transparent hover:border-slate-500/10 hover:bg-slate-500/5 text-slate-400 transition-all active:scale-90"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Add form */}
              <div className={cn(
                "p-4 border-b",
                isDarkMode ? "bg-slate-950/30 border-slate-800" : "bg-slate-50/50 border-slate-100"
              )}>
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Thêm loại văn bản mới
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ví dụ: Tài liệu đào tạo, Quy chế..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCategory();
                    }}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-violet-500",
                      isDarkMode 
                        ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600" 
                        : "bg-white border-slate-200 placeholder-slate-400"
                    )}
                  />
                  <button
                    onClick={handleAddCategory}
                    className="px-4 py-2.5 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shadow-md"
                  >
                    <Plus size={14} />
                    Thêm
                  </button>
                </div>
              </div>

              {/* List body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 max-h-[50vh]">
                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Danh sách loại văn bản hiện có ({categories.length})
                </span>
                
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-xs font-medium text-slate-500">
                    Chưa có phân loại nào được tạo.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <div 
                        key={cat.id} 
                        className={cn(
                          "flex items-center justify-between p-3 rounded-2xl border transition-all",
                          isDarkMode 
                            ? "bg-slate-950/40 border-slate-800/60 hover:border-slate-800"
                            : "bg-slate-50/40 border-slate-200/50 hover:bg-slate-50 hover:border-slate-200"
                        )}
                      >
                        {editingCategoryId === cat.id ? (
                          <div className="flex-1 flex gap-2 mr-2">
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateCategory(cat.id, cat.name);
                              }}
                              className={cn(
                                "flex-1 px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-violet-500",
                                isDarkMode 
                                  ? "bg-slate-900 border-slate-700 text-white" 
                                  : "bg-white border-slate-300 text-slate-800"
                              )}
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleUpdateCategory(cat.id, cat.name)}
                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all active:scale-90"
                                title="Lưu thay đổi"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setEditingCategoryId(null)}
                                className="p-1.5 rounded-lg bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 transition-all active:scale-90"
                                title="Hủy bỏ"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-semibold">{cat.name}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => {
                                  setEditingCategoryId(cat.id);
                                  setEditingCategoryName(cat.name);
                                }}
                                className={cn(
                                  "p-2 rounded-xl border transition-all active:scale-90",
                                  isDarkMode
                                    ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
                                    : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm"
                                )}
                                title="Đổi tên"
                              >
                                <Edit3 size={11} />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                className={cn(
                                  "p-2 rounded-xl border transition-all active:scale-90",
                                  isDarkMode
                                    ? "bg-slate-900 border-slate-800 text-rose-400 hover:bg-slate-850 hover:border-rose-900/40"
                                    : "bg-rose-50 border-rose-100 text-rose-600 hover:bg-white hover:shadow-sm"
                                )}
                                title="Xóa"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Informative footer */}
              <div className={cn(
                "px-6 py-3 border-t text-[10px] font-medium text-slate-500 flex items-center gap-2",
                isDarkMode ? "bg-slate-950/20 border-slate-800" : "bg-slate-50 border-slate-100"
              )}>
                <span>💡</span>
                <span>Khi bạn chỉnh sửa hoặc đổi tên, tất cả tài liệu hiện có thuộc loại cũ sẽ tự động đồng bộ sang tên phân loại mới.</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Premium Document Details Preview Modal */}
      <AnimatePresence>
        {selectedPreviewDoc && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPreviewDoc(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-4xl max-h-[85vh] rounded-[32px] border shadow-2xl flex flex-col overflow-hidden transition-all duration-300",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              {/* Modal Header */}
              <div className={cn(
                "px-6 py-4 border-b flex items-center justify-between shrink-0",
                isDarkMode ? "bg-slate-950/20 border-slate-800" : "bg-slate-50/50 border-slate-100"
              )}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-violet-500/10 text-[#8b5cf6] rounded-2xl">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 className={cn("text-sm font-black uppercase tracking-widest", isDarkMode ? "text-white" : "text-slate-900")}>
                      Xem chi tiết văn bản
                    </h3>
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] flex items-center gap-1.5">
                      {selectedPreviewDoc.category}
                      {selectedPreviewDoc.isInternal && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20 whitespace-nowrap">
                          VĂN BẢN NỘI BỘ
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPreviewDoc(null)}
                  className={cn(
                    "p-2 rounded-xl transition-all hover:rotate-90",
                    isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                  )}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-left">
                {/* Meta details box */}
                <div className={cn(
                  "p-5 rounded-2xl border text-xs leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-4 font-semibold",
                  isDarkMode ? "bg-slate-950/40 border-slate-850 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
                )}>
                  <div className="space-y-2">
                    <div>
                      <span className="opacity-50 block text-[9px] uppercase tracking-wider font-black text-[#8b5cf6]">Tên văn bản:</span>
                      <span className={cn("font-black text-sm", isDarkMode ? "text-white" : "text-slate-800")}>
                        {selectedPreviewDoc.title}
                      </span>
                    </div>
                    <div>
                      <span className="opacity-50 block text-[9px] uppercase tracking-wider font-black text-[#8b5cf6]">Phân loại văn bản:</span>
                      <span className="font-bold text-violet-500 uppercase">{selectedPreviewDoc.docType || "Không rõ"}</span>
                    </div>
                    <div>
                      <span className="opacity-50 block text-[9px] uppercase tracking-wider font-black text-[#8b5cf6]">Tag Key:</span>
                      <span className="font-mono text-[10px] bg-slate-500/5 px-2 py-0.5 rounded border border-slate-500/10">
                        {selectedPreviewDoc.tagKey || "---"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="opacity-50 block text-[9px] uppercase tracking-wider font-black text-[#8b5cf6]">Số QĐ / Hiệu:</span>
                        <span className="font-mono font-bold text-amber-500">{selectedPreviewDoc.decisionNo || "---"}</span>
                      </div>
                      <div>
                        <span className="opacity-50 block text-[9px] uppercase tracking-wider font-black text-[#8b5cf6]">Ngày QĐ:</span>
                        <span className="font-bold">{selectedPreviewDoc.decisionDate ? selectedPreviewDoc.decisionDate.split('-').reverse().join('/') : "---"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="opacity-50 block text-[9px] uppercase tracking-wider font-black text-[#8b5cf6]">Cơ quan trực thuộc:</span>
                        <span>{selectedPreviewDoc.parentOrg || "---"}</span>
                      </div>
                      <div>
                        <span className="opacity-50 block text-[9px] uppercase tracking-wider font-black text-[#8b5cf6]">Đơn vị ban hành:</span>
                        <span>{selectedPreviewDoc.issuingOrg || "---"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="opacity-50 block text-[9px] uppercase tracking-wider font-black text-[#8b5cf6]">Địa danh ban hành:</span>
                        <span>{selectedPreviewDoc.issuingLocation || "---"}</span>
                      </div>
                      <div>
                        <span className="opacity-50 block text-[9px] uppercase tracking-wider font-black text-[#8b5cf6]">Người ký:</span>
                        <span className={isDarkMode ? "text-slate-200 font-bold" : "text-slate-800 font-bold"}>{selectedPreviewDoc.signer || "---"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Addressed To & Recipients Fullwidth Span */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200/15 pt-3 mt-1">
                    <div>
                      <span className="opacity-50 block text-[9px] uppercase tracking-wider font-black text-[#8b5cf6]">Kính gửi:</span>
                      <span className={isDarkMode ? "text-slate-200" : "text-slate-800"}>{selectedPreviewDoc.addressedTo || "---"}</span>
                    </div>
                    <div>
                      <span className="opacity-50 block text-[9px] uppercase tracking-wider font-black text-[#8b5cf6]">Nơi nhận:</span>
                      <span className="whitespace-pre-line font-medium text-[11px] block mt-0.5 leading-normal">{selectedPreviewDoc.recipients || "---"}</span>
                    </div>
                  </div>

                  {/* Expiry Details */}
                  {(selectedPreviewDoc.expiryDate || selectedPreviewDoc.expiryDecision) && (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-rose-500/10 bg-rose-500/5 p-3 rounded-xl mt-1">
                      <div>
                        <span className="opacity-70 block text-[9px] uppercase tracking-wider font-extrabold text-rose-500">Quyết định hết hiệu lực:</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">{selectedPreviewDoc.expiryDecision || "---"}</span>
                      </div>
                      <div>
                        <span className="opacity-70 block text-[9px] uppercase tracking-wider font-extrabold text-rose-500">Ngày hết hiệu lực:</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {selectedPreviewDoc.expiryDate ? selectedPreviewDoc.expiryDate.split('-').reverse().join('/') : "---"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Text Content display */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#8b5cf6] flex items-center gap-1">
                      <FileText size={12} />
                      Tóm tắt bằng AI
                    </span>
                    <span className="text-[9px] font-black uppercase text-slate-400">
                      {selectedPreviewDoc.text.length.toLocaleString()} Ký tự
                    </span>
                  </div>
                  <div 
                    style={{ fontFamily: 'Times New Roman', fontSize: '15px' }}
                    className={cn(
                      "p-6 rounded-2xl border font-normal leading-relaxed select-text overflow-y-auto max-h-[40vh] custom-scrollbar shadow-inner text-left",
                      isDarkMode ? "bg-slate-950/60 border-slate-850 text-slate-200" : "bg-slate-50/50 border-slate-100 text-slate-800",
                      "whitespace-normal break-words",
                    "[&_h1]:text-base [&_h1]:font-black [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-violet-500 [&_h1]:uppercase [&_h1]:tracking-wider",
                    "[&_h2]:text-sm [&_h2]:font-extrabold [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-[#8b5cf6]",
                    "[&_h3]:text-xs [&_h3]:font-bold [&_h3]:mt-2 [&_h3]:mb-1",
                    "[&_p]:mb-3 [&_p]:leading-relaxed [&_p]:text-justify",
                    "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1",
                    "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1",
                    "[&_li]:marker:text-[#8b5cf6] [&_li]:mb-1",
                    "[&_strong]:font-black",
                    "[&_hr]:my-4 [&_hr]:border-t [&_hr]:border-slate-300/30",
                    "[&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-[11px]",
                    "[&_th]:border [&_th]:border-slate-300/30 [&_th]:p-1.5 [&_th]:bg-slate-500/10 [&_th]:font-bold",
                    "[&_td]:border [&_td]:border-slate-300/30 [&_td]:p-1.5"
                  )}>
                    <Markdown remarkPlugins={[remarkGfm]}>{selectedPreviewDoc.text}</Markdown>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className={cn(
                "px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3 shrink-0",
                isDarkMode ? "bg-slate-950/20 border-slate-800" : "bg-slate-50/50 border-slate-100"
              )}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyToClipboard(selectedPreviewDoc.text)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                      copied
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                        : isDarkMode
                          ? "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {copied ? (
                      <>
                        <Check size={12} />
                        Đã sao chép!
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        Sao chép y văn
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => window.print()}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                      isDarkMode
                        ? "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <Printer size={12} />
                    In tài liệu
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {selectedPreviewDoc.pdfUrl && (
                    <a
                      href={formatDrivePreviewUrl(selectedPreviewDoc.pdfUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-amber-500/15"
                    >
                      <ExternalLink size={12} />
                      Mở liên kết PDF
                    </a>
                  )}

                  {selectedPreviewDoc.attachedUrls && selectedPreviewDoc.attachedUrls.length > 0 ? (
                    selectedPreviewDoc.attachedUrls.map((url, uidx) => (
                      <a
                        key={uidx}
                        href={formatDriveViewUrl(url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-emerald-500/15"
                      >
                        <Link2 size={12} />
                        Tài liệu kèm theo {selectedPreviewDoc.attachedUrls.length > 1 ? `#${uidx + 1}` : ""}
                      </a>
                    ))
                  ) : (
                    selectedPreviewDoc.attachedUrl && (
                      <a
                        href={formatDriveViewUrl(selectedPreviewDoc.attachedUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-emerald-500/15"
                      >
                        <Link2 size={12} />
                        Tài liệu kèm theo
                      </a>
                    )
                  )}

                  <button
                    onClick={() => setSelectedPreviewDoc(null)}
                    className="px-5 py-2.5 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    Đóng lại
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deleteConfirmData}
        onClose={() => setDeleteConfirmData(null)}
        onConfirm={executeDelete}
        title="Xác nhận xóa"
        message={deleteConfirmData?.message || ""}
        confirmText="Đồng ý xóa"
        cancelText="Hủy bỏ"
        type="danger"
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
