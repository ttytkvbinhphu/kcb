import React, { useState, useEffect, useRef } from 'react';
import { User, Shield, BadgeCheck, Save, ArrowLeft, Loader2, CheckCircle2, Heart, MessageSquare, Send, ImageIcon, Trash2, Share2, Clock, Pencil, X, Globe, Lock, Check, Phone } from 'lucide-react';
import { cn, getBustedPhotoURL } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { db, doc, setDoc, collection, query, orderBy, onSnapshot, deleteDoc, updateDoc, increment, where, addDoc } from '../firebase';
import ConfirmModal from './ConfirmModal';

interface Comment {
  id: string;
  postId: string;
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: any;
}

interface Post {
  id: string;
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  imageUrl?: string;
  createdAt: any;
  likesCount: number;
  commentsCount: number;
  color?: string;
  textStyle?: string;
  backgroundImage?: string;
}

interface UserProfileFetch extends UserProfile {
  lastSeen?: any;
}

interface SocialWallProps {
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  isDarkMode: boolean;
  onBack?: () => void;
  initialTab?: 'feed' | 'profile';
  onSyncProfile?: () => Promise<void>;
  featureSettings?: any;
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

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  isDarkMode: boolean;
  newPostContent: string;
  setNewPostContent: (content: string) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  selectedTextStyle: string;
  setSelectedTextStyle: (style: string) => void;
  selectedBackgroundImage: string | null;
  setSelectedBackgroundImage: (url: string | null) => void;
  handleSavePost: () => Promise<void>;
  isPosting: boolean;
  colors: any[];
  isEditMode?: boolean;
}

const PostModal: React.FC<PostModalProps> = ({
  isOpen, onClose, userProfile, isDarkMode, 
  newPostContent, setNewPostContent, 
  selectedColor, setSelectedColor,
  selectedTextStyle, setSelectedTextStyle,
  selectedBackgroundImage, setSelectedBackgroundImage,
  handleSavePost, isPosting, colors,
  isEditMode = false
}) => {
  const textStyles = [
    { id: 'modern', name: 'Hiện đại', class: 'font-sans' },
    { id: 'serif', name: 'Trang trọng', class: 'font-serif' },
    { id: 'mono', name: 'Kỹ thuật', class: 'font-mono' },
    { id: 'bold', name: 'Mạnh mẽ', class: 'font-black uppercase tracking-wider' },
  ];

  const backgroundImages = [
    { id: 'none', url: null, name: 'Mặc định' },
    { id: 'medical', url: 'https://images.unsplash.com/photo-1576091160550-217359f42f8c?auto=format&fit=crop&q=80&w=800', name: 'Y tế' },
    { id: 'abstract', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=800', name: 'Trừu tượng' },
    { id: 'nature', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=800', name: 'Thiên nhiên' },
    { id: 'dark-geo', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800', name: 'Tối' },
  ];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const activeStyleClass = textStyles.find(s => s.id === selectedTextStyle)?.class;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed inset-0 sm:inset-4 sm:top-12 z-[101] flex flex-col rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl",
              isDarkMode ? "bg-slate-900" : "bg-white"
            )}
          >
            {/* Header */}
            <div className={cn(
              "px-6 py-4 flex items-center justify-between border-b shrink-0",
              isDarkMode ? "border-slate-800" : "border-slate-100"
            )}>
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 transition-colors">
                  <X size={20} />
                </button>
                <h3 className="text-sm font-black uppercase tracking-wider">{isEditMode ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}</h3>
              </div>
              <button
                onClick={handleSavePost}
                disabled={isPosting || !newPostContent.trim()}
                className={cn(
                  "px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50",
                  isDarkMode ? "bg-primary text-white" : "bg-slate-900 text-white shadow-lg"
                )}
              >
                {isPosting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {isEditMode ? 'Lưu' : 'Đăng bài'}
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div 
                className={cn(
                  "w-full min-h-[40vh] p-4 sm:p-12 flex flex-col items-center justify-center relative transition-all duration-500",
                  isDarkMode ? "bg-slate-950" : "bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3 mb-6 absolute top-4 left-4 sm:top-8 sm:left-8">
                   <div className={cn(
                     "w-10 h-10 rounded-xl overflow-hidden border-2 flex items-center justify-center transition-colors",
                     isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100 shadow-sm"
                   )}>
                     {userProfile.photoURL ? (
                       <img src={getBustedPhotoURL(userProfile.photoURL, userProfile.photoSyncToken)} alt={userProfile.displayName} className="w-full h-full object-cover" />
                     ) : (
                       <User size={20} className="text-slate-400" />
                     )}
                   </div>
                   <div className="text-left">
                     <p className={cn("font-black text-sm", isDarkMode ? "text-white" : "text-slate-900")}>
                       {userProfile.displayName}
                     </p>
                     <p className={cn("text-[10px] font-bold uppercase tracking-widest flex items-center gap-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                       <Globe size={10} /> Công khai
                     </p>
                   </div>
                </div>

                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Nội dung bài viết..."
                  className={cn(
                    "w-full max-w-full bg-transparent border-none focus:ring-0 text-center resize-none placeholder:opacity-50 transition-all text-xl sm:text-3xl font-medium",
                    activeStyleClass,
                    isDarkMode ? "text-white" : "text-slate-900"
                  )}
                  rows={6}
                />
              </div>

              {/* Toolbar */}
              <div className="p-6 sm:p-10 space-y-8">
                {/* Text Styles */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Phong cách văn bản</h4>
                  <div className="flex flex-wrap gap-2">
                    {textStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedTextStyle(style.id)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2",
                          selectedTextStyle === style.id
                            ? "bg-primary border-primary text-white shadow-md scale-105"
                            : (isDarkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200")
                        )}
                      >
                        {style.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const HighlightText: React.FC<{ text: string; search: string; className?: string }> = ({ text, search, className }) => {
  if (!search?.trim()) return <span className={className}>{text}</span>;
  
  const parts = text.split(new RegExp(`(${search})`, 'gi'));
  return (
    <span className={className}>
      {parts.map((part, i) => 
        part.toLowerCase() === search.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/30 text-slate-900 dark:text-white rounded-sm px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

const SocialWall: React.FC<SocialWallProps> = ({ userProfile, setUserProfile, isDarkMode, onBack, initialTab = 'feed', onSyncProfile, featureSettings = {} }) => {
  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'profile'>(initialTab);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  const [selectedColor, setSelectedColor] = useState('slate');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [selectedProfile, setSelectedProfile] = useState<UserProfile>(userProfile);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; postId: string | null; commentId?: string | null }>({
    isOpen: false,
    postId: null,
    commentId: null
  });

  const colors = [
    { name: 'indigo', bg: 'bg-indigo-500', light: 'bg-indigo-50', dark: 'bg-indigo-900/20' },
    { name: 'emerald', bg: 'bg-emerald-500', light: 'bg-emerald-50', dark: 'bg-emerald-900/20' },
    { name: 'rose', bg: 'bg-rose-500', light: 'bg-rose-50', dark: 'bg-rose-900/20' },
    { name: 'amber', bg: 'bg-amber-500', light: 'bg-amber-50', dark: 'bg-amber-900/20' },
    { name: 'cyan', bg: 'bg-cyan-500', light: 'bg-cyan-50', dark: 'bg-cyan-900/20' },
    { name: 'slate', bg: 'bg-slate-500', light: 'bg-slate-50', dark: 'bg-slate-900/20' },
  ];
  
  const [editName, setEditName] = useState(userProfile.displayName);
  const [editTitle, setEditTitle] = useState(userProfile.title || '');
  const [editPosition, setEditPosition] = useState(userProfile.position || '');
  const [editSpecialty, setEditSpecialty] = useState(userProfile.specialty || '');
  const [editDepartment, setEditDepartment] = useState(userProfile.department || '');
  const [editZalo, setEditZalo] = useState(userProfile.zaloNumber || '');
  const [hideEmail, setHideEmail] = useState(userProfile.hideEmail || false);
  const [hideZalo, setHideZalo] = useState(userProfile.hideZalo || false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTextStyle, setSelectedTextStyle] = useState('modern');
  const [selectedBackgroundImage, setSelectedBackgroundImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const isBanned = (featureSettings.bannedUsers || []).includes(userProfile.uid);
  const canPost = !isBanned && (
    (featureSettings.postingAllowedRoles || []).length === 0 || 
    (featureSettings.postingAllowedRoles || []).includes(userProfile.role) ||
    userProfile.role === 'admin'
  );
  const canComment = !isBanned && (
    (featureSettings.commentingAllowedRoles || []).length === 0 || 
    (featureSettings.commentingAllowedRoles || []).includes(userProfile.role) ||
    userProfile.role === 'admin'
  );
  const isModerator = (featureSettings.moderatorRoles || []).includes(userProfile.role) || userProfile.role === 'admin';

  useEffect(() => {
    if (isEditingProfile) {
      setEditName(userProfile.displayName || '');
      setEditTitle(userProfile.title || '');
      setEditPosition(userProfile.position || '');
      setEditSpecialty(userProfile.specialty || '');
      setEditDepartment(userProfile.department || '');
      setEditZalo(userProfile.zaloNumber || '');
      setHideEmail(userProfile.hideEmail || false);
      setHideZalo(userProfile.hideZalo || false);
    }
  }, [isEditingProfile, userProfile]);

  // Sync selectedProfile when userProfile changes (e.g. after sync with Google)
  useEffect(() => {
    if (selectedProfile.uid === userProfile.uid) {
      setSelectedProfile(userProfile);
    }
  }, [userProfile, selectedProfile.uid]);

  useEffect(() => {
    const q = query(collection(db, 'social_posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
    }, (error) => {
      console.error("Error fetching social posts:", error);
      // We don't use handleFirestoreError here to avoid blocking the whole Social Wall if rules are still propagating
    });

    const likesUnsub = onSnapshot(collection(db, 'social_likes'), (snapshot) => {
      const likes: Record<string, boolean> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.userId === userProfile.uid) {
          likes[data.postId] = true;
        }
      });
      setUserLikes(likes);
    }, (error) => {
      console.error("Error fetching social likes:", error);
    });

    const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      console.error("Error fetching users for social wall:", error);
    });

    return () => {
      unsubscribe();
      likesUnsub();
      usersUnsub();
    };
  }, [userProfile.uid]);

  const handleSavePost = async () => {
    if (!newPostContent.trim()) return;
    setIsPosting(true);
    try {
      if (editingPostId) {
        // Update existing post
        await updateDoc(doc(db, 'social_posts', editingPostId), {
          content: newPostContent,
          color: selectedColor,
          textStyle: selectedTextStyle,
          backgroundImage: selectedBackgroundImage,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Create new post
        const postsRef = collection(db, 'social_posts');
        const newPostRef = doc(postsRef);
        const postId = newPostRef.id;

        await setDoc(newPostRef, {
          id: postId,
          authorUid: userProfile.uid,
          authorName: userProfile.displayName,
          authorPhoto: userProfile.photoURL || '',
          content: newPostContent,
          createdAt: new Date().toISOString(),
          likesCount: 0,
          commentsCount: 0,
          color: selectedColor,
          textStyle: selectedTextStyle,
          backgroundImage: selectedBackgroundImage
        });
      }
      
      // Reset state and close modal
      setNewPostContent('');
      setSelectedColor('slate');
      setSelectedTextStyle('modern');
      setSelectedBackgroundImage(null);
      setEditingPostId(null);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Error saving post:", error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    const likeId = `${userProfile.uid}_${postId}`;
    const likeRef = doc(db, 'social_likes', likeId);
    const postRef = doc(db, 'social_posts', postId);

    try {
      if (userLikes[postId]) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
      } else {
        await setDoc(likeRef, {
          id: likeId,
          userId: userProfile.uid,
          postId: postId,
          createdAt: new Date().toISOString()
        });
        await updateDoc(postRef, { likesCount: increment(1) });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.commentId && deleteConfirm.postId) {
      try {
        await deleteDoc(doc(db, 'social_comments', deleteConfirm.commentId));
        const postRef = doc(db, 'social_posts', deleteConfirm.postId);
        await updateDoc(postRef, {
          commentsCount: increment(-1)
        });
        setDeleteConfirm({ isOpen: false, postId: null, commentId: null });
      } catch (error) {
        console.error("Error deleting comment:", error);
      }
      return;
    }

    if (!deleteConfirm.postId) return;
    try {
      await deleteDoc(doc(db, 'social_posts', deleteConfirm.postId));
      setDeleteConfirm({ isOpen: false, postId: null, commentId: null });
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };


  const handleSaveProfile = async () => {
    setSaveLoading(true);
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      const updatedProfile: UserProfile = {
        ...userProfile,
        displayName: editName,
        title: editTitle,
        position: editPosition,
        specialty: editSpecialty,
        department: editDepartment,
        zaloNumber: editZalo,
        hideEmail: hideEmail,
        hideZalo: hideZalo,
      };
      await setDoc(userRef, updatedProfile);
      setUserProfile(updatedProfile);
      setShowSuccess(true);
      setIsEditingProfile(false);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Save profile error:", error);
    } finally {
      setSaveLoading(false);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleViewProfile = (profile: UserProfile) => {
    setSelectedProfile(profile);
    setIsEditingProfile(false);
    setActiveSubTab('profile');
  };



  const renderPost = (post: Post) => {
    const authorProfile = allUsers.find(u => u.uid === post.authorUid);
    const authorPhoto = getBustedPhotoURL(authorProfile?.photoURL || post.authorPhoto, authorProfile?.photoSyncToken);
    const authorName = authorProfile?.displayName || post.authorName;

    const textStyles = [
      { id: 'modern', name: 'Hiện đại', class: 'font-sans' },
      { id: 'serif', name: 'Trang trọng', class: 'font-serif' },
      { id: 'mono', name: 'Kỹ thuật', class: 'font-mono' },
      { id: 'bold', name: 'Mạnh mẽ', class: 'font-black uppercase tracking-wider' },
    ];

    const backgroundImages = [
      { id: 'none', url: null, name: 'Mặc định' },
      { id: 'medical', url: 'https://images.unsplash.com/photo-1576091160550-217359f42f8c?auto=format&fit=crop&q=80&w=800', name: 'Y tế' },
      { id: 'abstract', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=800', name: 'Trừu tượng' },
      { id: 'nature', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=800', name: 'Thiên nhiên' },
      { id: 'dark-geo', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800', name: 'Tối' },
    ];

    const postColorData = post.color ? colors.find(c => c.name === post.color) : null;
    const styleData = textStyles.find(s => s.id === post.textStyle);

    return (
      <motion.div
        key={post.id}
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "p-4 sm:p-6 rounded-none sm:rounded-[32px] border-x-0 sm:border border-y sm:border-y shadow-sm group transition-all relative overflow-hidden",
          post.backgroundImage 
            ? "text-white min-h-[200px] flex flex-col justify-between" 
            : (post.color 
                ? (isDarkMode 
                    ? `${postColorData?.dark} border-${post.color}-500/30` 
                    : `${postColorData?.light} border-${post.color}-100`)
                : (isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"))
        )}
        style={post.backgroundImage ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${post.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (authorProfile) handleViewProfile(authorProfile);
              }}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all overflow-hidden shrink-0 hover:ring-2 hover:ring-primary/50",
                isDarkMode ? "bg-slate-800 text-slate-600" : "bg-slate-100 text-slate-400"
              )}
            >
              {authorPhoto ? (
                <img src={authorPhoto} alt={authorName} className="w-full h-full border-none object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={20} />
              )}
            </button>
            <div>
              <button 
                onClick={() => {
                  if (authorProfile) handleViewProfile(authorProfile);
                }}
                className={cn("font-black text-sm text-left hover:text-primary transition-colors", isDarkMode ? "text-white" : "text-slate-900")}
              >
                <HighlightText text={authorName} search={searchTerm} />
              </button>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <Clock size={10} />
              {new Date(post.createdAt).toLocaleString('vi-VN')}
            </div>
          </div>
        </div>
        {(post.authorUid === userProfile.uid || isModerator) && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {post.authorUid === userProfile.uid && (
              <button 
                onClick={() => {
                  setEditingPostId(post.id);
                  setNewPostContent(post.content);
                  setSelectedColor(post.color || 'slate');
                  setSelectedTextStyle(post.textStyle || 'modern');
                  setSelectedBackgroundImage(post.backgroundImage || null);
                  setIsCreateModalOpen(true);
                }}
                className="p-2 rounded-lg hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-500 transition-colors"
              >
                <Pencil size={16} />
              </button>
            )}
            <button 
              onClick={() => setDeleteConfirm({ isOpen: true, postId: post.id, commentId: null })}
              className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Post Content */}
      <p className={cn(
        "text-sm leading-relaxed mb-6 whitespace-pre-wrap", 
        styleData?.class,
        post.backgroundImage ? "text-white text-lg font-bold drop-shadow-md" : (isDarkMode ? "text-slate-300" : "text-slate-600")
      )}>
        <HighlightText text={post.content} search={searchTerm} />
      </p>

      <div className={cn(
        "flex items-center gap-6 pt-4 border-t transition-colors",
        post.backgroundImage ? "border-white/20" : (isDarkMode ? "border-slate-800" : "border-slate-100")
      )}>
        <button 
          onClick={() => handleLike(post.id)}
          className={cn(
            "flex items-center gap-2 text-xs font-black transition-colors",
            userLikes[post.id] ? "text-rose-500" : "text-slate-400 hover:text-rose-500"
          )}
        >
          <Heart size={18} fill={userLikes[post.id] ? "currentColor" : "none"} />
          <span>{post.likesCount}</span>
        </button>
        <button 
          onClick={() => toggleComments(post.id)}
          className={cn(
            "flex items-center gap-2 text-xs font-black transition-colors",
            expandedComments[post.id] ? "text-primary" : "text-slate-400 hover:text-primary"
          )}
        >
          <MessageSquare size={18} fill={expandedComments[post.id] ? "currentColor" : "none"} />
          <span>{post.commentsCount}</span>
        </button>
        <button className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-indigo-500 transition-colors ml-auto">
          <Share2 size={18} />
        </button>
      </div>

      <AnimatePresence>
        {expandedComments[post.id] && (
          <CommentSection 
            postId={post.id} 
            userProfile={userProfile} 
            isDarkMode={isDarkMode} 
            postAuthorUid={post.authorUid}
            onDeleteComment={(commentId) => setDeleteConfirm({ 
              isOpen: true, 
              postId: post.id, 
              commentId: commentId 
            })}
            allUsers={allUsers}
            canComment={canComment}
            isModerator={isModerator}
            searchTerm={searchTerm}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

  return (
    <div className="w-full p-0 lg:p-4">
      {/* Header */}
      <div className="hidden lg:flex items-center justify-between gap-8 mb-8">
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 rounded-xl transition-colors lg:hidden hover:bg-slate-100 text-slate-500"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all bg-indigo-50 border border-indigo-100">
              <MessageSquare size={24} style={{ color: '#000000' }} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">
                {activeSubTab === 'feed' ? 'Mạng xã hội' : (selectedProfile.uid === userProfile.uid ? 'Trang cá nhân' : 'Hồ sơ đồng nghiệp')}
              </h2>
              <p className="font-bold text-[10px] uppercase tracking-[0.2em] text-slate-400">
                {activeSubTab === 'feed' ? 'Bản tin y tế nội bộ' : (selectedProfile.uid === userProfile.uid ? userProfile.displayName : selectedProfile.displayName)}
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Search Bar */}
        <div className="flex-1 max-w-md relative group ml-auto">
          <div className={cn(
            "absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors",
            isDarkMode ? "text-slate-600 group-focus-within:text-primary" : "text-slate-400 group-focus-within:text-primary"
          )}>
            <Globe size={18} className="animate-pulse" />
          </div>
          <input 
            type="text"
            placeholder="Tìm kiếm bài viết, bình luận..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "w-full pl-12 pr-4 py-3.5 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all font-bold text-sm shadow-sm",
              isDarkMode ? "bg-slate-900 text-white placeholder:text-slate-600" : "bg-white text-slate-900 placeholder:text-slate-400"
            )}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-rose-500 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 pb-8">
          {/* Mobile Search Bar */}
          <div className="lg:hidden mb-6 relative group">
            <div className={cn(
              "absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors",
              isDarkMode ? "text-slate-600 group-focus-within:text-primary" : "text-slate-400 group-focus-within:text-primary"
            )}>
              <Globe size={18} className="animate-pulse" />
            </div>
            <input 
              type="text"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                "w-full pl-12 pr-4 py-4 rounded-[24px] border-none focus:ring-2 focus:ring-primary transition-all font-bold text-sm shadow-sm",
                isDarkMode ? "bg-slate-900 text-white placeholder:text-slate-600" : "bg-white text-slate-900 placeholder:text-slate-400"
              )}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-rose-500 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {activeSubTab === 'feed' ? (
              <motion.div
                key="feed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Posts List */}
                <div className="space-y-6">
                  {posts
                    .filter(post => 
                      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      post.authorName.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(renderPost)}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                <div className="space-y-6">
                  <div className={cn(
                    "p-8 rounded-[32px] border flex flex-col items-center text-center relative overflow-hidden",
                    isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-sm"
                  )}>
                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-primary/20 to-indigo-500/20" />
                    <div className="relative mb-6 mt-4">
                      <div className={cn(
                        "w-32 h-32 rounded-[40px] border-4 flex items-center justify-center overflow-hidden shadow-xl transition-colors",
                        isDarkMode ? "bg-slate-800 border-slate-900" : "bg-slate-100 border-white shadow-slate-200"
                      )}>
                        {selectedProfile.photoURL ? (
                          <img 
                            src={getBustedPhotoURL(selectedProfile.photoURL, selectedProfile.photoSyncToken)} 
                            alt={selectedProfile.displayName} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          <User size={64} className={cn("transition-colors", isDarkMode ? "text-slate-700" : "text-slate-200")} />
                        )}
                      </div>
                      {selectedProfile.role === 'admin' && (
                        <div className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-2xl shadow-lg">
                          <Shield size={20} />
                        </div>
                      )}
                    </div>
                    <h3 className={cn("text-2xl font-black mb-1", isDarkMode ? "text-white" : "text-slate-900")}>
                      {selectedProfile.displayName}
                    </h3>
                    <p className="text-sm font-bold text-primary mb-2 uppercase tracking-wider">
                      {selectedProfile.title || 'Thành viên'}
                    </p>
                    <div className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mt-2",
                      isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-50 text-slate-400"
                    )}>
                      <BadgeCheck size={12} className="text-emerald-500" />
                      {selectedProfile.department || 'Chưa cập nhật'}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  {selectedProfile.uid === userProfile.uid && isEditingProfile ? (
                    <div className={cn(
                      "p-8 rounded-[32px] border",
                      isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-sm"
                    )}>
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Chỉnh sửa thông tin</h4>
                          <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">Cập nhật thông tin cá nhân của bạn</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {onSyncProfile && (
                            <button
                              onClick={async () => {
                                setSaveLoading(true);
                                await onSyncProfile();
                                setSaveLoading(false);
                              }}
                              disabled={saveLoading}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                isDarkMode ? "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                              )}
                              title="Cập nhật tên và ảnh từ tài khoản Google"
                            >
                              <Globe size={14} />
                              Làm mới từ Google
                            </button>
                          )}
                          <button 
                            onClick={() => setIsEditingProfile(false)}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Họ và tên</label>
                          <input 
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className={cn(
                              "w-full px-4 py-3 rounded-2xl border font-bold focus:ring-2 focus:ring-primary transition-all",
                              isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Học hàm/Học vị</label>
                          <input 
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className={cn(
                              "w-full px-4 py-3 rounded-2xl border font-bold focus:ring-2 focus:ring-primary transition-all",
                              isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Khoa/Phòng</label>
                          <input 
                            type="text"
                            value={editDepartment}
                            onChange={(e) => setEditDepartment(e.target.value)}
                            className={cn(
                              "w-full px-4 py-3 rounded-2xl border font-bold focus:ring-2 focus:ring-primary transition-all",
                              isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            Số Zalo
                            <span className="text-[10px] font-bold text-slate-500 normal-case">(Tùy chọn)</span>
                          </label>
                          <input 
                            type="text"
                            value={editZalo}
                            onChange={(e) => setEditZalo(e.target.value)}
                            placeholder="Nhập số điện thoại Zalo..."
                            className={cn(
                              "w-full px-4 py-3 rounded-2xl border font-bold focus:ring-2 focus:ring-primary transition-all",
                              isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-100 text-slate-900"
                            )}
                          />
                        </div>
                      </div>

                      <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cài đặt riêng tư</h4>
                            <p className="text-[9px] text-slate-500 font-bold mt-1">Lựa chọn thông tin bạn muốn hiển thị công khai</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                            hideEmail 
                              ? "border-primary bg-primary/5 shadow-sm" 
                              : (isDarkMode ? "border-slate-800 bg-slate-900/50 hover:border-slate-700" : "border-slate-100 bg-slate-50 hover:bg-slate-100")
                          )}>
                             <div className="flex items-center gap-3">
                               <div className={cn(
                                 "p-2 rounded-lg transition-colors", 
                                 hideEmail ? "bg-primary text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                               )}>
                                 {hideEmail ? <Lock size={14} /> : <Globe size={14} />}
                               </div>
                               <div>
                                 <p className="text-[11px] font-black uppercase tracking-wider">Email liên hệ</p>
                                 <p className="text-[9px] font-bold text-slate-500 mt-0.5">
                                   {hideEmail ? 'Đang ẩn với mọi người' : 'Đang công khai'}
                                 </p>
                               </div>
                             </div>
                             <input 
                               type="checkbox"
                               checked={hideEmail}
                               onChange={(e) => setHideEmail(e.target.checked)}
                               className="sr-only"
                             />
                             <div className={cn(
                               "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                               hideEmail 
                                 ? "bg-primary border-primary" 
                                 : "border-slate-300 dark:border-slate-700 group-hover:border-primary/50"
                             )}>
                               {hideEmail && <Check size={12} className="text-white" />}
                             </div>
                          </label>

                          <label className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                            hideZalo 
                              ? "border-primary bg-primary/5 shadow-sm" 
                              : (isDarkMode ? "border-slate-800 bg-slate-900/50 hover:border-slate-700" : "border-slate-100 bg-slate-50 hover:bg-slate-100")
                          )}>
                             <div className="flex items-center gap-3">
                               <div className={cn(
                                 "p-2 rounded-lg transition-colors", 
                                 hideZalo ? "bg-primary text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                               )}>
                                 {hideZalo ? <Lock size={14} /> : <Globe size={14} />}
                               </div>
                               <div>
                                 <p className="text-[11px] font-black uppercase tracking-wider">Số Zalo / SĐT</p>
                                 <p className="text-[9px] font-bold text-slate-500 mt-0.5">
                                   {hideZalo ? 'Đang ẩn với mọi người' : 'Đang công khai'}
                                 </p>
                               </div>
                             </div>
                             <input 
                               type="checkbox"
                               checked={hideZalo}
                               onChange={(e) => setHideZalo(e.target.checked)}
                               className="sr-only"
                             />
                             <div className={cn(
                               "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                               hideZalo 
                                 ? "bg-primary border-primary" 
                                 : "border-slate-300 dark:border-slate-700 group-hover:border-primary/50"
                             )}>
                               {hideZalo && <Check size={12} className="text-white" />}
                             </div>
                          </label>
                        </div>
                      </div>
                      <div className="mt-10 flex items-center justify-end gap-4">
                        <button
                          onClick={() => setIsEditingProfile(false)}
                          className={cn(
                            "px-6 py-4 rounded-2xl font-black text-sm transition-all text-slate-500 hover:text-rose-500"
                          )}
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          disabled={saveLoading}
                          className={cn(
                            "px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-xl",
                            isDarkMode ? "bg-primary text-white" : "bg-slate-900 text-white shadow-slate-200"
                          )}
                        >
                          {saveLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          Lưu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={cn(
                      "p-8 rounded-[32px] border relative",
                      isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-sm"
                    )}>
                      {selectedProfile.uid === userProfile.uid && (
                        <button 
                          onClick={() => setIsEditingProfile(true)}
                          className={cn(
                            "absolute top-6 right-6 p-3 rounded-2xl transition-all shadow-sm flex items-center gap-2 text-xs font-black uppercase tracking-wider",
                            isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-50 text-slate-600 hover:bg-slate-100 whitespace-nowrap"
                          )}
                        >
                          <Pencil size={14} />
                          Chỉnh sửa
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 font-mono">Thông tin cơ bản</h4>
                          <div className="space-y-5">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Họ và tên</p>
                              <p className={cn("text-base font-black mt-1", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                                {selectedProfile.displayName}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học hàm/Học vị</p>
                              <p className={cn("text-sm font-black mt-1", isDarkMode ? "text-slate-200" : "text-slate-900")}>
                                {selectedProfile.title || 'Chưa cập nhật'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Khoa/Phòng</p>
                              <p className={cn("text-sm font-black mt-1", isDarkMode ? "text-slate-200" : "text-slate-900")}>
                                {selectedProfile.department || 'Chưa cập nhật'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 font-mono">Chuyên môn & Liên hệ</h4>
                          <div className="space-y-5">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chức vụ</p>
                              <p className={cn("text-sm font-black mt-1", isDarkMode ? "text-slate-200" : "text-slate-900")}>
                                {selectedProfile.position || 'Chưa cập nhật'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chuyên khoa</p>
                              <p className={cn("text-sm font-black mt-1", isDarkMode ? "text-slate-200" : "text-slate-900")}>
                                {selectedProfile.specialty || 'Chưa cập nhật'}
                              </p>
                            </div>

                            {(!selectedProfile.hideEmail || selectedProfile.uid === userProfile.uid) && (
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                  Email công vụ
                                  {selectedProfile.hideEmail && selectedProfile.uid === userProfile.uid && (
                                    <span className="text-[8px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 lowercase flex items-center gap-1">
                                      <Lock size={8} /> Đang ẩn
                                    </span>
                                  )}
                                </p>
                                <p className={cn("text-sm font-black mt-1 truncate transition-opacity", !selectedProfile.hideEmail ? "opacity-100" : "opacity-50", isDarkMode ? "text-slate-200" : "text-slate-900")}>
                                  {selectedProfile.email}
                                </p>
                              </div>
                            )}

                            {selectedProfile.zaloNumber && (!selectedProfile.hideZalo || selectedProfile.uid === userProfile.uid) && (
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                  Số Zalo / SĐT
                                  {selectedProfile.hideZalo && selectedProfile.uid === userProfile.uid && (
                                    <span className="text-[8px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 lowercase flex items-center gap-1">
                                      <Lock size={8} /> Đang ẩn
                                    </span>
                                  )}
                                </p>
                                <div className={cn("flex items-center gap-2 mt-1 transition-opacity", !selectedProfile.hideZalo ? "opacity-100" : "opacity-50")}>
                                  <div className="p-1.5 bg-indigo-500 text-white rounded-lg">
                                    <Phone size={10} />
                                  </div>
                                  <p className={cn("text-sm font-black", isDarkMode ? "text-slate-200" : "text-slate-900")}>
                                    {selectedProfile.zaloNumber}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {showSuccess && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute bottom-6 right-6 flex items-center gap-2 text-emerald-500 font-bold text-sm bg-emerald-500/10 px-4 py-2 rounded-xl"
                        >
                          <CheckCircle2 size={18} />
                          Cập nhật thành công
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* User's Posts Section */}
                  <div className="mt-8 space-y-6">
                    <div className="flex items-center gap-3 mb-4 pl-4">
                      {selectedProfile.uid === userProfile.uid ? (
                        <MessageSquare size={18} className="text-primary" />
                      ) : (
                        <Clock size={18} className="text-primary" />
                      )}
                      <h3 className={cn("text-lg font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-800")}>
                        {selectedProfile.uid === userProfile.uid ? 'Dòng trạng thái của bạn' : `Hoạt động của ${selectedProfile.displayName}`}
                      </h3>
                      <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 ml-2" />
                    </div>
                    
                    <div className="space-y-6">
                      {posts.filter(p => p.authorUid === selectedProfile.uid).length === 0 ? (
                        <div className={cn(
                          "p-12 rounded-[32px] border border-dashed text-center",
                          isDarkMode ? "border-slate-800" : "border-slate-200"
                        )}>
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                            {selectedProfile.uid === userProfile.uid ? 'Bạn chưa có bài đăng nào' : 'Người dùng này chưa có bài đăng nào'}
                          </p>
                        </div>
                      ) : (
                        posts.filter(p => p.authorUid === selectedProfile.uid).map(renderPost)
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Sidebar - Active Members */}
        <div className="hidden lg:block space-y-6">
          <div className={cn(
            "p-6 rounded-[32px] border sticky top-8",
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
          )}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={cn("text-xs font-black uppercase tracking-[0.2em]", isDarkMode ? "text-slate-400" : "text-slate-500")}>Thành viên</h3>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-wider">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                {allUsers.length}
              </div>
            </div>
            
            <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar pr-2">
              {allUsers.map((user) => (
                <button 
                  key={user.uid} 
                  onClick={() => handleViewProfile(user)}
                  className="w-full flex items-center gap-3 group text-left transition-all hover:translate-x-1"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 overflow-hidden group-hover:ring-2 group-hover:ring-primary/50",
                    isDarkMode ? "bg-slate-800 text-slate-600" : "bg-slate-50 text-slate-300"
                  )}>
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={20} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={cn("text-[13px] font-bold truncate group-hover:text-primary transition-colors", isDarkMode ? "text-slate-200" : "text-slate-900")}>
                      {user.displayName}
                    </h4>
                    <p className="text-[10px] font-medium text-slate-500 truncate uppercase tracking-wider">
                      {user.title || 'Thành viên'}
                    </p>
                  </div>
                  {user.role === 'admin' && (
                    <Shield size={14} className="text-primary ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
            
            <div className={cn(
              "mt-6 pt-6 border-t text-center",
              isDarkMode ? "border-slate-800" : "border-slate-50"
            )}>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cộng đồng Bình Phú</p>
            </div>
          </div>
        </div>
      </div>

      <PostModal 
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingPostId(null);
          setNewPostContent('');
          setSelectedColor('slate');
          setSelectedTextStyle('modern');
          setSelectedBackgroundImage(null);
        }}
        userProfile={userProfile}
        isDarkMode={isDarkMode}
        newPostContent={newPostContent}
        setNewPostContent={setNewPostContent}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        selectedTextStyle={selectedTextStyle}
        setSelectedTextStyle={setSelectedTextStyle}
        selectedBackgroundImage={selectedBackgroundImage}
        setSelectedBackgroundImage={setSelectedBackgroundImage}
        handleSavePost={handleSavePost}
        isPosting={isPosting}
        colors={colors}
        isEditMode={!!editingPostId}
      />

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, postId: null, commentId: null })}
        onConfirm={handleDeleteConfirm}
        title={deleteConfirm.commentId ? "Xóa bình luận" : "Xóa bài viết"}
        message={deleteConfirm.commentId 
          ? "Bạn có chắc chắn muốn xóa bình luận này? Hành động này không thể hoàn tác."
          : "Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác."
        }
        confirmText="Xác nhận xóa"
        cancelText="Quay lại"
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

interface CommentSectionProps {
  postId: string;
  userProfile: UserProfile;
  isDarkMode: boolean;
  postAuthorUid: string;
  onDeleteComment: (commentId: string) => void;
  allUsers: UserProfile[];
  canComment: boolean;
  isModerator: boolean;
  searchTerm?: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ postId, userProfile, isDarkMode, postAuthorUid, onDeleteComment, allUsers, canComment, isModerator, searchTerm = '' }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'social_comments'),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching social comments:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const commentRef = collection(db, 'social_comments');
      const newCommentDocRef = doc(commentRef);
      const commentId = newCommentDocRef.id;

      await setDoc(newCommentDocRef, {
        id: commentId,
        postId,
        authorUid: userProfile.uid,
        authorName: userProfile.displayName,
        authorPhoto: userProfile.photoURL || '',
        content: newComment,
        createdAt: new Date().toISOString()
      });

      const postRef = doc(db, 'social_posts', postId);
      await updateDoc(postRef, {
        commentsCount: increment(1)
      });

      setNewComment('');
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;
    try {
      await updateDoc(doc(db, 'social_comments', commentId), {
        content: editCommentContent
      });
      setEditingCommentId(null);
      setEditCommentContent('');
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800"
    >
      <div className="space-y-4 mb-6">
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 size={20} className="animate-spin text-slate-400" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Chưa có bình luận nào</p>
        ) : (
          comments.map((comment) => {
            const commenterProfile = allUsers.find(u => u.uid === comment.authorUid);
            const commenterPhoto = getBustedPhotoURL(commenterProfile?.photoURL || comment.authorPhoto, commenterProfile?.photoSyncToken);
            const commenterName = commenterProfile?.displayName || comment.authorName;

            return (
              <div key={comment.id} className="flex gap-3 group">
                <div className={cn(
                  "w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm border",
                  isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-white"
                )}>
                  {commenterPhoto ? (
                    <img src={commenterPhoto} alt={commenterName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <User size={14} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "p-3 rounded-2xl relative",
                    isDarkMode ? "bg-slate-800" : "bg-slate-50"
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <h5 className={cn("text-xs font-black", isDarkMode ? "text-slate-200" : "text-slate-900")}>
                        <HighlightText text={commenterName} search={searchTerm} />
                      </h5>
                      {(comment.authorUid === userProfile.uid || postAuthorUid === userProfile.uid || isModerator) && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {comment.authorUid === userProfile.uid && (
                            <button 
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditCommentContent(comment.content);
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-500 transition-all"
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                          <button 
                            onClick={() => onDeleteComment(comment.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <input
                          autoFocus
                          type="text"
                          value={editCommentContent}
                          onChange={(e) => setEditCommentContent(e.target.value)}
                          className={cn(
                            "w-full px-3 py-1.5 rounded-xl text-xs font-medium border focus:ring-2 focus:ring-primary transition-all",
                            isDarkMode ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-200 text-slate-900"
                          )}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingCommentId(null)}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={() => handleUpdateComment(comment.id)}
                            className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider"
                          >
                            Lưu
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={cn("text-[13px] leading-relaxed", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                        <HighlightText text={comment.content} search={searchTerm} />
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {new Date(comment.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {canComment ? (
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm border",
            isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-white"
          )}>
            {userProfile.photoURL ? (
              <img 
                src={getBustedPhotoURL(userProfile.photoURL, userProfile.photoSyncToken)} 
                alt={userProfile.displayName} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <User size={14} />
              </div>
            )}
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Viết bình luận..."
              className={cn(
                "w-full px-4 py-2 rounded-xl text-sm font-medium border-none focus:ring-2 focus:ring-primary transition-all shadow-inner",
                isDarkMode ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-900"
              )}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all active:scale-90 disabled:opacity-30",
                isDarkMode ? "text-primary hover:bg-primary/10" : "text-primary hover:bg-primary/5"
              )}
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </form>
      ) : (
        <div className={cn(
          "p-3 rounded-xl text-center border-none",
          isDarkMode ? "bg-slate-800/50" : "bg-slate-50"
        )}>
          <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-slate-500" : "text-slate-400")}>
            Bạn không có quyền bình luận
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default SocialWall;
