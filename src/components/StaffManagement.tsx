import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Users, ChevronRight, X, Loader2, Check, AlertTriangle, Filter, Eye, Trash2, UserCheck, UserX, Briefcase, Stethoscope, Pill, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, collection, onSnapshot, query, orderBy, handleFirestoreError, OperationType, setDoc, doc, deleteDoc, writeBatch } from '../firebase';
import { Staff } from '../types';

interface StaffManagementProps {
  isDarkMode: boolean;
  canManage: boolean;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ isDarkMode, canManage }) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [availableTitles, setAvailableTitles] = useState<{id: string, name: string}[]>([]);
  const [availablePositions, setAvailablePositions] = useState<{id: string, name: string}[]>([]);
  const [availableSpecialties, setAvailableSpecialties] = useState<{id: string, name: string}[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Staff>>({
    fullName: '',
    type: 'Bác sĩ',
    gender: 'Nam',
    dob: '',
    address: '',
    specialty: '',
    position: '',
    phone: '',
    email: '',
    certificateCode: '',
    department: '',
    isActive: true
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'All' | 'Bác sĩ' | 'Dược sĩ' | 'Điều dưỡng'>('All');

  useEffect(() => {
    const q = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
      setStaff(staffData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'staff');
      setLoading(false);
    });

    const unsubTitles = onSnapshot(collection(db, 'config_titles'), (snapshot) => {
      setAvailableTitles(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });

    const unsubPositions = onSnapshot(collection(db, 'config_positions'), (snapshot) => {
      setAvailablePositions(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });

    const unsubSpecialties = onSnapshot(collection(db, 'config_specialties'), (snapshot) => {
      setAvailableSpecialties(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });

    const unsubDepartments = onSnapshot(collection(db, 'config_departments'), (snapshot) => {
      setAvailableDepartments(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });

    return () => {
      unsubscribe();
      unsubTitles();
      unsubPositions();
      unsubSpecialties();
      unsubDepartments();
    };
  }, []);

  const handleSave = async () => {
    if (!formData.fullName || !formData.type || !formData.gender || !formData.dob) {
      alert("Vui lòng nhập đầy đủ Tên, Loại nhân sự, Giới tính và Ngày sinh");
      return;
    }

    setSaving(true);
    try {
      const staffId = isEditing && selectedStaff ? selectedStaff.id : `STF${Date.now()}`;
      const newStaff: Staff = {
        ...(formData as Staff),
        id: staffId,
        createdAt: isEditing && selectedStaff ? selectedStaff.createdAt : new Date().toISOString()
      };

      await setDoc(doc(db, 'staff', staffId), newStaff);
      setIsModalOpen(false);
      setIsEditing(false);
      setSelectedStaff(null);
      setFormData({
        fullName: '',
        type: 'Bác sĩ',
        gender: 'Nam',
        dob: '',
        address: '',
        specialty: '',
        position: '',
        phone: '',
        email: '',
        certificateCode: '',
        department: '',
        isActive: true
      });
    } catch (error) {
      console.error("Error saving staff:", error);
      alert("Lỗi khi lưu thông tin nhân sự");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa nhân sự này?")) return;
    try {
      await deleteDoc(doc(db, 'staff', id));
    } catch (error) {
      console.error("Error deleting staff:", error);
    }
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = (s.fullName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
                         (s.certificateCode || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                         (s.department || '').toLowerCase().includes((searchTerm || '').toLowerCase());
    const matchesTab = activeTab === 'All' || s.type === activeTab;
    return matchesSearch && matchesTab;
  });

  const getStaffIcon = (type: string) => {
    switch (type) {
      case 'Bác sĩ': return <Stethoscope size={20} />;
      case 'Dược sĩ': return <Pill size={20} />;
      case 'Điều dưỡng': return <ClipboardList size={20} />;
      default: return <Users size={20} />;
    }
  };

  return (
    <div className="space-y-2 lg:space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="hidden lg:block">
          <h2 className="text-xl lg:text-2xl font-black tracking-tight">Quản lý nhân sự</h2>
          <p className="text-xs lg:text-sm text-slate-500 font-medium">Danh sách bác sĩ, dược sĩ và điều dưỡng</p>
        </div>
        
        {canManage && (
          <button 
            onClick={() => {
              setIsEditing(false);
              setFormData({
                fullName: '',
                type: 'Bác sĩ',
                gender: 'Nam',
                dob: '',
                address: '',
                specialty: '',
                position: '',
                phone: '',
                email: '',
                certificateCode: '',
                department: '',
                isActive: true
              });
              setIsModalOpen(true);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 text-sm hover:bg-primary-hover",
              !isDarkMode && "shadow-md shadow-primary/10"
            )}
          >
            <UserPlus size={16} />
            Thêm nhân sự mới
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Tìm theo tên, mã chứng chỉ, khoa phòng..." 
            className={cn(
              "w-full pl-10 pr-3 py-2.5 rounded-xl border-none font-bold text-sm transition-all focus:ring-2 focus:ring-primary",
              isDarkMode ? "bg-slate-800 text-white" : "bg-white text-slate-900 shadow-sm"
            )}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={cn(
          "flex p-1 rounded-xl",
          isDarkMode ? "bg-slate-800" : "bg-slate-100"
        )}>
          {(['All', 'Bác sĩ', 'Dược sĩ', 'Điều dưỡng'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab 
                  ? (isDarkMode ? "bg-slate-700 text-primary shadow-sm" : "bg-white text-primary shadow-sm")
                  : (isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-500 hover:text-slate-700")
              )}
            >
              {tab === 'All' ? 'Tất cả' : tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-xs text-slate-500 font-bold animate-pulse">Đang tải danh sách nhân sự...</p>
        </div>
      ) : filteredStaff.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((person) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={person.id}
              className={cn(
                "group relative p-4 rounded-2xl border transition-all hover:shadow-md",
                isDarkMode ? "bg-slate-800 border-slate-700 hover:border-slate-600" : "bg-white border-slate-100 hover:border-primary/20 shadow-sm"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md",
                  person.type === 'Bác sĩ' ? "bg-primary" : person.type === 'Dược sĩ' ? "bg-emerald-600" : "bg-purple-600"
                )}>
                  {getStaffIcon(person.type)}
                </div>
                <div className="flex gap-1">
                  {canManage && (
                    <>
                      <button 
                        onClick={() => {
                          setSelectedStaff(person);
                          setFormData(person);
                          setIsEditing(true);
                          setIsModalOpen(true);
                        }}
                        className={cn(
                          "p-1.5 rounded-lg text-slate-400 hover:text-primary transition-colors",
                          isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"
                        )}
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(person.id)}
                        className={cn(
                          "p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors",
                          isDarkMode ? "hover:bg-red-900/20" : "hover:bg-red-50"
                        )}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-0.5">
                <h3 className="text-base font-black tracking-tight group-hover:text-primary transition-colors truncate">{person.fullName}</h3>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                    person.type === 'Bác sĩ' ? "bg-primary/10 text-primary" : person.type === 'Dược sĩ' ? "bg-emerald-100 text-emerald-600" : "bg-purple-100 text-purple-600"
                  )}>
                    {person.type}
                  </span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                    isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"
                  )}>
                    {person.gender}
                  </span>
                  {person.isActive ? (
                    <span className="flex items-center gap-0.5 text-[8px] font-bold text-emerald-500">
                      <UserCheck size={10} /> Đang làm việc
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[8px] font-bold text-slate-400">
                      <UserX size={10} /> Đã nghỉ
                    </span>
                  )}
                </div>
              </div>

              <div className={cn(
                "mt-4 pt-4 border-t grid grid-cols-2 gap-x-3 gap-y-2",
                isDarkMode ? "border-slate-700" : "border-slate-100"
              )}>
                <div className="space-y-0.5">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ngày sinh</p>
                  <p className="text-[11px] font-bold truncate">{person.dob || '---'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại</p>
                  <p className="text-[11px] font-bold truncate">{person.phone || '---'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Khoa / Phòng</p>
                  <p className="text-[11px] font-bold truncate">{person.department || '---'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mã CCHN</p>
                  <p className="text-[11px] font-bold truncate">{person.certificateCode || '---'}</p>
                </div>
                <div className="space-y-0.5 col-span-2">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ</p>
                  <p className="text-[11px] font-bold truncate">{person.address || '---'}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className={cn(
          "flex flex-col items-center justify-center py-20 space-y-4 rounded-[40px] border-2 border-dashed",
          isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"
        )}>
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center text-slate-400",
            isDarkMode ? "bg-slate-800" : "bg-slate-100"
          )}>
            <Users size={40} />
          </div>
          <div className="text-center">
            <p className={cn("text-xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>Không tìm thấy nhân sự</p>
            <p className="text-slate-500 font-medium">Thử thay đổi từ khóa tìm kiếm hoặc thêm nhân sự mới</p>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !saving && setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border transition-colors",
                isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
              )}
            >
              <div className={cn(
                "p-6 border-b flex items-center justify-between",
                isDarkMode ? "border-slate-800" : "border-slate-100"
              )}>
                <h3 className="text-xl font-black tracking-tight">
                  {isEditing ? "Chỉnh sửa thông tin nhân sự" : "Thêm nhân sự mới"}
                </h3>
                <button onClick={() => !saving && setIsModalOpen(false)} className={cn(
                  "p-2 rounded-xl transition-colors",
                  isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                )}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và tên</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại nhân sự (Chức danh)</label>
                    <select 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    >
                      {availableTitles.length > 0 ? (
                        availableTitles.map(t => <option key={t.id} value={t.name}>{t.name}</option>)
                      ) : (
                        <>
                          <option value="Bác sĩ">Bác sĩ</option>
                          <option value="Dược sĩ">Dược sĩ</option>
                          <option value="Điều dưỡng">Điều dưỡng</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giới tính</label>
                    <select 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.gender}
                      onChange={(e) => setFormData({...formData, gender: e.target.value as any})}
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày tháng năm sinh</label>
                    <input 
                      type="date" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.dob}
                      onChange={(e) => setFormData({...formData, dob: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã chứng chỉ hành nghề</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.certificateCode}
                      onChange={(e) => setFormData({...formData, certificateCode: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chuyên khoa</label>
                    <select 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.specialty}
                      onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                    >
                      <option value="">Chọn chuyên khoa...</option>
                      {availableSpecialties.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chức vụ</label>
                    <select 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.position}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                    >
                      <option value="">Chọn chức vụ...</option>
                      {availablePositions.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Khoa / Phòng</label>
                    <select 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                    >
                      <option value="">Chọn khoa/phòng...</option>
                      {availableDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ</label>
                    <input 
                      type="text" 
                      className={cn("w-full px-4 py-2.5 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                    <input 
                      type="email" 
                      className={cn("w-full px-4 py-3 rounded-xl border-none font-bold", isDarkMode ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-900")}
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-4">
                    <input 
                      type="checkbox" 
                      id="isActive"
                      className={cn(
                        "w-5 h-5 rounded-lg border-none text-primary focus:ring-0",
                        isDarkMode ? "bg-slate-800" : "bg-slate-100"
                      )}
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    />
                    <label htmlFor="isActive" className="text-sm font-bold cursor-pointer">Đang làm việc</label>
                  </div>
                </div>
              </div>

              <div className={cn(
                "p-6 border-t flex gap-3",
                isDarkMode ? "border-slate-800" : "border-slate-100"
              )}>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={cn(
                    "flex-1 py-3 rounded-2xl font-bold transition-all",
                    isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={cn(
                    "flex-1 py-3 bg-primary text-white rounded-2xl font-bold transition-all disabled:bg-slate-300 hover:bg-primary-hover",
                    !isDarkMode && "shadow-lg shadow-primary/20"
                  )}
                >
                  {saving ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Lưu thông tin"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StaffManagement;
