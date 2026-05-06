import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, Plus, Search, Pin, Trash2, Edit3, X, Save, Palette, Clock, ChevronLeft } from 'lucide-react';
import { db, collection, onSnapshot, setDoc, doc, deleteDoc, handleFirestoreError, OperationType, auth, query, where } from '../firebase';
import { Note } from '../types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { cn } from '../lib/utils';

interface NotesProps {
  isDarkMode?: boolean;
  subHeaderPortalId?: string;
}

const Notes: React.FC<NotesProps> = ({ isDarkMode, subHeaderPortalId }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [rotationOffset, setRotationOffset] = useState(0);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<Partial<Note>>({
    title: '',
    content: '',
    color: 'indigo',
    isPinned: false
  });

  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (subHeaderPortalId) {
      setPortalNode(document.getElementById(subHeaderPortalId));
    }
    return () => setPortalNode(null);
  }, [subHeaderPortalId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setIsColorPickerOpen(false);
      }
    };

    if (isColorPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColorPickerOpen]);

  const handleCloseAttempt = React.useCallback(() => {
    if (isEditing) {
      // Check if there are actual changes
      const hasChanges = selectedNote 
        ? (formData.title !== selectedNote.title || 
           formData.content !== selectedNote.content || 
           formData.color !== selectedNote.color)
        : (formData.title !== '' || formData.content !== '');

      if (hasChanges) {
        setShowDiscardConfirm(true);
      } else {
        setIsModalOpen(false);
      }
    } else {
      setIsModalOpen(false);
    }
  }, [isEditing, selectedNote, formData, setShowDiscardConfirm, setIsModalOpen]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
        } else {
          handleCloseAttempt();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isModalOpen, showDiscardConfirm, handleCloseAttempt]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'notes'), where('createdBy', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notes');
    });
    return () => unsubscribe();
  }, []);

  const colors = [
    { name: 'indigo', bg: 'bg-indigo-500', light: 'bg-indigo-50', dark: 'bg-indigo-900/20' },
    { name: 'emerald', bg: 'bg-emerald-500', light: 'bg-emerald-50', dark: 'bg-emerald-900/20' },
    { name: 'rose', bg: 'bg-rose-500', light: 'bg-rose-50', dark: 'bg-rose-900/20' },
    { name: 'amber', bg: 'bg-amber-500', light: 'bg-amber-50', dark: 'bg-amber-900/20' },
    { name: 'cyan', bg: 'bg-cyan-500', light: 'bg-cyan-50', dark: 'bg-cyan-900/20' },
    { name: 'slate', bg: 'bg-slate-500', light: 'bg-slate-50', dark: 'bg-slate-900/20' },
  ];

  const openAddModal = () => {
    setFormData({ title: '', content: '', color: 'indigo', isPinned: false });
    setSelectedNote(null);
    setIsEditing(true);
    setIsColorPickerOpen(false);
    setShowDiscardConfirm(false);
    setRotationOffset(0);
    setIsModalOpen(true);
  };

  const openViewModal = (note: Note) => {
    setSelectedNote(note);
    setFormData(note);
    setIsEditing(false);
    setIsColorPickerOpen(false);
    setShowDiscardConfirm(false);
    setRotationOffset(0);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const noteId = selectedNote?.id || doc(collection(db, 'notes')).id;
    const now = new Date().toISOString();
    const newNote: Note = {
      id: noteId,
      title: formData.title || 'Không tiêu đề',
      content: formData.content || '',
      color: formData.color || 'indigo',
      isPinned: formData.isPinned || false,
      createdBy: auth.currentUser.uid,
      createdAt: selectedNote?.createdAt || now,
      updatedAt: now
    };

    try {
      await setDoc(doc(db, 'notes', noteId), newNote);
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `notes/${noteId}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notes', id));
      if (selectedNote?.id === id) setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notes/${id}`);
    }
  };

  const togglePin = async (note: Note) => {
    try {
      await setDoc(doc(db, 'notes', note.id), { ...note, isPinned: !note.isPinned, updatedAt: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notes/${note.id}`);
    }
  };

  const filteredNotes = notes
    .filter(n => 
      (n.title || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
      (n.content || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div className={cn(
      "pt-2 px-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-12 transition-colors min-h-screen",
      isDarkMode ? "bg-slate-950/30" : "bg-white"
    )}>
      {/* Mobile Portal for Search */}
      {portalNode && createPortal(
        <div className="flex-1 flex items-center max-w-[200px] sm:max-w-none">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Tìm..."
              className={cn(
                "w-full pl-8 pr-3 py-1.5 border-none rounded-lg focus:ring-1 focus:ring-indigo-500 transition-all outline-none font-bold text-[10px]",
                isDarkMode ? "bg-slate-800 text-white" : "bg-white text-slate-900 shadow-sm"
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>,
        portalNode
      )}

      <div className="hidden lg:flex mb-8 flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="hidden lg:block space-y-2">
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] transition-all",
            isDarkMode ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
          )}>
            <MessageSquare size={14} />
            Ghi chú cá nhân
          </div>
          <h2 className={cn(
            "text-3xl lg:text-5xl font-black tracking-tighter transition-colors",
            isDarkMode ? "text-white" : "text-black"
          )}>Ghi chú & Lưu ý</h2>
          <p className={cn(
            "max-w-2xl text-sm lg:text-lg font-medium leading-relaxed transition-colors opacity-80",
            isDarkMode ? "text-slate-400" : "text-slate-500"
          )}>Lưu trữ các kiến thức lâm sàng, phác đồ nhanh hoặc các lưu ý quan trọng trong công việc.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="hidden sm:block relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Tìm ghi chú..."
              className={cn(
                "w-full sm:w-[260px] pl-12 pr-4 py-4 border-2 rounded-2xl focus:ring-0 focus:border-indigo-500 transition-all outline-none font-medium",
                isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900"
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={openAddModal}
            className="hidden sm:flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={20} />
            Ghi chú mới
          </button>
        </div>
      </div>

      {/* Mobile FAB for New Note */}
      <button
        onClick={openAddModal}
        className="sm:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center active:scale-90 transition-all"
        title="Ghi chú mới"
      >
        <Plus size={28} />
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredNotes.map((note) => {
            const colorConfig = colors.find(c => c.name === note.color) || colors[0];
            return (
              <motion.div
                layout
                key={note.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "group relative p-6 rounded-[32px] border-2 transition-all hover:shadow-2xl flex flex-col min-h-[240px]",
                  isDarkMode ? `${colorConfig.dark} border-slate-800 hover:border-${colorConfig.name}-500/50` : `${colorConfig.light} border-white hover:border-${colorConfig.name}-200 shadow-xl shadow-slate-200/50`
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <button
                    onClick={() => togglePin(note)}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      note.isPinned ? "text-indigo-600 bg-white shadow-sm" : "text-slate-400 hover:text-indigo-600 hover:bg-white/50"
                    )}
                  >
                    <Pin size={18} className={note.isPinned ? "fill-indigo-600" : ""} />
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        openViewModal(note);
                        setIsEditing(true);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-white/50 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-white/50 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 cursor-pointer" onClick={() => openViewModal(note)}>
                  <h3 className={cn(
                    "text-lg font-black tracking-tight mb-2 line-clamp-2",
                    isDarkMode ? "text-white" : "text-slate-900"
                  )}>
                    {note.title}
                  </h3>
                  <p className={cn(
                    "text-sm font-medium leading-relaxed line-clamp-6",
                    isDarkMode ? "text-slate-400" : "text-slate-600"
                  )}>
                    {note.content}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Clock size={12} />
                  {format(new Date(note.updatedAt), 'HH:mm dd/MM/yyyy', { locale: vi })}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Note Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                "w-full h-full sm:h-full sm:max-w-none sm:rounded-none shadow-2xl overflow-hidden border-0 flex flex-col",
                isDarkMode ? "bg-slate-900" : "bg-white"
              )}
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className={cn(
                  "px-4 py-2 sm:px-8 sm:py-3 flex items-center justify-between text-white shrink-0",
                  colors.find(c => c.name === formData.color)?.bg || 'bg-indigo-600'
                )}>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={handleCloseAttempt}
                      className="p-2 hover:bg-white/20 rounded-2xl transition-all active:scale-95"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                        {isEditing ? (selectedNote ? 'Chỉnh sửa' : 'Tạo mới') : 'Chi tiết'}
                      </span>
                      <h3 className="text-lg font-black leading-tight">Ghi chú</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })}
                          className={cn(
                            "p-2 rounded-2xl transition-all active:scale-95",
                            formData.isPinned ? "bg-white text-indigo-600" : "bg-white/20 text-white hover:bg-white/30"
                          )}
                        >
                          <Pin size={24} className={formData.isPinned ? "fill-indigo-600" : ""} />
                        </button>
                        <button 
                          type="submit"
                          className="p-2 hover:bg-white/20 rounded-2xl transition-all active:scale-95"
                        >
                          <Save size={24} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="p-2 hover:bg-white/20 rounded-2xl transition-all active:scale-95"
                        >
                          <Edit3 size={24} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => selectedNote && handleDelete(selectedNote.id)}
                          className="p-2 hover:bg-white/20 rounded-2xl transition-all active:scale-95 text-rose-200"
                        >
                          <Trash2 size={24} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className={cn("overflow-y-auto custom-scrollbar flex-1 relative [scrollbar-gutter:stable] p-4 pb-16 sm:p-8 lg:p-12 flex flex-col gap-6", isDarkMode ? "bg-slate-900" : "bg-white")}>
                  {isEditing ? (
                    <>
                      <div className="shrink-0">
                        <input
                          required
                          autoFocus
                          type="text"
                          className={cn(
                            "w-full px-4 py-2.5 sm:py-3 border-2 rounded-2xl focus:ring-0 focus:border-indigo-500 font-bold outline-none text-base sm:text-lg",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                          )}
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Tiêu đề ghi chú..."
                        />
                      </div>

                      <div className="flex-1 flex flex-col min-h-[500px]">
                        <textarea
                          required
                          className={cn(
                            "w-full flex-1 px-4 py-3 border-2 rounded-2xl focus:ring-0 focus:border-indigo-500 font-medium outline-none resize-none text-sm sm:text-base",
                            isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                          )}
                          value={formData.content}
                          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                          placeholder="Nhập nội dung ghi chú tại đây..."
                        />
                      </div>
                    </>
                  ) : (
                      <div className="w-full space-y-4">
                        <div className="flex items-start justify-between gap-6">
                          <h2 className={cn("text-[24px] font-black tracking-tighter leading-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                            {selectedNote?.title}
                          </h2>
                          {selectedNote?.isPinned && (
                            <div className="bg-indigo-500 text-white p-3 rounded-2xl shadow-lg shadow-indigo-500/20 shrink-0">
                              <Pin size={20} className="fill-white" />
                            </div>
                          )}
                        </div>
                        
                        <div className={cn(
                          "py-1 leading-relaxed whitespace-pre-wrap font-medium text-[14px]",
                          isDarkMode ? "text-slate-300" : "text-slate-700"
                        )}>
                          {selectedNote?.content}
                        </div>
                      </div>
                    )}
                </div>

                {!isEditing && selectedNote && (
                  <div className={cn(
                    "shrink-0 px-4 py-2 sm:px-12 sm:py-4 border-t sm:border-t-0 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                    "fixed bottom-0 left-0 right-0 sm:relative bg-inherit sm:bg-transparent z-10",
                    isDarkMode ? "text-slate-500 border-slate-800" : "text-slate-400 border-slate-50"
                  )}>
                    <Clock size={14} />
                    <span>Cập nhật: {format(new Date(selectedNote.updatedAt), 'HH:mm dd/MM/yyyy', { locale: vi })}</span>
                  </div>
                )}

                {isEditing && (
                  <div className={cn("flex flex-col p-4 sm:p-6 border-t gap-4 transition-colors shrink-0", isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-50")}>
                    <div className="w-full">
                       <label className={cn("block text-[10px] font-black uppercase tracking-widest mb-4", isDarkMode ? "text-slate-500" : "text-slate-400")}>Màu sắc</label>
                       <div className="flex flex-wrap gap-3">
                         {colors.map((color) => (
                           <button
                             key={color.name}
                             type="button"
                             onClick={() => setFormData({ ...formData, color: color.name })}
                             className={cn(
                               "w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all flex items-center justify-center",
                               color.bg,
                               formData.color === color.name ? "ring-4 ring-offset-4 ring-indigo-500 scale-110" : "hover:scale-105"
                             )}
                           >
                             {formData.color === color.name && <Palette size={18} className="text-white" />}
                           </button>
                         ))}
                       </div>
                    </div>
                  </div>
                )}

                {/* Discard Confirmation Dialog */}
                <AnimatePresence>
                  {showDiscardConfirm && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={cn(
                          "w-full max-w-xs p-6 rounded-[32px] shadow-2xl border text-center",
                          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                        )}
                      >
                        <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Trash2 size={32} />
                        </div>
                        <h4 className={cn("text-xl font-black mb-2", isDarkMode ? "text-white" : "text-slate-900")}>Hủy chỉnh sửa?</h4>
                        <p className={cn("text-sm font-medium mb-6", isDarkMode ? "text-slate-400" : "text-slate-500")}>Các thay đổi của bạn sẽ không được lưu lại.</p>
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20"
                          >
                            Xác nhận hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDiscardConfirm(false)}
                            className={cn(
                              "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                              isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-50"
                            )}
                          >
                            Tiếp tục chỉnh sửa
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notes;
