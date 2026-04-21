import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Info, ChevronRight, Pill, Filter, ShieldAlert, Plus, Edit2, Trash2, X, Save, FileText, ExternalLink, Eye, Loader2, Check, Clock, RefreshCw, Heart, Baby, Car, AlertTriangle, Activity, Zap, FolderTree, Folder, Scissors, Settings, Briefcase, MoveRight, ChevronUp, ChevronDown, Star, Database } from 'lucide-react';
import { Drug, DrugGroup } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, collection, onSnapshot, query, orderBy, handleFirestoreError, OperationType, setDoc, doc, deleteDoc, storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import DrugGroupManagement from './DrugGroupManagement';
import CatalogManagement from './CatalogManagement';
import ImageEditorModal from './ImageEditorModal';

import ConfirmModal from './ConfirmModal';

interface DrugDirectoryProps {
  canManage: boolean;
  isDarkMode: boolean;
  subHeaderPortalId?: string;
  featureSettings?: any;
  userRole?: string;
  isApproved?: boolean;
}

const AutoExpandingTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [props.value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      onInput={(e) => {
        e.currentTarget.style.height = 'auto';
        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
        if (props.onInput) props.onInput(e);
      }}
    />
  );
};

const DrugDirectory: React.FC<DrugDirectoryProps> = ({ canManage, isDarkMode, subHeaderPortalId, featureSettings, userRole, isApproved = false }) => {
  const isGuestUser = !userRole;
  const isPendingUser = !!userRole && !isApproved;
  const canAccessDirectoryHintsWhenToggleOff = !isGuestUser && !isPendingUser;
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [drugGroups, setDrugGroups] = useState<DrugGroup[]>([]);
  const [icdList, setIcdList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [groupFilter, setGroupFilter] = useState('Tất cả');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<Partial<Drug> | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'drugs' | 'groups' | 'ingredients'>('drugs');
  const mainSearchRef = useRef<HTMLDivElement>(null);
  const [showStickySearch, setShowStickySearch] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickySearch(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-60px 0px 0px 0px' }
    );

    if (mainSearchRef.current) {
      observer.observe(mainSearchRef.current);
    }

    return () => observer.disconnect();
  }, []);
  const [searchMode, setSearchMode] = useState<'all' | 'name' | 'ingredient'>('all');
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [isIngredientCategoryModalOpen, setIsIngredientCategoryModalOpen] = useState(false);
  const [isExcipientModalOpen, setIsExcipientModalOpen] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'dosage' | 'warnings' | 'pharmacology'>('general');
  const [activeSubTab, setActiveSubTab] = useState<string>('');

  useEffect(() => {
    // Reset sub-tab when main tab changes
    const defaultSubTabs: Record<string, string> = {
      general: 'info',
      dosage: 'indications',
      warnings: 'contra',
      pharmacology: 'interactions'
    };
    setActiveSubTab(defaultSubTabs[activeTab] || '');
  }, [activeTab]);

  const SUB_TABS: Record<string, { id: string, label: string }[]> = {
    general: [
      { id: 'info', label: 'Cơ bản' },
      { id: 'composition', label: 'Thành phần' }
    ],
    dosage: [
      { id: 'indications', label: 'Chỉ định' },
      { id: 'administration', label: 'Liều dùng' }
    ],
    warnings: [
      { id: 'contra', label: 'Chống chỉ định' },
      { id: 'adr', label: 'Tác dụng phụ' },
      { id: 'special', label: 'Thận trọng' }
    ],
    pharmacology: [
      { id: 'interactions', label: 'Tương tác' },
      { id: 'properties', label: 'Dược lực/Động' }
    ]
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Management state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [formData, setFormData] = useState<Drug>({
    id: '',
    name: '',
    activeIngredients: [],
    atcCode: '',
    dosageForm: '',
    excipients: '',
    manufacturer: '',
    indications: [],
    contraindications: [],
    sideEffects: [],
    category: '',
    groupId: '',
    avatarUrl: '',
    pdfUrl: '',
    isActive: true,
    dosageAndAdministration: [],
    precautions: '',
    pregnancy: '',
    lactation: '',
    driving: '',
    interactions: '',
    specificInteractions: [],
    pharmacodynamics: [],
    pharmacokinetics: [],
    overdose: ''
  });

  // Local string states for comma-separated fields
  const [contraindicationsText, setContraindicationsText] = useState(''); // Keep for legacy if needed, but we'll use formData
  const [sideEffectsText, setSideEffectsText] = useState('');
  const [searchingIcdIndex, setSearchingIcdIndex] = useState<number | null>(null);
  const [searchingContraIcdIndex, setSearchingContraIcdIndex] = useState<number | null>(null);
  const [icdQuery, setIcdQuery] = useState('');
  const hasLoadedIcdRef = useRef(false);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    indications: true,
    contraindications: true,
    dosage: true,
    interactions: true,
    warnings: true,
    pharmacology: true
  });
  
  const [activeDetailTab, setActiveDetailTab] = useState<'indications' | 'contraindications' | 'dosage' | 'interactions' | 'warnings' | 'pharmacology'>('indications');

  const detailTabs = [
    { id: 'indications', label: 'Chỉ định', icon: <Info size={14} /> },
    { id: 'contraindications', label: 'Chống chỉ định', icon: <ShieldAlert size={14} /> },
    { id: 'dosage', label: 'Liều lượng', icon: <Clock size={14} /> },
    { id: 'interactions', label: 'Tương tác', icon: <RefreshCw size={14} /> },
    { id: 'warnings', label: 'Cảnh báo', icon: <AlertTriangle size={14} /> },
    { id: 'pharmacology', label: 'Dược lý', icon: <Activity size={14} /> }
  ];

  const handleSwipe = (direction: number) => {
    const currentIndex = detailTabs.findIndex(t => t.id === activeDetailTab);
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < detailTabs.length) {
      setActiveDetailTab(detailTabs[nextIndex].id as any);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Image Editor state
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string>('');
  const [editingImageType, setEditingImageType] = useState<'avatar'>('avatar');

  const handleImageCropConfirm = (croppedImage: string) => {
    if (editingImageType === 'avatar') {
      setFormData({ ...formData, avatarUrl: croppedImage });
    }
    setIsImageEditorOpen(false);
  };

  const openImageEditor = (url: string, type: 'avatar') => {
    if (!url) return;
    setImageToEdit(url);
    setEditingImageType(type);
    setIsImageEditorOpen(true);
  };

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ id: string, name: string, pdfUrl?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (subHeaderPortalId) {
      const node = document.getElementById(subHeaderPortalId);
      setPortalNode(node);
    }
  }, [subHeaderPortalId]);

  useEffect(() => {
    const q = query(collection(db, 'drugs'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const drugsData = snapshot.docs.map(doc => {
        const data = doc.data() as Drug;
        return {
          ...data,
          groupIds: data.groupIds || (data.groupId ? [data.groupId] : []),
          indications: data.indications || [],
          contraindications: data.contraindications || [],
          sideEffects: data.sideEffects || []
        };
      });
      setDrugs(drugsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'drugs');
    });

    const unsubscribeGroups = onSnapshot(query(collection(db, 'drug_groups'), orderBy('order')), (snapshot) => {
      const groups = snapshot.docs.map(doc => doc.data() as DrugGroup);
      setDrugGroups(groups);
    });

    return () => {
      unsubscribe();
      unsubscribeGroups();
    };
  }, []);

  useEffect(() => {
    const shouldLoadIcd = isModalOpen || searchingIcdIndex !== null || searchingContraIcdIndex !== null;
    if (!shouldLoadIcd || hasLoadedIcdRef.current) return;

    hasLoadedIcdRef.current = true;
    const unsubscribeICD = onSnapshot(collection(db, 'icd10'), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data());
      setIcdList(list);
    });

    return () => {
      unsubscribeICD();
      hasLoadedIcdRef.current = false;
    };
  }, [isModalOpen, searchingIcdIndex, searchingContraIcdIndex]);

  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  // Initialize expanded groups with level 0 groups
  useEffect(() => {
    if (drugGroups.length > 0 && expandedGroupIds.size === 0) {
      const level0Ids = drugGroups.filter(g => g.level === 0).map(g => g.id);
      setExpandedGroupIds(new Set(level0Ids));
    }
  }, [drugGroups]);

  const toggleGroupExpand = (groupId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const sortedDrugGroups = useMemo(() => {
    const buildTree = (parentId: string | null = null): DrugGroup[] => {
      return drugGroups
        .filter(g => g.parentId === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .flatMap(g => [g, ...buildTree(g.id)]);
    };
    return buildTree(null);
  }, [drugGroups]);

  // Calculate recursive drug counts for each group
  const groupDrugCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    const calculateCount = (groupId: string): number => {
      // Return cached count if already calculated
      if (counts[groupId] !== undefined) return counts[groupId];
      
      // Count direct drugs in this group (both legacy and new array-based)
      let total = drugs.filter(d => (d.groupIds || []).includes(groupId) || d.groupId === groupId).length;
      
      // Add counts from all sub-groups
      const children = drugGroups.filter(g => g.parentId === groupId);
      children.forEach(child => {
        total += calculateCount(child.id);
      });
      
      counts[groupId] = total;
      return total;
    };
    
    drugGroups.forEach(g => calculateCount(g.id));
    return counts;
  }, [drugs, drugGroups]);

  // Map each group to a set of all its descendant group IDs (including itself)
  const groupDescendantsMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    
    const getDescendants = (id: string): Set<string> => {
      if (map[id]) return map[id];
      const descendants = new Set<string>([id]);
      drugGroups.filter(g => g.parentId === id).forEach(child => {
        getDescendants(child.id).forEach(dId => descendants.add(dId));
      });
      map[id] = descendants;
      return descendants;
    };
    
    drugGroups.forEach(g => getDescendants(g.id));
    return map;
  }, [drugGroups]);

  const uniqueIngredients = useMemo(() => {
    const ingredientsMap = new Map<string, { name: string, drugCount: number }>();
    drugs.forEach(drug => {
      (drug.activeIngredients || []).forEach(ing => {
        const name = (ing.name || '').trim();
        if (!name) return;
        const key = name.toLowerCase();
        const existing = ingredientsMap.get(key);
        if (existing) {
          existing.drugCount++;
        } else {
          ingredientsMap.set(key, { name, drugCount: 1 });
        }
      });
    });
    return Array.from(ingredientsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [drugs]);

  const filteredDrugs = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    const selectedIngredientNormalized = (selectedIngredient || '').toLowerCase();

    return drugs.filter(drug => {
      let matchesSearch = false;
      if (searchMode === 'all') {
        matchesSearch = (drug.name || '').toLowerCase().includes(term) ||
                        (drug.activeIngredients || []).some(ing =>
                           (ing.name || '').toLowerCase().includes(term) ||
                           (ing.strength || '').toLowerCase().includes(term)
                        ) ||
                        (drug.atcCode || '').toLowerCase().includes(term);
      } else if (searchMode === 'name') {
        matchesSearch = (drug.name || '').toLowerCase().includes(term);
      } else if (searchMode === 'ingredient') {
        matchesSearch = (drug.activeIngredients || []).some(ing =>
                           (ing.name || '').toLowerCase().includes(term)
                        );
      }

      const matchesGroup = groupFilter === 'Tất cả' || (
        (drug.groupId && groupDescendantsMap[groupFilter]?.has(drug.groupId)) ||
        (drug.groupIds || []).some(id => groupDescendantsMap[groupFilter]?.has(id))
      );
      const matchesIngredient = !selectedIngredientNormalized || (drug.activeIngredients || []).some(
        ing => (ing.name || '').toLowerCase() === selectedIngredientNormalized
      );

      return matchesSearch && matchesGroup && matchesIngredient;
    });
  }, [drugs, searchTerm, searchMode, groupFilter, groupDescendantsMap, selectedIngredient]);

  const handleOpenModal = (drug?: Drug) => {
    setSelectedFile(null);
    if (drug) {
      setEditingDrug(drug);
      const groupIds = drug.groupIds || (drug.groupId ? [drug.groupId] : []);
      const initialData = { 
        ...drug, 
        groupIds,
        groupId: drug.groupId || '',
        avatarUrl: drug.avatarUrl || '',
        pdfUrl: drug.pdfUrl || '',
        activeIngredients: drug.activeIngredients || [],
        generalAdministration: drug.generalAdministration || '',
        atcCode: drug.atcCode || '',
        excipients: drug.excipients || '',
        indications: (drug.indications || []).map((i: any) => ({
          ...i,
          icd10s: i.icd10s || (i.icd10 ? [i.icd10] : [])
        })),
        contraindications: (drug.contraindications || []).map((c: any) => 
          typeof c === 'string' ? { content: c, type: 'Other' } : c
        ),
        sideEffects: (drug.sideEffects || []).map((se: any) => 
          typeof se === 'string' ? { frequency: 'Chung', content: se } : se
        ),
        dosageAndAdministration: drug.dosageAndAdministration || [],
        precautions: drug.precautions || '',
        pregnancy: drug.pregnancy || '',
        lactation: drug.lactation || '',
        driving: drug.driving || '',
        interactions: drug.interactions || '',
        pharmacodynamics: Array.isArray(drug.pharmacodynamics) ? drug.pharmacodynamics : (drug.pharmacodynamics ? [{ category: 'Chung', content: drug.pharmacodynamics }] : []),
        pharmacokinetics: Array.isArray(drug.pharmacokinetics) ? drug.pharmacokinetics : (drug.pharmacokinetics ? [{ category: 'Chung', content: drug.pharmacokinetics }] : []),
        overdose: drug.overdose || ''
      };
      setFormData(initialData);
      setSideEffectsText(Array.isArray(initialData.sideEffects) ? initialData.sideEffects.map((se: any) => typeof se === 'string' ? se : se.content).join(', ') : '');
    } else {
      setEditingDrug(null);
      setFormData({
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        activeIngredients: [],
        atcCode: '',
        dosageForm: '',
        excipients: '',
        manufacturer: '',
        indications: [{ content: '', icd10s: [] }],
        contraindications: [{ content: '', type: 'Other' }],
        sideEffects: [],
        category: '',
        groupId: '',
        groupIds: [],
        avatarUrl: '',
        pdfUrl: '',
        isActive: true,
        generalAdministration: '',
        dosageAndAdministration: [],
        precautions: '',
        pregnancy: '',
        lactation: '',
        driving: '',
        interactions: '',
        pharmacodynamics: [],
        pharmacokinetics: [],
        overdose: ''
      });
      setContraindicationsText('');
      setSideEffectsText('');
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit for Storage
        alert("File PDF quá lớn (tối đa 10MB).");
        return;
      }
      setSelectedFile(file);
      // Temporary URL for preview/feedback
      setFormData({ ...formData, pdfUrl: URL.createObjectURL(file) });
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFormData({ ...formData, pdfUrl: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Vui lòng nhập tên thuốc.");
      return;
    }
    if ((formData.activeIngredients || []).length === 0) {
      alert("Vui lòng thêm ít nhất một hoạt chất.");
      return;
    }

    // handleRemoveFile(); // Removed automatic cleanup to preserve existing PDFs

    setUploading(true);
    setUploadProgress(0);
    try {
      let finalPdfUrl = formData.pdfUrl; // Preserve existing PDF URL

      // If a new file was selected, upload it to Firebase Storage
      // Đã bị vô hiệu hóa theo yêu cầu người dùng để tránh lỗi upload khi dùng AI
      if (false && selectedFile) {
        console.log("Starting upload to Storage...", selectedFile.name);
        const storageRef = ref(storage, `drug-pdfs/${formData.id}_${selectedFile.name}`);
        
        const uploadTask = uploadBytesResumable(storageRef, selectedFile);

        // Track progress
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
            console.log('Upload is ' + progress + '% done');
          }
        );

        // Await the task completion
        await uploadTask;
        
        // Get the download URL
        finalPdfUrl = await getDownloadURL(storageRef);
        console.log("Upload complete. URL:", finalPdfUrl);
      }

      // Parse comma-separated strings into arrays
      const parseList = (text: any) => {
        if (typeof text !== 'string') return [];
        return text.split(',').map(s => s.trim()).filter(s => s !== '');
      };

      const drugData = { 
        ...formData, 
        pdfUrl: finalPdfUrl,
        indications: formData.indications.filter(i => i && typeof i.content === 'string' && i.content.trim() !== ''),
        contraindications: formData.contraindications.filter(c => c && typeof c.content === 'string' && c.content.trim() !== ''),
        sideEffects: Array.isArray(formData.sideEffects) 
          ? formData.sideEffects.filter((se: any) => {
              if (typeof se === 'string') return se.trim() !== '';
              return se && se.content && se.content.trim() !== '';
            })
          : parseList(sideEffectsText)
      };

      try {
        await setDoc(doc(db, 'drugs', formData.id), drugData);
        setIsModalOpen(false);
        setSelectedFile(null); // Clear selected file after successful save
      } catch (firestoreError) {
        handleFirestoreError(firestoreError, OperationType.WRITE, `drugs/${formData.id}`);
      }
    } catch (error: any) {
      console.error("Error saving drug detail:", error);
      let errorMessage = "Lỗi khi lưu thông tin hoặc tải file.";
      
      if (error.code === 'storage/unauthorized') {
        errorMessage = "Lỗi: Không có quyền truy cập Storage. Vui lòng kiểm tra lại cấu hình Firebase Storage Rules.";
      } else if (error.code === 'storage/canceled') {
        errorMessage = "Tải lên đã bị hủy.";
      } else if (error.message) {
        // Check if it's a JSON string from handleFirestoreError
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) {
            errorMessage += " Chi tiết: " + parsed.error;
          } else {
            errorMessage += " Chi tiết: " + error.message;
          }
        } catch {
          errorMessage += " Chi tiết: " + error.message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const moveArrayItem = (fieldName: keyof Drug, index: number, direction: 'up' | 'down') => {
    const list = formData[fieldName];
    if (!Array.isArray(list)) return;
    
    const newList = [...list];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newList.length) return;
    
    [newList[index], newList[targetIdx]] = [newList[targetIdx], newList[index]];
    setFormData(prev => ({ ...prev, [fieldName]: newList }));
  };

  const handleAIExtract = async () => {
    if (!selectedFile) {
      fileInputRef.current?.click();
      return;
    }

    setExtracting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(selectedFile);
      });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "Trích xuất thông tin thuốc từ PDF này. Trả về JSON chính xác:\n- name: Tên thuốc\n- activeIngredients: Danh sách các hoạt chất và hàm lượng (mảng {name, strength})\n- excipients: Tá dược\n- atcCode: Mã ATC\n- indications: Chỉ định kèm danh sách mã ICD-10 gợi ý (mảng {content, icd10s: string[]})\n- contraindications: Chống chỉ định (mảng string)\n- sideEffects: Tác dụng phụ (mảng string)\n- generalAdministration: Cách dùng chung cho tất cả đối tượng (ví dụ: uống trước ăn, uống sau ăn,...)\n- dosageAndAdministration: Liều dùng (mảng {category, content})\n- precautions: Thận trọng\n- driving: Vận hành xe & máy móc (chọn 1: 'An toàn', 'Không an toàn')\n- pregnancy: Phụ nữ có thai (chọn 1: 'An toàn', 'Chưa thiết lập', 'Cân nhắc lợi ích', 'Không an toàn')\n- lactation: Phụ nữ cho con bú (chọn 1: 'An toàn', 'Chưa thiết lập', 'Cân nhắc lợi ích', 'Không an toàn')\n- interactions: Tương tác chung\n- specificInteractions: Phân loại tương tác cụ thể (mảng {target, content})\n- pharmacodynamics: Dược lực học (mảng {category, content})\n- pharmacokinetics: Dược động học (mảng {category, content})\n- overdose: Quá liều\n- dosageForm: Dạng bào chế\n- manufacturer: Nhà sản xuất\n- category: Phân loại" },
              { inlineData: { data: base64Data, mimeType: "application/pdf" } }
            ]
          }
        ],
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              activeIngredients: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    strength: { type: Type.STRING }
                  }
                } 
              },
              excipients: { type: Type.STRING },
              atcCode: { type: Type.STRING },
              indications: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    content: { type: Type.STRING },
                    icd10s: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                } 
              },
              contraindications: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    content: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['Drug', 'ICD-10', 'Weight', 'Age', 'Other'] }
                  }
                } 
              },
              sideEffects: { type: Type.ARRAY, items: { type: Type.STRING } },
              generalAdministration: { type: Type.STRING },
              dosageAndAdministration: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    content: { type: Type.STRING }
                  }
                } 
              },
              precautions: { type: Type.STRING },
              driving: { type: Type.STRING },
              pregnancy: { type: Type.STRING },
              lactation: { type: Type.STRING },
              interactions: { type: Type.STRING },
              specificInteractions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    target: { type: Type.STRING },
                    content: { type: Type.STRING }
                  }
                }
              },
              pharmacodynamics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    content: { type: Type.STRING }
                  }
                }
              },
              pharmacokinetics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    content: { type: Type.STRING }
                  }
                }
              },
              overdose: { type: Type.STRING },
              dosageForm: { type: Type.STRING },
              manufacturer: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["name", "activeIngredients"]
          }
        }
      });

      let text = response.text || '{}';
      const result = JSON.parse(text.trim());
      setExtractedData(result);
      setIsReviewModalOpen(true);
    } catch (error) {
      console.error("AI Extraction failed:", error);
      alert("Không thể trích xuất thông tin. Vui lòng kiểm tra file PDF hoặc thử lại.");
    } finally {
      setExtracting(false);
    }
  };

  const applyExtractedData = () => {
    if (extractedData) {
      const updatedData = {
        ...formData,
        ...extractedData,
        activeIngredients: extractedData.activeIngredients || formData.activeIngredients,
        atcCode: extractedData.atcCode || formData.atcCode,
        excipients: extractedData.excipients || formData.excipients,
        indications: (extractedData.indications || formData.indications).map((ind: any) => 
          typeof ind === 'string' ? { content: ind, icd10s: [] } : { ...ind, icd10s: ind.icd10s || (ind.icd10 ? [ind.icd10] : []) }
        ),
        contraindications: (extractedData.contraindications || formData.contraindications).map((c: any) => 
          typeof c === 'string' ? { content: c, type: 'Other' } : c
        ),
        sideEffects: extractedData.sideEffects || formData.sideEffects,
        generalAdministration: extractedData.generalAdministration || formData.generalAdministration,
        dosageAndAdministration: extractedData.dosageAndAdministration || formData.dosageAndAdministration,
        precautions: extractedData.precautions || formData.precautions,
        driving: extractedData.driving || formData.driving,
        pregnancy: extractedData.pregnancy || formData.pregnancy,
        lactation: extractedData.lactation || formData.lactation,
        pharmacodynamics: extractedData.pharmacodynamics || formData.pharmacodynamics,
        pharmacokinetics: extractedData.pharmacokinetics || formData.pharmacokinetics,
        interactions: extractedData.interactions || formData.interactions,
        specificInteractions: extractedData.specificInteractions || formData.specificInteractions,
        overdose: extractedData.overdose || formData.overdose,
      };
      setFormData(updatedData);
      setContraindicationsText((updatedData.contraindications || []).join(', '));
      setSideEffectsText((updatedData.sideEffects || []).join(', '));
      setIsReviewModalOpen(false);
      setExtractedData(null);
    }
  };

  const handleDelete = (id: string, name: string, pdfUrl?: string) => {
    setConfirmData({ id, name, pdfUrl });
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!confirmData) return;
    const { id, name, pdfUrl } = confirmData;
    try {
      // Delete PDF from storage if it exists and is a Firebase Storage URL
      if (pdfUrl && pdfUrl.includes('firebasestorage.googleapis.com')) {
        try {
          const storageRef = ref(storage, pdfUrl);
          await deleteObject(storageRef);
        } catch (storageError) {
          console.warn("Could not delete file from storage:", storageError);
        }
      }
      
      try {
        await deleteDoc(doc(db, 'drugs', id));
        if (selectedDrug?.id === id) setSelectedDrug(null);
      } catch (firestoreError) {
        handleFirestoreError(firestoreError, OperationType.DELETE, `drugs/${id}`);
      }
    } catch (error: any) {
      console.error("Error deleting drug:", error);
      let msg = "Lỗi khi xóa thuốc.";
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error) msg += " Chi tiết: " + parsed.error;
      } catch {
        if (error.message) msg += " Chi tiết: " + error.message;
      }
      setErrorMessage(msg);
      // Re-throw to prevent ConfirmModal from closing if we want it to stay open on error
      // Actually, ConfirmModal now catches it and console.errors it.
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const viewModeToggle = (
    <button
      type="button"
      onClick={() => {
        const modes: ('drugs' | 'groups' | 'ingredients')[] = ['drugs', 'groups', 'ingredients'];
        const nextIndex = (modes.indexOf(viewMode) + 1) % modes.length;
        setViewMode(modes[nextIndex]);
      }}
      className={cn(
        "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-black transition-all active:scale-95 whitespace-nowrap text-[10px] uppercase tracking-widest border shadow-sm",
        isDarkMode ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
      )}
    >
      {viewMode === 'drugs' ? (
        <>
          <Pill size={16} className="text-blue-500" /> <span>{featureSettings?.customTitle || "Tra cứu thuốc"}</span>
        </>
      ) : viewMode === 'groups' ? (
        <>
          <FolderTree size={16} className="text-amber-500" /> <span>Danh mục nhóm</span>
        </>
      ) : (
        <>
          <Activity size={16} className="text-emerald-500" /> <span>Tra cứu hoạt chất</span>
        </>
      )}
    </button>
  );

  return (
    <div className={cn(
      "p-2 lg:p-8 max-w-full mx-auto min-h-screen transition-colors text-slate-900 dark:text-slate-200",
      isDarkMode ? "bg-slate-950/30" : "bg-slate-50/50"
    )}>
      {/* Mobile Subheader Portal */}
      {subHeaderPortalId && document.getElementById(subHeaderPortalId) && createPortal(
        <div className="flex items-center justify-end w-full">
          {viewModeToggle}
        </div>,
        document.getElementById(subHeaderPortalId)!
      )}
      <div className="mb-2 lg:mb-12 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="hidden lg:block space-y-2">
          <div className={cn(
            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
            isDarkMode ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-blue-50 text-blue-600 border border-blue-100"
          )}>
            <Pill size={12} />
            Danh mục dược lý
          </div>
          <h2 className={cn("text-2xl lg:text-4xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
            {featureSettings?.customTitle || (canManage ? "Quản lý danh mục thuốc" : "Tra cứu thuốc")}
          </h2>
          <p className={cn(
            "font-medium max-w-xl transition-colors text-xs lg:text-sm opacity-70",
            isDarkMode ? "text-slate-400" : "text-slate-500"
          )}>
            {canManage 
              ? "Hệ thống cập nhật và quản lý cơ sở dữ liệu thuốc, hoạt chất và danh mục dược lý."
              : "Hệ thống tra cứu thông tin dược lý, tương tác và chỉ định ICD-10 chuẩn y khoa."
            }
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden lg:block">
            {viewModeToggle}
          </div>
          {canManage && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(true)}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition-all active:scale-95 text-xs lg:text-sm border shadow-sm",
                  isDarkMode ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <Settings size={18} />
                <span className="hidden sm:inline">Nhóm thuốc</span>
              </button>
              <button
                type="button"
                onClick={() => setIsIngredientModalOpen(true)}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition-all active:scale-95 text-xs lg:text-sm border shadow-sm",
                  isDarkMode ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <Database size={18} />
                <span className="hidden sm:inline">Hoạt chất</span>
              </button>
              <button
                type="button"
                onClick={() => setIsIngredientCategoryModalOpen(true)}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition-all active:scale-95 text-xs lg:text-sm border shadow-sm",
                  isDarkMode ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <FolderTree size={18} />
                <span className="hidden sm:inline">Phân loại</span>
              </button>
              <button
                type="button"
                onClick={() => setIsExcipientModalOpen(true)}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition-all active:scale-95 text-xs lg:text-sm border shadow-sm",
                  isDarkMode ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <Database size={18} />
                <span className="hidden sm:inline">Tá dược</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div 
        ref={mainSearchRef}
        className={cn(
          "mb-8 p-2 lg:p-3 rounded-[24px] lg:rounded-[32px] border transition-all shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center gap-3",
          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
        )}
      >
        <div className="relative flex-1 flex items-center group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder={searchMode === 'all' ? "Tìm tên thuốc, hoạt chất, mã ATC..." : searchMode === 'name' ? "Tìm theo tên thuốc..." : "Tìm theo hoạt chất..."}
            className={cn(
              "w-full pl-12 pr-32 py-3 lg:py-4 border-none rounded-2xl focus:ring-0 transition-all text-sm font-bold",
              isDarkMode ? "bg-slate-800/50 text-white placeholder:text-slate-600" : "bg-slate-50 text-slate-900 placeholder:text-slate-400"
            )}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <select
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value as any)}
              className={cn(
                "text-[10px] font-black uppercase tracking-widest py-1.5 px-3 rounded-xl border-none focus:ring-0 cursor-pointer transition-all",
                isDarkMode ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-white text-slate-600 hover:bg-slate-100 shadow-sm"
              )}
            >
              <option value="all">Tất cả</option>
              <option value="name">Tên</option>
              <option value="ingredient">Hoạt chất</option>
            </select>
          </div>
        </div>
        
        <div className={cn(
          "h-8 w-px hidden lg:block transition-colors",
          isDarkMode ? "bg-slate-800" : "bg-slate-100"
        )}></div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {viewMode === 'drugs' && (
            <div className="relative flex-1 sm:w-64 group">
              <Folder className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <select
                className={cn(
                  "w-full pl-11 pr-10 py-3 lg:py-4 border-none rounded-2xl appearance-none focus:ring-0 cursor-pointer text-sm font-bold transition-all",
                  isDarkMode ? "bg-slate-800/50 text-slate-300" : "bg-slate-50 text-slate-600"
                )}
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option value="Tất cả">Tất cả nhóm thuốc</option>
                {sortedDrugGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {'\u00A0'.repeat(group.level * 3)}{group.level > 0 ? '└─ ' : ''}{group.name}
                  </option>
                ))}
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" size={16} />
            </div>
          )}
        </div>
      </div>

      {viewMode === 'ingredients' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className={cn("text-xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>Tra cứu theo hoạt chất</h3>
            <div className="flex items-center gap-2">
              {selectedIngredient && (
                <button 
                  type="button"
                  onClick={() => setSelectedIngredient(null)}
                  className="text-xs font-bold text-rose-500 hover:underline"
                >
                  Xóa lọc hoạt chất
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {uniqueIngredients
              .filter(ing => (ing.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()))
              .map((ing, idx) => (
                <motion.div
                  layout
                  key={idx}
                  onClick={() => {
                    setSelectedIngredient(ing.name);
                    setViewMode('drugs');
                  }}
                  className={cn(
                    "p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-xl group",
                    selectedIngredient === ing.name
                      ? "border-primary bg-primary/5"
                      : isDarkMode ? "bg-slate-900 border-slate-800 hover:border-blue-900" : "bg-white border-slate-100 hover:border-blue-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        isDarkMode ? "bg-slate-800 group-hover:bg-blue-900/30" : "bg-blue-50 group-hover:bg-blue-100"
                      )}>
                        <Activity size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h4 className={cn("font-bold text-sm", isDarkMode ? "text-white" : "text-slate-900")}>{ing.name}</h4>
                        <p className="text-[10px] text-slate-500 font-medium">{ing.drugCount} biệt dược</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-primary transition-colors" />
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
      ) : viewMode === 'groups' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className={cn("text-xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>Danh mục nhóm thuốc</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Tìm nhóm thuốc..."
                className={cn(
                  "w-full pl-9 pr-4 py-2 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all text-xs font-medium",
                  isDarkMode ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900"
                )}
                value={groupSearchTerm}
                onChange={(e) => setGroupSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className={cn(
            "grid gap-3 lg:gap-4",
            groupSearchTerm ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 max-w-4xl mx-auto"
          )}>
            {(groupSearchTerm 
              ? drugGroups.filter(g => (g.name || '').toLowerCase().includes((groupSearchTerm || '').toLowerCase())).sort((a, b) => (a.order || 0) - (b.order || 0))
              : sortedDrugGroups.filter(g => {
                  // A group is visible if it's top-level OR all its ancestors are expanded
                  if (g.level === 0) return true;
                  
                  let currentParentId = g.parentId;
                  while (currentParentId) {
                    if (!expandedGroupIds.has(currentParentId)) return false;
                    const parent = drugGroups.find(pg => pg.id === currentParentId);
                    currentParentId = parent?.parentId || null;
                  }
                  return true;
                })
            ).map((group, index, array) => {
              const drugCount = groupDrugCounts[group.id] || 0;
              const parent = drugGroups.find(pg => pg.id === group.parentId);
              const hasChildren = drugGroups.some(g => g.parentId === group.id);
              const isExpanded = expandedGroupIds.has(group.id);
              
              // logic to show vertical line if there are more siblings or descendants
              const hasMoreSiblings = !groupSearchTerm && array.slice(index + 1).some(g => g.parentId === group.parentId);
              
              return (
                <motion.div
                  key={group.id}
                  onClick={() => {
                    setGroupFilter(group.id);
                    setViewMode('drugs');
                  }}
                  className={cn(
                    "group p-3 rounded-2xl border cursor-pointer transition-all hover:shadow-xl relative",
                    isDarkMode ? "bg-slate-900 border-slate-800 hover:border-blue-900" : "bg-white border-slate-100 hover:border-blue-200",
                    !groupSearchTerm && group.level === 0 && (isDarkMode ? "bg-blue-900/5 border-blue-900/20" : "bg-blue-50/30 border-blue-100/50")
                  )}
                  style={!groupSearchTerm && group.level > 0 ? { 
                    marginLeft: `${group.level * (window.innerWidth >= 1024 ? 48 : 32)}px` 
                  } : {}}
                >
                  {!groupSearchTerm && group.level > 0 && (
                    <>
                      <div className={cn(
                        "absolute top-1/2 -translate-y-1/2 h-px",
                        "-left-8 w-8 lg:-left-12 lg:w-12",
                        isDarkMode ? "bg-slate-700" : "bg-slate-200"
                      )} />
                      <div className={cn(
                        "absolute top-0 bottom-1/2 w-px",
                        "-left-8 lg:-left-12",
                        isDarkMode ? "bg-slate-700" : "bg-slate-200"
                      )} />
                      {hasMoreSiblings && (
                        <div className={cn(
                          "absolute top-1/2 bottom-0 w-px",
                          "-left-8 lg:-left-12",
                          isDarkMode ? "bg-slate-700" : "bg-slate-200"
                        )} />
                      )}
                    </>
                  )}
                  
                  <div className="flex items-start justify-between mb-2">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm relative",
                      group.level === 0 
                        ? (isDarkMode ? "bg-blue-600 text-white" : "bg-blue-600 text-white")
                        : isDarkMode ? "bg-slate-800 text-blue-400 group-hover:bg-blue-900/30" : "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
                    )}>
                      <Folder size={group.level === 0 ? 20 : 16} fill={group.level === 0 ? "currentColor" : "none"} />
                      {hasChildren && !groupSearchTerm && (
                        <button
                          onClick={(e) => toggleGroupExpand(group.id, e)}
                          className={cn(
                            "absolute -right-2 -bottom-2 w-6 h-6 rounded-full border flex items-center justify-center transition-transform duration-75 z-10",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-white border-slate-200 text-slate-500 shadow-sm",
                            isExpanded ? "rotate-180 bg-blue-500 text-white border-blue-600" : "hover:scale-105"
                          )}
                        >
                          <ChevronDown size={12} />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border shadow-sm",
                        group.level === 0 
                          ? "bg-amber-100 text-amber-700 border-amber-200" 
                          : group.level === 1 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                      )}>
                        {group.level === 0 ? "Nhóm lớn" : group.level === 1 ? "Nhóm con" : "Nhóm nhỏ"}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
                        isDarkMode ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-white text-slate-500 border-slate-100"
                      )}>
                        {drugCount} thuốc
                      </span>
                    </div>
                  </div>
                  
                  <h4 className={cn(
                    "font-black group-hover:text-blue-600 transition-colors truncate",
                    isDarkMode ? "text-white" : "text-slate-900",
                    group.level === 0 ? "text-sm lg:text-base" : "text-xs lg:text-sm"
                  )}>
                    {group.name}
                  </h4>
                </motion.div>
              );
            })}
          </div>

          {drugGroups.length === 0 && (
            <div className="text-center py-20">
              <FolderTree size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-bold">Chưa có nhóm thuốc nào được định nghĩa</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className={cn(
          "lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-[72px] transition-all duration-500",
          "h-fit max-h-[80vh] lg:max-h-[calc(100vh-140px)]"
        )}>
          {/* Quick Search in Sticky Column - Only visible when main search bar is scrolled out */}
          <AnimatePresence>
            {showStickySearch && (
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className={cn(
                  "p-2 rounded-2xl border shadow-xl transition-all relative flex items-center group mb-1",
                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-slate-200/50"
                )}
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Tìm thuốc..."
                  className={cn(
                    "w-full pl-10 pr-10 py-2.5 bg-transparent border-none focus:ring-0 text-xs font-black",
                    isDarkMode ? "text-white" : "text-slate-900"
                  )}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-1 rounded-full hover:bg-rose-500/10 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className={cn(
            "overflow-y-auto custom-scrollbar p-1",
            selectedDrug 
              ? "flex flex-col gap-4 lg:gap-3" 
              : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5 lg:gap-4"
          )}>

          {selectedIngredient && (
            <div className={cn(
              "p-3 rounded-2xl border flex items-center justify-between mb-2",
              isDarkMode ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-100"
            )}>
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-blue-600" />
                <span className="text-xs font-bold text-blue-700 truncate">Hoạt chất: {selectedIngredient}</span>
              </div>
              <button type="button" onClick={() => setSelectedIngredient(null)} className="text-blue-600 hover:text-blue-800 p-1">
                <X size={14} />
              </button>
            </div>
          )}
          {filteredDrugs.length > 0 ? (
            filteredDrugs.map((drug) => (
              <motion.div
                layout
                key={drug.id}
                onClick={() => setSelectedDrug(drug)}
                className={cn(
                  "p-5 lg:p-4 rounded-[24px] lg:rounded-2xl border cursor-pointer transition-all duration-300 relative group hover:z-30 hover:scale-[1.02] hover:-translate-y-1 h-auto min-h-[120px]",
                  selectedDrug?.id === drug.id 
                    ? cn(
                        "border-primary ring-4 ring-primary/10 z-20 shadow-2xl shadow-primary/20",
                        isDarkMode ? "bg-slate-900" : "bg-white"
                      )
                    : cn(
                        "hover:border-primary/30 shadow-sm hover:shadow-xl",
                        isDarkMode ? "bg-slate-900 border-slate-800 hover:bg-slate-800/50" : "bg-white border-slate-100 hover:shadow-slate-200/50"
                      )
                )}
              >
                {selectedDrug?.id === drug.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary shadow-[4px_0_12px_rgba(59,130,246,0.5)] rounded-l-2xl"></div>
                )}
                
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className={cn(
                      "w-14 h-14 lg:w-10 lg:h-10 rounded-2xl lg:rounded-lg flex items-center justify-center shrink-0 transition-all duration-700 overflow-hidden border shadow-sm relative",
                      selectedDrug?.id === drug.id 
                        ? "bg-primary border-primary/50 text-white shadow-primary/20" 
                        : cn(
                            "text-slate-400 group-hover:text-primary",
                            isDarkMode 
                              ? "bg-slate-800 border-slate-700 group-hover:bg-primary/10 group-hover:border-primary/30" 
                              : "bg-slate-50 border-slate-100 group-hover:bg-primary/5 group-hover:border-primary/10"
                          )
                    )}>
                      {drug.avatarUrl ? (
                        <img src={drug.avatarUrl} alt={drug.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                      ) : (
                        <Pill size={28} className="lg:size-5 transition-transform duration-500 group-hover:rotate-12" />
                      )}
                      {!drug.isActive && (
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center">
                          <X size={16} className="text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className={cn(
                          "font-black text-base lg:text-sm transition-colors",
                          isDarkMode ? "text-white group-hover:text-primary" : "text-slate-900 group-hover:text-primary"
                        )}>{drug.name}</h3>
                        {!drug.isActive && (
                          <span className="text-[8px] px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded-full font-black uppercase border border-rose-500/20">Ngưng</span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {(drug.activeIngredients || []).map((ing, idx) => (
                          <span key={idx} className={cn(
                            "text-[9px] font-bold px-2 py-0.5 rounded-md border transition-colors",
                            isDarkMode ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-500"
                          )}>
                            {ing.name} {ing.strength}
                          </span>
                        ))}
                        <span className={cn(
                          "flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md",
                          isDarkMode ? "bg-blue-900/20 text-blue-400" : "bg-blue-50 text-blue-600"
                        )}>
                          <Activity size={8} />
                          {drug.dosageForm || 'N/A'}
                        </span>
                        {drug.category || (drug.groupIds && drug.groupIds.length > 0 && drugGroups.filter(g => drug.groupIds?.includes(g.id)).map(g => g.name).join(', ')) ? (
                          <span className={cn(
                            "flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md border max-w-full",
                            isDarkMode ? "bg-slate-800/30 border-slate-700 text-slate-500" : "bg-slate-50 border-slate-100 text-slate-400"
                          )}>
                            <Folder size={8} className="shrink-0" />
                            <span className="truncate">
                              {drug.category || drugGroups.filter(g => drug.groupIds?.includes(g.id)).map(g => g.name).join(', ')}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end justify-between self-stretch py-0.5">
                    <div className="flex items-center gap-1">
                      {canManage && (
                        <div className={cn(
                          "flex flex-col gap-1 transition-all",
                          "lg:opacity-0 lg:group-hover:opacity-100"
                        )}>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(drug); }}
                            className={cn(
                              "p-2 lg:p-1.5 rounded-xl transition-all hover:scale-110",
                              isDarkMode ? "text-slate-500 hover:text-primary hover:bg-primary/10" : "text-slate-400 hover:text-primary hover:bg-primary/5"
                            )}
                          >
                            <Edit2 size={16} className="lg:size-3" />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(drug.id, drug.name, drug.pdfUrl); }}
                            className={cn(
                              "p-2 lg:p-1.5 rounded-xl transition-all hover:scale-110",
                              isDarkMode ? "text-slate-500 hover:text-rose-500 hover:bg-rose-500/10" : "text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                            )}
                          >
                            <Trash2 size={16} className="lg:size-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {drug.atcCode && (
                      <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded-md border",
                        isDarkMode ? "bg-slate-800/80 border-slate-700 text-slate-500" : "bg-slate-50 border-slate-100 text-slate-400"
                      )}>
                        {drug.atcCode}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className={cn(
              "text-center py-20 rounded-3xl border shadow-sm transition-colors",
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
            )}>
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                isDarkMode ? "bg-slate-800" : "bg-white"
              )}>
                <Search size={32} className={isDarkMode ? "text-slate-600" : "text-slate-300"} />
              </div>
              <p className={cn("font-bold", isDarkMode ? "text-slate-500" : "text-slate-400")}>Không tìm thấy thuốc phù hợp</p>
              <button 
                type="button"
                onClick={() => { setSearchTerm(''); setGroupFilter('Tất cả'); setSelectedIngredient(null); }}
                className={cn("mt-4 font-bold text-sm hover:underline", isDarkMode ? "text-blue-400" : "text-blue-600")}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className={cn(
        "lg:col-span-8",
          selectedDrug ? "fixed inset-0 z-[60] lg:relative lg:inset-auto lg:z-0" : "hidden lg:block"
        )}>
          <AnimatePresence>
            {selectedDrug && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedDrug(null)}
                className="lg:hidden fixed inset-0 bg-slate-900/60 z-[55]"
              />
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            {selectedDrug ? (
              <motion.div
                key={selectedDrug.id}
                initial={{ x: typeof window !== 'undefined' && window.innerWidth < 1024 ? '100%' : 0, opacity: 0, scale: typeof window !== 'undefined' && window.innerWidth < 1024 ? 1 : 0.98 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: typeof window !== 'undefined' && window.innerWidth < 1024 ? '100%' : 0, opacity: 0, scale: typeof window !== 'undefined' && window.innerWidth < 1024 ? 1 : 0.98 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className={cn(
                  "h-full lg:h-auto overflow-y-auto lg:overflow-visible custom-scrollbar relative z-[60]",
                  isDarkMode ? "bg-slate-950 lg:bg-transparent" : "bg-white lg:bg-transparent"
                )}
              >
                {/* Mobile Close Button */}
                <button 
                  type="button"
                  onClick={() => setSelectedDrug(null)}
                  className="lg:hidden fixed top-4 right-4 z-[70] p-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-white shadow-2xl active:scale-95 transition-transform"
                >
                  <X size={20} />
                </button>

                <div className={cn(
                  "min-h-full lg:min-h-0 rounded-none lg:rounded-[32px] border-0 lg:border shadow-none lg:shadow-2xl lg:sticky lg:top-8 transition-colors",
                  isDarkMode ? "bg-slate-900 border-slate-800 shadow-none" : "bg-white border-slate-100 shadow-slate-200/50"
                )}>
                <div className="sticky top-0 lg:top-[56px] z-30">
                  <div className={cn(
                    "p-4 md:p-6 lg:p-10 relative overflow-hidden transition-colors duration-500 rounded-t-[32px]",
                    isDarkMode 
                      ? "bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white" 
                      : "bg-white text-slate-900"
                  )}>
                    <div className="absolute inset-x-0 bottom-0 h-px bg-slate-100 dark:bg-slate-800" />
                    {(() => {
                      const group = drugGroups.find(g => g.id === selectedDrug.groupId);
                      const bannerUrl = group?.bannerUrl;
                      if (!bannerUrl) return null;
                      return (
                        <div className="absolute inset-0 z-0">
                          <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-30" referrerPolicy="no-referrer" />
                          <div className={cn(
                            "absolute inset-0 bg-gradient-to-t",
                            isDarkMode ? "from-slate-900 via-slate-900/80 to-transparent" : "from-white via-white/80 to-transparent"
                          )} />
                        </div>
                      );
                    })()}
                    <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                    <div className="absolute left-0 bottom-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full -ml-32 -mb-32"></div>
                    
                    <div className="relative z-10">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 lg:gap-8">
                        <div className="flex items-center gap-4 lg:gap-6">
                          <div className="relative group/avatar">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-[20px] lg:rounded-[28px] blur opacity-25 group-hover/avatar:opacity-50 transition duration-1000 group-hover/avatar:duration-200"></div>
                            <div className={cn(
                              "relative backdrop-blur-2xl p-1 rounded-[18px] lg:rounded-[26px] shadow-2xl border overflow-hidden w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center transition-transform duration-500 hover:scale-105",
                              isDarkMode ? "bg-white/10 border-white/20 ring-1 ring-white/10" : "bg-slate-50 border-slate-200 shadow-slate-200/50"
                            )}>
                              <div className={cn(
                                "w-full h-full rounded-[14px] lg:rounded-[18px] overflow-hidden flex items-center justify-center",
                                isDarkMode ? "bg-slate-900/20" : "bg-slate-100"
                              )}>
                                {selectedDrug.avatarUrl ? (
                                  <img src={selectedDrug.avatarUrl} alt={selectedDrug.name} className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" referrerPolicy="no-referrer" />
                                ) : (
                                  <Pill size={24} className="text-blue-400" />
                                )}
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 lg:gap-3 mb-1">
                              <h2 className="text-xl lg:text-3xl font-black tracking-tight leading-tight">{selectedDrug.name}</h2>
                              {selectedDrug.isActive ? (
                                <span className="px-1.5 lg:px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[8px] lg:text-[10px] font-black uppercase border border-emerald-500/30">Active</span>
                              ) : (
                                <span className="px-1.5 lg:px-2 py-0.5 bg-slate-500/20 text-slate-400 rounded-full text-[8px] lg:text-[10px] font-black uppercase border border-slate-500/30">Inactive</span>
                              )}
                            </div>
                            <p className={cn(
                              "font-bold uppercase tracking-[0.1em] lg:tracking-[0.15em] text-[9px] lg:text-[11px] mb-2 lg:mb-3",
                              isDarkMode ? "text-blue-300" : "text-blue-600"
                            )}>
                              {(selectedDrug.activeIngredients || []).map(ing => `${ing.name} ${ing.strength}`).join(' + ')}
                            </p>
                            
                            <div className="flex flex-wrap gap-1.5 lg:gap-2">
                              {selectedDrug.atcCode && (
                                <span className={cn(
                                  "px-2 lg:px-3 py-1 lg:py-1.5 backdrop-blur-md rounded-lg lg:rounded-xl text-[9px] lg:text-[10px] font-bold border flex items-center gap-1.5 lg:gap-2",
                                  isDarkMode ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-blue-50 border-blue-100 text-blue-600"
                                )}>
                                  <ShieldAlert size={10} />
                                  ATC: {selectedDrug.atcCode}
                                </span>
                              )}
                              <span className={cn(
                                "px-2 lg:px-3 py-1 lg:py-1.5 backdrop-blur-md rounded-lg lg:rounded-xl text-[9px] lg:text-[10px] font-bold border flex items-center gap-1.5 lg:gap-2",
                                isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                              )}>
                                <div className="w-1 lg:w-1 h-1 lg:h-1 rounded-full bg-blue-400"></div>
                                {(() => {
                                  if (selectedDrug.category) return selectedDrug.category;
                                  const names = drugGroups.filter(g => (selectedDrug.groupIds || []).includes(g.id)).map(g => g.name);
                                  return names.length > 0 ? names.join(', ') : 'Chưa phân nhóm';
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {selectedDrug.pdfUrl && (
                          <button
                            type="button"
                            onClick={() => setPdfViewerUrl(selectedDrug.pdfUrl!)}
                            className="flex items-center justify-center gap-2 lg:gap-3 px-4 lg:px-5 py-2 lg:py-3 bg-blue-600 hover:bg-blue-500 rounded-xl lg:rounded-2xl text-xs font-black transition-all shadow-xl shadow-blue-900/40 group active:scale-95"
                          >
                            <FileText size={16} className="group-hover:scale-110 transition-transform" /> 
                            Xem PDF
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={cn(
                    "px-4 lg:px-10 py-1 mt-1 border-b backdrop-blur-md transition-colors",
                    isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-100 shadow-sm"
                  )}>
                    {/* Detail Tabs Navigation */}
                    <div className={cn(
                      "flex overflow-x-auto gap-0.5 p-0.5 custom-scrollbar"
                    )}>
                      {detailTabs.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveDetailTab(tab.id as any)}
                          className={cn(
                            "flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap",
                            activeDetailTab === tab.id
                              ? isDarkMode 
                                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" 
                                  : "bg-blue-600 text-white shadow-md shadow-blue-200"
                              : isDarkMode
                                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                          )}
                        >
                          <span className="shrink-0">{tab.icon}</span>
                          <span className={cn(
                            "sm:inline",
                            activeDetailTab === tab.id ? "inline" : "hidden"
                          )}>{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "p-4 md:p-10 pt-4 md:pt-6 mt-2 space-y-6 transition-colors min-h-[500px]",
                  isDarkMode ? "bg-slate-900" : "bg-slate-50/50"
                )}>
                  <motion.div 
                    className="min-h-[400px]"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_, info) => {
                      if (info.offset.x > 80) handleSwipe(-1);
                      else if (info.offset.x < -80) handleSwipe(1);
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {activeDetailTab === 'indications' && (
                        <motion.div
                          key="indications"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                          className="grid grid-cols-1 gap-6"
                        >
                          <div className={cn(
                            "p-8 rounded-[40px] border transition-all",
                            isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-100 shadow-sm"
                          )}>
                            <div className="flex items-center gap-3 mb-8">
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm">
                                <Info size={24} />
                              </div>
                              <h4 className="font-black uppercase tracking-widest text-sm text-slate-400">Chỉ định điều trị</h4>
                            </div>
                            
                            <div className="space-y-4">
                              {[...(selectedDrug.indications || [])].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)).map((item, i) => (
                                <div key={i} className={cn(
                                  "flex items-start gap-5 p-6 rounded-3xl border transition-all shadow-sm group",
                                  isDarkMode ? "bg-slate-800 border-slate-700 hover:border-blue-900" : "bg-white border-slate-100 hover:border-blue-200"
                                )}>
                                  <div className="flex-1">
                                    <div className={cn("text-sm font-bold leading-relaxed", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                                      <span className="inline-flex items-center gap-2 mr-2 -mt-0.5 align-middle">
                                        <div className={cn(
                                          "w-2.5 h-2.5 rounded-full shrink-0 shadow-sm transition-all",
                                          (item.isPrimary && ((featureSettings?.showCommonIndications !== false) || canAccessDirectoryHintsWhenToggleOff))
                                            ? "bg-amber-500 shadow-amber-200 scale-125" 
                                            : "bg-blue-500 shadow-blue-200"
                                        )}></div>
                                        {item.isPrimary && ((featureSettings?.showCommonIndications !== false) || canAccessDirectoryHintsWhenToggleOff) && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-500 text-white uppercase tracking-wider shadow-sm">
                                            <Star size={8} fill="currentColor" /> Chỉ định thường dùng
                                          </span>
                                        )}
                                      </span>
                                      {item.content}
                                    </div>
                                    {item.icd10s?.[0] && ((featureSettings?.showIcdSuggestions !== false) || canAccessDirectoryHintsWhenToggleOff) && (
                                      <div className="mt-2 flex items-center gap-1.5">
                                        <span className={cn(
                                          "px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider",
                                          isDarkMode ? "bg-blue-900/30 text-blue-400 border-blue-800" : "bg-blue-50 text-blue-600 border-blue-100"
                                        )}>
                                          {item.icd10s[0]}
                                        </span>
                                        {icdList.find(icd => icd.code === item.icd10s[0]) && (
                                          <span className="text-[11px] text-slate-400 font-medium italic">
                                            - {icdList.find(icd => icd.code === item.icd10s[0])?.description}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {(!selectedDrug.indications || selectedDrug.indications.length === 0) && (
                                <div className="text-center py-20 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                                  <p className="text-slate-400 font-bold">Chưa có thông tin chỉ định.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeDetailTab === 'contraindications' && (
                        <motion.div
                          key="contraindications"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "p-8 rounded-[40px] border transition-all",
                            isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-100 shadow-sm"
                          )}
                        >
                          <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-sm">
                              <ShieldAlert size={24} />
                            </div>
                            <h4 className="font-black uppercase tracking-widest text-sm text-slate-400">Chống chỉ định</h4>
                          </div>

                          <div className="space-y-4">
                            {selectedDrug.contraindications.map((item, i) => (
                              <div key={i} className={cn(
                                "flex items-start gap-5 p-6 rounded-3xl border shadow-sm transition-all",
                                isDarkMode ? "bg-slate-800 border-rose-900/30 text-rose-200" : "bg-white border-rose-100/50 text-rose-900"
                              )}>
                                <div className="p-2 rounded-xl bg-rose-50 text-rose-500 shrink-0">
                                  <X size={18} strokeWidth={3} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    {item.type && (
                                      <span className={cn(
                                        "px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider",
                                        isDarkMode ? "bg-rose-900/30 text-rose-400 border-rose-800" : "bg-rose-100 text-rose-600 border-rose-200"
                                      )}>
                                        {item.type === 'Drug' ? 'Dùng chung thuốc' :
                                          item.type === 'ICD-10' ? 'ICD-10' :
                                          item.type === 'Weight' ? 'Cân nặng' :
                                          item.type === 'Age' ? 'Tuổi tác' : 'Khác'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm font-bold leading-relaxed">{item.content}</p>
                                </div>
                              </div>
                            ))}
                            {selectedDrug.contraindications.length === 0 && (
                              <div className="text-center py-20 bg-rose-50/20 rounded-[32px] border border-dashed border-rose-100">
                                <p className="text-rose-400 font-bold">Không có thông tin chống chỉ định đặc biệt.</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {activeDetailTab === 'dosage' && (
                        <motion.div
                          key="dosage"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "rounded-[40px] p-8 border shadow-sm transition-colors",
                            isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"
                          )}
                        >
                          <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                              <Clock size={24} />
                            </div>
                            <h4 className="font-black uppercase tracking-widest text-sm text-slate-400">Liều lượng & Cách dùng</h4>
                          </div>

                          <div className="space-y-8">
                            {selectedDrug.excipients && (
                              <div className={cn(
                                "p-6 rounded-3xl border transition-colors",
                                isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-slate-50 border-slate-100"
                              )}>
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tá dược:</h5>
                                <p className={cn(
                                  "text-sm font-bold italic transition-colors",
                                  isDarkMode ? "text-slate-400" : "text-slate-600"
                                )}>{selectedDrug.excipients}</p>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-1 gap-6">
                              {selectedDrug.generalAdministration && (
                                <div className={cn(
                                  "p-8 rounded-3xl border transition-colors relative overflow-hidden group",
                                  isDarkMode ? "bg-amber-900/10 border-amber-900/30" : "bg-amber-50/20 border-amber-100 shadow-sm"
                                )}>
                                  <div className="absolute top-0 right-0 p-6 opacity-5">
                                    <Clock size={60} className="text-amber-500" />
                                  </div>
                                  <h5 className={cn("text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2", isDarkMode ? "text-amber-400" : "text-amber-600")}>
                                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                    Hướng dẫn sử dụng chung:
                                  </h5>
                                  <p className={cn(
                                    "text-sm font-bold leading-relaxed transition-colors",
                                    isDarkMode ? "text-slate-200" : "text-slate-800"
                                  )}>{selectedDrug.generalAdministration}</p>
                                </div>
                              )}

                              {(selectedDrug.dosageAndAdministration || []).map((item, idx) => (
                                <div key={idx} className={cn(
                                  "p-8 rounded-3xl border shadow-sm hover:shadow-md transition-all group",
                                  isDarkMode ? "bg-slate-900/50 border-slate-700" : "bg-white border-slate-100"
                                )}>
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full group-hover:h-8 transition-all"></div>
                                    <h5 className={cn("font-black text-base uppercase tracking-tight transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>{item.category}</h5>
                                  </div>
                                  <p className={cn("text-sm leading-relaxed font-bold transition-colors", isDarkMode ? "text-slate-300" : "text-slate-700")}>{item.content}</p>
                                </div>
                              ))}
                              {(selectedDrug.dosageAndAdministration || []).length === 0 && !selectedDrug.generalAdministration && (
                                <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                                  <p className="text-slate-400 font-bold italic">Thông tin liều dùng đang được cập nhật...</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeDetailTab === 'interactions' && (
                        <motion.div
                          key="interactions"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-6"
                        >
                          {selectedDrug.specificInteractions && selectedDrug.specificInteractions.length > 0 ? (
                            <div className={cn(
                              "rounded-[40px] p-8 border transition-colors shadow-sm",
                              isDarkMode ? "bg-indigo-900/10 border-indigo-900/30" : "bg-white border-indigo-50"
                            )}>
                              <div className="flex items-center gap-3 mb-8">
                                <div className={cn(
                                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm border",
                                  isDarkMode ? "bg-indigo-900/50 text-indigo-400 border-indigo-800" : "bg-indigo-50 text-indigo-600 border-indigo-100"
                                )}>
                                  <RefreshCw size={24} />
                                </div>
                                <h4 className={cn("font-black uppercase tracking-widest text-sm transition-colors text-slate-400")}>Tương tác thuốc</h4>
                              </div>

                              <div className="grid grid-cols-1 gap-6">
                                {selectedDrug.specificInteractions.map((item, idx) => (
                                  <div key={idx} className={cn(
                                    "p-8 rounded-3xl border shadow-sm hover:shadow-md transition-all",
                                    isDarkMode ? "bg-slate-800 border-indigo-900/30" : "bg-white border-indigo-100"
                                  )}>
                                    <h5 className={cn("font-black text-sm uppercase tracking-tight mb-3 transition-colors", isDarkMode ? "text-indigo-400" : "text-indigo-900")}>{item.target}</h5>
                                    <p className={cn("text-sm leading-relaxed font-bold transition-colors", isDarkMode ? "text-slate-300" : "text-slate-700")}>{item.content}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-20 bg-indigo-50/10 rounded-[40px] border border-dashed border-indigo-100">
                              <RefreshCw size={48} className="mx-auto text-indigo-200 mb-4" />
                              <p className="text-slate-400 font-bold">Không có tương tác thuốc đặc biệt được ghi nhận.</p>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {activeDetailTab === 'warnings' && (
                        <motion.div
                          key="warnings"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "p-8 rounded-[40px] border transition-all",
                            isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-100 shadow-sm"
                          )}
                        >
                          <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-sm">
                              <AlertTriangle size={24} />
                            </div>
                            <h4 className="font-black uppercase tracking-widest text-sm text-slate-400">Thận trọng & Cảnh báo</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                              { label: 'Tác dụng phụ', value: selectedDrug.sideEffects, icon: <Info size={18} />, color: isDarkMode ? 'text-amber-400' : 'text-amber-600', bgColor: isDarkMode ? 'bg-amber-900/20' : 'bg-amber-50' },
                              { label: 'Thận trọng', value: selectedDrug.precautions, icon: <ShieldAlert size={18} />, color: isDarkMode ? 'text-orange-400' : 'text-orange-600', bgColor: isDarkMode ? 'bg-orange-900/20' : 'bg-orange-50' },
                              { label: 'Tương tác chung', value: selectedDrug.interactions, icon: <RefreshCw size={18} />, color: isDarkMode ? 'text-indigo-400' : 'text-indigo-600', bgColor: isDarkMode ? 'bg-indigo-900/20' : 'bg-indigo-50' },
                              { label: 'Phụ nữ có thai', value: selectedDrug.pregnancy, icon: <Heart size={18} />, color: isDarkMode ? 'text-rose-400' : 'text-rose-600', bgColor: isDarkMode ? 'bg-rose-900/20' : 'bg-rose-50' },
                              { label: 'Phụ nữ cho con bú', value: selectedDrug.lactation, icon: <Baby size={18} />, color: isDarkMode ? 'text-pink-400' : 'text-pink-600', bgColor: isDarkMode ? 'bg-pink-900/20' : 'bg-pink-50' },
                              { label: 'Vận hành xe & máy móc', value: selectedDrug.driving, icon: <Car size={18} />, color: isDarkMode ? 'text-slate-400' : 'text-slate-600', bgColor: isDarkMode ? 'bg-slate-800' : 'bg-slate-100' },
                              { label: 'Quá liều - Xử trí', value: selectedDrug.overdose, icon: <AlertTriangle size={18} />, color: isDarkMode ? 'text-red-400' : 'text-red-600', bgColor: isDarkMode ? 'bg-red-900/20' : 'bg-red-50' },
                            ].map((item, idx) => (item.value && (Array.isArray(item.value) ? item.value.length > 0 : true)) && (
                              <div key={idx} className={cn(
                                "p-6 rounded-3xl border transition-all hover:scale-[1.02] shadow-sm",
                                item.bgColor,
                                item.bgColor.replace('bg-', 'border-')
                              )}>
                                <div className={cn("flex items-center gap-2 mb-4", item.color)}>
                                  <div className={cn("p-1.5 rounded-lg bg-white/50 backdrop-blur-sm shadow-sm border", item.bgColor.replace('bg-', 'border-'))}>
                                    {item.icon}
                                  </div>
                                  <h4 className="font-black uppercase tracking-widest text-[10px]">{item.label}</h4>
                                </div>
                                {item.label === 'Tác dụng phụ' && Array.isArray(item.value) ? (
                                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {(item.value as any[]).map((se, i) => (
                                      <div key={i} className={cn(
                                        "p-4 rounded-2xl border border-dashed transition-colors",
                                        isDarkMode ? "bg-slate-900/50 border-amber-900/30 text-slate-300" : "bg-white/50 border-amber-100 text-slate-700 font-bold"
                                      )}>
                                        {typeof se === 'object' ? (
                                          <>
                                            <div className={cn("text-[9px] font-black uppercase tracking-widest mb-1.5 inline-block px-2 py-0.5 rounded-md", isDarkMode ? "bg-amber-900/40 text-amber-500" : "bg-amber-100 text-amber-700")}>
                                              {se.frequency || 'Chưa xác định'}
                                            </div>
                                            <p className="text-sm font-bold leading-relaxed whitespace-pre-line">
                                              {se.content}
                                            </p>
                                          </>
                                        ) : (
                                          <p className="text-sm font-bold leading-relaxed">
                                            {se}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className={cn("text-sm font-black leading-relaxed whitespace-pre-line", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                                    {typeof item.value === 'string' ? item.value : (Array.isArray(item.value) ? item.value.join(', ') : '')}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {activeDetailTab === 'pharmacology' && (
                        <motion.div
                          key="pharmacology"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "p-8 rounded-[40px] border transition-all",
                            isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-100 shadow-sm"
                          )}
                        >
                          <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
                              <Activity size={24} />
                            </div>
                            <h4 className="font-black uppercase tracking-widest text-sm text-slate-400">Dược lý học</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {selectedDrug.pharmacodynamics && (
                              <section>
                                <div className={cn("flex items-center gap-3 mb-6 transition-colors", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>
                                  <Activity size={24} />
                                  <h4 className="font-black uppercase tracking-widest text-xs">Dược lực học</h4>
                                </div>
                                <div className={cn(
                                  "p-8 rounded-[40px] border text-sm font-bold leading-relaxed transition-colors shadow-sm",
                                  isDarkMode ? "bg-emerald-900/10 border-emerald-900/30 text-slate-200" : "bg-emerald-50/30 border-emerald-100/50 text-slate-800"
                                )}>
                                  {typeof selectedDrug.pharmacodynamics === 'string' ? (
                                    selectedDrug.pharmacodynamics
                                  ) : (
                                    <div className="space-y-6">
                                      {selectedDrug.pharmacodynamics?.map((item, idx) => (
                                        <div key={idx} className="space-y-2">
                                          {item.category && <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">{item.category}</p>}
                                          <p>{item.content}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </section>
                            )}
                            {selectedDrug.pharmacokinetics && (
                              <section>
                                <div className={cn("flex items-center gap-3 mb-6 transition-colors", isDarkMode ? "text-cyan-400" : "text-cyan-600")}>
                                  <Zap size={24} />
                                  <h4 className="font-black uppercase tracking-widest text-xs">Dược động học</h4>
                                </div>
                                <div className={cn(
                                  "p-8 rounded-[40px] border text-sm font-bold leading-relaxed transition-colors shadow-sm",
                                  isDarkMode ? "bg-cyan-900/10 border-cyan-900/30 text-slate-200" : "bg-cyan-50/30 border-cyan-100/50 text-slate-800"
                                )}>
                                  {typeof selectedDrug.pharmacokinetics === 'string' ? (
                                    selectedDrug.pharmacokinetics
                                  ) : (
                                    <div className="space-y-6">
                                      {selectedDrug.pharmacokinetics?.map((item, idx) => (
                                        <div key={idx} className="space-y-2">
                                          {item.category && <p className="text-[10px] font-black uppercase tracking-wider text-cyan-500">{item.category}</p>}
                                          <p>{item.content}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </section>
                            )}
                            {!selectedDrug.pharmacodynamics && !selectedDrug.pharmacokinetics && (
                              <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                                <Activity size={48} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-slate-400 font-bold">Thông tin dược lý đang được cập nhật...</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ) : (
              <div className={cn(
                "h-full flex flex-col items-center justify-center text-center p-20 rounded-[40px] border-2 border-dashed min-h-[600px] shadow-inner transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              )}>
                <div className={cn(
                  "w-32 h-32 rounded-full flex items-center justify-center mb-8 shadow-sm transition-colors",
                  isDarkMode ? "bg-slate-800" : "bg-slate-50"
                )}>
                  <Pill size={64} className={isDarkMode ? "text-slate-700" : "text-slate-200"} />
                </div>
                <h3 className={cn("text-2xl font-black mb-3 transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>Tra cứu thông tin thuốc</h3>
                <p className={cn("max-w-sm font-medium transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Chọn một loại thuốc từ danh sách bên trái để xem chi tiết hướng dẫn sử dụng, liều dùng và các cảnh báo y khoa.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      )}

      {/* Management Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !uploading && setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-4xl sm:rounded-[32px] shadow-2xl overflow-hidden h-full sm:h-auto sm:max-h-[90vh] flex flex-col transition-colors",
                isDarkMode ? "bg-slate-900" : "bg-white"
              )}
            >
              <div className={cn(
                "p-4 sm:p-8 border-b flex items-center justify-between transition-colors shrink-0",
                isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white"
              )}>
                <div className="flex items-center gap-3 sm:gap-4">
                  <h3 className={cn("text-lg sm:text-2xl font-black tracking-tight transition-colors", isDarkMode ? "text-white" : "text-black")}>
                    {editingDrug ? 'Chỉnh sửa thuốc' : 'Thêm thuốc mới'}
                  </h3>
                  <label className={cn(
                    "flex items-center gap-2 cursor-pointer px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border shadow-sm transition-colors",
                    isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
                  )}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className={cn("text-[10px] sm:text-xs font-bold uppercase", formData.isActive ? "text-emerald-600" : (isDarkMode ? "text-slate-500" : "text-slate-400"))}>
                      {formData.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                    </span>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="submit"
                    form="drug-form"
                    disabled={uploading}
                    className={cn(
                      "sm:hidden p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50",
                      uploading && "animate-pulse"
                    )}
                  >
                    {uploading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!uploading) setIsModalOpen(false);
                    }} 
                    className={cn("p-2 rounded-full transition-colors", isDarkMode ? "hover:bg-slate-700 text-white" : "hover:bg-slate-200")}
                  >
                    <X size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>

              <div className={cn(
                "flex border-b px-4 sm:px-8 overflow-x-auto scrollbar-hide transition-colors shrink-0",
                isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white"
              )}>
                {[
                  { id: 'general', label: 'Chung', fullLabel: 'Thông tin chung', icon: <Pill size={18} /> },
                  { id: 'dosage', label: 'Liều dùng', fullLabel: 'Chỉ định & Liều dùng', icon: <Clock size={18} /> },
                  { id: 'warnings', label: 'Cảnh báo', fullLabel: 'Thận trọng & Cảnh báo', icon: <ShieldAlert size={18} /> },
                  { id: 'pharmacology', label: 'Dược lý', fullLabel: 'Dược lý & Tương tác', icon: <Activity size={18} /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex-1 sm:flex-none flex items-center justify-center sm:justify-start gap-2 py-3 sm:py-4 px-3 sm:px-4 border-b-2 transition-all font-bold text-xs sm:text-sm whitespace-nowrap",
                      activeTab === tab.id 
                        ? "border-blue-600 text-blue-600" 
                        : cn(
                            "border-transparent",
                            isDarkMode ? "text-slate-500 hover:text-slate-300 hover:border-slate-700" : "text-slate-400 hover:text-slate-600 hover:border-slate-200"
                          )
                    )}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.fullLabel}</span>
                  </button>
                ))}
              </div>

              <form id="drug-form" onSubmit={handleSave} className="flex-1 overflow-hidden flex flex-col">
                <div className={cn(
                  "flex-1 overflow-y-auto p-3 sm:p-8 space-y-6 sm:space-y-8 transition-colors custom-scrollbar",
                  isDarkMode ? "bg-slate-900" : "bg-white"
                )}>
                  {/* Sub Tabs Navigator */}
                  <div className={cn(
                    "flex gap-1 p-1 rounded-xl sticky top-0 z-30 transition-colors shadow-sm mb-6",
                    isDarkMode ? "bg-slate-800/80 backdrop-blur-md border border-slate-700" : "bg-slate-100/80 backdrop-blur-md border border-slate-200"
                  )}>
                    {(SUB_TABS[activeTab] || []).map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setActiveSubTab(sub.id)}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all",
                          activeSubTab === sub.id
                            ? (isDarkMode ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : "bg-white text-blue-600 shadow-sm border border-blue-100")
                            : (isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
                        )}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'general' && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6 sm:space-y-8"
                    >
                      {activeSubTab === 'info' && (
                        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                          <div className={cn(
                            "space-y-4 p-4 sm:p-6 rounded-2xl border transition-colors",
                            isDarkMode ? "bg-indigo-900/20 border-indigo-900/30" : "bg-indigo-50/50 border-indigo-100"
                          )}>
                            <div className={cn("flex items-center gap-2 mb-2 transition-colors", isDarkMode ? "text-indigo-400" : "text-indigo-700")}>
                              <FileText size={18} className="sm:w-5 sm:h-5" />
                              <label className="text-[10px] sm:text-sm font-black uppercase tracking-widest">Tài liệu PDF (Tải lên/Dán URL)</label>
                            </div>
                            <div className="flex flex-col gap-3">
                              <input
                                type="text"
                                disabled={uploading}
                                placeholder="Dán URL PDF tại đây..."
                                value={formData.pdfUrl}
                                onChange={(e) => setFormData({ ...formData, pdfUrl: e.target.value })}
                                className={cn(
                                  "flex-1 px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"
                                )}
                              />
                              <div className="flex flex-wrap gap-2">
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  ref={fileInputRef}
                                  onChange={handleFileChange}
                                  className="hidden"
                                />
                                <button
                                  type="button"
                                  disabled={uploading || extracting}
                                  onClick={() => fileInputRef.current?.click()}
                                  className={cn(
                                    "flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 border rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50",
                                    isDarkMode ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                  )}
                                >
                                  <Plus size={16} /> Tải file
                                </button>
                                <button
                                  type="button"
                                  disabled={uploading || extracting}
                                  onClick={handleAIExtract}
                                  className={cn(
                                    "flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 text-white rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg",
                                    isDarkMode ? "bg-indigo-600 hover:bg-indigo-700 shadow-none" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                                  )}
                                >
                                  {extracting ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
                                  {extracting ? 'Đang trích xuất...' : 'AI Trích xuất'}
                                </button>
                                {formData.pdfUrl && (
                                  <button
                                    type="button"
                                    disabled={uploading || extracting}
                                    onClick={handleRemoveFile}
                                    className={cn(
                                      "px-3 sm:px-4 py-3 sm:py-4 border rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50",
                                      isDarkMode ? "text-rose-400 bg-rose-900/20 border-rose-900/30 hover:bg-rose-900/40" : "text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100"
                                    )}
                                    title="Xóa file hiện tại"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-[9px] sm:text-[10px] text-slate-400 italic">* Tải file PDF lên và dùng AI để tự động điền thông tin thuốc.</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Tên thuốc <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                disabled={uploading}
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={cn(
                                  "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                                )}
                              />
                            </div>
                            <div>
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Mã ATC
                              </label>
                              <input
                                type="text"
                                disabled={uploading}
                                value={formData.atcCode || ''}
                                onChange={(e) => setFormData({ ...formData, atcCode: e.target.value })}
                                className={cn(
                                  "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                                )}
                                placeholder="Ví dụ: N02BE01"
                              />
                            </div>
                            <div>
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Nhóm thuốc <span className="text-rose-500">*</span>
                              </label>
                              <div className={cn(
                                "border rounded-xl p-3 sm:p-4 max-h-[220px] overflow-y-auto custom-scrollbar space-y-2",
                                isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                              )}>
                                {sortedDrugGroups.map(group => {
                                  const isSelected = (formData.groupIds || []).includes(group.id);
                                  return (
                                    <label 
                                      key={group.id} 
                                      className={cn(
                                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border",
                                        isSelected 
                                          ? (isDarkMode ? "bg-blue-600/20 border-blue-500/50 text-white" : "bg-blue-50 border-blue-200 text-blue-700 font-bold")
                                          : (isDarkMode ? "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800" : "bg-white border-slate-100 text-slate-600 hover:bg-slate-100")
                                      )}
                                      style={{ marginLeft: `${group.level * 20}px` }}
                                    >
                                      <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          let nextIds = [...(formData.groupIds || [])];
                                          if (e.target.checked) {
                                            if (!nextIds.includes(group.id)) nextIds.push(group.id);
                                          } else {
                                            nextIds = nextIds.filter(id => id !== group.id);
                                          }
                                          setFormData({ 
                                            ...formData, 
                                            groupIds: nextIds,
                                            groupId: nextIds[0] || '', // Fallback for legacy
                                            category: nextIds.length > 0 ? '' : '' // will be handled during display
                                          });
                                        }}
                                      />
                                      <div className={cn(
                                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                                        isSelected ? "bg-blue-600 border-blue-600" : (isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200")
                                      )}>
                                        {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                                      </div>
                                      <span className="text-xs">{group.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                            <div>
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>URL Ảnh đại diện</label>
                              <div className="flex gap-3 sm:gap-4">
                                {formData.avatarUrl && (
                                  <div className="relative group/img">
                                    <div className={cn(
                                      "w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border shrink-0 transition-colors",
                                      isDarkMode ? "border-slate-700" : "border-slate-200"
                                    )}>
                                      <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => openImageEditor(formData.avatarUrl, 'avatar')}
                                      className="absolute inset-0 bg-blue-600/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded-xl"
                                      title="Chỉnh sửa ảnh"
                                    >
                                      <Scissors size={12} />
                                    </button>
                                  </div>
                                )}
                                <div className="flex-1 flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Dán URL ảnh..."
                                    value={formData.avatarUrl}
                                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                                    className={cn(
                                      "flex-1 px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm",
                                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeSubTab === 'composition' && (
                        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center justify-between">
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Thành phần hoạt chất <span className="text-rose-500">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newList = [...(formData.activeIngredients || [])];
                                  newList.push({ name: '', strength: '' });
                                  setFormData({ ...formData, activeIngredients: newList });
                                }}
                                className={cn(
                                  "flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all",
                                  isDarkMode ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                )}
                              >
                                <Plus size={12} /> Thêm
                              </button>
                            </div>
                            <div className="space-y-2 sm:space-y-3">
                              {(formData.activeIngredients || []).map((ingredient, index) => (
                                <div key={index} className={cn(
                                  "flex gap-2 sm:gap-3 items-start p-3 sm:p-4 rounded-xl border transition-colors",
                                  isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"
                                )}>
                                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Tên hoạt chất</label>
                                      <input
                                        type="text"
                                        required
                                        value={ingredient.name}
                                        onChange={(e) => {
                                          const newList = [...(formData.activeIngredients || [])];
                                          newList[index] = { ...newList[index], name: e.target.value };
                                          setFormData({ ...formData, activeIngredients: newList });
                                        }}
                                        className={cn(
                                          "w-full px-3 py-2.5 sm:py-3.5 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                          isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                                        )}
                                        placeholder="Paracetamol"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Hàm lượng</label>
                                      <input
                                        type="text"
                                        required
                                        value={ingredient.strength}
                                        onChange={(e) => {
                                          const newList = [...(formData.activeIngredients || [])];
                                          newList[index] = { ...newList[index], strength: e.target.value };
                                          setFormData({ ...formData, activeIngredients: newList });
                                        }}
                                        className={cn(
                                          "w-full px-3 py-2.5 sm:py-3.5 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                          isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                                        )}
                                        placeholder="500mg"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1 p-1">
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('activeIngredients', index, 'up')}
                                      disabled={index === 0}
                                      className={cn(
                                        "p-1 rounded-md transition-all",
                                        index === 0 ? "opacity-30 cursor-not-allowed" : (isDarkMode ? "hover:bg-slate-700 text-slate-400 hover:text-blue-400" : "hover:bg-slate-200 text-slate-400 hover:text-blue-600")
                                      )}
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('activeIngredients', index, 'down')}
                                      disabled={index === (formData.activeIngredients || []).length - 1}
                                      className={cn(
                                        "p-1 rounded-md transition-all",
                                        index === (formData.activeIngredients || []).length - 1 ? "opacity-30 cursor-not-allowed" : (isDarkMode ? "hover:bg-slate-700 text-slate-400 hover:text-blue-400" : "hover:bg-slate-200 text-slate-400 hover:text-blue-600")
                                      )}
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = (formData.activeIngredients || []).filter((_, i) => i !== index);
                                      setFormData({ ...formData, activeIngredients: newList });
                                    }}
                                    className={cn(
                                      "p-1.5 sm:p-2 mt-4 sm:mt-5 transition-colors rounded-lg",
                                      isDarkMode ? "text-rose-400 hover:bg-rose-900/20" : "text-rose-500 hover:bg-rose-50"
                                    )}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                Tá dược
                              </label>
                              <input
                                type="text"
                                disabled={uploading}
                                value={formData.excipients || ''}
                                onChange={(e) => setFormData({ ...formData, excipients: e.target.value })}
                                className={cn(
                                  "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                                )}
                                placeholder="Tinh bột ngô, Povidon..."
                              />
                            </div>
                            {[
                              { label: 'Dạng bào chế', key: 'dosageForm' },
                              { label: 'Nhà sản xuất', key: 'manufacturer' },
                            ].map((field) => (
                              <div key={field.key}>
                                <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest mb-1.5 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                                  {field.label}
                                </label>
                                <input
                                  type="text"
                                  disabled={uploading}
                                  value={(formData as any)[field.key] || ''}
                                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                  className={cn(
                                    "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50",
                                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                                  )}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'dosage' && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6 sm:space-y-8"
                    >
                      {activeSubTab === 'indications' && (
                        <div className="pt-2 animate-in fade-in slide-in-from-left-4 duration-300">
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                              <div className="w-1 h-3 sm:h-4 bg-blue-600 rounded-full"></div>
                              Chỉ định & Mã ICD-10
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  indications: [...(formData.indications || []), { content: '', icd10s: [] }]
                                });
                              }}
                              className={cn(
                                "text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold transition-all flex items-center gap-1",
                                isDarkMode ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                              )}
                            >
                              <Plus size={12} /> Thêm
                            </button>
                          </div>

                          <div className="space-y-2 sm:space-y-3">
                            {(formData.indications || []).map((indication, index) => (
                              <div key={index} className={cn(
                                "flex gap-2 sm:gap-3 items-start p-3 sm:p-4 rounded-2xl border group relative transition-colors",
                                isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100",
                                indication.isPrimary && (isDarkMode ? "ring-2 ring-amber-500/50 bg-amber-900/10 border-amber-900/30" : "ring-2 ring-amber-500/50 bg-amber-50 border-amber-200")
                              )}>
                                <div className="flex flex-col gap-2 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = (formData.indications || []).map((ind, i) => ({
                                        ...ind,
                                        isPrimary: i === index ? !ind.isPrimary : false
                                      }));
                                      setFormData({ ...formData, indications: newList });
                                    }}
                                    className={cn(
                                      "p-2 rounded-xl transition-all hover:scale-110",
                                      indication.isPrimary 
                                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                                        : (isDarkMode ? "bg-slate-900 text-slate-600 hover:text-amber-400" : "bg-white text-slate-300 hover:text-amber-500 shadow-sm")
                                    )}
                                    title={indication.isPrimary ? "Chỉ định thường dùng" : "Ghim làm chỉ định thường dùng"}
                                  >
                                    <Star size={18} fill={indication.isPrimary ? "currentColor" : "none"} />
                                  </button>
                                </div>
                                <div className="flex-1 space-y-2 sm:space-y-3">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung chỉ định</label>
                                    <AutoExpandingTextarea
                                      rows={4}
                                      value={indication.content}
                                      onChange={(e) => {
                                        const newList = [...formData.indications];
                                        newList[index] = { ...newList[index], content: e.target.value };
                                        setFormData({ ...formData, indications: newList });
                                      }}
                                      className={cn(
                                        "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-xs sm:text-sm font-medium",
                                        isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                                      )}
                                      placeholder="Giảm đau, hạ sốt..."
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã ICD-10 gợi ý</label>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {(indication.icd10s || []).map((code, tagIdx) => (
                                        <div 
                                          key={tagIdx} 
                                          className={cn(
                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border animate-in fade-in zoom-in duration-200",
                                            isDarkMode ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-100"
                                          )}
                                        >
                                          {code.split(' - ')[0]}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newList = [...formData.indications];
                                              newList[index] = {
                                                ...newList[index],
                                                icd10s: (newList[index].icd10s || []).filter((_, i) => i !== tagIdx)
                                              };
                                              setFormData({ ...formData, indications: newList });
                                            }}
                                            className="hover:text-rose-500 transition-colors"
                                          >
                                            <X size={10} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="relative">
                                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                                      <input
                                        type="text"
                                        value={searchingIcdIndex === index ? icdQuery : ''}
                                        onChange={(e) => {
                                          setIcdQuery(e.target.value);
                                          setSearchingIcdIndex(index);
                                        }}
                                        onFocus={() => {
                                          setSearchingIcdIndex(index);
                                          setIcdQuery('');
                                        }}
                                        onBlur={() => {
                                          setTimeout(() => setSearchingIcdIndex(null), 200);
                                        }}
                                        className={cn(
                                          "w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-3 sm:py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs sm:text-sm font-bold",
                                          isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                                        )}
                                        placeholder="Tìm và thêm mã ICD-10..."
                                      />
                                      {searchingIcdIndex === index && (
                                        <div className={cn(
                                          "absolute z-50 w-full mt-1 border rounded-xl shadow-xl max-h-60 overflow-y-auto transition-colors",
                                          isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                                        )}>
                                          {icdList
                                            .filter(icd => 
                                              icd.code.toLowerCase().includes(icdQuery.toLowerCase()) || 
                                              icd.description.toLowerCase().includes(icdQuery.toLowerCase())
                                            )
                                            .slice(0, 50)
                                            .map(icd => (
                                              <button
                                                key={icd.code}
                                                type="button"
                                                onClick={() => {
                                                  const newList = [...formData.indications];
                                                  const codeStr = `${icd.code} - ${icd.description}`;
                                                  const currentIcds = newList[index].icd10s || [];
                                                  if (!currentIcds.includes(codeStr)) {
                                                    newList[index] = { 
                                                      ...newList[index], 
                                                      icd10s: [...currentIcds, codeStr] 
                                                    };
                                                    setFormData({ ...formData, indications: newList });
                                                  }
                                                  setSearchingIcdIndex(null);
                                                  setIcdQuery('');
                                                }}
                                                className={cn(
                                                  "w-full text-left px-3 sm:px-4 py-2 text-[10px] sm:text-xs transition-colors border-b last:border-0",
                                                  isDarkMode ? "hover:bg-slate-700 border-slate-700" : "hover:bg-blue-50 border-slate-50"
                                                )}
                                              >
                                                <span className="font-bold text-blue-600">{icd.code}</span>
                                                <span className={cn("ml-2", isDarkMode ? "text-slate-400" : "text-slate-600")}>- {icd.description}</span>
                                              </button>
                                            ))
                                          }
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 mt-4 sm:mt-6">
                                  <button
                                    type="button"
                                    onClick={() => moveArrayItem('indications', index, 'up')}
                                    disabled={index === 0}
                                    className={cn(
                                      "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                      index === 0 ? "invisible" : (isDarkMode ? "text-slate-500 hover:text-blue-400 hover:bg-blue-900/20" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50")
                                    )}
                                  >
                                    <ChevronUp size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveArrayItem('indications', index, 'down')}
                                    disabled={index === formData.indications.length - 1}
                                    className={cn(
                                      "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                      index === formData.indications.length - 1 ? "invisible" : (isDarkMode ? "text-slate-500 hover:text-blue-400 hover:bg-blue-900/20" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50")
                                    )}
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = formData.indications.filter((_, i) => i !== index);
                                    setFormData({ ...formData, indications: newList });
                                  }}
                                  className={cn(
                                    "mt-5 sm:mt-6 p-1.5 sm:p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                                    isDarkMode ? "text-slate-500 hover:text-rose-400 hover:bg-rose-900/20" : "text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                                  )}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeSubTab === 'administration' && (
                        <div className="pt-2 sm:pt-4 animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                              <div className="w-1 h-3 sm:h-4 bg-blue-600 rounded-full"></div>
                              Liều lượng & Cách dùng
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const current = formData.dosageAndAdministration || [];
                                setFormData({
                                  ...formData,
                                  dosageAndAdministration: [...current, { category: '', content: '' }]
                                });
                              }}
                              className={cn(
                                "text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold transition-all flex items-center gap-1",
                                isDarkMode ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                              )}
                            >
                              <Plus size={12} /> Thêm
                            </button>
                          </div>
                          <div className="space-y-3 sm:space-y-4">
                            <div className={cn(
                              "p-3 sm:p-5 rounded-2xl border shadow-sm transition-colors",
                              isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                            )}>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cách dùng chung (Tất cả đối tượng)</label>
                              <AutoExpandingTextarea
                                rows={1}
                                className={cn(
                                  "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm",
                                  isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                                )}
                                value={formData.generalAdministration || ''}
                                onChange={(e) => setFormData({ ...formData, generalAdministration: e.target.value })}
                                placeholder="Ví dụ: Uống sau bữa ăn 30 phút, sáng và tối..."
                              />
                            </div>

                            {(formData.dosageAndAdministration || []).map((item, index) => (
                              <div key={index} className={cn(
                                "p-3 sm:p-5 rounded-2xl border shadow-sm space-y-3 sm:space-y-4 relative group transition-colors",
                                isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                              )}>
                                <div className="flex flex-col gap-1 absolute top-3 sm:top-4 right-10 sm:right-12">
                                  <button
                                    type="button"
                                    onClick={() => moveArrayItem('dosageAndAdministration', index, 'up')}
                                    disabled={index === 0}
                                    className={cn(
                                      "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                      index === 0 ? "invisible" : (isDarkMode ? "text-slate-600 hover:text-blue-400 hover:bg-blue-900/20" : "text-slate-300 hover:text-blue-600 hover:bg-blue-50")
                                    )}
                                  >
                                    <ChevronUp size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveArrayItem('dosageAndAdministration', index, 'down')}
                                    disabled={index === (formData.dosageAndAdministration || []).length - 1}
                                    className={cn(
                                      "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                      index === (formData.dosageAndAdministration || []).length - 1 ? "invisible" : (isDarkMode ? "text-slate-600 hover:text-blue-400 hover:bg-blue-900/20" : "text-slate-300 hover:text-blue-600 hover:bg-blue-50")
                                    )}
                                  >
                                    <ChevronDown size={16} />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = (formData.dosageAndAdministration || []).filter((_, i) => i !== index);
                                    setFormData({ ...formData, dosageAndAdministration: newList });
                                  }}
                                  className={cn(
                                    "absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 sm:p-2 transition-all opacity-0 group-hover:opacity-100 rounded-lg",
                                    isDarkMode ? "text-slate-600 hover:text-red-400 hover:bg-red-900/20" : "text-slate-300 hover:text-red-500 hover:bg-red-50"
                                  )}
                                >
                                  <Trash2 size={16} />
                                </button>
                                <div className="w-full">
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Đối tượng / Phân loại</label>
                                  <input
                                    type="text"
                                    placeholder="Người lớn, Trẻ em..."
                                    value={item.category || ''}
                                    onChange={(e) => {
                                      const newList = [...(formData.dosageAndAdministration || [])];
                                      newList[index].category = e.target.value;
                                      setFormData({ ...formData, dosageAndAdministration: newList });
                                    }}
                                    className={cn(
                                      "w-full px-3 py-2.5 sm:py-3.5 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm transition-colors",
                                      isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-700"
                                    )}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Hướng dẫn sử dụng</label>
                                  <AutoExpandingTextarea
                                    rows={5}
                                    placeholder="Nội dung liều dùng..."
                                    value={item.content || ''}
                                    onChange={(e) => {
                                      const newList = [...(formData.dosageAndAdministration || [])];
                                      newList[index].content = e.target.value;
                                      setFormData({ ...formData, dosageAndAdministration: newList });
                                    }}
                                    className={cn(
                                      "w-full px-3 py-2.5 sm:py-3.5 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm transition-colors",
                                      isDarkMode ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-white border-slate-200"
                                    )}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'warnings' && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6 sm:space-y-8"
                    >
                      {activeSubTab === 'contra' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300 pt-2 text-rose-500">
                          <div className={cn(
                            "border rounded-2xl p-4 sm:p-6 transition-colors",
                            isDarkMode ? "bg-rose-900/10 border-rose-900/30" : "bg-rose-50/30 border-rose-100"
                          )}>
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-colors", isDarkMode ? "text-rose-400" : "text-rose-700")}>
                                <ShieldAlert size={16} className="sm:w-[18px] sm:h-[18px]" />
                                Chống chỉ định
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newList = [...(formData.contraindications || [])];
                                  newList.push({ content: '', type: 'Other' });
                                  setFormData({ ...formData, contraindications: newList });
                                }}
                                className={cn(
                                  "flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-white rounded-lg text-[10px] sm:text-xs font-bold transition-all shadow-sm",
                                  isDarkMode ? "bg-rose-700 hover:bg-rose-800" : "bg-rose-600 hover:bg-rose-700"
                                )}
                              >
                                <Plus size={12} />
                                Thêm
                              </button>
                            </div>

                            <div className="space-y-2 sm:space-y-3">
                              {(formData.contraindications || []).map((contra, index) => (
                                <div key={index} className={cn(
                                  "flex gap-2 sm:gap-3 items-start p-3 sm:p-4 rounded-2xl border group relative transition-colors",
                                  isDarkMode ? "bg-slate-800 border-rose-900/20" : "bg-white border-rose-50"
                                )}>
                                  <div className="flex-1 space-y-2 sm:space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                                      <div className="sm:col-span-1 space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phân loại</label>
                                        <select
                                          value={contra.type || 'Other'}
                                          onChange={(e) => {
                                            const newList = [...formData.contraindications];
                                            newList[index] = { ...newList[index], type: e.target.value as any };
                                            setFormData({ ...formData, contraindications: newList });
                                          }}
                                          className={cn(
                                            "w-full px-2 sm:px-3 py-2.5 sm:py-3.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all text-xs sm:text-sm font-bold",
                                            isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                                          )}
                                        >
                                          <option value="Drug" className={isDarkMode ? "bg-slate-900" : "bg-white"}>Thuốc</option>
                                          <option value="ICD-10" className={isDarkMode ? "bg-slate-900" : "bg-white"}>ICD-10</option>
                                          <option value="Weight" className={isDarkMode ? "bg-slate-900" : "bg-white"}>Cân nặng</option>
                                          <option value="Age" className={isDarkMode ? "bg-slate-900" : "bg-white"}>Tuổi</option>
                                          <option value="Other" className={isDarkMode ? "bg-slate-900" : "bg-white"}>Khác</option>
                                        </select>
                                      </div>
                                      <div className="sm:col-span-2 space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung</label>
                                        <div className="relative">
                                          {contra.type === 'ICD-10' && <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />}
                                          {contra.type === 'ICD-10' ? (
                                            <input
                                              type="text"
                                              value={contra.content}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                const newList = [...formData.contraindications];
                                                newList[index] = { ...newList[index], content: val };
                                                setFormData({ ...formData, contraindications: newList });
                                                setSearchingContraIcdIndex(index);
                                                setIcdQuery(val);
                                              }}
                                              onFocus={() => {
                                                setSearchingContraIcdIndex(index);
                                                setIcdQuery(contra.content || '');
                                              }}
                                              onBlur={() => {
                                                setTimeout(() => setSearchingContraIcdIndex(null), 200);
                                              }}
                                              className={cn(
                                                "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all text-xs sm:text-sm font-medium pl-8 sm:pl-9",
                                                isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                                              )}
                                              placeholder="Tìm mã ICD-10..."
                                            />
                                          ) : (
                                            <AutoExpandingTextarea
                                              rows={contra.type === 'Other' ? 5 : 3}
                                              value={contra.content}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                const newList = [...formData.contraindications];
                                                newList[index] = { ...newList[index], content: val };
                                                setFormData({ ...formData, contraindications: newList });
                                              }}
                                              className={cn(
                                                "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all text-xs sm:text-sm font-medium resize-none",
                                                isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                                              )}
                                              placeholder={
                                                contra.type === 'Drug' ? "Tên thuốc tương tác ngược..." :
                                                contra.type === 'Weight' ? "Cân nặng cụ thể (VD: < 40kg)..." :
                                                contra.type === 'Age' ? "Độ tuổi (VD: Trẻ em < 12 tuổi)..." :
                                                "Nhập nội dung chi tiết..."
                                              }
                                            />
                                          )}
                                          {searchingContraIcdIndex === index && contra.type === 'ICD-10' && (
                                            <div className={cn(
                                              "absolute z-50 w-full mt-1 border rounded-xl shadow-xl max-h-60 overflow-y-auto transition-colors",
                                              isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                                            )}>
                                              {icdList
                                                .filter(icd => 
                                                  (icd.code || '').toLowerCase().includes((icdQuery || '').toLowerCase()) || 
                                                  (icd.description || '').toLowerCase().includes((icdQuery || '').toLowerCase())
                                                )
                                                .slice(0, 50)
                                                .map(icd => (
                                                  <button
                                                    key={icd.code}
                                                    type="button"
                                                    onClick={() => {
                                                      const newList = [...formData.contraindications];
                                                      newList[index] = { ...newList[index], content: `${icd.code} - ${icd.description}` };
                                                      setFormData({ ...formData, contraindications: newList });
                                                      setSearchingContraIcdIndex(null);
                                                    }}
                                                    className={cn(
                                                      "w-full text-left px-3 sm:px-4 py-2 text-[10px] sm:text-xs transition-colors border-b last:border-0",
                                                      isDarkMode ? "hover:bg-slate-700 border-slate-700" : "hover:bg-blue-50 border-slate-50"
                                                    )}
                                                  >
                                                    <span className="font-bold text-blue-600">{icd.code}</span>
                                                    <span className={cn("ml-2", isDarkMode ? "text-slate-400" : "text-slate-600")}>- {icd.description}</span>
                                                  </button>
                                                ))
                                              }
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1 mt-5 sm:mt-6">
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('contraindications', index, 'up')}
                                      disabled={index === 0}
                                      className={cn(
                                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                        index === 0 ? "invisible" : (isDarkMode ? "text-slate-500 hover:text-blue-400 hover:bg-blue-900/20" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50")
                                      )}
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('contraindications', index, 'down')}
                                      disabled={index === formData.contraindications.length - 1}
                                      className={cn(
                                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                        index === formData.contraindications.length - 1 ? "invisible" : (isDarkMode ? "text-slate-500 hover:text-blue-400 hover:bg-blue-900/20" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50")
                                      )}
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = formData.contraindications.filter((_, i) => i !== index);
                                      setFormData({ ...formData, contraindications: newList });
                                    }}
                                    className={cn(
                                      "mt-5 sm:mt-6 p-1.5 sm:p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                                      isDarkMode ? "text-slate-500 hover:text-rose-400 hover:bg-rose-900/20" : "text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                                    )}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeSubTab === 'adr' && (
                        <div className="pt-2 sm:pt-4 animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <label className={cn("block text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-2", isDarkMode ? "text-amber-400" : "text-amber-700")}>
                              <Info size={16} />
                              Tác dụng không mong muốn (ADR)
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const current = (Array.isArray(formData.sideEffects) ? formData.sideEffects : []) as any[];
                                setFormData({
                                  ...formData,
                                  sideEffects: [...current, { frequency: '', content: '' }]
                                });
                              }}
                              className={cn(
                                "text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold transition-all flex items-center gap-1",
                                isDarkMode ? "bg-amber-900/30 text-amber-400 hover:bg-amber-900/50" : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                              )}
                            >
                              <Plus size={12} /> Thêm nhóm
                            </button>
                          </div>
                          
                          <div className="space-y-4">
                            {(Array.isArray(formData.sideEffects) ? (formData.sideEffects as any[]) : []).map((se, index) => (
                              <div key={index} className={cn(
                                "p-4 rounded-2xl border shadow-sm space-y-3 relative group transition-colors",
                                isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                              )}>
                                <div className="flex flex-col gap-1 absolute top-3 right-10">
                                  <button
                                    type="button"
                                    onClick={() => moveArrayItem('sideEffects', index, 'up')}
                                    disabled={index === 0}
                                    className={cn(
                                      "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                      index === 0 ? "invisible" : (isDarkMode ? "text-slate-500 hover:text-blue-400 hover:bg-blue-900/20" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50")
                                    )}
                                  >
                                    <ChevronUp size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveArrayItem('sideEffects', index, 'down')}
                                    disabled={index === (formData.sideEffects as any[]).length - 1}
                                    className={cn(
                                      "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                      index === (formData.sideEffects as any[]).length - 1 ? "invisible" : (isDarkMode ? "text-slate-500 hover:text-blue-400 hover:bg-blue-900/20" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50")
                                    )}
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = [...(formData.sideEffects as any[])];
                                    newList.splice(index, 1);
                                    setFormData({ ...formData, sideEffects: newList });
                                  }}
                                  className={cn(
                                    "absolute top-3 right-3 p-1.5 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 rounded-lg",
                                    isDarkMode ? "hover:bg-rose-900/20" : "hover:bg-rose-50"
                                  )}
                                >
                                  <X size={14} />
                                </button>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="sm:col-span-1">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Tần suất</label>
                                    <select
                                      value={se.frequency || ''}
                                      onChange={(e) => {
                                        const newList = [...(formData.sideEffects as any[])];
                                        newList[index] = { ...newList[index], frequency: e.target.value };
                                        setFormData({ ...formData, sideEffects: newList });
                                      }}
                                      className={cn(
                                        "w-full px-3 py-2.5 sm:py-3.5 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold transition-colors",
                                        isDarkMode ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200"
                                      )}
                                    >
                                      <option value="">-- Chọn tần suất --</option>
                                      <option value="Thường gặp (ADR > 1/100)">Thường gặp (&gt;1/100)</option>
                                      <option value="Ít gặp (1/1000 < ADR < 1/100)">Ít gặp (1/1000 - 1/100)</option>
                                      <option value="Hiếm gặp (ADR < 1/1000)">Hiếm gặp (&lt;1/1000)</option>
                                      <option value="Rất hiếm gặp (ADR < 1/10000)">Rất hiếm gặp</option>
                                      <option value="Chưa xác định">Chưa xác định</option>
                                    </select>
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Nội dung tác dụng phụ</label>
                                    <AutoExpandingTextarea
                                      rows={4}
                                      value={se.content || ''}
                                      onChange={(e) => {
                                        const newList = [...(formData.sideEffects as any[])];
                                        newList[index] = { ...newList[index], content: e.target.value };
                                        setFormData({ ...formData, sideEffects: newList });
                                      }}
                                      placeholder="Rối loạn tiêu hóa, nhức đầu..."
                                      className={cn(
                                        "w-full px-4 py-3 sm:py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none text-xs sm:text-sm font-medium",
                                        isDarkMode ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200"
                                      )}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                            {(Array.isArray(formData.sideEffects) ? (formData.sideEffects as any[]) : []).length === 0 && (
                              <div className={cn(
                                "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl",
                                isDarkMode ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-400"
                              )}>
                                <Info size={32} className="mb-2 opacity-20" />
                                <p className="text-sm font-medium italic">Chưa có thông tin tác dụng phụ theo nhóm. Nhấn "Thêm nhóm" để bắt đầu.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeSubTab === 'special' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                          {[
                            { label: 'Thận trọng', key: 'precautions', icon: <ShieldAlert size={14} />, color: 'amber', type: 'textarea' },
                            { label: 'Phụ nữ có thai', key: 'pregnancy', icon: <Heart size={14} />, color: 'rose', type: 'select', options: ['An toàn', 'Chưa thiết lập', 'Cân nhắc lợi ích', 'Không an toàn'] },
                            { label: 'Phụ nữ cho con bú', key: 'lactation', icon: <Baby size={14} />, color: 'pink', type: 'select', options: ['An toàn', 'Chưa thiết lập', 'Cân nhắc lợi ích', 'Không an toàn'] },
                            { label: 'Vận hành máy móc', key: 'driving', icon: <Car size={14} />, color: 'slate', type: 'select', options: ['An toàn', 'Không an toàn'] },
                            { label: 'Quá liều - Xử trí', key: 'overdose', icon: <AlertTriangle size={14} />, color: 'red', type: 'textarea' },
                          ].map((field) => (
                            <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                              <label className={cn(`block text-[10px] sm:text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-2`, isDarkMode ? `text-${field.color}-400` : `text-${field.color}-700`)}>
                                {field.icon}
                                {field.label}
                              </label>
                              {field.type === 'select' ? (
                                <select
                                  value={(formData as any)[field.key] || (field.options ? field.options[0] : '')}
                                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                  className={cn(
                                    `w-full px-3 py-3 sm:py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-${field.color}-500 transition-all text-xs sm:text-sm font-bold`,
                                    isDarkMode ? "bg-slate-900 border-slate-700 text-slate-300" : `bg-${field.color}-50/30 border-${field.color}-100`
                                  )}
                                >
                                  {field.options?.map(opt => (
                                    <option key={opt} value={opt} className={isDarkMode ? "bg-slate-900" : "bg-white"}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <AutoExpandingTextarea
                                  rows={5}
                                  value={(formData as any)[field.key] || ''}
                                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                  className={cn(
                                    `w-full px-3 py-3 sm:py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-${field.color}-500 transition-all resize-none text-xs sm:text-sm font-medium`,
                                    isDarkMode ? "bg-slate-900 border-slate-700 text-slate-300" : `bg-${field.color}-50/30 border-${field.color}-100`
                                  )}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'pharmacology' && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6 sm:space-y-8"
                    >
                      {activeSubTab === 'interactions' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                          {/* Tương tác cụ thể */}
                          <div className={cn(
                            "p-4 sm:p-6 rounded-2xl border transition-colors",
                            isDarkMode ? "bg-indigo-900/10 border-indigo-900/20" : "bg-indigo-50/30 border-indigo-100"
                          )}>
                            <div className="flex items-center justify-between mb-4">
                              <label className={cn("block text-[10px] sm:text-sm font-black uppercase tracking-widest flex items-center gap-2 transition-colors", isDarkMode ? "text-indigo-400" : "text-indigo-700")}>
                                <Zap size={16} className="sm:w-[18px] sm:h-[18px]" />
                                Tương tác thuốc cụ thể
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newList = [...(formData.specificInteractions || [])];
                                  newList.push({ target: '', content: '' });
                                  setFormData({ ...formData, specificInteractions: newList });
                                }}
                                className={cn(
                                  "flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all",
                                  isDarkMode ? "text-indigo-400 bg-indigo-900/30 hover:bg-indigo-900/50" : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                                )}
                              >
                                <Plus size={12} /> Thêm
                              </button>
                            </div>
                            <div className="space-y-2 sm:space-y-3">
                              {(formData.specificInteractions || []).map((item, index) => (
                                <div key={index} className={cn(
                                  "p-3 sm:p-4 rounded-2xl border shadow-sm space-y-2 sm:space-y-3 relative group transition-colors",
                                  isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                                )}>
                                  <div className="flex flex-col gap-1 absolute top-3 sm:top-4 right-10 sm:right-12">
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('specificInteractions', index, 'up')}
                                      disabled={index === 0}
                                      className={cn(
                                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                        index === 0 ? "invisible" : (isDarkMode ? "text-slate-600 hover:text-indigo-400 hover:bg-slate-700" : "text-slate-300 hover:text-indigo-600 hover:bg-slate-50")
                                      )}
                                    >
                                      <ChevronUp size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('specificInteractions', index, 'down')}
                                      disabled={index === (formData.specificInteractions || []).length - 1}
                                      className={cn(
                                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                        index === (formData.specificInteractions || []).length - 1 ? "invisible" : (isDarkMode ? "text-slate-600 hover:text-indigo-400 hover:bg-slate-700" : "text-slate-300 hover:text-indigo-600 hover:bg-slate-50")
                                      )}
                                    >
                                      <ChevronDown size={16} />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = (formData.specificInteractions || []).filter((_, i) => i !== index);
                                      setFormData({ ...formData, specificInteractions: newList });
                                    }}
                                    className={cn(
                                      "absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 sm:p-2 transition-all opacity-0 group-hover:opacity-100 rounded-lg",
                                      isDarkMode ? "text-slate-600 hover:text-red-400 hover:bg-red-900/20" : "text-slate-300 hover:text-red-500 hover:bg-red-50"
                                    )}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                  <div className="w-full">
                                    <label className={cn("block text-[9px] font-bold uppercase mb-1 transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Đối tượng tương tác</label>
                                    <input
                                      type="text"
                                      value={item.target || ''}
                                      onChange={(e) => {
                                        const newList = [...(formData.specificInteractions || [])];
                                        newList[index].target = e.target.value;
                                        setFormData({ ...formData, specificInteractions: newList });
                                      }}
                                      className={cn(
                                        "w-full px-3 py-2.5 sm:py-3.5 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-colors",
                                        isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
                                      )}
                                      placeholder="Ví dụ: Simvastatin..."
                                    />
                                  </div>
                                  <div>
                                    <label className={cn("block text-[9px] font-bold uppercase mb-1 transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>Nội dung tương tác</label>
                                    <AutoExpandingTextarea
                                      rows={4}
                                      value={item.content || ''}
                                      onChange={(e) => {
                                        const newList = [...(formData.specificInteractions || [])];
                                        newList[index].content = e.target.value;
                                        setFormData({ ...formData, specificInteractions: newList });
                                      }}
                                      className={cn(
                                        "w-full px-3 py-2.5 sm:py-3.5 border rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-colors",
                                        isDarkMode ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200"
                                      )}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Tương tác chung */}
                          <div>
                            <label className={cn("block text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2 transition-colors", isDarkMode ? "text-indigo-400" : "text-indigo-700")}>
                              <RefreshCw size={16} />
                              Tương tác chung
                            </label>
                            <AutoExpandingTextarea
                              rows={5}
                              value={formData.interactions || ''}
                              onChange={(e) => setFormData({ ...formData, interactions: e.target.value })}
                              className={cn(
                                "w-full px-3 sm:px-4 py-3 sm:py-4 border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all resize-none font-medium",
                                isDarkMode ? "bg-slate-900 border-slate-700 text-slate-300 focus:ring-indigo-900/50" : "bg-indigo-50/30 border-indigo-100 focus:ring-indigo-500"
                              )}
                              placeholder="Nhập các tương tác thuốc chung..."
                            />
                          </div>
                        </div>
                      )}

                      {activeSubTab === 'properties' && (
                        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                          {/* Dược lực học */}
                          <div className={cn(
                            "p-4 sm:p-6 rounded-2xl border transition-colors",
                            isDarkMode ? "bg-emerald-900/10 border-emerald-900/20" : "bg-emerald-50/30 border-emerald-100"
                          )}>
                            <div className="flex items-center justify-between mb-4">
                              <label className={cn("block text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors", isDarkMode ? "text-emerald-400" : "text-emerald-700")}>
                                <Activity size={16} />
                                Dược lực học
                              </label>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, pharmacodynamics: [...(Array.isArray(formData.pharmacodynamics) ? formData.pharmacodynamics : []), { category: '', content: '' }] })}
                                className={cn(
                                  "text-[10px] font-black uppercase transition-colors flex items-center gap-1",
                                  isDarkMode ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-600 hover:text-emerald-700"
                                )}
                              >
                                <Plus size={14} /> Thêm phân loại
                              </button>
                            </div>
                            <div className="space-y-3">
                              {(Array.isArray(formData.pharmacodynamics) ? formData.pharmacodynamics : []).map((item: any, idx) => (
                                <div key={idx} className={cn(
                                  "p-4 rounded-2xl border transition-all relative group shadow-sm",
                                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-emerald-50/30 border-emerald-100/50"
                                )}>
                                  <div className="flex flex-col gap-1 absolute top-2 right-8">
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('pharmacodynamics', idx, 'up')}
                                      disabled={idx === 0}
                                      className={cn(
                                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                        idx === 0 ? "invisible" : (isDarkMode ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-400 hover:text-emerald-600")
                                      )}
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('pharmacodynamics', idx, 'down')}
                                      disabled={idx === (formData.pharmacodynamics as any[]).length - 1}
                                      className={cn(
                                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                        idx === (formData.pharmacodynamics as any[]).length - 1 ? "invisible" : (isDarkMode ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-400 hover:text-emerald-600")
                                      )}
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = [...(formData.pharmacodynamics as any[])];
                                      newList.splice(idx, 1);
                                      setFormData({ ...formData, pharmacodynamics: newList });
                                    }}
                                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                  <input
                                    type="text"
                                    placeholder="Phân loại (Ví dụ: Cơ chế tác dụng, Tác động lâm sàng...)"
                                    value={item.category}
                                    onChange={(e) => {
                                      const newList = [...(formData.pharmacodynamics as any[])];
                                      newList[idx].category = e.target.value;
                                      setFormData({ ...formData, pharmacodynamics: newList });
                                    }}
                                    className={cn(
                                      "w-full mb-2 bg-transparent border-none p-0 text-[10px] font-black uppercase tracking-wider focus:ring-0 placeholder:text-slate-500",
                                      isDarkMode ? "text-emerald-400" : "text-emerald-600"
                                    )}
                                  />
                                  <AutoExpandingTextarea
                                    rows={4}
                                    placeholder="Nội dung chi tiết cho phân loại này..."
                                    value={item.content}
                                    onChange={(e) => {
                                      const newList = [...(formData.pharmacodynamics as any[])];
                                      newList[idx].content = e.target.value;
                                      setFormData({ ...formData, pharmacodynamics: newList });
                                    }}
                                    className={cn(
                                      "w-full bg-transparent border-none p-0 text-xs sm:text-sm focus:ring-0 resize-none font-medium",
                                      isDarkMode ? "text-slate-300 placeholder:text-slate-700" : "text-slate-700 placeholder:text-slate-400"
                                    )}
                                  />
                                </div>
                              ))}
                              {(Array.isArray(formData.pharmacodynamics) ? formData.pharmacodynamics : []).length === 0 && (
                                <p className="text-[10px] text-slate-500 italic text-center py-2">Chưa có phân loại dược lực học nào.</p>
                              )}
                            </div>
                          </div>

                          {/* Dược động học */}
                          <div className={cn(
                            "p-4 sm:p-6 rounded-2xl border transition-colors",
                            isDarkMode ? "bg-blue-900/10 border-blue-900/20" : "bg-blue-50/30 border-blue-100"
                          )}>
                            <div className="flex items-center justify-between mb-4">
                              <label className={cn("block text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors", isDarkMode ? "text-blue-400" : "text-blue-700")}>
                                <MoveRight size={16} />
                                Dược động học
                              </label>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, pharmacokinetics: [...(Array.isArray(formData.pharmacokinetics) ? formData.pharmacokinetics : []), { category: '', content: '' }] })}
                                className={cn(
                                  "text-[10px] font-black uppercase transition-colors flex items-center gap-1",
                                  isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                                )}
                              >
                                <Plus size={14} /> Thêm phân loại
                              </button>
                            </div>
                            <div className="space-y-3">
                              {(Array.isArray(formData.pharmacokinetics) ? formData.pharmacokinetics : []).map((item: any, idx) => (
                                <div key={idx} className={cn(
                                  "p-4 rounded-2xl border transition-all relative group shadow-sm",
                                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-blue-50/30 border-blue-100/50"
                                )}>
                                  <div className="flex flex-col gap-1 absolute top-2 right-8">
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('pharmacokinetics', idx, 'up')}
                                      disabled={idx === 0}
                                      className={cn(
                                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                        idx === 0 ? "invisible" : (isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-400 hover:text-blue-600")
                                      )}
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveArrayItem('pharmacokinetics', idx, 'down')}
                                      disabled={idx === (formData.pharmacokinetics as any[]).length - 1}
                                      className={cn(
                                        "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                                        idx === (formData.pharmacokinetics as any[]).length - 1 ? "invisible" : (isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-400 hover:text-blue-600")
                                      )}
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = [...(formData.pharmacokinetics as any[])];
                                      newList.splice(idx, 1);
                                      setFormData({ ...formData, pharmacokinetics: newList });
                                    }}
                                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                  <input
                                    type="text"
                                    placeholder="Phân loại (Ví dụ: Hấp thu, Phân bố, Chuyển hóa, Thải trừ...)"
                                    value={item.category}
                                    onChange={(e) => {
                                      const newList = [...(formData.pharmacokinetics as any[])];
                                      newList[idx].category = e.target.value;
                                      setFormData({ ...formData, pharmacokinetics: newList });
                                    }}
                                    className={cn(
                                      "w-full mb-2 bg-transparent border-none p-0 text-[10px] font-black uppercase tracking-wider focus:ring-0 placeholder:text-slate-500",
                                      isDarkMode ? "text-blue-400" : "text-blue-600"
                                    )}
                                  />
                                  <AutoExpandingTextarea
                                    rows={4}
                                    placeholder="Nội dung chi tiết cho phân loại này..."
                                    value={item.content}
                                    onChange={(e) => {
                                      const newList = [...(formData.pharmacokinetics as any[])];
                                      newList[idx].content = e.target.value;
                                      setFormData({ ...formData, pharmacokinetics: newList });
                                    }}
                                    className={cn(
                                      "w-full bg-transparent border-none p-0 text-xs sm:text-sm focus:ring-0 resize-none font-medium",
                                      isDarkMode ? "text-slate-300 placeholder:text-slate-700" : "text-slate-700 placeholder:text-slate-400"
                                    )}
                                  />
                                </div>
                              ))}
                              {(Array.isArray(formData.pharmacokinetics) ? formData.pharmacokinetics : []).length === 0 && (
                                <p className="text-[10px] text-slate-500 italic text-center py-2">Chưa có phân loại dược động học nào.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                <div className={cn(
                  "hidden sm:flex p-4 sm:p-8 border-t bg-white gap-3 sm:gap-4 transition-colors",
                  isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white"
                )}>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="hidden sm:flex flex-1 py-3 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {uploading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin" size={20} /> 
                        <span>Đang cập nhật...</span>
                      </div>
                    ) : (
                      <>
                        <Save size={20} /> {editingDrug ? 'Cập nhật thông tin' : 'Lưu thuốc mới'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Review Modal */}
      <AnimatePresence>
        {isReviewModalOpen && extractedData && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <div className={cn(
                "p-6 border-b flex items-center justify-between transition-colors",
                isDarkMode ? "border-slate-800 bg-indigo-900/10" : "border-slate-100 bg-indigo-50/50"
              )}>
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 p-2 rounded-lg text-white">
                    <FileText size={20} />
                  </div>
                  <h3 className={cn("text-xl font-bold transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>Xác nhận thông tin trích xuất</h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)} 
                  className={cn("p-2 rounded-full transition-colors", isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-200")}
                >
                  <X size={20} className={isDarkMode ? "text-slate-400" : ""} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6 transition-colors">
                <div className={cn(
                  "flex items-center gap-4 p-6 rounded-[24px] border transition-colors",
                  isDarkMode ? "bg-indigo-900/20 border-indigo-900/30" : "bg-indigo-50 border-indigo-100"
                )}>
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm shrink-0 transition-colors",
                    isDarkMode ? "bg-slate-800" : "bg-white"
                  )}>
                    <Check className={isDarkMode ? "text-indigo-400" : "text-indigo-600"} size={32} />
                  </div>
                  <div>
                    <h4 className={cn("text-lg font-black transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>Trích xuất thành công!</h4>
                    <p className={cn("text-sm font-medium transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>AI đã phân tích tài liệu và tìm thấy các thông tin quan trọng.</p>
                  </div>
                </div>
                
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: 'Tên thuốc', value: extractedData.name, icon: <Pill size={16} /> },
                        { label: 'Hoạt chất', value: (extractedData.activeIngredients?.[0]?.name || (typeof extractedData.activeIngredients?.[0] === 'string' ? extractedData.activeIngredients[0] : '') || 'N/A') as string, icon: <Activity size={16} /> },
                        { label: 'Chỉ định', value: `${(extractedData.indications || []).length} mục`, icon: <Info size={16} /> },
                        { label: 'Liều dùng', value: `${(extractedData.dosageAndAdministration || []).length} đối tượng`, icon: <Clock size={16} /> },
                      ].map((field, idx) => (
                        <div key={idx} className={cn(
                          "p-4 rounded-2xl border flex items-center gap-3 transition-colors",
                          isDarkMode ? "border-slate-800 bg-slate-800/50" : "border-slate-100 bg-slate-50/50"
                        )}>
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm transition-colors",
                            isDarkMode ? "bg-slate-700 text-slate-500" : "bg-white text-slate-400"
                          )}>
                            {field.icon}
                          </div>
                          <div>
                            <span className={cn("text-[10px] font-black uppercase tracking-widest block transition-colors", isDarkMode ? "text-slate-500" : "text-slate-400")}>{field.label}</span>
                            <p className={cn("text-sm font-bold truncate transition-colors", isDarkMode ? "text-slate-300" : "text-slate-700")}>{field.value || '(Trống)'}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                <div className={cn(
                  "p-5 rounded-2xl border transition-colors",
                  isDarkMode ? "bg-amber-900/10 border-amber-900/30" : "bg-amber-50/50 border-amber-100/50"
                )}>
                  <div className={cn("flex items-center gap-2 mb-2 transition-colors", isDarkMode ? "text-amber-400" : "text-amber-600")}>
                    <ShieldAlert size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Lưu ý quan trọng</span>
                  </div>
                  <p className={cn("text-xs leading-relaxed font-medium transition-colors", isDarkMode ? "text-amber-300" : "text-amber-700")}>
                    Tất cả các trường thông tin khác (Chống chỉ định, Tác dụng phụ, Thận trọng, Tương tác...) cũng đã được trích xuất và sẽ tự động điền vào biểu mẫu. Vui lòng kiểm tra lại kỹ trước khi lưu.
                  </p>
                </div>
              </div>

              <div className={cn(
                "p-6 border-t flex gap-3 transition-colors",
                isDarkMode ? "border-slate-800" : "border-slate-100"
              )}>
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all",
                    isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Bỏ qua
                </button>
                <button
                  type="button"
                  onClick={applyExtractedData}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Áp dụng thay đổi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {pdfViewerUrl && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPdfViewerUrl(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "relative w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <div className={cn(
                "p-4 border-b flex items-center justify-between transition-colors",
                isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white"
              )}>
                <div className="flex items-center gap-3">
                  <FileText className={isDarkMode ? "text-blue-400" : "text-blue-600"} size={24} />
                  <h3 className={cn("font-bold transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>Tài liệu hướng dẫn thuốc</h3>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={pdfViewerUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      isDarkMode ? "text-slate-400 hover:text-blue-400 hover:bg-blue-900/30" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                    )}
                    title="Mở trong tab mới"
                  >
                    <ExternalLink size={20} />
                  </a>
                  <button 
                    type="button"
                    onClick={() => setPdfViewerUrl(null)} 
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      isDarkMode ? "text-slate-400 hover:text-rose-400 hover:bg-rose-900/30" : "text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                    )}
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className={cn(
                "flex-1 transition-colors",
                isDarkMode ? "bg-slate-950" : "bg-slate-100"
              )}>
                <iframe
                  src={pdfViewerUrl}
                  className="w-full h-full border-none"
                  title="PDF Viewer"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Message Toast */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] w-full max-w-md px-4"
          >
            <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} />
                <p className="text-sm font-bold">{errorMessage}</p>
              </div>
              <button 
                type="button"
                onClick={() => setErrorMessage(null)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Deletion Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Xác nhận xóa thuốc"
        message={`Bạn có chắc chắn muốn xóa thuốc "${confirmData?.name}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa thuốc"
        isDarkMode={isDarkMode}
      />

      <AnimatePresence>
        {isGroupModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGroupModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <div className={cn(
                "p-4 lg:p-6 border-b flex items-center justify-between transition-colors",
                isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl text-white shadow-lg transition-all",
                    isDarkMode ? "bg-blue-600 shadow-none" : "bg-blue-600 shadow-blue-200"
                  )}>
                    <FolderTree size={24} />
                  </div>
                  <div>
                    <h3 className={cn("text-xl font-black transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>Quản lý nhóm thuốc</h3>
                    <p className={cn("text-xs font-medium transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>Phân cấp nhóm thuốc tối đa 3 cấp</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)} 
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    isDarkMode ? "text-slate-400 hover:text-rose-400 hover:bg-rose-900/30" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  )}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className={cn(
                "flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar transition-colors",
                isDarkMode ? "bg-slate-950/50" : "bg-white"
              )}>
                <DrugGroupManagement 
                  isDarkMode={isDarkMode}
                  onClose={() => setIsGroupModalOpen(false)} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isIngredientModalOpen && (
          <CatalogManagement
            type="ingredient"
            isDarkMode={isDarkMode}
            onClose={() => setIsIngredientModalOpen(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isIngredientCategoryModalOpen && (
          <CatalogManagement
            type="ingredient_category"
            isDarkMode={isDarkMode}
            onClose={() => setIsIngredientCategoryModalOpen(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isExcipientModalOpen && (
          <CatalogManagement
            type="excipient"
            isDarkMode={isDarkMode}
            onClose={() => setIsExcipientModalOpen(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isImageEditorOpen && (
          <ImageEditorModal
            isOpen={isImageEditorOpen}
            onClose={() => setIsImageEditorOpen(false)}
            imageSrc={imageToEdit}
            onConfirm={handleImageCropConfirm}
            aspect={editingImageType === 'avatar' ? 1 : 16 / 9}
            isDarkMode={isDarkMode}
          />
        )}
      </AnimatePresence>

      {/* Floating Action Button for Adding Drug */}
      {canManage && (
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className={cn(
            "fixed bottom-20 lg:bottom-10 right-6 lg:right-10 z-[60] w-14 lg:w-16 h-14 lg:h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 group",
            "shadow-blue-500/40"
          )}
          title="Thêm thuốc mới"
        >
          <div className="relative">
            <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
          </div>
        </button>
      )}
    </div>
  );
};

export default DrugDirectory;
