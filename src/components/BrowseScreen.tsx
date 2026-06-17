import { Search, Bell, Info, Play, X, ChevronRight, Check, Volume2, VolumeX, RefreshCw, Plus, ChevronDown, Settings, User, LogOut } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { MAIN_FEATURE, MOVIE_CATEGORIES, PROFILES } from '../data';
import { Memory, Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface BrowseScreenProps {
  profile: Profile;
  isMorning: boolean;
  onSwitchProfile: (profile: Profile) => void;
  onSignOut: () => void;
}

export default function BrowseScreen({ profile, isMorning, onSwitchProfile, onSignOut }: BrowseScreenProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Global Floating Hover State
  const [hoveredMemory, setHoveredMemory] = useState<Memory | null>(null);
  const [hoveredRect, setHoveredRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterThumbnail = (memory: Memory, e: React.MouseEvent<HTMLDivElement>) => {
    if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const left = rect.left + window.scrollX;
    
    hoverTimeout.current = setTimeout(() => {
      setHoveredMemory(memory);
      setHoveredRect({
        top,
        left,
        width: rect.width,
        height: rect.height
      });
    }, 380); // Classic Netflix feel transition delay
  };

  const handleMouseLeaveThumbnail = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    leaveTimeout.current = setTimeout(() => {
      setHoveredMemory(null);
      setHoveredRect(null);
    }, 180);
  };

  const handleMouseEnterFloating = () => {
    if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
  };

  const handleMouseLeaveFloating = () => {
    leaveTimeout.current = setTimeout(() => {
      setHoveredMemory(null);
      setHoveredRect(null);
    }, 150);
  };

  // Theme-aware colors
  const bgColor = isMorning ? 'bg-[#f5f5f1]' : 'bg-[#141414]';
  const textColor = isMorning ? 'text-black' : 'text-white';
  const mutedTextColor = isMorning ? 'text-gray-700' : 'text-gray-300';
  const navBg = isMorning ? 'bg-[#f5f5f1]' : 'bg-[#141414]';
  const modalBg = isMorning ? 'bg-[#f5f5f1]' : 'bg-[#181818]';
  const highlightColor = isMorning ? 'bg-black text-white' : 'bg-white text-black';
  const secondaryBtn = isMorning ? 'bg-gray-300/60 text-black hover:bg-gray-300/80' : 'bg-gray-500/60 text-white hover:bg-gray-500/80';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Filter categories based on search
  const filteredCategories = MOVIE_CATEGORIES.map(category => {
    const filteredMemories = category.memories.filter(m => 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return { ...category, memories: filteredMemories };
  }).filter(c => c.memories.length > 0);

  return (
    <div className={`min-h-screen ${bgColor} ${textColor} font-sans selection:bg-red-600 selection:text-white transition-colors duration-500`}>
      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? `${navBg} shadow-md` : 'bg-gradient-to-b from-black/70 to-transparent'}`}>
        <div className="px-4 md:px-[60px] py-3 md:py-0 min-h-[70px] flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-4 md:gap-[30px]">
            <img 
              id="netflix-navbar-logo"
              src="https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" 
              alt="Netflix" 
              className="h-7 md:h-[40px] w-auto cursor-pointer object-contain select-none hover:scale-105 transition-transform duration-300" 
            />
            {/* Top box top dock links - highly flexible, wraps gracefully and auto-resizes */}
            <div className={`flex flex-wrap items-center gap-3 sm:gap-[20px] text-[12px] sm:text-[14px] bg-transparent ${isScrolled ? textColor : 'text-white'}`}>
              <span className="font-bold cursor-pointer opacity-100 border-b-2 border-red-600 pb-0.5">Home</span>
              <span className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity">Dates</span>
              <span className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity">Categories</span>
              <span className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity">My List</span>
              <span className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity">Moments</span>
            </div>
          </div>
          
          <div className={`flex items-center gap-[15px] sm:gap-[20px] ${isScrolled ? textColor : 'text-white'}`}>
            <div className="flex items-center relative">
               <motion.div 
                 initial={false}
                 animate={{ width: isSearchOpen ? '160px' : '0px', opacity: isSearchOpen ? 1 : 0 }}
                 className="overflow-hidden absolute right-8"
               >
                 <input 
                  type="text" 
                  placeholder="Search memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full bg-black/65 border border-neutral-700 text-white px-3 py-1 text-xs rounded outline-none ${isMorning ? 'bg-white/60 text-black border-black/20 focus:bg-white' : ''}`}
                 />
               </motion.div>
               <Search className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform" onClick={() => setIsSearchOpen(!isSearchOpen)} />
            </div>
            
            <Plus className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform" />
            
            {/* Bell Icon with Red Notification Badge "10" */}
            <div className="relative cursor-pointer hover:scale-110 transition-transform">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-bold text-[9px] rounded-full px-1 py-0.5 min-w-[15px] h-[15px] flex items-center justify-center border border-black scale-90">
                10
              </span>
            </div>
            
            {/* Profile Dropdown Trigger */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-1.5 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-md overflow-hidden cursor-pointer border border-neutral-700 hover:border-white transition-colors">
                  <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <ChevronDown className="w-4 h-4 cursor-pointer text-gray-400 hover:text-white transition-colors" />
              </button>

              {/* Dropdown Popover */}
              <AnimatePresence>
                {isProfileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className={`absolute right-0 mt-3 w-56 rounded-md shadow-2xl py-2 border z-50 ${isMorning ? 'bg-white border-gray-200 text-black' : 'bg-neutral-950 border-neutral-800 text-white'}`}
                    >
                      <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 tracking-wider uppercase mb-1">Switch Profile</div>
                      {PROFILES.filter(p => p.id !== profile.id).map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            onSwitchProfile(p);
                            setIsProfileDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-red-600 hover:text-white transition-colors`}
                        >
                          <div className="w-6 h-6 rounded-md overflow-hidden">
                            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                          <span className="font-medium">{p.name}</span>
                        </button>
                      ))}

                      <div className={`h-[1px] my-2 ${isMorning ? 'bg-gray-200' : 'bg-neutral-800'}`} />

                      <button
                        onClick={() => {
                          onSignOut();
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-neutral-800/20 hover:text-red-500 transition-colors font-medium text-red-500"
                      >
                        <Settings className="w-4 h-4" />
                        Manage Profiles
                      </button>

                      <div className="px-3 py-1.5 text-xs text-gray-400 font-semibold select-none flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Profile Settings
                      </div>

                      <div className={`h-[1px] my-1 ${isMorning ? 'bg-gray-200' : 'bg-neutral-800'}`} />

                      <button
                        onClick={() => {
                          onSignOut();
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-red-600 hover:text-white transition-colors font-semibold"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out of Netflix
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative min-h-[500px] h-[75vh] md:h-[85vh] w-full bg-neutral-900 overflow-hidden flex flex-col justify-end transition-all">
        {/* Real Video Background with sound controller linkage */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <video 
            src={MAIN_FEATURE.videoUrl}
            className="w-full h-full object-cover select-none"
            autoPlay
            loop
            muted={isMuted}
            playsInline
          />
        </div>
        
        {/* 1. Header Drop-Shadow (Top "Sky Safeguard") */}
        <div 
           className="absolute top-0 left-0 right-0 h-[70px] z-10 pointer-events-none" 
           style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)' }} 
        />

        {/* 2. Horizontal Vignette (Left "Reading Pocket" Veil) */}
        <div 
           className="absolute top-0 bottom-0 left-0 w-[80%] md:w-[45%] z-10 pointer-events-none" 
           style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)' }} 
        />

        {/* 3. Vertical Fade (Bottom "Floor" Melt with Color Easing) */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[40%] z-10 pointer-events-none"
          style={{
             background: `linear-gradient(to bottom, rgba(${isMorning ? '245, 245, 241' : '20, 20, 20'}, 0) 0%, rgba(${isMorning ? '245, 245, 241' : '20, 20, 20'}, 0.1) 50%, rgba(${isMorning ? '245, 245, 241' : '20, 20, 20'}, 0.4) 75%, rgba(${isMorning ? '245, 245, 241' : '20, 20, 20'}, 1) 100%)`
          }}
        />

        {/* Hero Content */}
        <div className="relative z-20 px-4 md:px-[60px] pb-24 md:pb-32 w-full md:w-[60%] flex flex-col items-start text-left pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full pointer-events-auto"
          >
            <div className="flex items-center gap-2 mb-2 select-none">
              <img src="https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" alt="N" className="h-6 w-auto" />
              <span className={`tracking-[0.2em] text-xs font-bold text-gray-300`}>SERIES</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-none mb-[15px] text-white tracking-tight select-none" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}>
              {MAIN_FEATURE.title}
            </h1>
            
            <p className="hidden md:block text-white/95 text-[15px] sm:text-[18px] font-medium leading-[1.4] mb-[25px] max-w-[550px] select-none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>
              {MAIN_FEATURE.description}
            </p>
            
            <div className="flex gap-[12px]">
              <button className="px-[20px] py-[8px] md:px-[25px] md:py-[10px] rounded-[4px] flex items-center justify-center gap-[8px] font-bold text-sm md:text-[18px] bg-white text-black transition-colors hover:bg-white/80 active:scale-95">
                <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" /> Play
              </button>
              <button className="hidden sm:flex px-[20px] py-[8px] md:px-[25px] md:py-[10px] rounded-[4px] items-center justify-center gap-[8px] font-bold text-sm md:text-[18px] bg-neutral-500/50 text-white transition-colors hover:bg-neutral-500/30 backdrop-blur-sm active:scale-95">
                <Info className="w-5 h-5 md:w-6 md:h-6" /> More Info
              </button>
            </div>
          </motion.div>
        </div>

        {/* Specialty Circular Icons (Replay / Sound) aligned right */}
        <div className="absolute right-4 md:right-[60px] bottom-24 md:bottom-32 flex items-center space-x-3 z-30">
            {/* Replay */}
            <button 
                onClick={() => {
                  const mediaEl = document.querySelector('video');
                  if (mediaEl) {
                    mediaEl.currentTime = 0;
                    mediaEl.play().catch(() => {});
                  }
                }}
                className="flex items-center justify-center w-[36px] h-[36px] rounded-full border-[1.5px] border-white/80 bg-transparent hover:bg-white/10 hover:border-white transition-all duration-200 hover:scale-[1.08] active:scale-95 ease-out"
                style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}
            >
                <RefreshCw size={16} strokeWidth={1.5} className="text-white" style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }} />
            </button>
            {/* Sound Toggle */}
            <button 
                onClick={() => setIsMuted(!isMuted)}
                className="flex items-center justify-center w-[36px] h-[36px] rounded-full border-[1.5px] border-white/80 bg-transparent hover:bg-white/10 hover:border-white transition-all duration-200 hover:scale-[1.08] active:scale-95 ease-out"
                style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}
            >
                {isMuted ? (
                    <VolumeX size={16} strokeWidth={1.5} className="text-white" style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }} />
                ) : (
                    <Volume2 size={16} strokeWidth={1.5} className="text-white" style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }} />
                )}
            </button>
            {/* Age Rating Box */}
            <div className="hidden md:flex items-center bg-black/60 border-l-[3px] border-white pl-4 py-1.5 pr-12 text-white text-sm font-bold backdrop-blur-sm shadow-md"
                 style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                16+
            </div>
        </div>
      </div>

      {/* Rows - set z-30 relative to completely clear overlapping hero elements */}
      <div className="pb-16 -mt-16 sm:-mt-24 relative z-30 pt-[20px]">
        {filteredCategories.map(category => (
          <div key={category.id} className="mb-6 md:mb-8">
            <h2 className={`px-4 md:px-[60px] text-[18px] md:text-[22px] font-bold mb-[10px] ${textColor} flex items-center group cursor-pointer select-none`}>
              {category.title}
              <span className="text-[10px] text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 hidden md:inline">Explore All</span>
              <ChevronRight className="w-4 h-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hidden md:inline" />
            </h2>
            
            <div className="px-4 md:px-[60px] flex gap-[8px] overflow-x-auto hide-scrollbar snap-x py-6">
              {category.memories.map(memory => (
                <div 
                  key={memory.id} 
                  className="flex-none w-[130px] sm:w-[200px] md:w-[240px] snap-center relative rounded-[4px] cursor-pointer transition-all duration-300 ease-out transform hover:scale-[1.03] hover:z-30 will-change-transform transform-gpu"
                  onMouseEnter={(e) => handleMouseEnterThumbnail(memory, e)}
                  onMouseLeave={handleMouseLeaveThumbnail}
                  onClick={() => setSelectedMemory(memory)}
                >
                  <div className="aspect-video relative rounded-[4px] overflow-hidden border border-transparent hover:border-white/20 transition-colors">
                    <img src={memory.thumbnailUrl} alt={memory.title} className="w-full h-full object-cover rounded-[4px] select-none" />
                  </div>

                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal View */}
      <AnimatePresence>
        {selectedMemory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedMemory(null)}
               className="absolute inset-0 bg-black/70 backdrop-blur-sm"
             />
             <motion.div
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className={`relative w-full md:w-[850px] max-w-full rounded-[10px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10 ${modalBg}`}
             >
                <div className="h-[250px] md:h-[350px] relative bg-[#333]">
                  <img src={selectedMemory.thumbnailUrl} alt={selectedMemory.title} className="w-full h-full object-cover absolute inset-0" />
                  <div className={`absolute inset-0 bg-gradient-to-b from-transparent from-70% ${isMorning ? 'to-[#f5f5f1]' : 'to-[#181818]'}`} />
                  
                  <button 
                    onClick={() => setSelectedMemory(null)}
                    className={`absolute top-[20px] right-[20px] z-20 w-[36px] h-[36px] rounded-full bg-black/50 text-white hover:bg-gray-800 transition-colors flex items-center justify-center`}
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="absolute bottom-[20px] md:bottom-[40px] left-[20px] md:left-[40px]">
                     <h2 className={`text-3xl md:text-[48px] font-bold mb-4 ${isMorning ? 'text-black' : 'text-white'}`}>{selectedMemory.title}</h2>
                     <div className="flex gap-[12px]">
                        <button className={`px-[25px] py-[10px] rounded-[4px] flex items-center gap-[8px] font-bold text-[18px] bg-white text-black transition-transform hover:scale-105`}>
                          <Play className="w-5 h-5 fill-current" /> Play
                        </button>
                     </div>
                  </div>
                </div>

                <div className={`p-[20px] md:p-[40px] grid md:grid-cols-[2fr_1fr] gap-[20px] md:gap-[40px] text-[16px] ${textColor}`}>
                   <div className="space-y-4">
                     <div className="flex items-center gap-[10px] text-[#46d369] font-bold">
                       <span>{selectedMemory.matchPercentage}% Match</span>
                       <span className={textColor}>{selectedMemory.year}</span>
                       <span className={`px-1 border border-[#777] text-white`}>{selectedMemory.maturityRating}</span>
                       <span className={textColor}>{selectedMemory.duration}</span>
                     </div>
                     <p className={`text-[16px] leading-[1.6] ${mutedTextColor}`}>
                       {selectedMemory.description}
                     </p>
                   </div>
                   
                   <div className={`font-normal text-[14px] text-[#777] space-y-4`}>
                     <div>
                       <span>Cast: </span>
                       <span className="text-[#ddd]">{selectedMemory.cast.join(', ')}</span>
                     </div>
                     <div>
                       <span>Genres: </span>
                       <span className="text-[#ddd]">{selectedMemory.tags.join(', ')}</span>
                     </div>
                     <div>
                       <span>This movie is: </span>
                       <span className="text-[#ddd]">Romantic, Intimate, Ours</span>
                     </div>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Hover Preview Card (Netflix-style absolute overlay) */}
      <AnimatePresence>
        {hoveredMemory && hoveredRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1.15 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            onMouseEnter={handleMouseEnterFloating}
            onMouseLeave={handleMouseLeaveFloating}
            onClick={() => {
              setSelectedMemory(hoveredMemory);
              setHoveredMemory(null);
            }}
            className={`fixed rounded-md shadow-[0_12px_44px_rgba(0,0,0,0.85)] z-[60] overflow-hidden ${modalBg} border ${isMorning ? 'border-gray-200' : 'border-neutral-800'} cursor-pointer flex flex-col`}
            style={{
              top: hoveredRect.top - window.scrollY - 30,
              left: Math.max(12, Math.min(
                hoveredRect.left - window.scrollX - ((hoveredRect.width * 1.3 - hoveredRect.width) / 2),
                (typeof window !== 'undefined' ? window.innerWidth : 1200) - (hoveredRect.width * 1.3) - 12
              )),
              width: hoveredRect.width * 1.3,
              transformOrigin: 'center center',
            }}
          >
            {/* Aspect Video for trailer/teaser preview */}
            <div className="relative aspect-video w-full bg-neutral-900 overflow-hidden">
               <video 
                 src="https://assets.mixkit.co/videos/preview/mixkit-romantic-couple-by-the-lake-at-sunset-42907-large.mp4"
                 className="w-full h-full object-cover select-none absolute inset-0"
                 autoPlay
                 loop
                 muted
                 playsInline
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
               
               {/* Small title layered neat */}
               <div className="absolute bottom-2 left-3 right-3 z-10">
                 <p className="text-white text-[12px] font-bold font-mono tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase">
                   {hoveredMemory.title}
                 </p>
               </div>
            </div>

            {/* Expanded metadata below */}
            <div className="p-3.5 flex flex-col flex-grow">
               <div className="flex justify-between items-center mb-1.5 col-span-2">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-white text-black hover:bg-neutral-200 transition-colors shadow">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center ${isMorning ? 'border-gray-400 text-gray-700 hover:bg-gray-100' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'} transition-colors shadow`}>
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${isMorning ? 'border-gray-300 text-gray-600' : 'border-neutral-700 text-neutral-400'}`}>
                    {hoveredMemory.maturityRating}
                  </div>
               </div>

               {/* Stats tags layout */}
               <div className="flex items-center gap-2 text-[10px] font-bold mb-1.5">
                  <span className="text-[#46d369]">{hoveredMemory.matchPercentage}% Match</span>
                  <span className={isMorning ? 'text-gray-500' : 'text-neutral-400'}>{hoveredMemory.year}</span>
                  <span className={isMorning ? 'text-gray-500' : 'text-neutral-400'}>{hoveredMemory.duration}</span>
               </div>

               {/* Very small fonted descriptive snippet */}
               <div className="mb-2">
                  <p className={`text-[10px] sm:text-[11px] font-medium leading-snug line-clamp-2 ${isMorning ? 'text-gray-700' : 'text-gray-300'}`}>
                    {hoveredMemory.description}
                  </p>
               </div>

               {/* Genre badges flex items */}
               <div className="flex items-center flex-wrap gap-1 mt-1">
                 {hoveredMemory.tags.map(tag => (
                   <span key={tag} className="text-[8px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                     {tag}
                   </span>
                 ))}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
