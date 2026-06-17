import { Search, Bell, Info, Play, X, ChevronRight, Check, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MAIN_FEATURE, MOVIE_CATEGORIES } from '../data';
import { Memory, Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface BrowseScreenProps {
  profile: Profile;
  isMorning: boolean;
}

export default function BrowseScreen({ profile, isMorning }: BrowseScreenProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
        <div className="px-4 md:px-[60px] h-[70px] flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-[20px]">
            <img 
              id="netflix-navbar-logo"
              src="https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" 
              alt="Netflix" 
              className="h-9 md:h-[44px] w-auto cursor-pointer object-contain select-none hover:scale-105 transition-transform duration-300" 
            />
            <div className={`hidden md:flex gap-[20px] text-[14px] bg-transparent ${isScrolled ? textColor : 'text-white'}`}>
              <span className="font-bold cursor-pointer opacity-100">Home</span>
              <span className="cursor-pointer opacity-80 hover:opacity-100">TV Shows</span>
              <span className="cursor-pointer opacity-80 hover:opacity-100">Movies</span>
              <span className="cursor-pointer opacity-80 hover:opacity-100">New & Popular</span>
              <span className="cursor-pointer opacity-80 hover:opacity-100">My List</span>
            </div>
          </div>
          
          <div className={`flex items-center gap-[20px] ${isScrolled ? textColor : 'text-white'}`}>
            <div className="flex items-center relative">
               <motion.div 
                 initial={false}
                 animate={{ width: isSearchOpen ? '200px' : '0px', opacity: isSearchOpen ? 1 : 0 }}
                 className="overflow-hidden absolute right-8"
               >
                 <input 
                  type="text" 
                  placeholder="Titles, people, genres"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full bg-black/60 border border-gray-400 text-white px-3 py-1 text-sm outline-none ${isMorning ? 'bg-white/60 text-black border-black/20 focus:bg-white' : ''}`}
                 />
               </motion.div>
               <Search className="w-5 h-5 cursor-pointer" onClick={() => setIsSearchOpen(!isSearchOpen)} />
            </div>
            <span className="hidden md:inline text-sm cursor-pointer hover:opacity-80">Kids</span>
            <Bell className="w-5 h-5 cursor-pointer hover:opacity-80" />
            <div className="w-8 h-8 rounded-md overflow-hidden cursor-pointer">
              <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative h-[80vh] md:h-[90vh] w-full bg-neutral-900 overflow-hidden flex flex-col justify-end">
        {/* Video Background (using image as placeholder to match current app structure) */}
        <div className="absolute inset-0 w-full h-full">
            <img src={MAIN_FEATURE.coverUrl} alt="Hero" className="w-full h-full object-cover" />
        </div>
        
        {/* 1. Header Drop-Shadow (Top "Sky Safeguard") */}
        <div 
           className="absolute top-0 left-0 right-0 h-32 z-10 pointer-events-none" 
           style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)' }} 
        />

        {/* 2. Horizontal Vignette (Left "Reading Pocket" Veil) */}
        <div 
           className="absolute top-0 bottom-0 left-0 w-[80%] md:w-[45%] z-10 pointer-events-none" 
           style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.8) 0%, transparent 100%)' }} 
        />

        {/* 3. Vertical Fade (Bottom "Floor" Melt) */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[40%] z-10 pointer-events-none"
          style={{
             background: `linear-gradient(to bottom, transparent 0%, rgba(${isMorning ? '245, 245, 241' : '20, 20, 20'}, 0.1) 50%, rgba(${isMorning ? '245, 245, 241' : '20, 20, 20'}, 0.4) 75%, rgba(${isMorning ? '245, 245, 241' : '20, 20, 20'}, 1) 100%)`
          }}
        />

        {/* Hero Content */}
        <div className="relative z-20 px-4 md:px-[60px] pb-24 md:pb-32 w-full md:w-[60%] flex flex-col items-start text-left">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full"
          >
            <div className="flex items-center gap-2 mb-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" alt="N" className="h-6 w-auto" />
              <span className={`tracking-[0.2em] text-xs font-bold text-gray-300`}>SERIES</span>
            </div>
            
            <h1 className={`text-5xl md:text-[80px] font-bold leading-none mb-[15px] text-white tracking-tight`} style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}>
              {MAIN_FEATURE.title}
            </h1>
            
            <p className={`hidden md:block text-white/95 text-[18px] font-medium leading-[1.4] mb-[30px] max-w-[600px]`} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>
              {MAIN_FEATURE.description}
            </p>
            
            <div className="flex gap-[12px]">
              <button className={`px-[25px] py-[10px] rounded-[4px] flex items-center justify-center gap-[8px] font-bold text-[18px] bg-white text-black transition-colors hover:bg-white/80`}>
                <Play className="w-6 h-6 fill-current" /> Play
              </button>
              <button className={`hidden sm:flex px-[25px] py-[10px] rounded-[4px] items-center justify-center gap-[8px] font-bold text-[18px] bg-neutral-500/50 text-white transition-colors hover:bg-neutral-500/30 backdrop-blur-sm`}>
                <Info className="w-6 h-6" /> More Info
              </button>
            </div>
          </motion.div>
        </div>

        {/* Specialty Circular Icons (Replay / Sound) aligned right */}
        <div className="absolute right-4 md:right-[60px] bottom-24 md:bottom-32 flex items-center space-x-3 z-30">
            {/* Replay */}
            <button 
                className="flex items-center justify-center w-[36px] h-[36px] rounded-full border-[1.5px] border-white/80 bg-transparent hover:bg-white/10 transition-all duration-200 hover:scale-[1.06] ease-out"
                style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}
            >
                <RefreshCw size={16} strokeWidth={1.5} className="text-white" style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }} />
            </button>
            {/* Sound Toggle */}
            <button 
                onClick={() => setIsMuted(!isMuted)}
                className="flex items-center justify-center w-[36px] h-[36px] rounded-full border-[1.5px] border-white/80 bg-transparent hover:bg-white/10 transition-all duration-200 hover:scale-[1.06] ease-out"
                style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}
            >
                {isMuted ? (
                    <VolumeX size={16} strokeWidth={1.5} className="text-white" style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }} />
                ) : (
                    <Volume2 size={16} strokeWidth={1.5} className="text-white" style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }} />
                )}
            </button>
            {/* Age Rating Box */}
            <div className="hidden md:flex items-center bg-black/60 border-l-[3px] border-white pl-4 py-1.5 pr-12 text-white text-sm font-bold backdrop-blur-sm"
                 style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                16+
            </div>
        </div>
      </div>

      {/* Rows */}
      <div className="pb-16 -mt-8 relative z-10 pt-[20px]">
        {filteredCategories.map(category => (
          <div key={category.id} className="mb-8 md:mb-12">
            <h2 className={`px-4 md:px-[60px] text-[20px] font-bold mb-[10px] ${textColor} flex items-center group cursor-pointer`}>
              {category.title}
              <span className="text-[10px] text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 hidden md:inline">Explore All</span>
              <ChevronRight className="w-4 h-4 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity hidden md:inline" />
            </h2>
            
            <div className="px-4 md:px-[60px] flex gap-[8px] overflow-x-auto hide-scrollbar snap-x py-4">
              {category.memories.map(memory => (
                <div 
                  key={memory.id} 
                  className={`flex-none w-[140px] md:w-[240px] h-full snap-center relative rounded-[4px] overflow-hidden cursor-pointer transition-all duration-300 transform md:hover:scale-110 hover:z-20 md:hover:-translate-y-8`}
                  onClick={() => setSelectedMemory(memory)}
                >
                  <div className="aspect-video relative rounded-[4px]">
                    <img src={memory.thumbnailUrl} alt={memory.title} className="w-full h-full object-cover rounded-[4px]" />
                  </div>
                  {/* Hover Info card - Desktop mostly */}
                  <div className={`hidden md:block absolute bottom-0 left-0 right-0 p-4 opacity-0 hover:opacity-100 transition-opacity ${modalBg} shadow-2xl rounded-b-[4px] border border-t-0 ${isMorning ? 'border-gray-200' : 'border-gray-800'}`}>
                    <div className="flex justify-between items-center mb-2">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white text-black`}>
                         <Play className="w-4 h-4 fill-current ml-1" />
                       </div>
                       <Check className={`w-6 h-6 rounded-full border-2 p-1 ${isMorning ? 'border-gray-400 text-gray-500' : 'border-gray-500 text-gray-400'}`} />
                    </div>
                    <p className="text-green-500 text-xs font-bold mb-1">{memory.matchPercentage}% Match</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold mb-2">
                      <span className={`px-1 border ${isMorning ? 'border-gray-500' : 'border-gray-400'}`}>{memory.maturityRating}</span>
                      <span>{memory.duration}</span>
                    </div>
                    <p className={`text-xs ${textColor} font-bold`}>{memory.tags.join(' • ')}</p>
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

    </div>
  );
}
