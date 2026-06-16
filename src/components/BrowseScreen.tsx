import { Search, Bell, Info, Play, X, ChevronRight, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MAIN_FEATURE, MOVIE_CATEGORIES } from '../data';
import { Memory, Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import VideoPlayer from './VideoPlayer';

interface BrowseScreenProps {
  profile: Profile;
  isMorning: boolean;
}

export default function BrowseScreen({ profile, isMorning }: BrowseScreenProps) {
  const [isScrolled, setIsScrolled] = useState(false);
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
            <h1 className={`text-[#E50914] font-bold text-2xl md:text-[32px] tracking-[-1px] uppercase cursor-pointer`}>
              Netflix
            </h1>
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
      <div className="relative h-[60vh] md:h-[450px] w-full">
        <div className="absolute inset-0">
          <img src={MAIN_FEATURE.coverUrl} alt="Hero" className="w-full h-full object-cover" />
          {/* Gradient Overlay based on theme */}
          <div className={`absolute inset-0 bg-gradient-to-r ${isMorning ? 'from-[#f5f5f1] via-[#f5f5f1]/50 to-transparent' : 'from-[#141414] via-[#141414]/50 to-transparent'}`} />
          <div className={`absolute inset-0 bg-gradient-to-t ${isMorning ? 'from-[#f5f5f1] via-transparent to-transparent' : 'from-[#141414] via-transparent to-transparent'}`} />
        </div>
        
        <div className="absolute inset-0 px-4 md:px-[60px] flex flex-col justify-center w-full md:w-[600px]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <img src="https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" alt="N" className="h-6 w-auto" style={{filter: isMorning ? 'grayscale(100%) brightness(0)' : 'none'}}/>
              <span className={`tracking-[0.2em] text-xs font-bold ${isMorning ? 'text-black' : 'text-gray-300'}`}>SERIES</span>
            </div>
            
            <h1 className={`text-4xl md:text-[60px] font-bold leading-none mb-[15px] ${isScrolled && isMorning ? 'text-black' : 'text-white'}`} style={{textShadow: isMorning ? 'none' : '2px 2px 4px rgba(0,0,0,0.5)'}}>
              {MAIN_FEATURE.title}
            </h1>
            
            <p className={`hidden md:block ${isScrolled && isMorning ? 'text-gray-800' : 'text-white'} text-[18px] leading-[1.4] mb-[20px] max-w-[500px]`} style={{textShadow: isMorning ? 'none' : '2px 2px 4px rgba(0,0,0,0.5)'}}>
              {MAIN_FEATURE.description}
            </p>
            
            <div className="flex gap-[12px]">
              <button className={`px-[25px] py-[10px] rounded-[4px] flex items-center gap-[8px] font-bold text-[18px] transition-transform hover:scale-105 bg-white text-black`}>
                <Play className="w-5 h-5 fill-current" /> Play
              </button>
              <button className={`px-[25px] py-[10px] rounded-[4px] flex items-center gap-[8px] font-bold text-[18px] transition-transform hover:scale-105 bg-[#6d6d6e]/70 text-white`}>
                <Info className="w-5 h-5" /> More Info
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Rows */}
      <div className="pb-16 -mt-8 relative z-10 pt-[20px]">
        {filteredCategories.map(category => (
          <div key={category.id} className="mb-8 md:mb-12" style={{ marginBottom: '-40px' }}>
            <h2 className={`px-4 md:px-[60px] text-[20px] font-bold mb-[10px] ${textColor} flex items-center group cursor-pointer`}>
              {category.title}
              <span className="text-[10px] text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 hidden md:inline">Explore All</span>
              <ChevronRight className="w-4 h-4 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity hidden md:inline" />
            </h2>
            
            <div className="px-4 md:px-[60px] flex gap-[8px] overflow-x-auto hide-scrollbar snap-x py-4 pb-[40px]" style={{ contain: 'content' }}>
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
               className="absolute inset-0 bg-black/70 backdrop-blur-2xl"
             />
             <motion.div
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className={`relative w-full md:w-[850px] max-w-full max-h-[90vh] overflow-y-auto overflow-x-hidden hide-scrollbar rounded-[10px] shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10 ${modalBg}`}
             >
                <div className="h-[250px] md:h-[350px] relative bg-[#333]">
                  {selectedMemory.videoUrl ? (
                    <VideoPlayer videoId={selectedMemory.videoUrl} autoplay />
                  ) : (
                    <img src={selectedMemory.thumbnailUrl} alt={selectedMemory.title} className="w-full h-full object-cover absolute inset-0" />
                  )}
                  <div className={`absolute inset-0 bg-gradient-to-b from-transparent from-70% ${isMorning ? 'to-[#f5f5f1]' : 'to-[#181818]'} pointer-events-none`} />
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#141414] to-transparent pointer-events-none" />
                  
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
                     <p className={`text-[16px] leading-relaxed ${mutedTextColor}`}>
                       {selectedMemory.description}
                     </p>
                   </div>
                   
                   <div className={`font-normal text-[14px] flex flex-col space-y-4`}>
                     <div>
                       <span className="text-gray-500">Cast: </span>
                       <span className="text-white">{selectedMemory.cast.join(', ')}</span>
                     </div>
                     <div>
                       <span className="text-gray-500">Genres: </span>
                       <span className="text-white">{selectedMemory.tags.join(', ')}</span>
                     </div>
                     <div>
                       <span className="text-gray-500">This movie is: </span>
                       <span className="text-white">Romantic, Intimate, Ours</span>
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
