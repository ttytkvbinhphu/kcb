import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Presentation, LayoutTemplate, Sparkles, Play, Pause, ChevronLeft, ChevronRight, 
  Plus, Trash2, Edit3, Save, Copy, Eye, Download, Upload, RefreshCw, X, 
  ExternalLink, Check, Pill, ClipboardList, ShieldAlert, FileSearch, MessageSquare, 
  Calculator, ListTodo, Users, ArrowRight, Layers, Palette, Image as ImageIcon, 
  Video, Monitor, Cpu, Maximize2, Minimize2, Settings, Zap, CheckCircle2, Globe, HelpCircle,
  Search, Mic, ArrowUp, FolderPlus, Folder, FolderOpen, ChevronDown, FileText
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { db, collection, query, orderBy, onSnapshot, setDoc, doc, deleteDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { SlideShowcaseItem, SlideShowcaseDeck, SlideDeckSection } from '../types';
import { cn, formatDateSafe, sanitizeFirestoreData } from '../lib/utils';

interface SlideShowcaseStudioProps {
  isDarkMode: boolean;
  userRole?: string;
  uid?: string;
  onNavigateToTab?: (tab: string) => void;
  initialMode?: 'viewer' | 'designer';
}

// Default Showcase Decks
const DEFAULT_DECKS: SlideShowcaseDeck[] = [
  {
    id: 'deck_default',
    title: 'Showcase Microsoft Edge AI v151',
    description: 'Bộ slide mặc định giới thiệu tính năng AI, tìm kiếm & bảo mật phong cách Edge v151',
    category: 'Giới thiệu Hệ thống',
    badge: 'MS Edge 151',
    isDefault: true,
    order: 1
  },
  {
    id: 'deck_bhyt_2026',
    title: 'Quy Trình Khám BHYT & TT26',
    description: 'Bộ slide hướng dẫn tiếp đón BHYT, tra cứu thẻ tự động & mã ICD-10 theo Thông tư 26/2026',
    category: 'Nghiệp vụ Y tế',
    badge: 'BHYT TT26',
    order: 2
  },
  {
    id: 'deck_clinical_ai',
    title: 'Trợ Lý Y Tế AI & Cảnh Báo Thuốc',
    description: 'Bộ slide giới thiệu Copilot Y tế, kiểm tra tương tác thuốc & gợi ý phác đồ lâm sàng',
    category: 'Trợ lý AI',
    badge: 'AI Clinical',
    order: 3
  }
];

// Sample Microsoft Edge v151 Showcase Default Deck Slides
const DEFAULT_SLIDES: SlideShowcaseItem[] = [
  {
    id: 'edge-slide-1',
    deckId: 'deck_default',
    title: 'Nền Tảng Tra Cứu Y - Dược v151 Showcase',
    subtitle: 'Khám phá giao diện thiết kế phong cách Microsoft Edge hoàn toàn mới',
    category: 'Chào mừng',
    badgeText: 'EDGE v151 SHOWCASE',
    badgeVariant: 'blue',
    description: 'Hệ thống tra cứu chuyên sâu tích hợp Trợ lý AI, kiểm tra tương tác thuốc, tra cứu ICD-10 và lưu trữ hồ sơ bệnh nhân chuẩn hóa y khoa.',
    highlights: [
      'Giao diện hiện đại phong cách Microsoft Edge v151',
      'Tra cứu thuốc & hoạt chất phản ứng tức thời',
      'Phân tích văn bản & tài liệu y khoa với Trợ lý AI',
      'Cảnh báo tương tác thuốc & kiểm tra mã ICD-10'
    ],
    mediaType: 'interactive_demo',
    mockConfig: {
      previewType: 'ai_assistant_demo',
      headerTitle: 'Trợ lý AI Y Khoa v151',
      badge: 'GEMINI AI ACTIVE',
      codeSnippet: 'Hỏi AI: "Liều dùng Paracetamol ở trẻ em 15kg?" -> AI phân tích và phản hồi ngay lập tức theo chuẩn Bộ Y Tế'
    },
    primaryCta: {
      text: 'Khám phá Tra cứu Thuốc',
      actionType: 'navigate',
      targetTab: 'view_directory'
    },
    secondaryCta: {
      text: 'Tra cứu Văn bản AI',
      actionType: 'navigate',
      targetTab: 'view_doc_lookup'
    },
    layoutType: 'edge_hero',
    themeColor: 'edge_blue',
    order: 1,
    isActive: true
  },
  {
    id: 'edge-slide-2',
    deckId: 'deck_default',
    title: 'Tra Cứu Dược Khẩu & Hoạt Chất Thông Minh',
    subtitle: 'Tìm kiếm hơn 10.000+ biệt dược & thông tin dược lý đầy đủ',
    category: 'Tính năng Mới',
    badgeText: 'FEATURED 151',
    badgeVariant: 'emerald',
    description: 'Hỗ trợ tra cứu nhanh chóng theo tên biệt dược, hoạt chất, số đăng ký, chỉ định, chống chỉ định và liều dùng cho từng nhóm đối tượng cụ thể.',
    highlights: [
      'Tra cứu đa tiêu chí: Tên thuốc, Hoạt chất, Mã ATC, Nhà sản xuất',
      'Tích hợp thông số liều lượng theo tuổi, cân nặng, chức năng thận',
      'Xem thông tin tờ hướng dẫn sử dụng và cập nhật dược điển'
    ],
    mediaType: 'interactive_demo',
    mockConfig: {
      previewType: 'search_demo',
      headerTitle: 'Thanh tìm kiếm Dược phẩm v151',
      badge: '10.000+ DRUGS'
    },
    primaryCta: {
      text: 'Mở Danh mục Thuốc',
      actionType: 'navigate',
      targetTab: 'view_directory'
    },
    secondaryCta: {
      text: 'Kê toa mẫu',
      actionType: 'navigate',
      targetTab: 'view_prescription'
    },
    layoutType: 'feature_split',
    themeColor: 'emerald_teal',
    order: 2,
    isActive: true
  },
  {
    id: 'edge-slide-3',
    deckId: 'deck_default',
    title: 'Kiểm Tra Tương Tác Thuốc & Cảnh Báo Lâm Sàng',
    subtitle: 'Phát hiện sớm cặp tương tác bất lợi bảo vệ an toàn cho bệnh nhân',
    category: 'Bảo mật & Cảnh báo',
    badgeText: 'CẢNH BÁO LÂM SÀNG',
    badgeVariant: 'rose',
    description: 'Công cụ phân tích tương tác tự động đánh giá mức độ nghiêm trọng (Chống chỉ định, Nghiêm trọng, Thận trọng), đưa ra cơ chế tác dụng và hướng dẫn xử trí cụ thể.',
    highlights: [
      'Đánh giá đồng thời nhiều đơn thuốc & nhóm tương tác',
      'Mức độ tương tác rõ ràng đi kèm biểu tượng trực quan',
      'Khuyến cáo lâm sàng chi tiết theo tài liệu chính thức'
    ],
    mediaType: 'interactive_demo',
    mockConfig: {
      previewType: 'interaction_demo',
      headerTitle: 'Ma trận Kiểm tra Tương tác',
      badge: 'SAFETY MATRIX'
    },
    primaryCta: {
      text: 'Kiểm tra Tương tác ngay',
      actionType: 'navigate',
      targetTab: 'view_interaction'
    },
    secondaryCta: {
      text: 'Xem Báo cáo ADR',
      actionType: 'navigate',
      targetTab: 'view_adr'
    },
    layoutType: 'edge_hero',
    themeColor: 'sunset_rose',
    order: 3,
    isActive: true
  },
  {
    id: 'edge-slide-4',
    deckId: 'deck_default',
    title: 'Trợ Lý AI Phân Tích Văn Bản & BHYT TT26',
    subtitle: 'Tóm tắt tài liệu y tế, quy trình BHYT và tra cứu mã ICD-10 tức thời',
    category: 'Trợ lý AI',
    badgeText: 'POWERED BY GEMINI 151',
    badgeVariant: 'purple',
    description: 'Chỉ cần tải lên file PDF hoặc dán văn bản y khoa, Trợ lý AI sẽ tự động phân tích, trích xuất điểm chính, kiểm tra quy tắc thanh toán BHYT TT26 và tra cứu ICD-10 liên quan.',
    highlights: [
      'Phân tích tài liệu PDF & hình ảnh bệnh án',
      'Kiểm tra mã bệnh ICD-10 theo Thông tư 26/2023/TT-BYT',
      'Đề xuất quy tắc ghép mã và lưu trữ lịch sử tra cứu'
    ],
    mediaType: 'interactive_demo',
    mockConfig: {
      previewType: 'icd_demo',
      headerTitle: 'Trợ lý BHYT & ICD-10',
      badge: 'TT26 READY'
    },
    primaryCta: {
      text: 'Phân tích Văn bản với AI',
      actionType: 'navigate',
      targetTab: 'view_doc_lookup'
    },
    secondaryCta: {
      text: 'Danh mục ICD-10',
      actionType: 'navigate',
      targetTab: 'view_icd10'
    },
    layoutType: 'feature_split',
    themeColor: 'cyber_violet',
    order: 4,
    isActive: true
  },
  {
    id: 'edge-slide-5',
    deckId: 'deck_default',
    title: 'Hồ Sơ Bệnh Nhân & Mạng Xã Hội Y Khoa',
    subtitle: 'Kết nối đồng nghiệp, chia sẻ ca lâm sàng & quản lý bệnh án',
    category: 'Hiệu suất & Năng suất',
    badgeText: 'CỘNG ĐỒNG Y KHOA',
    badgeVariant: 'amber',
    description: 'Môi trường trao đổi chuyên môn an toàn dành cho bác sĩ và dược sĩ. Quản lý lịch công tác, danh sách việc cần làm, ghi chú cá nhân và mạng xã hội nội bộ.',
    highlights: [
      'Theo dõi tiến trình & lịch sử khám chữa bệnh',
      'Trao đổi ca bệnh khó trên Mạng xã hội y khoa',
      'Lịch trực, máy tính y khoa & ghi chú đồng bộ real-time'
    ],
    mediaType: 'interactive_demo',
    mockConfig: {
      previewType: 'stats_demo',
      headerTitle: 'Dashboard Năng suất Lâm sàng',
      badge: 'WORKFLOW'
    },
    primaryCta: {
      text: 'Truy cập Mạng xã hội',
      actionType: 'navigate',
      targetTab: 'view_social'
    },
    secondaryCta: {
      text: 'Quản lý Bệnh nhân',
      actionType: 'navigate',
      targetTab: 'view_patients'
    },
    layoutType: 'grid_spotlight',
    themeColor: 'golden_amber',
    order: 5,
    isActive: true
  }
];

const SAMPLE_BHYT_SLIDES: SlideShowcaseItem[] = [
  {
    id: 'bhyt-slide-1',
    deckId: 'deck_bhyt_2026',
    title: 'Tiếp Đón & Kiểm Tra Thẻ BHYT Tự Động',
    subtitle: 'Liên thông cổng dữ liệu BHYT quốc gia không độ trễ',
    category: 'BHYT & Tiếp đón',
    badgeText: 'TỰ ĐỘNG BHYT',
    badgeVariant: 'emerald',
    description: 'Tự động xác thực hạn sử dụng thẻ BHYT, kiểm tra lịch sử khám chữa bệnh trùng lặp và tính đúng tuyến tức thì.',
    highlights: ['Đối soát thẻ BHYT trực tuyến', 'Phát hiện khám trùng tuyến', 'Cảnh báo thẻ hết hạn'],
    mediaType: 'interactive_demo',
    mockConfig: {
      previewType: 'icd_demo',
      headerTitle: 'Hệ thống Tiếp đón BHYT 2026',
      badge: 'CỔNG BHYT'
    },
    primaryCta: { text: ' Mở Tiếp Đón BHYT', actionType: 'navigate', targetTab: 'view_patients' },
    secondaryCta: { text: 'Hướng dẫn TT26', actionType: 'navigate', targetTab: 'view_directory' },
    layoutType: 'feature_split',
    themeColor: 'emerald_teal',
    order: 1,
    isActive: true
  },
  {
    id: 'bhyt-slide-2',
    deckId: 'deck_bhyt_2026',
    title: 'Tra Cứu Mã ICD-10 & Xuất Hồ Sơ TT26',
    subtitle: 'Tự động gợi ý mã ICD-10 chuẩn Bộ Y tế',
    category: 'Nghiệp vụ Y tế',
    badgeText: 'ICD-10 chuẩn',
    badgeVariant: 'purple',
    description: 'Hệ thống gợi ý mã bệnh chính xác, kiểm tra điều kiện xuất toán BHYT giúp tối ưu tỷ lệ duyệt hồ sơ lên đến 99.8%.',
    highlights: ['Gợi ý ICD-10 thông minh', 'Cảnh báo sai mã thanh toán', 'Xuất XML 4210 tự động'],
    mediaType: 'interactive_demo',
    mockConfig: {
      previewType: 'icd_demo',
      headerTitle: 'Bộ lọc ICD-10 BHYT',
      badge: 'BHYT XML'
    },
    primaryCta: { text: 'Thống kê BHYT', actionType: 'navigate', targetTab: 'view_reports' },
    layoutType: 'grid_spotlight',
    themeColor: 'cyber_violet',
    order: 2,
    isActive: true
  }
];

const SAMPLE_CLINICAL_SLIDES: SlideShowcaseItem[] = [
  {
    id: 'clinical-slide-1',
    deckId: 'deck_clinical_ai',
    title: 'Trợ Lý Copilot Y Tế & Tra Cứu Dược Điển',
    subtitle: 'Tìm kiếm hơn 10.000+ biệt dược và hoạt chất chính xác',
    category: 'Trợ lý AI',
    badgeText: 'AI COPILOT',
    badgeVariant: 'blue',
    description: 'Hỗ trợ y bác sĩ tra cứu liều dùng, chống chỉ định, tương tác thuốc và thông tin dược lâm sàng trong giây lát.',
    highlights: ['Dược điển cập nhật 2026', 'Phân tích liều lượng theo độ tuổi', 'Trợ lý giọng nói AI'],
    mediaType: 'interactive_demo',
    mockConfig: {
      previewType: 'ai_assistant_demo',
      headerTitle: 'Copilot Tra cứu Dược phẩm',
      badge: 'MEDISOFT AI'
    },
    primaryCta: { text: 'Hỏi Copilot AI', actionType: 'navigate', targetTab: 'view_assistant' },
    layoutType: 'edge_hero',
    themeColor: 'edge_blue',
    order: 1,
    isActive: true
  },
  {
    id: 'clinical-slide-2',
    deckId: 'deck_clinical_ai',
    title: 'Cảnh Báo Tương Tác Thuốc & Dị Ứng Lâm Sàng',
    subtitle: 'Kiểm tra đơn thuốc đa tầng an toàn cho bệnh nhân',
    category: 'Bảo mật & Cảnh báo',
    badgeText: 'AN TOÀN BỆNH NHÂN',
    badgeVariant: 'rose',
    description: 'Cảnh báo đỏ ngay lập tức khi phát hiện tương tác thuốc chống chỉ định (ví dụ: Clopidogrel + Omeprazole) hoặc trùng hoạt chất.',
    highlights: ['Phát hiện tương tác mức độ Đỏ/Cam', 'Đề xuất thuốc thay thế an toàn', 'Kiểm tra tiền sử dị ứng'],
    mediaType: 'interactive_demo',
    mockConfig: {
      previewType: 'interaction_demo',
      headerTitle: 'Cảnh báo Tương tác Thuốc',
      badge: 'DƯỢC LÂM SÀNG'
    },
    primaryCta: { text: 'Xem Cảnh báo Thuốc', actionType: 'navigate', targetTab: 'view_directory' },
    layoutType: 'feature_split',
    themeColor: 'sunset_rose',
    order: 2,
    isActive: true
  }
];

const ALL_INITIAL_SLIDES: SlideShowcaseItem[] = [
  ...DEFAULT_SLIDES.map(s => ({ ...s, deckId: s.deckId || 'deck_default' })),
  ...SAMPLE_BHYT_SLIDES,
  ...SAMPLE_CLINICAL_SLIDES
];

export default function SlideShowcaseStudio({ isDarkMode, userRole = 'member', uid, onNavigateToTab, initialMode }: SlideShowcaseStudioProps) {
  const [decks, setDecks] = useState<SlideShowcaseDeck[]>(DEFAULT_DECKS);
  const [activeDeckId, setActiveDeckId] = useState<string>('deck_default');
  const [slides, setSlides] = useState<SlideShowcaseItem[]>(ALL_INITIAL_SLIDES);

  const [mode, setMode] = useState<'viewer' | 'designer'>(initialMode || 'viewer');
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');
  const [activeTemplate, setActiveTemplate] = useState<'split' | 'deck_3d'>('deck_3d');
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playInterval, setPlayInterval] = useState<number>(5000);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Deck Management Modal States
  const [isCreateDeckModalOpen, setIsCreateDeckModalOpen] = useState<boolean>(false);
  const [newDeckTitle, setNewDeckTitle] = useState<string>('');
  const [newDeckDesc, setNewDeckDesc] = useState<string>('');
  const [newDeckCategory, setNewDeckCategory] = useState<string>('Nghiệp vụ Y tế');
  const [newDeckTemplate, setNewDeckTemplate] = useState<'edge_ai' | 'bhyt' | 'clinical' | 'blank'>('edge_ai');

  const [isEditDeckModalOpen, setIsEditDeckModalOpen] = useState<boolean>(false);
  const [editingDeck, setEditingDeck] = useState<Partial<SlideShowcaseDeck>>({});

  // Slide Editor states
  const [editingSlide, setEditingSlide] = useState<Partial<SlideShowcaseItem>>({});
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [highlightInput, setHighlightInput] = useState<string>('');

  // Interactive Demo State inside Slide Showcase
  const [demoSearch, setDemoSearch] = useState<string>('Paracetamol');
  const [demoAiPrompt, setDemoAiPrompt] = useState<string>('Phác đồ điều trị tăng huyết áp độ 1?');
  const [demoAiReply, setDemoAiReply] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Firestore Sync - Decks
  useEffect(() => {
    const q = query(collection(db, 'slides_showcase_decks'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...sanitizeFirestoreData(d.data()) } as SlideShowcaseDeck));
        setDecks(fetched);
      }
    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.warn("Firestore slides_showcase_decks error:", error);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync - Slides
  useEffect(() => {
    const q = query(collection(db, 'slides_showcase'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...sanitizeFirestoreData(d.data()) } as SlideShowcaseItem));
        setSlides(fetched);
      }
    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.warn("Firestore slides_showcase error:", error);
      }
    });
    return () => unsubscribe();
  }, []);

  // Current Selected Deck Object
  const currentDeck = React.useMemo(() => {
    return decks.find(d => d.id === activeDeckId) || decks[0] || DEFAULT_DECKS[0];
  }, [decks, activeDeckId]);

  // Slides belonging to the currently active deck
  const currentDeckSlides = React.useMemo(() => {
    return slides.filter(s => (s.deckId || 'deck_default') === activeDeckId);
  }, [slides, activeDeckId]);

  // Filter current deck's slides by active category
  const filteredSlides = React.useMemo(() => {
    const activeOnly = currentDeckSlides.filter(s => s.isActive !== false);
    if (activeCategory === 'Tất cả') return activeOnly;
    return activeOnly.filter(s => s.category === activeCategory);
  }, [currentDeckSlides, activeCategory]);

  // Ensure current slide index is valid when switching decks or categories
  useEffect(() => {
    if (currentSlideIndex >= filteredSlides.length && filteredSlides.length > 0) {
      setCurrentSlideIndex(0);
    }
  }, [filteredSlides.length, currentSlideIndex]);

  // Autoplay Timer
  useEffect(() => {
    if (!isPlaying || filteredSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % filteredSlides.length);
    }, playInterval);
    return () => clearInterval(timer);
  }, [isPlaying, filteredSlides.length, playInterval]);

  // Unique Categories List for active deck
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    currentDeckSlides.forEach(s => {
      if (s.category) set.add(s.category);
    });
    return ['Tất cả', ...Array.from(set)];
  }, [currentDeckSlides]);

  // Key Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'viewer') return;
      if (e.key === 'ArrowRight') {
        handleNextSlide();
      } else if (e.key === 'ArrowLeft') {
        handlePrevSlide();
      } else if (e.key === ' ') {
        setIsPlaying(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredSlides.length, mode]);

  const handleNextSlide = () => {
    if (filteredSlides.length === 0) return;
    setCurrentSlideIndex(prev => (prev + 1) % filteredSlides.length);
  };

  const handlePrevSlide = () => {
    if (filteredSlides.length === 0) return;
    setCurrentSlideIndex(prev => (prev - 1 + filteredSlides.length) % filteredSlides.length);
  };

  // CREATE A BRAND NEW SLIDE SHOWCASE DECK
  const handleCreateDeck = async () => {
    if (!newDeckTitle.trim()) {
      alert("Vui lòng nhập Tên Bộ Slide Showcase!");
      return;
    }

    const newDeckId = `deck-${Date.now()}`;
    const newDeckObj: SlideShowcaseDeck = {
      id: newDeckId,
      title: newDeckTitle.trim(),
      description: newDeckDesc.trim() || 'Bộ slide showcase mới tạo',
      category: newDeckCategory.trim() || 'Nghiệp vụ Y tế',
      badge: 'MỚI TẠO',
      isDefault: false,
      order: decks.length + 1,
      createdAt: new Date().toISOString(),
      createdBy: uid || 'admin'
    };

    // Generate starter slides based on selected template
    let starterSlides: SlideShowcaseItem[] = [];
    if (newDeckTemplate === 'edge_ai') {
      starterSlides = DEFAULT_SLIDES.map((s, idx) => ({
        ...s,
        id: `slide-${newDeckId}-${idx + 1}`,
        deckId: newDeckId,
        order: idx + 1
      }));
    } else if (newDeckTemplate === 'bhyt') {
      starterSlides = SAMPLE_BHYT_SLIDES.map((s, idx) => ({
        ...s,
        id: `slide-${newDeckId}-${idx + 1}`,
        deckId: newDeckId,
        order: idx + 1
      }));
    } else if (newDeckTemplate === 'clinical') {
      starterSlides = SAMPLE_CLINICAL_SLIDES.map((s, idx) => ({
        ...s,
        id: `slide-${newDeckId}-${idx + 1}`,
        deckId: newDeckId,
        order: idx + 1
      }));
    } else {
      // Blank starter slide
      starterSlides = [
        {
          id: `slide-${newDeckId}-1`,
          deckId: newDeckId,
          title: `Slide Mở Đầu - ${newDeckTitle.trim()}`,
          subtitle: 'Thiết kế slide showcase cá nhân hóa của bạn',
          category: newDeckCategory.trim() || 'Chung',
          badgeText: 'SLIDE 1',
          badgeVariant: 'blue',
          description: 'Mô tả nội dung trọng tâm cho slide này trong bộ slide mới.',
          highlights: ['Điểm nổi bật 1', 'Điểm nổi bật 2'],
          mediaType: 'interactive_demo',
          mockConfig: {
            previewType: 'ai_assistant_demo',
            headerTitle: newDeckTitle.trim(),
            badge: 'MEDISOFT'
          },
          primaryCta: { text: 'Khám phá ngay', actionType: 'navigate', targetTab: 'dashboard' },
          layoutType: 'edge_hero',
          themeColor: 'edge_blue',
          order: 1,
          isActive: true
        }
      ];
    }

    try {
      // Save new deck to Firestore
      await setDoc(doc(db, 'slides_showcase_decks', newDeckId), newDeckObj);
      setDecks(prev => [...prev, newDeckObj]);

      // Save starter slides to Firestore
      for (const item of starterSlides) {
        await setDoc(doc(db, 'slides_showcase', item.id), item);
      }
      setSlides(prev => [...prev, ...starterSlides]);

      // Automatically switch to the newly created deck
      setActiveDeckId(newDeckId);
      setCurrentSlideIndex(0);

      // Reset modal fields
      setNewDeckTitle('');
      setNewDeckDesc('');
      setIsCreateDeckModalOpen(false);
    } catch (err) {
      console.error("Error creating new deck:", err);
      // Fallback local update
      setDecks(prev => [...prev, newDeckObj]);
      setSlides(prev => [...prev, ...starterSlides]);
      setActiveDeckId(newDeckId);
      setCurrentSlideIndex(0);
      setIsCreateDeckModalOpen(false);
    }
  };

  // UPDATE EXISTING SLIDE SHOWCASE DECK METADATA
  const handleSaveDeckEdit = async () => {
    if (!editingDeck.id || !editingDeck.title) return;

    try {
      await setDoc(doc(db, 'slides_showcase_decks', editingDeck.id), {
        ...editingDeck,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setDecks(prev => prev.map(d => d.id === editingDeck.id ? { ...d, ...editingDeck } as SlideShowcaseDeck : d));
      setIsEditDeckModalOpen(false);
    } catch (err) {
      console.error("Error updating deck:", err);
      setDecks(prev => prev.map(d => d.id === editingDeck.id ? { ...d, ...editingDeck } as SlideShowcaseDeck : d));
      setIsEditDeckModalOpen(false);
    }
  };

  // DUPLICATE A SLIDE SHOWCASE DECK
  const handleDuplicateDeck = async (targetDeckId: string) => {
    const sourceDeck = decks.find(d => d.id === targetDeckId);
    if (!sourceDeck) return;

    const newDeckId = `deck-${Date.now()}`;
    const duplicatedDeck: SlideShowcaseDeck = {
      ...sourceDeck,
      id: newDeckId,
      title: `Bản sao - ${sourceDeck.title}`,
      isDefault: false,
      order: decks.length + 1,
      createdAt: new Date().toISOString()
    };

    const sourceSlides = slides.filter(s => (s.deckId || 'deck_default') === targetDeckId);
    const duplicatedSlides = sourceSlides.map((s, idx) => ({
      ...s,
      id: `slide-${newDeckId}-${idx + 1}`,
      deckId: newDeckId
    }));

    try {
      await setDoc(doc(db, 'slides_showcase_decks', newDeckId), duplicatedDeck);
      setDecks(prev => [...prev, duplicatedDeck]);

      for (const item of duplicatedSlides) {
        await setDoc(doc(db, 'slides_showcase', item.id), item);
      }
      setSlides(prev => [...prev, ...duplicatedSlides]);

      setActiveDeckId(newDeckId);
      setCurrentSlideIndex(0);
    } catch (err) {
      console.error("Error duplicating deck:", err);
      setDecks(prev => [...prev, duplicatedDeck]);
      setSlides(prev => [...prev, ...duplicatedSlides]);
      setActiveDeckId(newDeckId);
      setCurrentSlideIndex(0);
    }
  };

  // DELETE A SLIDE SHOWCASE DECK
  const handleDeleteDeck = async (targetDeckId: string) => {
    if (decks.length <= 1) {
      alert("Không thể xóa bộ slide duy nhất còn lại!");
      return;
    }

    const targetDeck = decks.find(d => d.id === targetDeckId);
    if (!targetDeck) return;

    if (window.confirm(`Bạn có chắc chắn muốn xóa bộ slide "${targetDeck.title}" cùng toàn bộ slide bên trong không?`)) {
      try {
        await deleteDoc(doc(db, 'slides_showcase_decks', targetDeckId));
        const targetSlides = slides.filter(s => (s.deckId || 'deck_default') === targetDeckId);
        for (const s of targetSlides) {
          await deleteDoc(doc(db, 'slides_showcase', s.id));
        }
      } catch (err) {
        console.error("Error deleting deck:", err);
      }

      setDecks(prev => prev.filter(d => d.id !== targetDeckId));
      setSlides(prev => prev.filter(s => (s.deckId || 'deck_default') !== targetDeckId));

      const remaining = decks.filter(d => d.id !== targetDeckId);
      if (remaining.length > 0) {
        setActiveDeckId(remaining[0].id);
        setCurrentSlideIndex(0);
      }
    }
  };

  // Seed default template slides
  const handleSeedDefaults = async () => {
    if (window.confirm("Bạn có muốn nạp bộ Slide Mẫu phong cách Microsoft Edge v151 không?")) {
      try {
        for (const slide of DEFAULT_SLIDES) {
          await setDoc(doc(db, 'slides_showcase', slide.id), {
            ...slide,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        setSlides(prev => [...prev.filter(s => s.deckId !== 'deck_default'), ...DEFAULT_SLIDES]);
        alert("Đã nạp thành công bộ Slide Showcase mẫu!");
      } catch (err) {
        console.error("Error seeding slides:", err);
      }
    }
  };

  // Save or Update Slide inside Active Deck
  const handleSaveSlide = async () => {
    if (!editingSlide.title || !editingSlide.category) {
      alert("Vui lòng nhập đầy đủ Tiêu đề và Danh mục!");
      return;
    }

    const id = editingSlide.id || `slide-${Date.now()}`;
    const newSlideData: SlideShowcaseItem = {
      id,
      deckId: editingSlide.deckId || activeDeckId, // Link slide to active deck
      title: editingSlide.title || '',
      subtitle: editingSlide.subtitle || '',
      category: editingSlide.category || 'Tính năng Mới',
      badgeText: editingSlide.badgeText || 'SHOWCASE',
      badgeVariant: editingSlide.badgeVariant || 'blue',
      description: editingSlide.description || '',
      highlights: editingSlide.highlights || [],
      mediaType: editingSlide.mediaType || 'interactive_demo',
      mediaUrl: editingSlide.mediaUrl || '',
      mockConfig: editingSlide.mockConfig || { previewType: 'ai_assistant_demo', headerTitle: 'Demo' },
      primaryCta: editingSlide.primaryCta || { text: 'Khám phá ngay', actionType: 'navigate', targetTab: 'view_directory' },
      secondaryCta: editingSlide.secondaryCta || { text: 'Xem thêm', actionType: 'navigate', targetTab: 'dashboard' },
      layoutType: editingSlide.layoutType || 'edge_hero',
      themeColor: editingSlide.themeColor || 'edge_blue',
      order: editingSlide.order ?? (currentDeckSlides.length + 1),
      isActive: editingSlide.isActive ?? true,
      createdBy: uid || 'admin',
      createdAt: editingSlide.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'slides_showcase', id), newSlideData);
      setSlides(prev => {
        const idx = prev.findIndex(s => s.id === id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = newSlideData;
          return updated;
        }
        return [...prev, newSlideData];
      });
      setIsEditorOpen(false);
      setEditingSlide({});
    } catch (e) {
      console.error("Error saving slide:", e);
      alert("Lỗi khi lưu slide!");
    }
  };

  // Delete slide
  const handleDeleteSlide = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa slide này?")) {
      try {
        await deleteDoc(doc(db, 'slides_showcase', id));
        setSlides(prev => prev.filter(s => s.id !== id));
      } catch (e) {
        console.error("Error deleting slide:", e);
      }
    }
  };

  // Move slide up/down order
  const handleMoveSlide = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === slides.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;

    // Update orders
    const updated = newSlides.map((s, idx) => ({ ...s, order: idx + 1 }));
    setSlides(updated);

    try {
      for (const item of updated) {
        await setDoc(doc(db, 'slides_showcase', item.id), item, { merge: true });
      }
    } catch (e) {
      console.error("Failed to reorder:", e);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(slides, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `edge_slides_showcase_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item.id && item.title) {
                await setDoc(doc(db, 'slides_showcase', item.id), item);
              }
            }
            alert("Đã nhập thành công bộ slide!");
          }
        } catch (err) {
          alert("File JSON không hợp lệ!");
        }
      };
    }
  };

  // Trigger CTA Navigation
  const handleCtaClick = (cta?: { text: string; actionType: string; targetTab?: string; url?: string }) => {
    if (!cta) return;
    if (cta.actionType === 'navigate' && cta.targetTab && onNavigateToTab) {
      onNavigateToTab(cta.targetTab);
    } else if (cta.actionType === 'external_link' && cta.url) {
      window.open(cta.url, '_blank');
    }
  };

  // Current active slide object
  const currentSlide = filteredSlides[currentSlideIndex] || slides[0] || DEFAULT_SLIDES[0];

  // Helper theme classes
  const getThemeGradient = (color?: string) => {
    switch (color) {
      case 'emerald_teal':
        return isDarkMode 
          ? 'from-emerald-950/80 via-slate-900 to-teal-950/70 border-emerald-500/30 text-emerald-400' 
          : 'from-emerald-500/10 via-teal-500/5 to-white border-emerald-200 text-emerald-700';
      case 'cyber_violet':
        return isDarkMode 
          ? 'from-purple-950/80 via-slate-900 to-indigo-950/70 border-purple-500/30 text-purple-400' 
          : 'from-purple-500/10 via-indigo-500/5 to-white border-purple-200 text-purple-700';
      case 'sunset_rose':
        return isDarkMode 
          ? 'from-rose-950/80 via-slate-900 to-pink-950/70 border-rose-500/30 text-rose-400' 
          : 'from-rose-500/10 via-pink-500/5 to-white border-rose-200 text-rose-700';
      case 'golden_amber':
        return isDarkMode 
          ? 'from-amber-950/80 via-slate-900 to-yellow-950/70 border-amber-500/30 text-amber-400' 
          : 'from-amber-500/10 via-yellow-500/5 to-white border-amber-200 text-amber-700';
      case 'slate_dark':
        return isDarkMode 
          ? 'from-slate-900 via-slate-950 to-slate-900 border-slate-700 text-slate-300' 
          : 'from-slate-100 via-slate-50 to-white border-slate-300 text-slate-800';
      case 'edge_blue':
      default:
        return isDarkMode 
          ? 'from-blue-950/80 via-slate-900 to-cyan-950/70 border-blue-500/30 text-blue-400' 
          : 'from-blue-500/10 via-cyan-500/5 to-white border-blue-200 text-blue-700';
    }
  };

  const getBadgeStyle = (variant?: string) => {
    switch (variant) {
      case 'emerald':
        return isDarkMode 
          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'purple':
        return isDarkMode 
          ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' 
          : 'bg-purple-50 text-purple-700 border-purple-200';
      case 'rose':
        return isDarkMode 
          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
          : 'bg-rose-50 text-rose-700 border-rose-200';
      case 'amber':
        return isDarkMode 
          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
          : 'bg-amber-50 text-amber-800 border-amber-200';
      case 'dark':
        return isDarkMode
          ? 'bg-slate-700/30 text-slate-300 border-slate-600'
          : 'bg-slate-100 text-slate-800 border-slate-300';
      case 'blue':
      default:
        return isDarkMode 
          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' 
          : 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  // Mock AI response demo handler
  const handleRunAiDemo = () => {
    setIsAiThinking(true);
    setDemoAiReply(null);
    setTimeout(() => {
      setIsAiThinking(false);
      setDemoAiReply(
        `📌 **Phác đồ khuyến cáo theo VNHA 2023:**\n` +
        `- **Bước 1:** Thay đổi lối sống (Giảm muối <5g/ngày, tập thể dục 30p/ngày, ngưng thuốc lá).\n` +
        `- **Bước 2:** Phối hợp 2 thuốc liều thấp (Amlodipine 5mg + Telmisartan 40mg) uống buổi sáng.\n` +
        `- **Chú ý:** Tái khám theo dõi huyết áp mục tiêu <130/80 mmHg sau 2-4 tuần.`
      );
    }, 900);
  };

  // Render Mẫu 2: Edge 3D Stacked Card Deck Carousel
  const render3dDeckViewer = () => {
    if (!currentSlide) return null;

    return (
      <div className="w-full flex flex-col gap-6 bg-slate-950 text-white rounded-[32px] sm:rounded-[40px] p-4 sm:p-8 lg:p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Background Subtle Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-blue-600/10 blur-[120px] pointer-events-none rounded-full" />

        {/* TOP DECK CAROUSEL STAGE */}
        <div className="relative w-full min-h-[460px] sm:min-h-[520px] flex items-center justify-center py-6">
          <div className="relative w-full max-w-2xl sm:max-w-3xl flex items-center justify-center min-h-[440px]">
            {filteredSlides.map((slide, idx) => {
              const total = filteredSlides.length;
              let offset = idx - currentSlideIndex;
              if (offset < 0) offset += total;

              if (offset > 2 && offset !== total - 1) return null;

              const isActive = offset === 0;
              const isNext1 = offset === 1;
              const isNext2 = offset === 2;

              let zIndex = 10;
              let scale = 0.75;
              let translateX = 0;
              let rotateY = 0;
              let opacity = 0;

              if (isActive) {
                zIndex = 30;
                scale = 1;
                translateX = 0;
                rotateY = 0;
                opacity = 1;
              } else if (isNext1) {
                zIndex = 20;
                scale = 0.91;
                translateX = 85;
                rotateY = -7;
                opacity = 0.7;
              } else if (isNext2) {
                zIndex = 10;
                scale = 0.82;
                translateX = 160;
                rotateY = -12;
                opacity = 0.35;
              } else {
                zIndex = 5;
                scale = 0.7;
                translateX = -100;
                opacity = 0;
              }

              const getStageBg = (theme?: string, category?: string) => {
                if (theme === 'emerald_teal' || category === 'Tính năng Mới') return 'bg-[#122e25] border-emerald-800/40';
                if (theme === 'sunset_rose' || category === 'Bảo mật & Cảnh báo') return 'bg-[#2b1721] border-rose-800/40';
                if (theme === 'cyber_violet' || category === 'Trợ lý AI') return 'bg-[#1b1733] border-purple-800/40';
                if (theme === 'golden_amber') return 'bg-[#2b2214] border-amber-800/40';
                return 'bg-[#ebf4d9] border-slate-200/40';
              };

              return (
                <motion.div
                  key={slide.id || idx}
                  onClick={() => {
                    if (!isActive) setCurrentSlideIndex(idx);
                  }}
                  animate={{
                    scale,
                    x: translateX,
                    rotateY,
                    opacity,
                    zIndex,
                  }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    "absolute top-0 w-full max-w-xl sm:max-w-2xl rounded-[32px] border shadow-2xl overflow-hidden cursor-pointer transition-shadow",
                    isActive ? "ring-2 ring-blue-500/30 shadow-blue-500/10" : "hover:brightness-110"
                  )}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="bg-[#1c2230] text-white flex flex-col overflow-hidden">
                    {/* TOP MEDIA VISUAL STAGE */}
                    <div className={cn(
                      "relative w-full h-64 sm:h-72 p-6 flex items-center justify-center overflow-hidden rounded-t-[32px] transition-colors",
                      getStageBg(slide.themeColor, slide.category)
                    )}>
                      {slide.mediaType === 'image' && slide.mediaUrl ? (
                        <img src={slide.mediaUrl} alt={slide.title} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {(slide.category === 'Chào mừng' || slide.mockConfig?.previewType === 'ai_assistant_demo') && (
                            <div className="relative w-full h-full flex items-center justify-center">
                              <div className="absolute w-28 sm:w-36 h-36 sm:h-44 rounded-2xl overflow-hidden shadow-xl border border-white/20 transform -rotate-12 -translate-x-20 sm:-translate-x-28 translate-y-2 bg-gradient-to-br from-amber-300 to-amber-600 p-1">
                                <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&auto=format&fit=crop&q=60" alt="Travel" className="w-full h-full object-cover rounded-xl" />
                              </div>
                              <div className="absolute w-28 sm:w-36 h-36 sm:h-44 rounded-2xl overflow-hidden shadow-xl border border-white/20 transform rotate-12 translate-x-20 sm:translate-x-28 translate-y-2 bg-gradient-to-br from-teal-300 to-emerald-600 p-1">
                                <img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=60" alt="Camera" className="w-full h-full object-cover rounded-xl" />
                              </div>
                              <div className="relative w-36 sm:w-44 h-40 sm:h-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/40 bg-slate-900 z-10 p-1">
                                <img src="https://images.unsplash.com/photo-1548625361-183ba324482a?w=400&auto=format&fit=crop&q=60" alt="Landscape" className="w-full h-full object-cover rounded-xl" />
                              </div>
                              <div className="absolute z-20 bottom-4 inset-x-4 sm:inset-x-8 p-2.5 sm:p-3 rounded-2xl bg-white/95 text-slate-900 shadow-2xl backdrop-blur-md border border-white/40 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 truncate text-xs font-bold">
                                  <span className="p-1 rounded-xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 text-white shrink-0">
                                    <Sparkles size={14} />
                                  </span>
                                  <span className="truncate">{slide.mockConfig?.headerTitle || 'Lên kế hoạch chuyến đi y khoa với AI...'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                                  <Mic size={14} />
                                  <div className="p-1 rounded-xl bg-slate-900 text-white">
                                    <ArrowUp size={12} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {(slide.category === 'Tính năng Mới' || slide.mockConfig?.previewType === 'search_demo') && (
                            <div className="relative w-full h-full flex items-center justify-center">
                              <div className="absolute w-44 sm:w-56 h-32 sm:h-40 rounded-xl bg-slate-900/90 border border-emerald-500/40 shadow-xl transform -rotate-6 -translate-x-16 sm:-translate-x-24 opacity-80 overflow-hidden p-2">
                                <div className="h-3 w-full bg-slate-800 rounded-md mb-2 flex items-center px-1.5 gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                </div>
                                <div className="w-full h-full bg-emerald-950/60 rounded-lg p-2 text-[10px] text-emerald-300">
                                  💊 Paracetamol 500mg - Dược điển 2026
                                </div>
                              </div>
                              <div className="absolute w-44 sm:w-56 h-32 sm:h-40 rounded-xl bg-slate-900/90 border border-teal-500/40 shadow-xl transform rotate-6 translate-x-16 sm:translate-x-24 opacity-80 overflow-hidden p-2">
                                <div className="h-3 w-full bg-slate-800 rounded-md mb-2 flex items-center px-1.5 gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                </div>
                                <div className="w-full h-full bg-teal-950/60 rounded-lg p-2 text-[10px] text-teal-300">
                                  🩺 Hướng dẫn chẩn đoán & điều trị
                                </div>
                              </div>
                              <div className="relative z-10 w-52 sm:w-64 h-36 sm:h-44 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 border-2 border-white/30 shadow-2xl overflow-hidden p-2.5 flex flex-col justify-between">
                                <div className="h-4 w-full bg-white/20 backdrop-blur-md rounded-lg flex items-center px-2 gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-rose-400" />
                                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                  <span className="text-[9px] font-bold text-white ml-2 truncate">Tra cứu Dược phẩm v151</span>
                                </div>
                                <div className="my-auto p-3 bg-slate-950/70 backdrop-blur-md rounded-xl text-center space-y-1">
                                  <span className="text-xl">🐼</span>
                                  <p className="text-xs font-black text-white">Tra cứu hơn 10.000+ Dược phẩm</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {(slide.category === 'Bảo mật & Cảnh báo' || slide.mockConfig?.previewType === 'interaction_demo') && (
                            <div className="relative w-full h-full flex items-center justify-center">
                              <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/90 border border-rose-500/40 shadow-2xl max-w-sm text-center space-y-2 backdrop-blur-md">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-black">
                                  <ShieldAlert size={14} />
                                  <span>CẢNH BÁO TƯƠNG TÁC THUỐC</span>
                                </div>
                                <p className="text-xs text-rose-200 font-bold">
                                  Clopidogrel + Omeprazole (Chống chỉ định)
                                </p>
                                <div className="text-[11px] text-rose-300/80 bg-rose-900/50 p-2 rounded-xl">
                                  Giảm hiệu lực chống tập kết tiểu cầu -&gt; Thay bằng Pantoprazole
                                </div>
                              </div>
                            </div>
                          )}

                          {(slide.category === 'Trợ lý AI' || slide.mockConfig?.previewType === 'icd_demo') && (
                            <div className="relative w-full h-full flex items-center justify-center">
                              <div className="p-4 rounded-2xl bg-purple-950/90 border border-purple-500/40 shadow-2xl max-w-sm text-center space-y-2 backdrop-blur-md">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500 text-white text-xs font-black">
                                  <FileSearch size={14} />
                                  <span>PHÂN TÍCH VĂN BẢN BHYT TT26</span>
                                </div>
                                <div className="flex justify-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded-md bg-purple-800 text-purple-200 text-[10px] font-mono">E11.9</span>
                                  <span className="px-2 py-0.5 rounded-md bg-purple-800 text-purple-200 text-[10px] font-mono">I10</span>
                                  <span className="px-2 py-0.5 rounded-md bg-purple-800 text-purple-200 text-[10px] font-mono">J45</span>
                                </div>
                                <p className="text-xs text-purple-200 font-medium">
                                  AI tự động đối soát điều kiện thanh toán BHYT
                                </p>
                              </div>
                            </div>
                          )}

                          {!['Chào mừng', 'Tính năng Mới', 'Bảo mật & Cảnh báo', 'Trợ lý AI'].includes(slide.category) && 
                           !['ai_assistant_demo', 'search_demo', 'interaction_demo', 'icd_demo'].includes(slide.mockConfig?.previewType || '') && (
                            <div className="text-center p-4 space-y-2">
                              <Sparkles size={36} className="mx-auto text-amber-400 animate-bounce" />
                              <h4 className="font-black text-sm text-white">{slide.title}</h4>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* BOTTOM TEXT CONTENT */}
                    <div className="p-6 sm:p-8 text-center flex flex-col items-center justify-between gap-3 min-h-[160px]">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                          {slide.title}
                        </h3>
                        <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-md mx-auto line-clamp-2 leading-relaxed font-normal">
                          {slide.description}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (slide.primaryCta) handleCtaClick(slide.primaryCta);
                        }}
                        className="mt-1 px-6 sm:px-8 py-2.5 rounded-full bg-white hover:bg-blue-50 text-slate-900 font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all"
                      >
                        <Sparkles size={15} className="text-blue-600" />
                        <span>{slide.primaryCta?.text || 'Dùng thử ngay'}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM CONTROLS & PAGINATION */}
        <div className="flex flex-col items-center justify-center gap-4 pt-2">
          <div className="flex items-center gap-2">
            {filteredSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  idx === currentSlideIndex
                    ? "w-7 bg-white shadow-md shadow-white/20"
                    : "w-2 bg-slate-600 hover:bg-slate-400"
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevSlide}
              title="Slide trước"
              className="p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNextSlide}
              className="px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>Tiếp theo</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* FOOTER BAR */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black">
              e
            </div>
            <span className="font-bold text-slate-200">Các thông tin mới trong Microsoft Edge (Medisoft v151)</span>
          </div>

          <div className="text-slate-500 text-[10px] text-center">
            Nội dung trên trang này có thể đã được dịch bằng AI (Trí tuệ nhân tạo).
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm web"
                className="bg-slate-900 border border-slate-800 rounded-full px-3.5 py-1 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-36 sm:w-44"
              />
              <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="hover:underline cursor-pointer">Lựa chọn quyền riêng tư</span>
              <span className="hover:underline cursor-pointer">Quyền riêng tư</span>
              <span>© Medisoft 2026</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "w-full min-h-screen transition-colors p-3 sm:p-6 lg:p-8 flex flex-col font-sans",
        isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      )}
    >
      {/* TOP CONTROL HEADER */}
      <div className={cn(
        "w-full max-w-7xl mx-auto rounded-3xl p-4 sm:p-5 mb-6 border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md transition-all",
        isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-200/80"
      )}>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-blue-600 to-cyan-500 text-white rounded-2xl shadow-md shadow-blue-500/20 shrink-0">
              <Presentation size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                  Trình Thiết Kế Slide Showcase
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/30">
                  MS EDGE v151
                </span>
              </div>
              <p className={cn("text-[11px] font-medium", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Thiết kế & trình chiếu slide tương tác phong cách Microsoft Edge Welcome
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
          {/* Template Layout Switcher */}
          <div className={cn(
            "p-1 rounded-2xl border flex items-center gap-1",
            isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
          )}>
            <button
              onClick={() => setActiveTemplate('split')}
              title="Mẫu 1: Giao diện Split View + Live Widget"
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                activeTemplate === 'split' 
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm" 
                  : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <LayoutTemplate size={13} />
              <span className="hidden sm:inline">Mẫu 1: Studio Split</span>
              <span className="sm:hidden">Mẫu 1</span>
            </button>
            <button
              onClick={() => setActiveTemplate('deck_3d')}
              title="Mẫu 2: Giao diện Thẻ 3D Xếp Lớp (Welcome Edge 151)"
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                activeTemplate === 'deck_3d' 
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm" 
                  : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Layers size={13} />
              <span className="hidden sm:inline">Mẫu 2: Thẻ 3D Xếp Lớp</span>
              <span className="sm:hidden">Mẫu 2</span>
            </button>
          </div>

          {/* Mode Switcher */}
          <div className={cn(
            "p-1 rounded-2xl border flex items-center gap-1",
            isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
          )}>
            <button
              onClick={() => setMode('viewer')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                mode === 'viewer' 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Play size={13} />
              <span>Trình chiếu</span>
            </button>
            <button
              onClick={() => setMode('designer')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                mode === 'designer' 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <LayoutTemplate size={13} />
              <span>Thiết kế Slide</span>
            </button>
          </div>

          {/* Preset Defaults Button */}
          <button
            onClick={handleSeedDefaults}
            title="Nạp bộ Slide Mẫu Edge v151"
            className={cn(
              "p-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95",
              isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            )}
          >
            <Sparkles size={15} className="text-amber-500" />
            <span className="hidden md:inline">Nạp Mẫu Edge v151</span>
          </button>
        </div>
      </div>

      {/* SHOWCASE DECK SELECTOR & MANAGEMENT BAR */}
      <div className={cn(
        "w-full max-w-7xl mx-auto rounded-3xl p-3.5 sm:p-4 mb-6 border shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 backdrop-blur-md transition-all",
        isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-200/90"
      )}>
        {/* Left: Active Deck Info & Selector Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shrink-0 shadow-sm">
              <FolderOpen size={18} />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 shrink-0">
              Danh Sách Slide Showcase:
            </span>
          </div>

          {/* Deck Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full no-scrollbar">
            {decks.map((deck) => {
              const deckSlideCount = slides.filter(s => (s.deckId || 'deck_default') === deck.id && s.isActive !== false).length;
              const isSelected = deck.id === activeDeckId;
              return (
                <button
                  key={deck.id}
                  onClick={() => {
                    setActiveDeckId(deck.id);
                    setCurrentSlideIndex(0);
                  }}
                  className={cn(
                    "px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border",
                    isSelected
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-md shadow-blue-500/20 scale-102"
                      : isDarkMode
                        ? "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:border-slate-600"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  )}
                >
                  <Folder size={14} className={isSelected ? "text-white" : "text-blue-500"} />
                  <span className="truncate max-w-[180px] sm:max-w-[220px]">{deck.title}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-mono font-black",
                    isSelected ? "bg-white/20 text-white" : isDarkMode ? "bg-slate-700 text-slate-400" : "bg-slate-200 text-slate-600"
                  )}>
                    {deckSlideCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Deck Actions (Create New Deck, Edit, Duplicate, Delete) */}
        <div className="flex items-center gap-2 self-end lg:self-auto shrink-0 flex-wrap">
          <button
            onClick={() => {
              setNewDeckTitle('');
              setNewDeckDesc('');
              setIsCreateDeckModalOpen(true);
            }}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <FolderPlus size={15} />
            <span>+ Tạo Slide Showcase Mới</span>
          </button>

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />

          <button
            onClick={() => {
              setEditingDeck({ ...currentDeck });
              setIsEditDeckModalOpen(true);
            }}
            title="Sửa thông tin bộ slide hiện tại"
            className={cn(
              "px-3 py-2 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5",
              isDarkMode ? "bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700" : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
            )}
          >
            <Edit3 size={14} />
            <span className="hidden sm:inline">Sửa Bộ Slide</span>
          </button>

          <button
            onClick={() => handleDuplicateDeck(currentDeck.id)}
            title="Nhân bản bộ slide này thành danh sách mới"
            className={cn(
              "px-3 py-2 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5",
              isDarkMode ? "bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700" : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
            )}
          >
            <Copy size={14} />
            <span className="hidden sm:inline">Nhân bản</span>
          </button>

          {decks.length > 1 && (
            <button
              onClick={() => handleDeleteDeck(currentDeck.id)}
              title="Xóa bộ slide showcase này"
              className="p-2 rounded-2xl border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white text-xs font-bold transition-all flex items-center gap-1"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* VIEWER MODE */}
      {mode === 'viewer' && (
        <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col gap-6">
          {/* CATEGORY TABS BAR */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setCurrentSlideIndex(0);
                }}
                className={cn(
                  "px-4 py-2 rounded-2xl text-xs font-black tracking-wide uppercase transition-all shrink-0 border",
                  activeCategory === cat
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-blue-500 shadow-md shadow-blue-500/20 scale-105"
                    : isDarkMode
                      ? "bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {activeTemplate === 'deck_3d' ? (
            render3dDeckViewer()
          ) : (
            /* MAIN EDGE SHOWCASE SLIDE CARD (TEMPLATE 1) */
            <div className={cn(
              "relative w-full rounded-[32px] sm:rounded-[40px] border overflow-hidden p-6 sm:p-10 lg:p-12 transition-all shadow-xl backdrop-blur-xl flex flex-col justify-between min-h-[540px]",
              getThemeGradient(currentSlide?.themeColor)
            )}>
            {/* Background Decorative Blur Orbs */}
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none animate-pulse" />

            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide?.id || currentSlideIndex}
                initial={{ opacity: 0, x: 40, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -40, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center z-10 my-auto"
              >
                {/* LEFT COLUMN: TITLE, BADGE, HIGHLIGHTS, CTAs */}
                <div className="lg:col-span-7 flex flex-col items-start gap-4 sm:gap-6">
                  {/* Category & Badge */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={cn("px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-xs", getBadgeStyle(currentSlide?.badgeVariant))}>
                      {currentSlide?.badgeText || 'FEATURE HIGHLIGHT'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {currentSlide?.category}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <h2 className={cn(
                      "text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.15]",
                      isDarkMode ? "text-white" : "text-slate-900"
                    )}>
                      {currentSlide?.title}
                    </h2>
                    {currentSlide?.subtitle && (
                      <p className={cn(
                        "mt-2 text-sm sm:text-base font-semibold",
                        isDarkMode ? "text-cyan-400" : "text-blue-600"
                      )}>
                        {currentSlide?.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Description Prose */}
                  <div className={cn(
                    "text-xs sm:text-sm leading-relaxed font-normal",
                    isDarkMode ? "text-slate-300" : "text-slate-700"
                  )}>
                    <ReactMarkdown>{currentSlide?.description || ''}</ReactMarkdown>
                  </div>

                  {/* Bullet Highlights */}
                  {currentSlide?.highlights && currentSlide.highlights.length > 0 && (
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {currentSlide.highlights.map((item, idx) => (
                        <div key={idx} className={cn(
                          "flex items-center gap-2.5 p-2.5 rounded-2xl border text-xs font-semibold transition-all",
                          isDarkMode ? "bg-slate-900/60 border-slate-800 text-slate-200" : "bg-white/80 border-slate-200/80 text-slate-800 shadow-xs"
                        )}>
                          <div className="p-1 rounded-full bg-blue-500/20 text-blue-500 shrink-0">
                            <Check size={12} strokeWidth={3} />
                          </div>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action CTA Buttons */}
                  <div className="flex items-center gap-3 pt-4 flex-wrap w-full sm:w-auto">
                    {currentSlide?.primaryCta && (
                      <button
                        onClick={() => handleCtaClick(currentSlide.primaryCta)}
                        className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group"
                      >
                        <span>{currentSlide.primaryCta.text}</span>
                        <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}

                    {currentSlide?.secondaryCta && (
                      <button
                        onClick={() => handleCtaClick(currentSlide.secondaryCta)}
                        className={cn(
                          "px-6 py-3.5 rounded-2xl border font-bold text-xs uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-2",
                          isDarkMode ? "bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs"
                        )}
                      >
                        <span>{currentSlide.secondaryCta.text}</span>
                        <ExternalLink size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: INTERACTIVE MOCK OR MEDIA PREVIEW */}
                <div className="lg:col-span-5 w-full flex items-center justify-center">
                  <div className={cn(
                    "w-full rounded-3xl border shadow-2xl p-5 sm:p-6 transition-all backdrop-blur-xl relative overflow-hidden",
                    isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-200/80"
                  )}>
                    {/* Header Mock Bar */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-500/10 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {currentSlide?.mockConfig?.headerTitle || 'MS Edge Preview v151'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-500 text-[9px] font-black uppercase">
                        {currentSlide?.mockConfig?.badge || 'LIVE'}
                      </span>
                    </div>

                    {/* MOCK PREVIEW TYPES */}
                    {currentSlide?.mediaType === 'interactive_demo' && (
                      <div className="space-y-4">
                        {/* SEARCH DEMO */}
                        {currentSlide.mockConfig?.previewType === 'search_demo' && (
                          <div className="space-y-3">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                              Thử tìm kiếm Dược phẩm:
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={demoSearch}
                                onChange={(e) => setDemoSearch(e.target.value)}
                                className={cn(
                                  "w-full px-4 py-3 rounded-2xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                                )}
                                placeholder="Nhập tên thuốc..."
                              />
                            </div>
                            <div className={cn(
                              "p-3.5 rounded-2xl border space-y-2 text-xs",
                              isDarkMode ? "bg-slate-950/60 border-slate-800" : "bg-blue-50/50 border-blue-100"
                            )}>
                              <div className="flex items-center justify-between">
                                <span className={cn("font-black", isDarkMode ? "text-blue-400" : "text-blue-600")}>
                                  {demoSearch || 'Paracetamol'} 500mg
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-500">Hoạt chất chính</span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                Hàm lượng: Paracetamol 500mg. Dạng bào chế: Viên nén bao phim. Nhóm điều trị: Hạ sốt, giảm đau.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* AI ASSISTANT DEMO */}
                        {currentSlide.mockConfig?.previewType === 'ai_assistant_demo' && (
                          <div className="space-y-3">
                            <div className={cn(
                              "p-3 rounded-2xl border text-xs font-medium space-y-2",
                              isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                            )}>
                              <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">Câu hỏi thử nghiệm:</p>
                              <input
                                type="text"
                                value={demoAiPrompt}
                                onChange={(e) => setDemoAiPrompt(e.target.value)}
                                className={cn(
                                  "w-full bg-transparent text-xs font-semibold focus:outline-none",
                                  isDarkMode ? "text-white" : "text-slate-900"
                                )}
                              />
                            </div>
                            <button
                              onClick={handleRunAiDemo}
                              disabled={isAiThinking}
                              className="w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                            >
                              {isAiThinking ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                              <span>Gửi tới Trợ Lý AI</span>
                            </button>

                            {demoAiReply && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                  "p-3.5 rounded-2xl border text-xs leading-relaxed space-y-1.5",
                                  isDarkMode ? "bg-blue-950/30 border-blue-900/50 text-blue-200" : "bg-blue-50 border-blue-200 text-blue-900"
                                )}
                              >
                                <ReactMarkdown>{demoAiReply}</ReactMarkdown>
                              </motion.div>
                            )}
                          </div>
                        )}

                        {/* ICD DEMO */}
                        {currentSlide.mockConfig?.previewType === 'icd_demo' && (
                          <div className="space-y-2">
                            <div className={cn("p-3 rounded-2xl border space-y-1", isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200")}>
                              <div className="flex items-center justify-between">
                                <span className="font-black text-rose-500 text-xs">I10 - Tăng huyết áp vô căn</span>
                                <span className="text-[9px] font-bold text-slate-400">TT26 BHYT</span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Áp dụng quy tắc ghép mã dagger-asterisk và tự động đề xuất biệt dược điều trị chuẩn.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* INTERACTION DEMO */}
                        {currentSlide.mockConfig?.previewType === 'interaction_demo' && (
                          <div className="space-y-2">
                            <div className={cn(
                              "p-3 rounded-2xl border space-y-1",
                              isDarkMode ? "bg-rose-500/10 border-rose-500/30 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-800"
                            )}>
                              <div className="flex items-center justify-between font-bold text-xs">
                                <span>Cảnh báo: Clopidogrel + Omeprazole</span>
                                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">Chống chỉ định</span>
                              </div>
                              <p className="text-[11px] leading-relaxed opacity-90">
                                Omeprazole làm giảm hiệu quả chống tập kết tiểu cầu của Clopidogrel. Khuyến cáo thay thế bằng Pantoprazole.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* STATS DEMO */}
                        {currentSlide.mockConfig?.previewType === 'stats_demo' && (
                          <div className="grid grid-cols-2 gap-3 text-center">
                            <div className={cn("p-3 rounded-2xl border", isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200")}>
                              <span className="text-2xl font-black text-blue-500">10k+</span>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Dược phẩm</p>
                            </div>
                            <div className={cn("p-3 rounded-2xl border", isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200")}>
                              <span className="text-2xl font-black text-emerald-500">99.8%</span>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Độ chính xác AI</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* IMAGE PREVIEW TYPE */}
                    {currentSlide?.mediaType === 'image' && (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-500/20 aspect-video bg-slate-900 flex items-center justify-center">
                        {currentSlide.mediaUrl ? (
                          <img 
                            src={currentSlide.mediaUrl} 
                            alt={currentSlide.title} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="text-center p-6 text-slate-500 space-y-2">
                            <ImageIcon size={32} className="mx-auto" />
                            <p className="text-xs font-bold">Chưa chọn hình ảnh preview</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* VIDEO PREVIEW TYPE */}
                    {currentSlide?.mediaType === 'video' && (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-500/20 aspect-video bg-slate-900 flex items-center justify-center">
                        {currentSlide.mediaUrl ? (
                          <iframe
                            src={currentSlide.mediaUrl}
                            title="Video Preview"
                            className="w-full h-full"
                            allowFullScreen
                          />
                        ) : (
                          <div className="text-center p-6 text-slate-500 space-y-2">
                            <Video size={32} className="mx-auto" />
                            <p className="text-xs font-bold">Dán link Video iframe YouTube/Vimeo</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* BOTTOM CAROUSEL NAVIGATION CONTROLS */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-500/10 z-10 gap-4 flex-wrap">
              {/* Step counter */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-black tracking-widest text-slate-400">
                  {currentSlideIndex + 1} / {filteredSlides.length}
                </span>

                {/* Progress dots */}
                <div className="flex items-center gap-1.5">
                  {filteredSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        idx === currentSlideIndex 
                          ? "w-8 bg-blue-500" 
                          : "w-2 bg-slate-400/40 hover:bg-slate-400"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Autoplay & Arrows Controls */}
              <div className="flex items-center gap-2">
                {/* Autoplay toggle */}
                <button
                  onClick={() => setIsPlaying(prev => !prev)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5",
                    isPlaying 
                      ? "bg-amber-500/15 text-amber-500 border-amber-500/30" 
                      : isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-600"
                  )}
                >
                  {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                  <span>{isPlaying ? 'Tạm dừng' : 'Tự động phát'}</span>
                </button>

                {/* Arrows */}
                <button
                  onClick={handlePrevSlide}
                  className={cn(
                    "p-2.5 rounded-2xl border transition-all hover:scale-105 active:scale-95",
                    isDarkMode ? "bg-slate-900/90 border-slate-800 hover:bg-slate-800 text-white" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-900 shadow-xs"
                  )}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={handleNextSlide}
                  className={cn(
                    "p-2.5 rounded-2xl border transition-all hover:scale-105 active:scale-95",
                    isDarkMode ? "bg-slate-900/90 border-slate-800 hover:bg-slate-800 text-white" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-900 shadow-xs"
                  )}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )}

      {/* DESIGNER MODE */}
      {mode === 'designer' && (
        <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col gap-6">
          {/* TOP DESIGNER CONTROLS */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Layers size={18} className="text-blue-500" />
              <span>Danh sách Slide Showcase ({slides.length})</span>
            </h2>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setEditingSlide({
                    title: '',
                    subtitle: '',
                    category: 'Tính năng Mới',
                    badgeText: 'MỚI v151',
                    badgeVariant: 'blue',
                    description: '',
                    highlights: ['Điểm nổi bật 1'],
                    layoutType: 'edge_hero',
                    themeColor: 'edge_blue',
                    mediaType: 'interactive_demo',
                    mockConfig: { previewType: 'search_demo', headerTitle: 'Demo' },
                    order: slides.length + 1,
                    isActive: true
                  });
                  setIsEditorOpen(true);
                }}
                className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
              >
                <Plus size={15} />
                <span>Thêm Slide Mới</span>
              </button>

              <button
                onClick={handleExportJson}
                className={cn(
                  "px-3.5 py-2.5 rounded-2xl border font-bold text-xs flex items-center gap-1.5 transition-all",
                  isDarkMode ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                )}
              >
                <Download size={14} />
                <span>Xuất JSON</span>
              </button>

              <label className={cn(
                "px-3.5 py-2.5 rounded-2xl border font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer",
                isDarkMode ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}>
                <Upload size={14} />
                <span>Nhập JSON</span>
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>
          </div>

          {/* SLIDES LIST TABLE / CARDS */}
          <div className="grid grid-cols-1 gap-4">
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className={cn(
                  "p-4 sm:p-5 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all shadow-xs",
                  isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200/80"
                )}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMoveSlide(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded-md hover:bg-slate-500/20 text-slate-400 disabled:opacity-30"
                    >
                      <ChevronLeft size={16} className="rotate-90" />
                    </button>
                    <span className="text-xs font-black text-slate-400">{idx + 1}</span>
                    <button
                      onClick={() => handleMoveSlide(idx, 'down')}
                      disabled={idx === slides.length - 1}
                      className="p-1 rounded-md hover:bg-slate-500/20 text-slate-400 disabled:opacity-30"
                    >
                      <ChevronRight size={16} className="rotate-90" />
                    </button>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border", getBadgeStyle(slide.badgeVariant))}>
                        {slide.badgeText || 'SHOWCASE'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {slide.category}
                      </span>
                    </div>
                    <h3 className={cn("font-bold text-sm truncate", isDarkMode ? "text-white" : "text-slate-900")}>
                      {slide.title}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">
                      {slide.subtitle || slide.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-500/10">
                  <button
                    onClick={() => {
                      setEditingSlide(slide);
                      setIsEditorOpen(true);
                    }}
                    className={cn(
                      "px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    <Edit3 size={13} />
                    <span>Sửa</span>
                  </button>

                  <button
                    onClick={() => handleDeleteSlide(slide.id)}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold hover:bg-rose-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    <span>Xóa</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT / CREATE SLIDE MODAL */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "w-full max-w-3xl rounded-[32px] border shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto my-auto transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-500/10">
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <Edit3 size={18} className="text-blue-500" />
                  <span>{editingSlide.id ? 'Chỉnh Sửa Slide Showcase' : 'Tạo Slide Showcase Mới'}</span>
                </h3>
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-500/20 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              {/* FORM FIELDS */}
              <div className="space-y-4 text-xs font-semibold">
                {/* Title & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Tiêu đề Slide *
                    </label>
                    <input
                      type="text"
                      value={editingSlide.title || ''}
                      onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500",
                        isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      )}
                      placeholder="Ví dụ: Tra cứu Dược Khẩu v151"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Danh mục / Tab Section *
                    </label>
                    <input
                      type="text"
                      value={editingSlide.category || ''}
                      onChange={(e) => setEditingSlide({ ...editingSlide, category: e.target.value })}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500",
                        isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      )}
                      placeholder="Ví dụ: Tính năng Mới, Chào mừng, Trợ lý AI"
                    />
                  </div>
                </div>

                {/* Subtitle & Badge */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Tiêu đề phụ / Tagline
                    </label>
                    <input
                      type="text"
                      value={editingSlide.subtitle || ''}
                      onChange={(e) => setEditingSlide({ ...editingSlide, subtitle: e.target.value })}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500",
                        isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      )}
                      placeholder="Tóm tắt ngắn gọn tính năng..."
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Nhãn Badge (VD: MỚI)
                    </label>
                    <input
                      type="text"
                      value={editingSlide.badgeText || ''}
                      onChange={(e) => setEditingSlide({ ...editingSlide, badgeText: e.target.value })}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500",
                        isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      )}
                      placeholder="EDGE v151"
                    />
                  </div>
                </div>

                {/* Color Theme & Badge Variant */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Tông màu Chủ đề
                    </label>
                    <select
                      value={editingSlide.themeColor || 'edge_blue'}
                      onChange={(e) => setEditingSlide({ ...editingSlide, themeColor: e.target.value as any })}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500",
                        isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      )}
                    >
                      <option value="edge_blue">Xanh Dương Edge Royal</option>
                      <option value="emerald_teal">Xanh Ngọc Emerald</option>
                      <option value="cyber_violet">Tím Cyber Violet</option>
                      <option value="sunset_rose">Hồng Hồng Sunset Rose</option>
                      <option value="golden_amber">Vàng Amber Gold</option>
                      <option value="slate_dark">Tối Slate Dark Glass</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Màu sắc Badge
                    </label>
                    <select
                      value={editingSlide.badgeVariant || 'blue'}
                      onChange={(e) => setEditingSlide({ ...editingSlide, badgeVariant: e.target.value as any })}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500",
                        isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      )}
                    >
                      <option value="blue">Xanh Dương (Blue)</option>
                      <option value="emerald">Xanh Lá (Emerald)</option>
                      <option value="purple">Tím (Purple)</option>
                      <option value="rose">Đỏ Hồng (Rose)</option>
                      <option value="amber">Vàng Cam (Amber)</option>
                      <option value="dark">Xám Tối (Dark)</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Mô tả chi tiết (Hỗ trợ Markdown)
                  </label>
                  <textarea
                    rows={3}
                    value={editingSlide.description || ''}
                    onChange={(e) => setEditingSlide({ ...editingSlide, description: e.target.value })}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500",
                      isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                    placeholder="Mô tả nội dung nổi bật của slide..."
                  />
                </div>

                {/* Highlights List Builder */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Các điểm Nổi bật (Bullet Points)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={highlightInput}
                      onChange={(e) => setHighlightInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && highlightInput.trim()) {
                          e.preventDefault();
                          setEditingSlide({
                            ...editingSlide,
                            highlights: [...(editingSlide.highlights || []), highlightInput.trim()]
                          });
                          setHighlightInput('');
                        }
                      }}
                      className={cn(
                        "flex-1 px-4 py-2 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500",
                        isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      )}
                      placeholder="Thêm điểm nổi bật rồi nhấn Enter..."
                    />
                    <button
                      onClick={() => {
                        if (highlightInput.trim()) {
                          setEditingSlide({
                            ...editingSlide,
                            highlights: [...(editingSlide.highlights || []), highlightInput.trim()]
                          });
                          setHighlightInput('');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-2xl font-bold"
                    >
                      Thêm
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(editingSlide.highlights || []).map((h, hIdx) => (
                      <span key={hIdx} className="px-3 py-1 rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/30 flex items-center gap-1 text-[11px]">
                        <span>{h}</span>
                        <button
                          onClick={() => {
                            const filtered = (editingSlide.highlights || []).filter((_, i) => i !== hIdx);
                            setEditingSlide({ ...editingSlide, highlights: filtered });
                          }}
                          className="hover:text-rose-500"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Media Type & Interactive Demo Config */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Loại Media / Demo
                    </label>
                    <select
                      value={editingSlide.mediaType || 'interactive_demo'}
                      onChange={(e) => setEditingSlide({ ...editingSlide, mediaType: e.target.value as any })}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500",
                        isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      )}
                    >
                      <option value="interactive_demo">Khung Demo Tương Tác</option>
                      <option value="image">Hình Ảnh (URL)</option>
                      <option value="video">Video Embed (Iframe)</option>
                    </select>
                  </div>

                  {editingSlide.mediaType === 'interactive_demo' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Chế độ Demo Tương Tác
                      </label>
                      <select
                        value={editingSlide.mockConfig?.previewType || 'search_demo'}
                        onChange={(e) => setEditingSlide({
                          ...editingSlide,
                          mockConfig: {
                            ...editingSlide.mockConfig,
                            previewType: e.target.value as any
                          }
                        })}
                        className={cn(
                          "w-full px-4 py-2.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500",
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        )}
                      >
                        <option value="search_demo">Tra cứu Dược phẩm Demo</option>
                        <option value="ai_assistant_demo">Trợ lý AI Trả lời Demo</option>
                        <option value="icd_demo">Tra cứu ICD-10 & BHYT Demo</option>
                        <option value="interaction_demo">Cảnh báo Tương tác Thuốc Demo</option>
                        <option value="stats_demo">Thống kê Năng suất Demo</option>
                      </select>
                    </div>
                  )}

                  {(editingSlide.mediaType === 'image' || editingSlide.mediaType === 'video') && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        URL Media / Embed
                      </label>
                      <input
                        type="text"
                        value={editingSlide.mediaUrl || ''}
                        onChange={(e) => setEditingSlide({ ...editingSlide, mediaUrl: e.target.value })}
                        className={cn(
                          "w-full px-4 py-2.5 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-blue-500",
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        )}
                        placeholder="https://..."
                      />
                    </div>
                  )}
                </div>

                {/* Primary CTA button config */}
                <div className="p-4 rounded-2xl border space-y-3 bg-slate-500/5">
                  <p className="text-xs font-black uppercase tracking-wider text-blue-500">
                    Nút Hành Động (Primary CTA)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={editingSlide.primaryCta?.text || ''}
                      onChange={(e) => setEditingSlide({
                        ...editingSlide,
                        primaryCta: { ...(editingSlide.primaryCta || { actionType: 'navigate' }), text: e.target.value }
                      })}
                      className={cn(
                        "w-full px-4 py-2 rounded-xl border focus:outline-none",
                        isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                      )}
                      placeholder="Tên nút (VD: Khám phá ngay)"
                    />

                    <select
                      value={editingSlide.primaryCta?.targetTab || 'view_directory'}
                      onChange={(e) => setEditingSlide({
                        ...editingSlide,
                        primaryCta: { ...(editingSlide.primaryCta || { text: 'Khám phá ngay', actionType: 'navigate' }), targetTab: e.target.value }
                      })}
                      className={cn(
                        "w-full px-4 py-2 rounded-xl border focus:outline-none",
                        isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                      )}
                    >
                      <option value="view_directory">Mở Tra cứu Thuốc</option>
                      <option value="view_icd10">Mở Tra cứu ICD-10</option>
                      <option value="view_interaction">Mở Tương tác Thuốc</option>
                      <option value="view_doc_lookup">Mở Tra cứu Văn bản AI</option>
                      <option value="view_social">Mở Mạng xã hội</option>
                      <option value="view_patients">Mở Tra cứu Bệnh nhân</option>
                      <option value="dashboard">Mở Workspace Main</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SAVE / CANCEL BUTTONS */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-500/10">
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border text-xs font-bold hover:bg-slate-500/10"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSaveSlide}
                  className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/20"
                >
                  <Save size={15} />
                  <span>Lưu Slide Showcase</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE NEW SLIDE SHOWCASE DECK */}
      <AnimatePresence>
        {isCreateDeckModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={cn(
                "w-full max-w-lg rounded-3xl p-6 border shadow-2xl space-y-5 relative",
                isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-500/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                    <FolderPlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black tracking-tight">Tạo Bộ Slide Showcase Mới</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tạo danh sách slide showcase hoàn toàn độc lập</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateDeckModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Tên Bộ Slide Showcase *
                  </label>
                  <input
                    type="text"
                    value={newDeckTitle}
                    onChange={(e) => setNewDeckTitle(e.target.value)}
                    placeholder="Ví dụ: Quy Trình Khám BHYT & TT26, Báo Cáo Giao Ban..."
                    className={cn(
                      "w-full px-4 py-2.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                      isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Mô Tả Bộ Slide Showcase
                  </label>
                  <textarea
                    rows={2}
                    value={newDeckDesc}
                    onChange={(e) => setNewDeckDesc(e.target.value)}
                    placeholder="Tóm tắt mục đích và nội dung của bộ slide showcase này..."
                    className={cn(
                      "w-full px-4 py-2.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                      isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Chọn Mẫu Khởi Tạo (Starter Template)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewDeckTemplate('edge_ai')}
                      className={cn(
                        "p-3 rounded-2xl border text-left text-xs font-bold transition-all flex flex-col gap-1",
                        newDeckTemplate === 'edge_ai'
                          ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20"
                          : isDarkMode ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                      )}
                    >
                      <span className="font-black text-sm">🌟 Mẫu MS Edge AI</span>
                      <span className="text-[10px] opacity-80">5 slide mẫu Edge 151</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewDeckTemplate('bhyt')}
                      className={cn(
                        "p-3 rounded-2xl border text-left text-xs font-bold transition-all flex flex-col gap-1",
                        newDeckTemplate === 'bhyt'
                          ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20"
                          : isDarkMode ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                      )}
                    >
                      <span className="font-black text-sm">🩺 Mẫu BHYT TT26</span>
                      <span className="text-[10px] opacity-80">2 slide BHYT & ICD-10</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewDeckTemplate('clinical')}
                      className={cn(
                        "p-3 rounded-2xl border text-left text-xs font-bold transition-all flex flex-col gap-1",
                        newDeckTemplate === 'clinical'
                          ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20"
                          : isDarkMode ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                      )}
                    >
                      <span className="font-black text-sm">💊 Mẫu AI Lâm Sàng</span>
                      <span className="text-[10px] opacity-80">2 slide Copilot & Dược</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewDeckTemplate('blank')}
                      className={cn(
                        "p-3 rounded-2xl border text-left text-xs font-bold transition-all flex flex-col gap-1",
                        newDeckTemplate === 'blank'
                          ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20"
                          : isDarkMode ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                      )}
                    >
                      <span className="font-black text-sm">📄 Slide Trống</span>
                      <span className="text-[10px] opacity-80">Tự thiết kế từ đầu</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-500/10">
                <button
                  onClick={() => setIsCreateDeckModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl border text-xs font-bold hover:bg-slate-500/10"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleCreateDeck}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <FolderPlus size={16} />
                  <span>Tạo Bộ Slide Mới</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT SLIDE SHOWCASE DECK */}
      <AnimatePresence>
        {isEditDeckModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-5 relative",
                isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-500/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                    <Edit3 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black tracking-tight">Chỉnh Sửa Bộ Slide Showcase</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Cập nhật thông tin nhận diện bộ slide</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditDeckModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Tên Bộ Slide Showcase
                  </label>
                  <input
                    type="text"
                    value={editingDeck.title || ''}
                    onChange={(e) => setEditingDeck({ ...editingDeck, title: e.target.value })}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                      isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Mô Tả Bộ Slide Showcase
                  </label>
                  <textarea
                    rows={3}
                    value={editingDeck.description || ''}
                    onChange={(e) => setEditingDeck({ ...editingDeck, description: e.target.value })}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                      isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                    )}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                    Danh Mục Bộ Slide Showcase
                  </label>
                  <input
                    type="text"
                    value={editingDeck.category || ''}
                    onChange={(e) => setEditingDeck({ ...editingDeck, category: e.target.value })}
                    placeholder="Giới thiệu, BHYT, AI Lâm sàng..."
                    className={cn(
                      "w-full px-4 py-2.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                      isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-500/10">
                <button
                  onClick={() => setIsEditDeckModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl border text-xs font-bold hover:bg-slate-500/10"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSaveDeckEdit}
                  className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <Save size={16} />
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
