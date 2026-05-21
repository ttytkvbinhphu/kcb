import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, Type, Trash2, Save, FileText } from 'lucide-react';
import { db, collection, onSnapshot, setDoc, doc, deleteDoc, handleFirestoreError, OperationType, auth, query, where } from '../firebase';
import { CalendarEvent } from '../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isWithinInterval } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CalendarProps {
  isDarkMode?: boolean;
}

const Calendar: React.FC<CalendarProps> = ({ isDarkMode }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [formData, setFormData] = useState<Partial<CalendarEvent>>({
    title: '',
    description: '',
    startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    type: 'other',
    location: ''
  });

  const [activeViewDate, setActiveViewDate] = useState<Date>(new Date());
  const [viewedEvent, setViewedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = onSnapshot(collection(db, 'calendar_events'), (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
      setEvents(fetchedEvents);
      
      // Update viewed event if it was changed in the background
      if (viewedEvent) {
        const updated = fetchedEvents.find(e => e.id === viewedEvent.id);
        if (updated) setViewedEvent(updated);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'calendar_events');
    });
    return () => unsubscribe();
  }, [viewedEvent?.id]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const openAddModal = (day?: Date) => {
    const dateStr = day ? format(day, "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm");
    setFormData({
      title: '',
      description: '',
      startDate: dateStr,
      endDate: dateStr,
      type: 'other',
      location: ''
    });
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setFormData(event);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const eventId = selectedEvent?.id || doc(collection(db, 'calendar_events')).id;
    const newEvent: CalendarEvent = {
      id: eventId,
      title: formData.title || 'Không tiêu đề',
      description: formData.description || '',
      startDate: formData.startDate || new Date().toISOString(),
      endDate: formData.endDate || new Date().toISOString(),
      type: formData.type || 'other',
      location: formData.location || '',
      createdBy: auth.currentUser.uid,
      createdAt: selectedEvent?.createdAt || new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'calendar_events', eventId), newEvent);
      setIsModalOpen(false);
      if (viewedEvent?.id === eventId) setViewedEvent(newEvent);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `calendar_events/${eventId}`);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    try {
      await deleteDoc(doc(db, 'calendar_events', selectedEvent.id));
      if (viewedEvent?.id === selectedEvent.id) setViewedEvent(null);
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `calendar_events/${selectedEvent.id}`);
    }
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const start = parseISO(event.startDate);
      const end = parseISO(event.endDate);
      return isSameDay(day, start) || isSameDay(day, end) || (day >= start && day <= end);
    }).sort((a, b) => a.startDate.localeCompare(b.startDate));
  };

  const eventTypeColors = {
    meeting: 'bg-blue-500',
    duty: 'bg-emerald-500',
    surgery: 'bg-rose-500',
    other: 'bg-slate-500'
  };

  const eventTypeLabels = {
    meeting: 'Hội chẩn/Họp',
    duty: 'Trực',
    surgery: 'Phẫu thuật',
    other: 'Khác'
  };

  const activeDayEvents = getEventsForDay(activeViewDate);

  return (
    <div className={cn(
      "p-4 lg:p-8 max-w-[1600px] mx-auto pb-24 lg:pb-12 transition-colors min-h-screen",
      isDarkMode ? "bg-slate-950/30" : "bg-white"
    )}>
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] transition-all",
            isDarkMode ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
          )}>
            <CalendarIcon size={14} />
            Lịch công tác
          </div>
          <h2 className={cn(
            "text-3xl lg:text-5xl font-black tracking-tighter transition-colors",
            isDarkMode ? "text-white" : "text-black"
          )}>Lịch làm việc</h2>
          <p className={cn(
            "max-w-2xl text-sm lg:text-lg font-medium leading-relaxed transition-colors opacity-80",
            isDarkMode ? "text-slate-400" : "text-slate-500"
          )}>Theo dõi lịch trực, hội chẩn và các hoạt động chuyên môn của khoa.</p>
        </div>

        <button
          onClick={() => openAddModal(activeViewDate)}
          className="flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={20} />
          Thêm sự kiện
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Calendar Area */}
        <div className={cn(
          "flex-1 rounded-[32px] border transition-all overflow-hidden shadow-2xl shadow-slate-200/50",
          isDarkMode ? "bg-slate-900/50 border-slate-800 shadow-none" : "bg-white border-slate-100"
        )}>
          {/* Calendar Header */}
          <div className={cn(
            "p-6 flex items-center justify-between border-b transition-colors",
            isDarkMode ? "border-slate-800" : "border-slate-100"
          )}>
            <h3 className={cn(
              "text-xl lg:text-2xl font-black tracking-tight capitalize",
              isDarkMode ? "text-white" : "text-slate-900"
            )}>
              {format(currentDate, 'MMMM yyyy', { locale: vi })}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className={cn(
                  "p-2 rounded-xl border-2 transition-all",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-100 text-slate-400 hover:text-slate-900"
                )}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => {
                  setCurrentDate(new Date());
                  setActiveViewDate(new Date());
                }}
                className={cn(
                  "px-4 py-2 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-100 text-slate-400 hover:text-slate-900"
                )}
              >
                Hôm nay
              </button>
              <button
                onClick={handleNextMonth}
                className={cn(
                  "p-2 rounded-xl border-2 transition-all",
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-100 text-slate-400 hover:text-slate-900"
                )}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
              <div key={day} className={cn(
                "py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] border-b transition-colors",
                isDarkMode ? "text-slate-500 border-slate-800" : "text-slate-400 border-slate-100"
              )}>
                {day}
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());
              const isActive = isSameDay(day, activeViewDate);

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setActiveViewDate(day);
                    setViewedEvent(null);
                  }}
                  className={cn(
                    "min-h-[100px] lg:min-h-[140px] p-2 border-r border-b transition-all cursor-pointer relative group",
                    isDarkMode ? "border-slate-800" : "border-slate-100",
                    !isCurrentMonth && (isDarkMode ? "bg-slate-950/50 opacity-30" : "bg-slate-50/50 opacity-40"),
                    isActive ? (isDarkMode ? "bg-indigo-500/10" : "bg-indigo-50/50") : (isDarkMode ? "hover:bg-slate-800/30" : "hover:bg-slate-50/50")
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-xl text-sm font-black transition-all",
                      isToday 
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                        : (isActive ? (isDarkMode ? "text-indigo-400" : "text-indigo-600") : (isDarkMode ? "text-slate-400" : "text-slate-500"))
                    )}>
                      {format(day, 'd')}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddModal(day);
                      }}
                      className={cn(
                        "p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all",
                        isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-200"
                      )}
                    >
                      <Plus size={14} className="text-slate-400" />
                    </button>
                  </div>
                  
                  <div className="space-y-1 overflow-y-auto max-h-[60px] lg:max-h-[90px] custom-scrollbar">
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveViewDate(day);
                          setViewedEvent(event);
                        }}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold text-white truncate transition-all hover:scale-[1.02] active:scale-[0.98]",
                          eventTypeColors[event.type] || 'bg-slate-500',
                          viewedEvent?.id === event.id && "ring-2 ring-white ring-offset-1 ring-offset-indigo-500"
                        )}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar - Details Area */}
        <div className={cn(
          "w-full lg:w-[400px] rounded-[32px] border transition-all overflow-hidden flex flex-col h-fit sticky top-24",
          isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-2xl shadow-slate-200/50"
        )}>
          <div className={cn(
            "p-6 border-b transition-colors",
            isDarkMode ? "border-slate-800" : "border-slate-100"
          )}>
            <h4 className={cn("text-lg font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
              Chi tiết ngày {format(activeViewDate, 'dd/MM/yyyy')}
            </h4>
            <p className={cn("text-xs font-bold uppercase tracking-widest mt-1", isDarkMode ? "text-slate-500" : "text-slate-400")}>
              {activeDayEvents.length} sự kiện trong ngày
            </p>
          </div>

          <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar">
            {viewedEvent ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white",
                    eventTypeColors[viewedEvent.type]
                  )}>
                    {eventTypeLabels[viewedEvent.type]}
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => openEditModal(viewedEvent)}
                      className={cn(
                        "p-2 rounded-xl transition-colors",
                        isDarkMode ? "bg-slate-800 text-slate-500 hover:text-indigo-400" : "bg-slate-100 text-slate-500 hover:text-indigo-600"
                      )}
                    >
                      <Save size={16} />
                    </button>
                    <button 
                      onClick={() => setViewedEvent(null)}
                      className={cn(
                        "p-2 rounded-xl transition-colors",
                        isDarkMode ? "bg-slate-800 text-slate-500 hover:text-rose-400" : "bg-slate-100 text-slate-500 hover:text-rose-600"
                      )}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <h3 className={cn("text-2xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
                  {viewedEvent.title}
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                      <Clock size={18} />
                    </div>
                    <div>
                      <p className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-500" : "text-slate-400")}>Thời gian</p>
                      <p className={cn("text-sm font-bold", isDarkMode ? "text-slate-200" : "text-slate-700")}>
                        {format(parseISO(viewedEvent.startDate), 'HH:mm')} - {format(parseISO(viewedEvent.endDate), 'HH:mm')}
                      </p>
                    </div>
                  </div>

                  {viewedEvent.location && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-500" : "text-slate-400")}>Địa điểm</p>
                        <p className={cn("text-sm font-bold", isDarkMode ? "text-slate-200" : "text-slate-700")}>
                          {viewedEvent.location}
                        </p>
                      </div>
                    </div>
                  )}

                  {viewedEvent.description && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-500" : "text-slate-400")}>Ghi chú</p>
                        <p className={cn("text-sm font-medium leading-relaxed", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                          {viewedEvent.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {activeDayEvents.length > 0 ? (
                  activeDayEvents.map(event => (
                    <button
                      key={event.id}
                      onClick={() => setViewedEvent(event)}
                      className={cn(
                        "w-full p-4 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group",
                        isDarkMode ? "bg-slate-800/50 border-slate-700 hover:border-indigo-500/50" : "bg-slate-50 border-slate-100 hover:border-indigo-200"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-white",
                          eventTypeColors[event.type]
                        )}>
                          {eventTypeLabels[event.type]}
                        </span>
                        <span className={cn("text-[10px] font-bold", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                          {format(parseISO(event.startDate), 'HH:mm')}
                        </span>
                      </div>
                      <h5 className={cn("font-black text-sm group-hover:text-indigo-500 transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
                        {event.title}
                      </h5>
                    </button>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors",
                      isDarkMode ? "bg-slate-800" : "bg-slate-100"
                    )}>
                      <CalendarIcon className={cn("transition-colors", isDarkMode ? "text-slate-600" : "text-slate-300")} size={32} />
                    </div>
                    <p className={cn("text-sm font-bold", isDarkMode ? "text-slate-500" : "text-slate-400")}>
                      Không có sự kiện nào trong ngày này
                    </p>
                    <button
                      onClick={() => openAddModal(activeViewDate)}
                      className="mt-4 text-xs font-black text-indigo-500 uppercase tracking-widest hover:underline"
                    >
                      + Thêm sự kiện đầu tiên
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 lg:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden border transition-all",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <form onSubmit={handleSubmit}>
                <div className={cn(
                  "p-8 border-b flex items-center justify-between text-white transition-colors",
                  isDarkMode ? "border-slate-800" : "border-slate-100",
                  eventTypeColors[formData.type as keyof typeof eventTypeColors] || 'bg-indigo-600'
                )}>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">
                      {selectedEvent ? 'Chỉnh sửa sự kiện' : 'Thêm sự kiện mới'}
                    </h3>
                    <p className="text-xs font-bold opacity-80 uppercase tracking-widest mt-1">
                      {selectedEvent ? 'Cập nhật thông tin lịch làm việc' : 'Tạo lịch làm việc mới cho khoa'}
                    </p>
                  </div>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/20 rounded-2xl transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className={cn("p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar", isDarkMode ? "bg-slate-900" : "bg-white")}>
                  <div>
                    <label className={cn("block text-[10px] font-black uppercase tracking-widest mb-2", isDarkMode ? "text-slate-500" : "text-slate-400")}>Tiêu đề sự kiện</label>
                    <div className="relative">
                      <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        required
                        type="text"
                        className={cn(
                          "w-full pl-12 pr-4 py-4 border-2 rounded-2xl focus:ring-0 focus:border-indigo-500 transition-all font-bold outline-none",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                        )}
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ví dụ: Họp giao ban sáng..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={cn("block text-[10px] font-black uppercase tracking-widest mb-2", isDarkMode ? "text-slate-500" : "text-slate-400")}>Bắt đầu</label>
                      <input
                        required
                        type="datetime-local"
                        className={cn(
                          "w-full px-4 py-4 border-2 rounded-2xl focus:ring-0 focus:border-indigo-500 transition-all font-bold outline-none",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                        )}
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={cn("block text-[10px] font-black uppercase tracking-widest mb-2", isDarkMode ? "text-slate-500" : "text-slate-400")}>Kết thúc</label>
                      <input
                        required
                        type="datetime-local"
                        className={cn(
                          "w-full px-4 py-4 border-2 rounded-2xl focus:ring-0 focus:border-indigo-500 transition-all font-bold outline-none",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                        )}
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={cn("block text-[10px] font-black uppercase tracking-widest mb-2", isDarkMode ? "text-slate-500" : "text-slate-400")}>Loại sự kiện</label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {Object.entries(eventTypeLabels).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: key as any })}
                          className={cn(
                            "py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border-2",
                            formData.type === key 
                              ? (isDarkMode ? "bg-indigo-500/20 border-indigo-500 text-indigo-400" : "bg-indigo-50 border-indigo-600 text-indigo-600")
                              : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700" : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100")
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={cn("block text-[10px] font-black uppercase tracking-widest mb-2", isDarkMode ? "text-slate-500" : "text-slate-400")}>Địa điểm</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        className={cn(
                          "w-full pl-12 pr-4 py-4 border-2 rounded-2xl focus:ring-0 focus:border-indigo-500 transition-all font-bold outline-none",
                          isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                        )}
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Ví dụ: Hội trường A, Khoa Nội..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className={cn("block text-[10px] font-black uppercase tracking-widest mb-2", isDarkMode ? "text-slate-500" : "text-slate-400")}>Ghi chú thêm</label>
                    <textarea
                      rows={3}
                      className={cn(
                        "w-full px-5 py-4 border-2 rounded-2xl focus:ring-0 focus:border-indigo-500 transition-all font-bold outline-none resize-none",
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                      )}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Nội dung chi tiết sự kiện..."
                    />
                  </div>
                </div>

                <div className={cn("p-8 border-t flex gap-4 transition-colors", isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-slate-50/50 border-slate-100")}>
                  {selectedEvent && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className={cn(
                        "p-4 rounded-2xl transition-all border-2",
                        isDarkMode ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20" : "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100"
                      )}
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={cn(
                      "flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2",
                      isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    Lưu sự kiện
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


export default Calendar;
