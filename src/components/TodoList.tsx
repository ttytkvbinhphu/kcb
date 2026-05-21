import React, { useState, useEffect, useRef } from 'react';
import { ListTodo, Plus, Trash2, CheckCircle2, Circle, X, Edit2, Save, Flag, Calendar, Tag, Search, Filter, AlertCircle, ChevronDown, ChevronUp, FileText, Pill, Bell, Box, ClipboardCheck, ShieldCheck, Activity, User, Building2, Clock, MoreVertical, LayoutGrid, List, CheckCircle, FlaskConical, Stethoscope, ChevronRight, Share2, History, Check, Inbox, CalendarDays, Star, Hash, Settings, FolderHeart, FilterIcon, Sparkles, Send } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, handleFirestoreError, OperationType } from '../firebase';
import { Todo } from '../types';
import { format, isPast, isToday } from 'date-fns';
import { vi } from 'date-fns/locale';

interface TodoListProps {
  isDarkMode?: boolean;
  onClose?: () => void;
  inline?: boolean;
}

const TodoList: React.FC<TodoListProps> = ({ isDarkMode, onClose, inline }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newPriority, setNewPriority] = useState<Todo['priority']>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newType, setNewType] = useState<Todo['type']>('other');
  const [newPatientId, setNewPatientId] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editPriority, setEditPriority] = useState<Todo['priority']>('medium');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editType, setEditType] = useState<Todo['type']>('other');
  const [editPatientId, setEditPatientId] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<Todo['status']>('pending');
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'completed' | 'urgent' | 'today'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const quickAddInputRef = useRef<HTMLInputElement>(null);

  const TASK_TYPES = [
    { id: 'prescription_review', label: 'Duyệt đơn thuốc', icon: FileText, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
    { id: 'drug_dispensing', label: 'Cấp phát thuốc', icon: Pill, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
    { id: 'follow_up', label: 'Theo dõi bệnh nhân', icon: Stethoscope, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
    { id: 'inventory_check', label: 'Kiểm kê kho', icon: Box, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
    { id: 'clinical_note', label: 'Ghi chú lâm sàng', icon: ClipboardCheck, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
    { id: 'insurance_approval', label: 'Duyệt bảo hiểm', icon: ShieldCheck, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20' },
    { id: 'laboratory_review', label: 'Kết quả xét nghiệm', icon: FlaskConical, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
    { id: 'other', label: 'Công việc khác', icon: Activity, color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/20' },
  ];

  const PRIORITIES = [
    { id: 'low', label: 'Thấp', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800', icon: Circle },
    { id: 'medium', label: 'Vừa', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', icon: Flag },
    { id: 'high', label: 'Cao', color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20', icon: AlertCircle },
    { id: 'urgent', label: 'Khẩn cấp', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20', icon: Bell },
  ];

  const SIDEBAR_VIEWS = [
    { id: 'all', label: 'Tất cả công việc', icon: Inbox, count: todos.length },
    { id: 'today', label: 'Hôm nay', icon: CalendarDays, count: todos.filter(t => t.dueDate && isToday(new Date(t.dueDate))).length },
    { id: 'urgent', label: 'Khẩn cấp', icon: AlertCircle, count: todos.filter(t => t.priority === 'urgent' && !t.completed).length, color: 'text-rose-500' },
    { id: 'completed', label: 'Đã hoàn thành', icon: CheckCircle2, count: todos.filter(t => t.completed).length },
  ];

  const departments = Array.from(new Set(todos.map(t => t.department).filter(Boolean)));

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'todos'),
      where('createdBy', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Todo));
      setTodos(list);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'todos');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addTodo = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTodo.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'todos'), {
        title: newTodo.trim(),
        completed: false,
        priority: newPriority,
        status: 'pending',
        type: newType,
        dueDate: newDueDate || null,
        dueTime: newDueTime || null,
        category: newCategory.trim() || null,
        patientId: newPatientId.trim() || null,
        department: newDepartment.trim() || null,
        notes: '',
        createdBy: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setNewTodo('');
      setNewDueDate('');
      setNewDueTime('');
      setNewCategory('');
      setNewPatientId('');
      setNewDepartment('');
      setNewType('other');
      setIsAddingTask(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'todos');
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    try {
      await updateDoc(doc(db, 'todos', id), {
        completed: !completed,
        status: !completed ? 'completed' : 'pending',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `todos/${id}`);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'todos', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `todos/${id}`);
    }
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.title);
    setEditPriority(todo.priority || 'medium');
    setEditDueDate(todo.dueDate || '');
    setEditDueTime(todo.dueTime || '');
    setEditCategory(todo.category || '');
    setEditType(todo.type || 'other');
    setEditPatientId(todo.patientId || '');
    setEditDepartment(todo.department || '');
    setEditNotes(todo.notes || '');
    setEditStatus(todo.status || 'pending');
  };

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return;
    try {
      await updateDoc(doc(db, 'todos', id), {
        title: editText.trim(),
        priority: editPriority,
        status: editStatus,
        type: editType,
        dueDate: editDueDate || null,
        dueTime: editDueTime || null,
        category: editCategory.trim() || null,
        patientId: editPatientId.trim() || null,
        department: editDepartment.trim() || null,
        notes: editNotes.trim(),
        updatedAt: new Date().toISOString()
      });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `todos/${id}`);
    }
  };

  const filteredTodos = todos.filter(todo => {
    const matchesSearch = todo.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (todo.category?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (todo.patientId?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterTab === 'pending') return matchesSearch && !todo.completed;
    if (filterTab === 'completed') return matchesSearch && todo.completed;
    if (filterTab === 'urgent') return matchesSearch && todo.priority === 'urgent';
    if (filterTab === 'today') return matchesSearch && todo.dueDate && isToday(new Date(todo.dueDate));
    return matchesSearch;
  });

  const completedCount = todos.filter(t => t.completed).length;
  const progressPercentage = todos.length > 0 ? (completedCount / todos.length) * 100 : 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-rose-600 bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800';
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
      case 'medium': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
      default: return 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  const getTaskTypeDetails = (type: string) => {
    return TASK_TYPES.find(t => t.id === type) || TASK_TYPES[TASK_TYPES.length - 1];
  };

  const renderTaskCard = (todo: Todo, isKanban = false) => {
    const typeDetails = getTaskTypeDetails(todo.type);
    const TypeIcon = typeDetails.icon;
    const isOverdue = todo.dueDate && isPast(new Date(todo.dueDate)) && !todo.completed && !isToday(new Date(todo.dueDate));
    
    return (
      <motion.div
        key={todo.id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={() => setSelectedTaskId(todo.id)}
        className={cn(
          "group relative flex flex-col rounded-[24px] border transition-all duration-300 cursor-pointer overflow-hidden",
          isDarkMode 
            ? "bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 hover:shadow-2xl hover:shadow-black/20" 
            : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)]",
          todo.completed && "grayscale-[0.5] opacity-80",
          selectedTaskId === todo.id && (isDarkMode ? "border-blue-500/50 bg-slate-800" : "border-blue-300 bg-blue-50/30"),
          isKanban ? "w-full" : "w-full"
        )}
      >
        <div className="p-6 flex items-start gap-5">
          <div className="relative shrink-0 mt-1">
             <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTodo(todo.id, todo.completed);
                }}
                className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 border-2",
                  todo.completed 
                    ? "bg-emerald-500 border-emerald-500 text-white" 
                    : (isDarkMode ? "bg-slate-800 border-slate-700 hover:border-blue-500" : "bg-slate-50 border-slate-200 hover:border-blue-400")
                )}
              >
                {todo.completed && <Check size={14} strokeWidth={4} />}
              </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5",
                typeDetails.color
              )}>
                <TypeIcon size={12} />
                {typeDetails.label}
              </div>
              <div className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                getPriorityColor(todo.priority)
              )}>
                {PRIORITIES.find(p => p.id === todo.priority)?.label}
              </div>
              {todo.patientId && (
                <div className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                  isDarkMode ? "bg-slate-800/50 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-500"
                )}>
                  ID: {todo.patientId}
                </div>
              )}
            </div>

            <h4 className={cn(
              "text-base font-bold transition-all line-clamp-1 mb-2 tracking-tight",
              isDarkMode ? "text-slate-100" : "text-slate-800",
              todo.completed && "line-through text-slate-400"
            )}>
              {todo.title}
            </h4>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-slate-400">
              {todo.department && (
                <div className="flex items-center gap-1.5">
                  <Building2 size={13} className="opacity-60" />
                  <span className="text-[11px] font-bold">{todo.department}</span>
                </div>
              )}
              {todo.dueDate && (
                <div className={cn(
                  "flex items-center gap-1.5",
                  isOverdue ? "text-rose-500" : "opacity-80"
                )}>
                  <Clock size={13} />
                  <span className="text-[11px] font-black tracking-tighter">
                    {format(new Date(todo.dueDate), 'dd MMM', { locale: vi })} {todo.dueTime || ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end justify-between self-stretch">
            <button className="p-2 -mr-2 rounded-xl text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <MoreVertical size={18} />
            </button>
            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden bg-blue-100 flex items-center justify-center">
               <User size={14} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className={cn(
          "absolute top-0 right-0 w-24 h-24 blur-[60px] pointer-events-none opacity-20 transition-all duration-500 group-hover:opacity-40",
          todo.completed ? "bg-emerald-500" : (isOverdue ? "bg-rose-500" : "bg-blue-500")
        )} />
      </motion.div>
    );
  };

  const renderTaskDetail = (todo: Todo) => {
    const typeDetails = getTaskTypeDetails(todo.type);
    const TypeIcon = typeDetails.icon;
    const isEditing = editingId === todo.id;

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className={cn(
          "p-8 border-b flex items-center justify-between backdrop-blur-md sticky top-0 z-10",
          isDarkMode ? "border-slate-800/50 bg-slate-900/80" : "border-slate-100/50 bg-white/80"
        )}>
          <div className="flex items-center gap-4">
             <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
                <ClipboardCheck size={20} />
             </div>
             <h3 className={cn("text-lg font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
               Chi tiết công việc
             </h3>
          </div>
          <button 
            onClick={() => setSelectedTaskId(null)}
            className="p-3 rounded-2xl hover:bg-rose-500 hover:text-white transition-all text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar custom-scrollbar">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
               <div className={cn("px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest", typeDetails.color)}>
                 {typeDetails.label}
               </div>
               <div className={cn(
                 "w-2.5 h-2.5 rounded-full",
                 todo.completed ? "bg-emerald-500" : (todo.status === 'in_progress' ? "bg-amber-500" : "bg-blue-500")
               )} />
               <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest">
                 {todo.completed ? 'Đã hoàn thành' : (todo.status === 'in_progress' ? 'Đang thực hiện' : 'Chờ xử lý')}
               </span>
            </div>

            {isEditing ? (
              <textarea 
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className={cn(
                  "w-full p-6 rounded-[32px] font-bold border-2 outline-none focus:border-blue-500 text-xl leading-relaxed",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900 shadow-inner"
                )}
              />
            ) : (
              <h2 className={cn("text-3xl font-black leading-tight tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                {todo.title}
              </h2>
            )}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className={cn("p-6 rounded-[24px] border-2 group transition-all", isDarkMode ? "bg-slate-800/30 border-slate-800 hover:border-slate-700" : "bg-white border-slate-100 hover:border-blue-100 shadow-sm")}>
              <p className="text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest">Mức độ ưu tiên</p>
              <div className="flex items-center gap-3">
                <Flag size={18} className={getPriorityColor(todo.priority).split(' ')[0]} />
                <span className="text-sm font-black tracking-tight">{PRIORITIES.find(p => p.id === todo.priority)?.label}</span>
              </div>
            </div>
            <div className={cn("p-6 rounded-[24px] border-2 group transition-all", isDarkMode ? "bg-slate-800/30 border-slate-800 hover:border-slate-700" : "bg-white border-slate-100 hover:border-blue-100 shadow-sm")}>
              <p className="text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest">Hạn chót</p>
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-blue-500" />
                <span className="text-sm font-black tracking-tight">{todo.dueDate ? format(new Date(todo.dueDate), 'dd/MM/yyyy') : 'Chưa thiết lập'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Ngữ cảnh lâm sàng</h4>
              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 ml-4" />
            </div>
            <div className="space-y-4">
               <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                        <User size={14} className="text-slate-400" />
                     </div>
                     <span className="text-xs font-bold text-slate-500">Mã bệnh nhân</span>
                  </div>
                  <span className="text-sm font-black">{todo.patientId || 'N/A'}</span>
               </div>
               <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                        <Building2 size={14} className="text-slate-400" />
                     </div>
                     <span className="text-xs font-bold text-slate-500">Khoa / Phòng</span>
                  </div>
                  <span className="text-sm font-black">{todo.department || 'N/A'}</span>
               </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Ghi chú lâm sàng</h4>
              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 ml-4" />
            </div>
            {isEditing ? (
              <textarea 
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Nhập các quan sát lâm sàng hoặc ghi chú quy trình chi tiết..."
                className={cn(
                  "w-full p-6 rounded-[24px] font-bold border-2 outline-none focus:border-blue-500 text-sm min-h-[200px] leading-relaxed",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900 shadow-inner"
                )}
              />
            ) : (
              <div className={cn(
                "p-8 rounded-[32px] text-sm font-medium leading-relaxed min-h-[120px] shadow-sm border-2",
                isDarkMode ? "bg-slate-800/50 border-slate-800 text-slate-300" : "bg-white border-slate-100 text-slate-600"
              )}>
                {todo.notes || "Không có ghi chú lâm sàng nào đính kèm."}
              </div>
            )}
          </div>
          
          <div className="h-20" />
        </div>

        <div className={cn(
          "p-8 border-t flex gap-4 backdrop-blur-xl sticky bottom-0",
          isDarkMode ? "border-slate-800 bg-slate-900/90" : "border-slate-100 bg-white/90"
        )}>
          {isEditing ? (
            <>
              <button 
                onClick={() => setEditingId(null)}
                className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all border-2 border-transparent"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => saveEdit(todo.id)}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
              >
                Cập nhật Workspace
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => startEdit(todo)}
                className={cn(
                  "flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-2",
                  isDarkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-blue-100 text-blue-600 hover:bg-blue-50"
                )}
              >
                <Edit2 size={16} /> Chỉnh sửa
              </button>
              <button 
                onClick={() => deleteTodo(todo.id).then(() => setSelectedTaskId(null))}
                className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-100 active:scale-95 transition-all border-2 border-rose-100"
              >
                Lưu trữ / Xóa
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderAddTaskPanel = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={cn(
        "p-8 border-b flex items-center justify-between backdrop-blur-md sticky top-0 z-10",
        isDarkMode ? "border-slate-800/50 bg-slate-900/80" : "border-slate-100/50 bg-white/80"
      )}>
        <div className="flex items-center gap-4">
           <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
              <Plus size={20} />
           </div>
           <h3 className={cn("text-lg font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
             Thêm công việc mới
           </h3>
        </div>
        <button 
          onClick={() => setIsAddingTask(false)}
          className="p-3 rounded-2xl hover:bg-rose-500 hover:text-white transition-all text-slate-400"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={addTodo} className="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar custom-scrollbar">
        <div className="space-y-6">
          <label className="block text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Tiêu đề công việc *</label>
          <textarea 
            autoFocus
            required
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Mô tả tóm tắt việc cần thực hiện..."
            className={cn(
              "w-full p-6 rounded-[32px] font-bold border-2 outline-none focus:border-blue-500 text-xl leading-relaxed transition-all",
              isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addTodo();
              }
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Loại công việc</label>
            <div className="grid grid-cols-1 gap-2">
              {TASK_TYPES.slice(0, 6).map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setNewType(type.id as any)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
                    newType === type.id 
                      ? "border-blue-500 bg-blue-500/5 text-blue-600" 
                      : (isDarkMode ? "border-slate-800 bg-slate-900/50 text-slate-500" : "border-slate-100 bg-white text-slate-600")
                  )}
                >
                  <type.icon size={18} />
                  <span className="text-sm font-bold">{type.label}</span>
                  {newType === type.id && <Check size={16} className="ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <label className="block text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Độ ưu tiên</label>
              <div className="grid grid-cols-2 gap-3">
                {PRIORITIES.map(priority => (
                  <button
                    key={priority.id}
                    type="button"
                    onClick={() => setNewPriority(priority.id as any)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all",
                      newPriority === priority.id 
                        ? (priority.id === 'urgent' ? "border-rose-500 bg-rose-500/5 text-rose-600" : "border-blue-500 bg-blue-500/5 text-blue-600")
                        : (isDarkMode ? "border-slate-800 bg-slate-900/50 text-slate-500" : "border-slate-100 bg-white text-slate-600")
                    )}
                  >
                    <priority.icon size={16} />
                    <span className="text-xs font-bold">{priority.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Hạn chót</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className={cn(
                    "w-full pl-14 pr-6 py-4 rounded-2xl font-bold border-2 outline-none focus:border-blue-500 transition-all text-sm",
                    isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900"
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Mã bệnh nhân</label>
            <div className="relative">
              <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                value={newPatientId}
                onChange={(e) => setNewPatientId(e.target.value)}
                placeholder="VD: 24001"
                className={cn(
                  "w-full pl-14 pr-6 py-4 rounded-2xl font-bold border-2 outline-none focus:border-blue-500 transition-all text-sm",
                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900"
                )}
              />
            </div>
          </div>
          <div className="space-y-4">
            <label className="block text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Khoa / Phòng</label>
            <div className="relative">
              <Building2 size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="VD: Cấp cứu"
                className={cn(
                  "w-full pl-14 pr-6 py-4 rounded-2xl font-bold border-2 outline-none focus:border-blue-500 transition-all text-sm",
                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900"
                )}
              />
            </div>
          </div>
        </div>
        
        <div className="h-20" />
      </form>

      <div className={cn(
        "p-8 border-t flex gap-4 backdrop-blur-xl sticky bottom-0",
        isDarkMode ? "border-slate-800 bg-slate-900/90" : "border-slate-100 bg-white/90"
      )}>
        <button 
          onClick={() => setIsAddingTask(false)}
          className="flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
        >
          Hủy bỏ
        </button>
        <button 
          onClick={() => addTodo()}
          disabled={!newTodo.trim()}
          className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
        >
          Lưu công việc y tế
        </button>
      </div>
    </div>
  );

  return (
    <div className={cn(
      "w-full flex transition-all h-full min-h-screen overflow-hidden",
      isDarkMode ? "bg-slate-950 text-slate-200" : "bg-slate-50 text-slate-800"
    )}>
      {/* Internal Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className={cn(
              "h-full flex flex-col border-r relative z-30 transition-colors shrink-0",
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
            )}
          >
            {/* Sidebar Branding */}
            <div className="p-8 pb-4">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <ListTodo size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest">Việc Cần Làm</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Hệ thống lâm sàng v2.4</p>
                </div>
              </div>

              {/* Sidebar Views */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 ml-2">Góc nhìn thông minh</p>
                {SIDEBAR_VIEWS.map(view => {
                  const Icon = view.icon;
                  return (
                    <button
                      key={view.id}
                      onClick={() => setFilterTab(view.id as any)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
                        filterTab === view.id 
                          ? (isDarkMode ? "bg-blue-600 text-white shadow-lg" : "bg-blue-50 text-blue-600 shadow-sm")
                          : (isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-50 text-slate-500")
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={cn(filterTab === view.id ? "text-current" : (view.color || "text-slate-400"))} />
                        <span className="text-sm font-bold tracking-tight">{view.label}</span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-md",
                        filterTab === view.id ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"
                      )}>
                        {view.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sidebar Departments */}
            <div className="flex-1 overflow-y-auto px-8 py-4 no-scrollbar">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 ml-2">Khoa / Phòng</p>
                {departments.length === 0 ? (
                  <p className="text-[11px] font-bold text-slate-400 ml-2 italic">Chưa có khoa phòng nào</p>
                ) : (
                  departments.map(dept => (
                    <button
                      key={dept}
                      onClick={() => setSearchTerm(dept || '')}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all",
                        searchTerm === dept 
                          ? (isDarkMode ? "bg-slate-800 text-white border border-slate-700" : "bg-white text-blue-600 border border-blue-100 shadow-sm")
                          : (isDarkMode ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-50 text-slate-500")
                      )}
                    >
                      <Hash size={14} className="text-slate-400" />
                      <span className="text-xs font-bold tracking-tight truncate">{dept}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Sidebar Bottom */}
            <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-800">
               <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-500 mb-2">
                  <Settings size={18} />
                  <span className="text-sm font-bold">Cài đặt cá nhân</span>
               </button>
               <div className="px-4 py-4 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Chỉ số hiệu quả</p>
                  <p className="text-2xl font-black mb-2">{Math.round(progressPercentage)}%</p>
                  <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                     <motion.div initial={{width: 0}} animate={{width: `${progressPercentage}%`}} className="h-full bg-white" />
                  </div>
               </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content Header */}
        <div className={cn(
          "px-10 py-6 flex items-center justify-between transition-colors relative z-20 backdrop-blur-3xl border-b",
          isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-100"
        )}>
          <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               className={cn("p-2.5 rounded-xl transition-all", isDarkMode ? "hover:bg-slate-800 text-slate-500" : "hover:bg-slate-100 text-slate-400")}
             >
                {isSidebarOpen ? <X size={20} /> : <FilterIcon size={20} />}
             </button>
             <h3 className={cn("text-xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                {SIDEBAR_VIEWS.find(v => v.id === filterTab)?.label || 'Khu vực làm việc'}
             </h3>
          </div>

          <div className="flex items-center gap-6">
            <div className={cn(
              "p-1.5 rounded-2xl flex items-center gap-1.5",
              isDarkMode ? "bg-slate-800/50" : "bg-slate-100/80"
            )}>
              <button 
                onClick={() => setViewMode('list')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  viewMode === 'list' ? (isDarkMode ? "bg-blue-600 text-white shadow-lg" : "bg-white text-blue-600 shadow-sm") : "text-slate-400 hover:text-slate-600"
                )}
              >
                <List size={16} /> Danh sách
              </button>
              <button 
                onClick={() => setViewMode('kanban')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  viewMode === 'kanban' ? (isDarkMode ? "bg-blue-600 text-white shadow-lg" : "bg-white text-blue-600 shadow-sm") : "text-slate-400 hover:text-slate-600"
                )}
              >
                <LayoutGrid size={16} /> Bảng
              </button>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />

            {onClose && (
              <button onClick={onClose} className={cn(
                "p-2.5 rounded-xl transition-all",
                isDarkMode ? "hover:bg-slate-800 text-slate-500" : "hover:bg-rose-50 hover:text-rose-500 text-slate-300"
              )}>
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Quick Add Bar & Toolbar */}
            <div className={cn(
              "p-8 flex flex-col gap-4 border-b",
              isDarkMode ? "bg-slate-900/30 border-slate-800" : "bg-white/50 border-slate-100"
            )}>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                {/* Quick Add Search-like Bar */}
                <div className="relative flex-1 w-full group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                    <Sparkles size={20} className="text-blue-500 animate-pulse" />
                  </div>
                  <input 
                    ref={quickAddInputRef}
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addTodo();
                      }
                    }}
                    placeholder="Thêm nhanh việc cần làm... (Nhấn Enter để lưu)"
                    className={cn(
                      "w-full pl-16 pr-24 py-5 rounded-[28px] text-sm font-bold transition-all outline-none border-2",
                      isDarkMode 
                        ? "bg-slate-950/50 border-slate-800 text-white focus:border-blue-500 focus:bg-slate-900 shadow-inner" 
                        : "bg-white border-slate-100 text-slate-900 focus:border-blue-500 shadow-sm"
                    )}
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button 
                       onClick={() => setIsAddingTask(true)}
                       className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all"
                       title="Thêm chi tiết"
                    >
                      <MoreVertical size={18} />
                    </button>
                    <button 
                      onClick={() => addTodo()}
                      disabled={!newTodo.trim()}
                      className="p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                   <div className="relative group flex-1 md:flex-none">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className={cn(
                          "w-full md:w-64 pl-12 pr-4 py-3.5 rounded-2xl text-xs font-bold transition-all outline-none border-2",
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:border-blue-500" : "bg-white border-slate-100 text-slate-900 focus:border-blue-500"
                        )}
                      />
                   </div>
                   <button 
                    onClick={() => setIsAddingTask(true)}
                    className="flex-1 md:flex-none px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    <Plus size={18} /> Mở Form
                  </button>
                </div>
              </div>
            </div>

            {/* List/Kanban Scroll Area */}
            <div className={cn(
              "flex-1 overflow-y-auto p-10 space-y-6 no-scrollbar custom-scrollbar transition-all",
              isDarkMode ? "bg-slate-950/20" : "bg-slate-50/30"
            )}>
              {isLoading ? (
                <div className="h-96 flex flex-col items-center justify-center gap-6">
                  <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Đang đồng bộ dữ liệu...</p>
                </div>
              ) : (
                <div className={cn(
                  viewMode === 'list' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex gap-8 h-full overflow-x-auto pb-6 no-scrollbar"
                )}>
                  {viewMode === 'list' ? (
                    <AnimatePresence mode="popLayout">
                      {filteredTodos.map((todo) => renderTaskCard(todo))}
                    </AnimatePresence>
                  ) : (
                    <>
                      {['pending', 'in_progress', 'completed'].map(status => {
                        const statusTodos = filteredTodos.filter(t => (t.status || 'pending') === status);
                        return (
                          <div key={status} className="w-[380px] flex-shrink-0 flex flex-col gap-6">
                            <div className="flex items-center justify-between px-4">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-2.5 h-2.5 rounded-full ring-4 ring-opacity-20",
                                  status === 'pending' ? "bg-blue-500 ring-blue-500" : status === 'in_progress' ? "bg-amber-500 ring-amber-500" : "bg-emerald-500 ring-emerald-500"
                                )} />
                                <h4 className={cn("text-[13px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                                  {status === 'pending' ? 'Chờ xử lý' : status === 'in_progress' ? 'Đang làm' : 'Đã xong'}
                                </h4>
                              </div>
                            </div>
                            <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar pb-10">
                              {statusTodos.map(todo => renderTaskCard(todo, true))}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel (Details or Add Task) */}
          <AnimatePresence mode="wait">
            {selectedTaskId ? (
              <motion.div 
                key="detail"
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className={cn(
                  "absolute lg:relative right-0 top-0 bottom-0 w-full lg:w-[500px] z-[50] shadow-2xl border-l flex flex-col",
                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                )}
              >
                {renderTaskDetail(todos.find(t => t.id === selectedTaskId)!)}
              </motion.div>
            ) : isAddingTask ? (
              <motion.div 
                key="add"
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className={cn(
                  "absolute lg:relative right-0 top-0 bottom-0 w-full lg:w-[550px] z-[50] shadow-2xl border-l flex flex-col",
                  isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                )}
              >
                {renderAddTaskPanel()}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default TodoList;
