import { Search, Bell, Info, Play, X, ChevronRight, Check, Volume2, VolumeX, RefreshCw, Plus, ChevronDown, Settings, User, LogOut, Pencil, HelpCircle, Grid } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { MAIN_FEATURE, MOVIE_CATEGORIES, PROFILES } from '../data';
import { Memory, Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import HelpCentre from './HelpCentre';

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
      className="flex-none w-[130px] sm:w-[200px] md:w-[245px] snap-center relative rounded-md bg-neutral-950 select-none z-10 hover:z-[60]"
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
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter categories based on search
  const filteredCategories = MOVIE_CATEGORIES.map((category) => {
    const filteredMemories = category.memories.filter(
      (m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return { ...category, memories: filteredMemories };
  }).filter((c) => c.memories.length > 0);

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
              <span className="font-bold cursor-pointer opacity-100 border-b-2 border-red-600 pb-0.5">Home</span>
              <span className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity">Dates</span>
              <span className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity">Categories</span>
              <span className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity">My List</span>
              <span className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity">Moments</span>
            </div>
          </div>

          <div className={`flex items-center gap-[15px] sm:gap-[24px] ${isScrolled ? textColor : 'text-white'}`}>
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
                            alert("Bulk Manage Gallery is locked under safety permissions.");
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
                            alert("Account Status: Ultra Premium. All pipeline variables fully synchronized.");
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

          {/* Maturity Rating Ribbon: smoothly slides open width over 0.7s */}
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '135px', opacity: 0.95 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'right' }}
            className="hidden md:flex items-center bg-black/65 border-l-[3.5px] border-white pl-4 py-1.5 text-white text-xs font-bold leading-none backdrop-blur-md shadow-lg overflow-hidden whitespace-nowrap h-[32px] rounded-l-sm"
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
                  : 'overflow-x-auto hide-scrollbar snap-x'
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
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
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
              className={`relative w-full md:w-[850px] max-w-full rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] z-10 ${modalBg} border ${
                isMorning ? 'border-gray-200' : 'border-neutral-800'
              }`}
            >
              <div className="h-[250px] md:h-[380px] relative bg-neutral-900">
                <img src={selectedMemory.thumbnailUrl} alt={selectedMemory.title} className="w-full h-full object-cover absolute inset-0 select-none" />
                <div className={`absolute inset-0 bg-gradient-to-b from-transparent from-65% ${isMorning ? 'to-[#f5f5f1]' : 'to-[#181818]'}`} />

                {/* Close Trigger surrounded by Thin Circular Outline Box Expanding on Hover with Air-Bubble Easing */}
                <motion.button
                  onClick={() => setSelectedMemory(null)}
                  className="absolute top-[20px] right-[20px] z-[120] w-[38px] h-[38px] rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-neutral-900 transition-colors"
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
                          ease: [0.175, 0.885, 0.32, 1.275], // soft fluid air-bubble expansion curve
                        },
                      },
                    }}
                  />
                </motion.button>

                {/* Title & Info controls */}
                <div className="absolute bottom-[20px] md:bottom-[40px] left-[20px] md:left-[40px]">
                  <h2 className={`text-3xl md:text-[44px] font-extrabold mb-4 select-none ${isMorning ? 'text-black' : 'text-white'}`}>{selectedMemory.title}</h2>
                  <div className="flex gap-[12px]">
                    <button className="px-6 py-2.5 rounded flex items-center gap-2 font-extrabold text-sm md:text-base bg-white text-black transition-transform hover:scale-103 cursor-pointer">
                      <Play className="w-4 h-4 fill-current" /> Play Memory
                    </button>
                  </div>
                </div>

                {/* Maturity Rating Ribbon inside info dialog: slides open over 0.7s */}
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '150px', opacity: 0.95 }}
                  transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformOrigin: 'right' }}
                  className="absolute right-0 bottom-12 z-30 hidden md:flex items-center bg-black/60 border-l-[3px] border-white pl-4 py-1.5 text-white text-[10px] uppercase font-bold backdrop-blur-md shadow-md overflow-hidden whitespace-nowrap h-[28px]"
                >
                  {selectedMemory.maturityRating} | FULL QUALITY
                </motion.div>
              </div>

              {/* Informational specs split column */}
              <div className={`p-6 md:p-10 grid md:grid-cols-[2fr_1fr] gap-6 md:gap-[40px] text-sm md:text-base ${textColor}`}>
                <div className="space-y-4">
                  <div className="flex items-center gap-[10px] text-[#46d369] font-bold text-xs sm:text-sm">
                    <span>{selectedMemory.matchPercentage}% Match</span>
                    <span className={textColor}>{selectedMemory.year}</span>
                    <span className="px-1.5 py-0.2 border border-neutral-600 rounded-sm scale-95">{selectedMemory.maturityRating}</span>
                    <span className={textColor}>{selectedMemory.duration}</span>
                  </div>
                  <p className={`leading-[1.65] text-xs sm:text-sm font-medium ${mutedTextColor}`}>
                    {selectedMemory.description}
                  </p>
                </div>

                <div className="text-xs text-neutral-500 leading-relaxed space-y-3.5">
                  <div>
                    <span className="font-semibold text-neutral-500 uppercase tracking-wider block mb-0.5">Cast</span>
                    <span className="text-neutral-400 font-medium">{selectedMemory.cast.join(', ')}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-500 uppercase tracking-wider block mb-0.5">Genres</span>
                    <span className="text-neutral-400 font-medium">{selectedMemory.tags.join(', ')}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-500 uppercase tracking-wider block mb-0.5">Vibe</span>
                    <span className="text-neutral-400 font-medium">Romantic, Intimate, Intensely Personal</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help Centre Overlay */}
      {isHelpCentreOpen && <HelpCentre isMorning={isMorning} onClose={() => setIsHelpCentreOpen(false)} />}
    </motion.div>
  );
}
