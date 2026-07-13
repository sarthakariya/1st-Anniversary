import { Search, Bell, Info, Play, X, ChevronRight, Check, Volume2, VolumeX, RefreshCw, Plus, ChevronDown, Settings, User, LogOut, Pencil, HelpCircle, Grid, PlusCircle, Trash2, Film, Pause, ThumbsUp, Download, RotateCcw, RotateCw } from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MAIN_FEATURE, MOVIE_CATEGORIES, PROFILES } from '../data';
import { Memory, Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import HelpCentre from './HelpCentre';
import AddMemoryModal from './AddMemoryModal';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

interface BrowseScreenProps {
  profile: Profile;
  isMorning: boolean;
  onSwitchProfile: (profile: Profile) => void;
  onSignOut: () => void;
}

// ==========================================
// THUMBNAILCARD COMPONENT (LIFECYCLE ENGINE)
// ==========================================
interface ThumbnailCardProps {
  key?: React.Key;
  memory: Memory;
  isMorning: boolean;
  onClick: () => void;
  onPauseBillboard: () => void;
  onResumeBillboard: () => void;
  isBillboardPlaying: boolean;
  setHoveredRowId: (id: string | null) => void;
  categoryId: string;
}

function ThumbnailCard({
  memory,
  isMorning,
  onClick,
  onPauseBillboard,
  onResumeBillboard,
  isBillboardPlaying,
  setHoveredRowId,
  categoryId,
}: ThumbnailCardProps) {
  const [isVideoMounted, setIsVideoMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Hanlde Hover Entry - Debounce 500ms
  const handleMouseEnter = () => {
    setIsHovered(true);
    // Release overflow clip to allow popup expansion
    setHoveredRowId(categoryId);

    // Proximity Hover Debounce Filter (Exactly 500ms)
    timerRef.current = setTimeout(() => {
      // Coordinated Media Handoff
      onPauseBillboard();
      setIsVideoMounted(true);
    }, 500);
  };

  // Handle Hover Exit - Safe Tear-down immediately
  const handleMouseLeave = () => {
    setIsHovered(false);
    setHoveredRowId(null); // Restore containment shield clipping

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isVideoMounted) {
      // Clean and tear down player code immediately to clear memory
      setIsVideoMounted(false);
      onResumeBillboard();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <motion.div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileHover={{
        scale: 1.15,
        y: -8,
        boxShadow: isMorning
          ? '0 10px 20px -3px rgba(0,0,0,0.15)'
          : '0 20px 40px -6px rgba(0,0,0,0.85)',
      }}
      transition={{ type: 'spring', stiffness: 350, damping: 24 }}
      className="flex-none w-[130px] sm:w-[200px] md:w-[245px] snap-center relative rounded-md bg-neutral-950 select-none z-10 hover:z-[60] hardware-accelerated"
    >
      <div className="aspect-video relative rounded-md overflow-hidden border border-transparent hover:border-white/25 transition-all duration-300">
        {/* Lightweight Static Placeholder Block */}
        <img
          src={memory.thumbnailUrl}
          alt={memory.title}
          className="w-full h-full object-cover select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />

        {/* Live Streaming Video Player Tracking Node */}
        <AnimatePresence>
          {isVideoMounted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="absolute inset-0 z-20 w-full h-full bg-black/95 pointer-events-none"
            >
              <video
                key={memory.videoUrl || 'placeholder'}
                src={memory.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-romantic-couple-by-the-lake-at-sunset-42907-large.mp4'}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
              <div className="absolute top-2 right-2 bg-red-600/90 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider font-mono shadow text-white">
                LIVE STREAM
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Meta popup metadata card styled inside absolute row boundaries */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.18 }}
            className={`absolute top-[96%] left-0 right-0 p-3 rounded-b-md shadow-lg z-50 border-t ${
              isMorning
                ? 'bg-[#f5f5f1] border-gray-200 text-gray-800'
                : 'bg-[#181818] border-neutral-800 text-white'
            }`}
          >
            <p className="text-[11px] font-bold tracking-tight uppercase line-clamp-1">{memory.title}</p>
            <div className="flex gap-1.5 items-center text-[9px] font-bold mt-1 opacity-90">
              <span className="text-[#46d369]">{memory.matchPercentage}% Match</span>
              <span>{memory.year}</span>
              <span className="px-1 border border-neutral-600 rounded-sm text-[8px] scale-90">{memory.maturityRating}</span>
              <span>{memory.duration}</span>
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {memory.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[8px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ==========================================
// MAIN BROWSE SCREEN COMPONENT
// ==========================================
export default function BrowseScreen({ profile, isMorning, onSwitchProfile, onSignOut }: BrowseScreenProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isHelpCentreOpen, setIsHelpCentreOpen] = useState(false);

  // States and Ref for modal video player & interactive downloading
  const [isModalMuted, setIsModalMuted] = useState(true);
  const [isModalPlaying, setIsModalPlaying] = useState(true);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  // Editing state for the modal Pencil button
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editMaturityRating, setEditMaturityRating] = useState('U/A 16+');
  const [editDuration, setEditDuration] = useState('');
  const [editCast, setEditCast] = useState('');
  const [editTags, setEditTags] = useState('');

  // Prefill edit states whenever selectedMemory changes
  useEffect(() => {
    if (selectedMemory) {
      setIsModalPlaying(true);
      setIsEditing(false);
      setEditTitle(selectedMemory.title || '');
      setEditDescription(selectedMemory.description || '');
      setEditYear(selectedMemory.year || '');
      setEditMaturityRating(selectedMemory.maturityRating || 'U/A 16+');
      setEditDuration(selectedMemory.duration || '');
      setEditCast(selectedMemory.cast ? selectedMemory.cast.join(', ') : '');
      setEditTags(selectedMemory.tags ? selectedMemory.tags.join(', ') : '');
    }
  }, [selectedMemory]);

  // Handle saving memory edits
  const handleSaveEdit = async () => {
    if (!selectedMemory) return;
    const updatedData = {
      title: editTitle,
      description: editDescription,
      year: editYear,
      maturityRating: editMaturityRating,
      duration: editDuration,
      cast: editCast.split(',').map(s => s.trim()).filter(Boolean),
      tags: editTags.split(',').map(s => s.trim()).filter(Boolean),
    };

    try {
      const isFirestore = firestoreMemories.some(m => m.id === selectedMemory.id);
      if (isFirestore) {
        const { updateDoc, doc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'memories', selectedMemory.id), updatedData);
        showToast("Memory details updated in real-time!", "success");
      } else {
        const { addDoc, collection } = await import('firebase/firestore');
        await addDoc(collection(db, 'memories'), {
          ...selectedMemory,
          ...updatedData,
          id: undefined // let Firestore assign its own ID
        });
        showToast("Memory saved to library database!", "success");
      }
      
      setSelectedMemory({
        ...selectedMemory,
        ...updatedData
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Save edit failed: ", err);
      showToast("Failed to save changes. Please try again.", "warn");
    }
  };

  // Download video handler (copies real video link, opens downloader website)
  const handleDownload = (videoUrl: string | undefined) => {
    const urlToCopy = videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-romantic-couple-by-the-lake-at-sunset-42907-large.mp4';
    
    let copied = false;
    
    // Attempt 1: Standard iframe-safe textarea selection fallback
    try {
      const textArea = document.createElement("textarea");
      textArea.value = urlToCopy;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      copied = document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (err) {
      console.error("Fallback execCommand copy failed:", err);
    }

    if (copied) {
      showToast("Copied video download link to clipboard!", "success");
    } else {
      // Attempt 2: Navigator Clipboard API
      if (navigator.clipboard) {
        navigator.clipboard.writeText(urlToCopy)
          .then(() => {
            showToast("Copied video download link to clipboard!", "success");
          })
          .catch((e) => {
            console.error("Clipboard API failed:", e);
            // Ultimate fallback for security locked browsers
            prompt("Could not auto-copy. Please copy the link below manually:", urlToCopy);
          });
      } else {
        prompt("Could not auto-copy. Please copy the link below manually:", urlToCopy);
      }
    }

    // Try to open downloader URL using safe element click (higher clearance for popup blockers)
    try {
      const link = document.createElement("a");
      link.href = "https://vidssave.com/youtube-video-downloader-7gt";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Simulated anchor click failed, falling back to window.open:", err);
      window.open("https://vidssave.com/youtube-video-downloader-7gt", "_blank");
    }
  };

  // Premium Custom Toast Notifications
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'success' | 'warn'; id: number } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type, id: Date.now() });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Clean toast timer on tear down
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Firestore Sync & Dynamic Playlist States
  const [firestoreMemories, setFirestoreMemories] = useState<Memory[]>([]);
  const [shuffledTopPicks, setShuffledTopPicks] = useState<Memory[]>([]);
  const [isAddMemoryOpen, setIsAddMemoryOpen] = useState(false);

  // Real-time Firestore Listener
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, 'memories'), (snapshot) => {
        const list: Memory[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            title: data.title || '',
            description: data.description || data.desc || '',
            thumbnailUrl: data.thumbnailUrl || data.thumbnail || 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=640&auto=format&fit=crop',
            videoUrl: data.videoUrl || '',
            matchPercentage: Number(data.matchPercentage || 98),
            year: data.year || '13-07-2026',
            duration: data.duration || '2h',
            maturityRating: data.maturityRating || data.rating || 'U/A 16+',
            cast: Array.isArray(data.cast) ? data.cast : ['Sia', 'Aman'],
            tags: Array.isArray(data.tags) ? data.tags : ['Family'],
          });
        });
        setFirestoreMemories(list);
      }, (error) => {
        console.error("Firestore listening error: ", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Failed to initialize Firestore listener:", e);
    }
  }, []);

  // Shuffling Helper
  const shuffleArray = useCallback(<T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  // Randomize Top Picks Logic
  const randomizeTopPicks = useCallback(() => {
    const allMemories = [
      ...firestoreMemories,
      ...MOVIE_CATEGORIES.flatMap(cat => cat.memories)
    ];
    // Remove duplicates by ID
    const uniqueMemories = Array.from(new Map(allMemories.map(m => [m.id, m])).values());
    const shuffled = shuffleArray(uniqueMemories);
    setShuffledTopPicks(shuffled.slice(0, 4));
  }, [firestoreMemories, shuffleArray]);

  // Initial and reactive randomization
  useEffect(() => {
    randomizeTopPicks();
  }, [firestoreMemories]);

  // Window Focus (tab return) listener
  useEffect(() => {
    const handleFocus = () => {
      randomizeTopPicks();
      showToast("Refreshed Curated Top Picks!", "success");
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [randomizeTopPicks]);

  // Billboard playback controls
  const [isBillboardPlaying, setIsBillboardPlaying] = useState(true);
  const billboardVideoRef = useRef<HTMLVideoElement | null>(null);

  // Overflow track management
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  // Theme support
  const bgColor = isMorning ? 'bg-[#f5f5f1]' : 'bg-[#141414]';
  const textColor = isMorning ? 'text-black' : 'text-white';
  const mutedTextColor = isMorning ? 'text-gray-700' : 'text-gray-300';
  const navBg = isMorning ? 'bg-[#f5f5f1]' : 'bg-[#141414]';
  const modalBg = isMorning ? 'bg-[#f5f5f1]' : 'bg-[#181818]';

  // Coordinated play mechanisms
  const handlePauseBillboard = () => {
    setIsBillboardPlaying(false);
    if (billboardVideoRef.current) {
      billboardVideoRef.current.pause();
    }
  };

  const handleResumeBillboard = () => {
    setIsBillboardPlaying(true);
    if (billboardVideoRef.current) {
      billboardVideoRef.current.play().catch(() => {});
    }
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll, { passive: true } as any);
  }, []);

  // Combine static and custom memories
  const categories = useMemo(() => {
    return MOVIE_CATEGORIES.map((cat) => {
      if (cat.id === 'top-picks') {
        return {
          ...cat,
          memories: shuffledTopPicks.length > 0 ? shuffledTopPicks : cat.memories
        };
      }
      if (cat.id === 'recent-additions') {
        return {
          ...cat,
          memories: [...firestoreMemories, ...cat.memories]
        };
      }
      return cat;
    });
  }, [shuffledTopPicks, firestoreMemories]);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    return categories.map((category) => {
      const filteredMemories = category.memories.filter(
        (m) =>
          m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      return { ...category, memories: filteredMemories };
    }).filter((c) => c.memories.length > 0);
  }, [categories, searchQuery]);

  // ==========================================
  // FRAMER MOTION TRANSITION VARIANTS
  // ==========================================

  // Row Lanes Cascade Stagger
  const laneContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.18, // Stagger interval top to bottom
        delayChildren: 0.12,
      },
    },
  };

  const laneItemVariants = {
    hidden: { opacity: 0, y: 35 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1], // fluid ease path
      },
    },
  };

  // Dropdown Stagger - Microscopic 15ms staggered entry delay
  const dropdownContainerVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.015, // Exact 15ms delay cascade downward
        delayChildren: 0.04,
      },
    },
    exit: {
      opacity: 0,
      y: 8,
      transition: { duration: 0.12 },
    },
  };

  const dropdownItemVariants = {
    hidden: { opacity: 0, y: -6 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 450, damping: 22 },
    },
  };

  return (
    // Homepage Dashboard Assembly Entrance: Glides up from viewport floor fading up over exactly 0.35s
    <motion.div
      initial={{ y: 95, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      className={`min-h-screen ${bgColor} ${textColor} font-sans selection:bg-red-600 selection:text-white transition-colors duration-500 overflow-x-hidden`}
    >
      {/* Navbar */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled ? `${navBg} shadow-md border-b ${isMorning ? 'border-gray-200' : 'border-neutral-900'}` : 'bg-gradient-to-b from-black/85 via-black/40 to-transparent'
        }`}
      >
        <div className="px-4 md:px-[60px] py-3 md:py-0 min-h-[70px] flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-4 md:gap-[30px]">
            <img
              id="netflix-navbar-logo"
              src="https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg"
              alt="Netflix"
              className="h-7 md:h-[40px] w-auto cursor-pointer object-contain select-none hover:scale-105 transition-transform duration-300"
            />
            <div className={`flex flex-wrap items-center gap-3 sm:gap-[20px] text-[12px] sm:text-[14px] bg-transparent ${isScrolled ? textColor : 'text-white'}`}>
              <span onClick={() => { randomizeTopPicks(); showToast("Home: Curated spotlight stories randomized!", "success"); }} className="font-bold cursor-pointer opacity-100 border-b-2 border-red-600 pb-0.5">Home</span>
              <span onClick={() => showToast("Chronological Dates Timeline loaded successfully.", "success")} className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity">Dates</span>
              <span onClick={() => showToast("Scroll down to explore categorized carousel tracks.", "info")} className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity">Categories</span>
              <span onClick={() => showToast(`My List bookmarks synced under: ${profile.name}`)} className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity">My List</span>
              <span onClick={() => showToast("Moments: Playback highlights generated from archives.", "success")} className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity">Moments</span>
            </div>
          </div>

          <div className={`flex items-center gap-[15px] sm:gap-[24px] ${isScrolled ? textColor : 'text-white'}`}>
            {/* Add Memory Button */}
            <button
              id="btn-add-memory-nav"
              onClick={() => setIsAddMemoryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-600/30 hover:border-red-600 bg-red-600/10 hover:bg-red-600 text-[11px] sm:text-xs font-bold text-white transition-all cursor-pointer shadow-md select-none"
            >
              <PlusCircle size={14} />
              <span>Add Memory</span>
            </button>

            {/* Search Box */}
            <div className="flex items-center relative transition-all duration-300 rounded">
              <Search
                className="w-5 h-5 cursor-pointer text-white hover:opacity-80 transition-opacity"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
              />
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.input
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 140, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    type="text"
                    placeholder="Search memories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-black/70 border border-neutral-800 rounded text-white text-xs ml-2 outline-none p-1.5 focus:ring-1 focus:ring-red-600 focus:border-red-600"
                    autoFocus
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Quick Children access */}
            <span
              onClick={() => {
                const childP = PROFILES.find((p) => p.name === 'Children');
                if (childP) onSwitchProfile(childP);
              }}
              className="text-sm font-semibold select-none cursor-pointer tracking-wide hover:opacity-80 transition-opacity text-white"
            >
              Children
            </span>

            {/* Fast, Asymmetrical Alert Bell swivel on hover */}
            <motion.div
              whileHover={{
                rotate: [0, 10, -10, 10, -10, 0],
                transition: {
                  duration: 0.4,
                  ease: 'easeInOut',
                },
              }}
              style={{ transformOrigin: 'top center' }}
              className="relative cursor-pointer hover:opacity-100 transition-opacity"
            >
              <Bell className="w-5 h-5 text-white" />
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-bold text-[9px] rounded-full px-1 py-0.5 min-w-[15px] h-[15px] flex items-center justify-center border border-black scale-90 shadow-sm">
                10
              </span>
            </motion.div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-1.5 focus:outline-none focus:ring-0 cursor-pointer"
              >
                <div className="w-[32px] h-[32px] rounded-[4px] overflow-hidden border border-neutral-700 hover:border-white transition-colors flex-shrink-0">
                  <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <span className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-white transition-transform duration-300 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Utility Dropdown Panel with staggered 15ms row entries */}
              <AnimatePresence>
                {isProfileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsProfileDropdownOpen(false)} />
                    <div className="absolute right-4 mt-2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-neutral-900 z-50 pointer-events-none" />

                    <motion.div
                      variants={dropdownContainerVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute right-0 mt-3.5 w-[220px] bg-neutral-950/95 backdrop-blur-md border border-neutral-800/80 text-white z-50 flex flex-col py-2"
                    >
                      {/* Swapping profiles items */}
                      <div className="flex flex-col gap-2 px-4 py-2">
                        {PROFILES.filter((p) => p.id !== profile.id).map((p) => (
                          <motion.div
                            variants={dropdownItemVariants}
                            key={p.id}
                            onClick={() => {
                              onSwitchProfile(p);
                              setIsProfileDropdownOpen(false);
                            }}
                            className="flex items-center gap-3 cursor-pointer group w-full"
                          >
                            <img src={p.avatar} alt={p.name} className="w-7 h-7 rounded-[4px] object-cover" referrerPolicy="no-referrer" />
                            <span className="text-xs text-[#e5e5e5] font-semibold group-hover:underline">
                              {p.name}
                            </span>
                          </motion.div>
                        ))}
                      </div>

                      <div className="border-t border-neutral-800 my-1 w-full" />

                      {/* Utility list items - beautifully staggered */}
                      <div className="flex flex-col">
                        <motion.button
                          variants={dropdownItemVariants}
                          onClick={() => {
                            onSignOut();
                            setIsProfileDropdownOpen(false);
                          }}
                          className="w-full flex items-center px-4 py-1.5 hover:bg-neutral-800/20 text-left text-xs text-[#e5e5e5] font-semibold group cursor-pointer"
                        >
                          <Pencil className="w-4 h-4 text-gray-500 group-hover:text-white" />
                          <span className="ml-3 group-hover:underline">Manage Profiles</span>
                        </motion.button>

                        <motion.button
                          variants={dropdownItemVariants}
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            showToast("Bulk Manage Gallery: Access is restricted by parent controls.", "warn");
                          }}
                          className="w-full flex items-center px-4 py-1.5 hover:bg-neutral-800/20 text-left text-xs text-[#e5e5e5] font-semibold group cursor-pointer"
                        >
                          <Grid className="w-4 h-4 text-gray-500 group-hover:text-white" />
                          <span className="ml-3 group-hover:underline">Bulk Manage Gallery</span>
                        </motion.button>

                        <motion.button
                          variants={dropdownItemVariants}
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            showToast("Account: Ultra Premium Status active. Sync stream is online.", "success");
                          }}
                          className="w-full flex items-center px-4 py-1.5 hover:bg-neutral-800/20 text-left text-xs text-[#e5e5e5] font-semibold group cursor-pointer"
                        >
                          <User className="w-4 h-4 text-gray-500 group-hover:text-white" />
                          <span className="ml-3 group-hover:underline">Account</span>
                        </motion.button>

                        <motion.button
                          variants={dropdownItemVariants}
                          onClick={() => {
                            setIsHelpCentreOpen(true);
                            setIsProfileDropdownOpen(false);
                          }}
                          className="w-full flex items-center px-4 py-1.5 hover:bg-neutral-800/20 text-left text-xs text-[#e5e5e5] font-semibold group cursor-pointer"
                        >
                          <HelpCircle className="w-4 h-4 text-gray-500 group-hover:text-white" />
                          <span className="ml-3 group-hover:underline">Help Centre</span>
                        </motion.button>
                      </div>

                      <div className="border-t border-neutral-800 my-1 w-full" />

                      <motion.div variants={dropdownItemVariants} className="py-2 flex justify-center">
                        <button
                          onClick={() => {
                            onSignOut();
                            setIsProfileDropdownOpen(false);
                          }}
                          className="text-xs text-white font-bold hover:underline cursor-pointer"
                        >
                          Sign out of Netflix
                        </button>
                      </motion.div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Movie Feature Banner */}
      <div className="relative min-h-[500px] h-[75vh] md:h-[82vh] w-full bg-neutral-950 overflow-hidden flex flex-col justify-end">
        {/* Real Video Background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <video
            ref={billboardVideoRef}
            key={MAIN_FEATURE.videoUrl}
            src={MAIN_FEATURE.videoUrl}
            className="w-full h-full object-cover select-none pointer-events-none"
            autoPlay
            loop
            muted={isMuted}
            playsInline
          />
        </div>

        {/* Cinematic shading/vignettes */}
        <div className="absolute top-0 left-0 right-0 h-[80px] z-15 pointer-events-none style-vignette-top" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)' }} />
        <div className="absolute top-0 bottom-0 left-0 w-[80%] md:w-[45%] z-15 pointer-events-none style-vignette-left" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 65%, transparent 100%)' }} />
        <div
          className="absolute bottom-0 left-0 right-0 h-[45%] z-15 pointer-events-none style-vignette-bottom"
          style={{
            background: `linear-gradient(to bottom, rgba(${isMorning ? '245, 245, 241' : '20, 20, 20'}, 0) 0%, rgba(${
              isMorning ? '245, 245, 241' : '20, 20, 20'
            }, 0.2) 40%, rgba(${isMorning ? '245, 245, 241' : '20, 20, 20'}, 0.6) 70%, rgba(${
              isMorning ? '245, 245, 241' : '20, 20, 20'
            }, 1) 100%)`,
          }}
        />

        {/* Banner Content elements */}
        <div className="relative z-20 px-4 md:px-[60px] pb-24 md:pb-32 w-full md:w-[55%] flex flex-col items-start pointer-events-none">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }} className="w-full pointer-events-auto">
            <div className="flex items-center gap-2 mb-2 select-none">
              <span className="bg-red-600 text-white font-extrabold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded leading-none">N Original</span>
              <span className="tracking-[0.25em] text-xs font-bold text-gray-300">SPECIAL PROFILE ARCHIVE</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-none mb-4 text-white tracking-tight drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
              {MAIN_FEATURE.title}
            </h1>

            <p className="hidden md:block text-white text-[15px] sm:text-[17px] font-medium leading-[1.45] mb-6 max-w-[550px] drop-shadow-[0_3px_5px_rgba(0,0,0,0.85)]">
              {MAIN_FEATURE.description}
            </p>

            <div className="flex gap-[12px]">
              <button className="px-6 py-2.5 rounded flex items-center justify-center gap-2 font-bold text-sm md:text-lg bg-white text-black transition-all hover:bg-neutral-200 cursor-pointer hover:scale-102 active:scale-95 shadow shadow-black/40">
                <Play className="w-5 h-5 fill-current" /> Play
              </button>
              <button className="px-6 py-2.5 rounded flex items-center justify-center gap-2 font-bold text-sm md:text-lg bg-neutral-500/50 text-white transition-all hover:bg-neutral-500/30 backdrop-blur-md cursor-pointer hover:scale-102 active:scale-95 shadow shadow-black/40">
                <Info className="w-5 h-5" /> More Info
              </button>
            </div>
          </motion.div>
        </div>

        {/* Right side utility widgets (sound controller & rating ribbon) */}
        <div className="absolute right-4 md:right-[60px] bottom-24 md:bottom-32 flex items-center space-x-4 z-30 justify-end w-full">
          {/* Sound Trigger */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="flex items-center justify-center w-[36px] h-[36px] rounded-full border-[1.5px] border-white/80 bg-black/30 hover:bg-white/10 hover:border-white transition-all duration-250 hover:scale-[1.08] active:scale-95 shadow-md shadow-black"
          >
            {isMuted ? <VolumeX size={16} className="text-white" /> : <Volume2 size={16} className="text-white" />}
          </button>

          {/* Maturity Rating Ribbon: smoothly slides open width over 0.7s with zero-reflow scaleX */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 0.95 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'right' }}
            className="hidden md:flex items-center bg-black/65 border-l-[3.5px] border-white pl-4 py-1.5 text-white text-xs font-bold leading-none backdrop-blur-md shadow-lg overflow-hidden whitespace-nowrap h-[32px] rounded-l-sm w-[135px]"
          >
            PG-13 | 16+
          </motion.div>
        </div>
      </div>

      {/* Category Lanes Container */}
      {/* Category Lane Staggered Sequence Entrance: Animates each lane with cascading delay vertically */}
      <motion.div
        variants={laneContainerVariants}
        initial="hidden"
        animate="visible"
        className="pb-24 -mt-16 sm:-mt-24 relative z-30 pt-6"
      >
        {filteredCategories.map((category) => (
          <motion.div
            variants={laneItemVariants}
            key={category.id}
            className={`mb-10 px-4 md:px-[60px] transition-all relative ${
              hoveredRowId === category.id ? 'z-40' : 'z-20'
            }`}
          >
            <h2 className={`text-lg md:text-2xl font-bold mb-2.5 ${textColor} flex items-center group cursor-pointer select-none`}>
              {category.title}
              <span className="text-[10px] text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2.5 hidden md:inline">Explore All</span>
              <ChevronRight className="w-4 h-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hidden md:inline ml-0.5" />
            </h2>

            {/* Release overflow clipping when active hover transition detected */}
            <div
              className={`flex gap-[12px] py-4 transition-all duration-300 ${
                hoveredRowId === category.id
                  ? 'overflow-visible'
                  : 'overflow-x-auto hide-scrollbar snap-x containment-shield offscreen-cull'
              }`}
            >
              {category.memories.map((memory) => (
                <ThumbnailCard
                  key={memory.id}
                  memory={memory}
                  isMorning={isMorning}
                  onClick={() => setSelectedMemory(memory)}
                  onPauseBillboard={handlePauseBillboard}
                  onResumeBillboard={handleResumeBillboard}
                  isBillboardPlaying={isBillboardPlaying}
                  setHoveredRowId={setHoveredRowId}
                  categoryId={category.id}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Details Dialog Modal View */}
      <AnimatePresence>
        {selectedMemory && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-0">
            {/* Dark background panel mask */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMemory(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />

            {/* Modal Card Chassis: Close transition is the mathematical inverse axis compress */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              // PERFECT MATHEMATICAL INVERSE: compress vertically, scale down, slide towards row tracks
              exit={{
                opacity: 0,
                scaleY: 0.05,
                scaleX: 0.78,
                y: 220,
              }}
              transition={{ duration: 0.45, ease: [0.25, 1, 0.4, 1] }}
              className={`relative w-full md:w-[850px] max-w-full rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.85)] z-10 ${modalBg} border ${
                isMorning ? 'border-gray-200' : 'border-neutral-850'
              }`}
            >
              {/* Media Banner Section */}
              <div className="h-[260px] md:h-[400px] relative bg-black overflow-hidden">
                {/* Fallback Thumbnail Image */}
                <img src={selectedMemory.thumbnailUrl} alt={selectedMemory.title} className="w-full h-full object-cover absolute inset-0 select-none" />
                
                {/* Live Video Player Element */}
                {selectedMemory.videoUrl && (
                  <video
                    ref={modalVideoRef}
                    src={selectedMemory.videoUrl}
                    className="w-full h-full object-cover absolute inset-0 select-none"
                    autoPlay={isModalPlaying}
                    loop
                    muted={isModalMuted}
                    playsInline
                  />
                )}

                {/* Ambient Shading Overlays */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-60% pointer-events-none" />
                <div className={`absolute inset-0 bg-gradient-to-b from-transparent from-60% ${isMorning ? 'to-[#f5f5f1]' : 'to-[#181818]'} pointer-events-none`} />

                {/* Visual Playback Controls in the Absolute Center of player banner */}
                <div className="absolute inset-0 flex items-center justify-center gap-6 z-25 pointer-events-auto">
                  {/* Skip Back 10s */}
                  <button
                    onClick={() => {
                      if (modalVideoRef.current) {
                        modalVideoRef.current.currentTime = Math.max(0, modalVideoRef.current.currentTime - 10);
                        showToast("Skipped back 10s", "success");
                      }
                    }}
                    className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-all border border-white/15 hover:border-white/40 active:scale-90"
                    title="Rewind 10 Seconds"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>

                  {/* Large Play/Pause Toggle */}
                  <button
                    onClick={() => {
                      setIsModalPlaying(!isModalPlaying);
                      if (modalVideoRef.current) {
                        if (isModalPlaying) {
                          modalVideoRef.current.pause();
                        } else {
                          modalVideoRef.current.play().catch(() => {});
                        }
                      }
                    }}
                    className="w-14 h-14 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-all border border-white/20 hover:border-white/50 active:scale-90"
                    title={isModalPlaying ? "Pause Video" : "Play Video"}
                  >
                    {isModalPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 fill-white" />}
                  </button>

                  {/* Skip Forward 10s */}
                  <button
                    onClick={() => {
                      if (modalVideoRef.current) {
                        modalVideoRef.current.currentTime = Math.min(modalVideoRef.current.duration || 0, modalVideoRef.current.currentTime + 10);
                        showToast("Skipped forward 10s", "success");
                      }
                    }}
                    className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-all border border-white/15 hover:border-white/40 active:scale-90"
                    title="Forward 10 Seconds"
                  >
                    <RotateCw className="w-5 h-5" />
                  </button>
                </div>

                {/* Top Actions: Sound Mute & Close button */}
                <div className="absolute top-[20px] right-[20px] z-[120] flex items-center gap-3">
                  {selectedMemory.videoUrl && (
                    <button
                      onClick={() => setIsModalMuted(!isModalMuted)}
                      className="w-[38px] h-[38px] rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-neutral-900 transition-colors border border-white/10"
                      title={isModalMuted ? "Unmute Video" : "Mute Video"}
                    >
                      {isModalMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                  )}

                  <motion.button
                    onClick={() => setSelectedMemory(null)}
                    className="w-[38px] h-[38px] rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-neutral-900 transition-colors"
                    whileHover="exitHover"
                  >
                    <X className="w-5 h-5 relative z-10" />
                    <motion.div
                      className="absolute inset-0 rounded-full border border-white/35 pointer-events-none"
                      variants={{
                        exitHover: {
                          scale: 1.25,
                          opacity: 0.8,
                          transition: {
                            duration: 0.45,
                            ease: [0.175, 0.885, 0.32, 1.275],
                          },
                        },
                      }}
                    />
                  </motion.button>
                </div>

                {/* Bottom Left Control Row & Title overlay */}
                <div className="absolute bottom-[20px] md:bottom-[45px] left-[20px] md:left-[40px] right-[20px] md:right-[40px] z-30 flex items-end justify-between pointer-events-none">
                  <div className="flex-1 mr-4 pointer-events-auto">
                    <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold mb-4 select-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight">
                      {selectedMemory.title}
                    </h2>
                    <div className="flex gap-3 flex-wrap items-center">
                      <button 
                        onClick={() => {
                          setIsModalPlaying(true);
                          if (modalVideoRef.current) {
                            modalVideoRef.current.currentTime = 0;
                            modalVideoRef.current.play().catch(() => {});
                          }
                          showToast(`Now playing: ${selectedMemory.title}`, "success");
                        }}
                        className="px-7 py-2.5 rounded-md flex items-center gap-2 font-extrabold text-sm bg-white text-black transition-all hover:bg-neutral-200 active:scale-95 cursor-pointer shadow-md select-none"
                      >
                        <Play className="w-5 h-5 fill-current" /> Play
                      </button>
                      
                      <button 
                        onClick={() => showToast(`Added "${selectedMemory.title}" to My List!`, "success")}
                        className="w-10 h-10 rounded-full border-2 border-neutral-400 bg-black/40 text-white flex items-center justify-center cursor-pointer hover:border-white hover:bg-neutral-800/40 transition-all duration-200 active:scale-90 select-none shadow-md"
                        title="Add to My List"
                      >
                        <Plus className="w-5 h-5" />
                      </button>

                      <button 
                        onClick={() => showToast(`Liked "${selectedMemory.title}"!`, "success")}
                        className="w-10 h-10 rounded-full border-2 border-neutral-400 bg-black/40 text-white flex items-center justify-center cursor-pointer hover:border-white hover:bg-neutral-800/40 transition-all duration-200 active:scale-90 select-none shadow-md"
                        title="Rate Positive (Thumbs Up)"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>

                      <button 
                        onClick={() => handleDownload(selectedMemory.videoUrl)}
                        className="w-10 h-10 rounded-full border-2 border-neutral-400 bg-black/40 text-white flex items-center justify-center cursor-pointer hover:border-white hover:bg-neutral-800/40 transition-all duration-200 active:scale-90 select-none shadow-md animate-pulse-subtle"
                        title="Download Video Link"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Actions Right Side (Edit & Delete triggers) */}
                  <div className="flex items-center gap-2.5 pointer-events-auto">
                    {/* Pencil Edit button */}
                    <button 
                      onClick={() => {
                        setIsEditing(!isEditing);
                        showToast(isEditing ? "Viewing memory info" : "Opening inline metadata editor...", "info");
                      }}
                      className={`w-10 h-10 rounded-full border-2 text-white flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-90 shadow-md select-none ${
                        isEditing ? 'bg-red-600 border-red-500 hover:bg-red-750' : 'bg-black/40 border-neutral-400 hover:bg-white hover:bg-neutral-800/40'
                      }`}
                      title="Edit Memory Details"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete button (shows only for Firestore custom library items) */}
                    {firestoreMemories.some(m => m.id === selectedMemory?.id) && (
                      <button
                        onClick={async () => {
                          try {
                            await deleteDoc(doc(db, 'memories', selectedMemory.id));
                            showToast("Memory deleted from your Netflix library!", "success");
                            setSelectedMemory(null);
                          } catch (err) {
                            console.error("Delete failed: ", err);
                            showToast("Could not delete memory. Please try again.", "warn");
                          }
                        }}
                        className="w-10 h-10 rounded-full bg-red-600/90 border-2 border-red-500 text-white flex items-center justify-center cursor-pointer hover:bg-red-750 transition-all duration-200 active:scale-90 shadow-md select-none"
                        title="Delete from Library"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Maturity Rating Overlay Right Ribbon */}
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 0.95 }}
                  transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformOrigin: 'right' }}
                  className="absolute right-0 bottom-12 z-30 hidden md:flex items-center bg-black/60 border-l-[3px] border-white pl-4 py-1.5 text-white text-[10px] uppercase font-bold backdrop-blur-md shadow-md overflow-hidden whitespace-nowrap h-[28px] w-[150px]"
                >
                  {selectedMemory.maturityRating} | FULL HD
                </motion.div>
              </div>

              {/* Dynamic Bottom Info Area */}
              {isEditing ? (
                /* REDESIGNED INLINE METADATA EDITOR */
                <div className={`p-6 md:p-10 ${textColor} border-t ${isMorning ? 'border-gray-200' : 'border-neutral-800'}`}>
                  <h3 className="text-base font-extrabold mb-5 flex items-center gap-2 text-red-500 uppercase tracking-wide">
                    <Pencil className="w-4 h-4" /> Edit Memory Metadata
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 block">Memory Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className={`w-full text-xs sm:text-sm font-semibold rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-red-600 ${
                            isMorning ? 'bg-white border border-gray-300 text-black' : 'bg-neutral-900 border border-neutral-800 text-white'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 block">Description</label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={4}
                          className={`w-full text-xs sm:text-sm font-semibold rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-red-600 ${
                            isMorning ? 'bg-white border border-gray-300 text-black' : 'bg-neutral-900 border border-neutral-800 text-white'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 block">Date (DD-MM-YYYY)</label>
                          <input
                            type="text"
                            value={editYear}
                            onChange={(e) => setEditYear(e.target.value)}
                            placeholder="DD-MM-YYYY"
                            className={`w-full text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-red-600 text-center ${
                              isMorning ? 'bg-white border border-gray-300 text-black' : 'bg-neutral-900 border border-neutral-800 text-white'
                            }`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 block">Maturity Rating</label>
                          <select
                            value={editMaturityRating}
                            onChange={(e) => setEditMaturityRating(e.target.value)}
                            className={`w-full text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-red-600 text-center cursor-pointer ${
                              isMorning ? 'bg-white border border-gray-300 text-black' : 'bg-neutral-900 border border-neutral-800 text-white'
                            }`}
                          >
                            <option value="U">U</option>
                            <option value="U/A 7+">U/A 7+</option>
                            <option value="U/A 13+">U/A 13+</option>
                            <option value="U/A 16+">U/A 16+</option>
                            <option value="U/A 18+">U/A 18+</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 block">Duration</label>
                        <input
                          type="text"
                          value={editDuration}
                          onChange={(e) => setEditDuration(e.target.value)}
                          className={`w-full text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-red-600 ${
                            isMorning ? 'bg-white border border-gray-300 text-black' : 'bg-neutral-900 border border-neutral-800 text-white'
                          }`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 block">Cast Members (comma separated)</label>
                        <input
                          type="text"
                          value={editCast}
                          onChange={(e) => setEditCast(e.target.value)}
                          className={`w-full text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-red-600 ${
                            isMorning ? 'bg-white border border-gray-300 text-black' : 'bg-neutral-900 border border-neutral-800 text-white'
                          }`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 block">Genres & Vibes (comma separated)</label>
                        <input
                          type="text"
                          value={editTags}
                          onChange={(e) => setEditTags(e.target.value)}
                          className={`w-full text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-red-600 ${
                            isMorning ? 'bg-white border border-gray-300 text-black' : 'bg-neutral-900 border border-neutral-800 text-white'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-neutral-800/65">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-5 py-2 text-xs font-extrabold uppercase rounded-lg border border-neutral-500 hover:bg-neutral-800/40 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-6 py-2 text-xs font-extrabold uppercase rounded-lg bg-red-600 hover:bg-red-750 text-white transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                /* REDESIGNED NETFLIX-STYLE SPECS CONTAINER GRID */
                <div className={`p-6 md:p-10 grid md:grid-cols-[2fr_1fr] gap-6 md:gap-[40px] text-sm md:text-base ${textColor}`}>
                  {/* Left Column (Meta + Descriptions) */}
                  <div className="space-y-4">
                    {/* Meta Indicators row */}
                    <div className="flex flex-wrap items-center gap-[12px] text-xs sm:text-sm font-semibold select-none">
                      <span className="text-[#46d369] font-bold">
                        {selectedMemory.matchPercentage}% {selectedMemory.tags[0] || 'Romantic'} Match
                      </span>
                      <span className="opacity-90 font-medium text-white">
                        {selectedMemory.year}
                      </span>
                      <span className="px-1.5 py-0.5 border border-white/40 rounded text-[11px] font-bold leading-none select-none text-white bg-black/20">
                        {selectedMemory.maturityRating}
                      </span>
                      <span className="px-1.5 py-0.5 border border-white/40 rounded text-[11px] font-bold leading-none select-none text-white bg-black/20">
                        {selectedMemory.duration}
                      </span>
                      <span className="px-1.5 py-0.5 border border-white/40 rounded text-[11px] font-bold leading-none select-none text-white bg-black/20">
                        4K Ultra HD
                      </span>
                    </div>

                    {/* RED TOP 10 INDICATOR ROW */}
                    <div className="flex items-center gap-2.5 select-none pt-1">
                      <div className="bg-red-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded leading-none shadow tracking-wider uppercase flex flex-col items-center justify-center h-5 w-6">
                        <span className="text-[7px] leading-none uppercase font-extrabold tracking-tighter">TOP</span>
                        <span className="text-[10px] leading-none font-black -mt-0.5">10</span>
                      </div>
                      <span className="text-sm font-bold text-red-500 tracking-tight">
                        #1 in Memories Today
                      </span>
                    </div>

                    {/* Memory description text */}
                    <p className={`leading-[1.65] text-xs sm:text-sm font-medium ${mutedTextColor} pt-1`}>
                      {selectedMemory.description}
                    </p>
                  </div>

                  {/* Right Column (Divider + Credits List) */}
                  <div className="text-xs leading-relaxed space-y-3 md:pl-6 md:border-l border-neutral-800/50 flex flex-col justify-start select-none">
                    <div>
                      <span className="text-neutral-500 font-semibold">Cast: </span>
                      <span className="text-neutral-300 font-semibold">
                        {selectedMemory.cast && selectedMemory.cast.length > 0 ? selectedMemory.cast.join(', ') : 'Sia, Aman'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-semibold">Genres: </span>
                      <span className="text-neutral-300 font-semibold">
                        {selectedMemory.tags && selectedMemory.tags.length > 0 ? selectedMemory.tags.join(', ') : 'Romantic, Core Memory'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help Centre Overlay */}
      {isHelpCentreOpen && <HelpCentre isMorning={isMorning} onClose={() => setIsHelpCentreOpen(false)} />}

      {/* Premium Micro-Toast Notification Layer */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 35, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9, transition: { duration: 0.22 } }}
            className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 z-[210] w-[340px] max-w-[calc(100vw-3rem)] rounded-xl border p-4 shadow-2xl overflow-hidden backdrop-blur-md flex items-start gap-3.5 hardware-accelerated ${
              isMorning
                ? 'bg-white/95 border-gray-200/80 text-neutral-800'
                : 'bg-neutral-950/95 border-neutral-800/90 text-white'
            }`}
          >
            {/* Status bar left accent indicator */}
            <div
              className={`w-1.5 h-11 rounded-full flex-shrink-0 ${
                toast.type === 'success'
                  ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                  : toast.type === 'warn'
                  ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                  : 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.4)]'
              }`}
            />

            <div className="flex-1 min-w-0 pr-2">
              <span className={`text-[10px] font-bold tracking-wider uppercase block ${isMorning ? 'text-gray-400' : 'text-neutral-500'}`}>
                {toast.type === 'success' ? 'Task Completed' : toast.type === 'warn' ? 'Alert Access Denied' : 'System Sync'}
              </span>
              <p className="text-xs font-semibold leading-normal mt-0.5 whitespace-normal break-words select-none">{toast.message}</p>
            </div>

            <button
              onClick={() => setToast(null)}
              className={`text-gray-400 hover:text-white transition-colors cursor-pointer select-none -mt-1 -mr-1 p-1 rounded-md ${
                isMorning ? 'hover:bg-neutral-100 hover:text-black' : 'hover:bg-neutral-800'
              }`}
            >
              <X size={14} />
            </button>

            {/* Time-dismiss Progress Indicator Keybar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 4, ease: 'linear' }}
              style={{ transformOrigin: 'left' }}
              className={`absolute bottom-0 left-0 right-0 h-1 ${
                toast.type === 'success' ? 'bg-green-500/80' : toast.type === 'warn' ? 'bg-red-500/80' : 'bg-red-600/80'
              }`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Add Memory Overlay Form */}
      <AddMemoryModal
        isOpen={isAddMemoryOpen}
        onClose={() => setIsAddMemoryOpen(false)}
        isMorning={isMorning}
        profileName={profile.name}
        profileId={profile.id}
        onSuccess={(msg) => showToast(msg, "success")}
      />
    </motion.div>
  );
}
