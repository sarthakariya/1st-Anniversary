import React, { useState } from 'react';
import { 
  Search, X, BookOpen, User, Film, Compass, 
  HelpCircle, ChevronRight, HelpCircle as QuestionIcon, Sparkles, Clock, Bell, Info 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HelpCentreProps {
  isOpen: boolean;
  onClose: () => void;
  isMorning: boolean;
}

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  icon: React.ComponentType<any>;
  description: string;
  does: string;
  how: string[];
  need: string;
}

export default function HelpCentre({ isOpen, onClose, isMorning }: HelpCentreProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  const categories = [
    { id: 'all', title: 'All Guides', icon: BookOpen },
    { id: 'profile', title: 'Profiles', icon: User },
    { id: 'playback', title: 'Playback & Visuals', icon: Film },
    { id: 'navigation', title: 'Search & Navigation', icon: Compass },
  ];

  const articles: HelpArticle[] = [
    {
      id: 'hero-player',
      title: 'Interactive Hero Video Player',
      category: 'playback',
      icon: Film,
      description: 'The master cinematic showcase greeting you at the top of your homepage.',
      does: 'Plays a high-definition romantic background video trailer looping seamlessly across the top section, and hooks directly into live ambient music controls.',
      how: [
        'To Restart / Replay: Find the circular rotating arrow (Replay) icon at the bottom-right of the hero section. Click it to reset the video clip back to 0:00 instantly.',
        'To Toggle Sound: Locate the speaker icon next to the replay control. Click it to toggle between muted and full romantic soundtrack playback.'
      ],
      need: 'Acts as the heart of the app’s emotional and aesthetic atmosphere, creating an immediate, immersive cinematic experience the moment you log in.'
    },
    {
      id: 'profile-system',
      title: 'Gatekeeper Profile Selection',
      category: 'profile',
      icon: User,
      description: 'Personalized "Who’s Watching?" screening system to custom-tailor your memories.',
      does: 'Provides a custom login wall requiring the visitor to select their profile (Moumita, Samar :), or Children), establishing individual sessions and personalized greetings.',
      how: [
        'Entering the App: On landing, click on your personalized profile card (Moumita, Samar :), or Children) to unlock the database.',
        'Switching Profiles: Hover or click your Profile Avatar in the top-right of the navigation header. Select any other profile from the list to instantly hot-swap viewer contexts without signing out.',
        'Managing Avatars: Click "Manage Profiles" in the settings menu or starting screen to enter the editor flow.'
      ],
      need: 'Allows each viewer or couple member to have their custom settings, saving their preferences and organizing memory rows relative to their viewpoint.'
    },
    {
      id: 'live-search',
      title: 'Real-Time Memory Search Drawer',
      category: 'navigation',
      icon: Search,
      description: 'The ultra-responsive live search bar that processes tag arrays in split-seconds.',
      does: 'Instantly filters all memory rows, titles, synopses, and key tags (like "Romantic", "Summer", or "Cozy") in real-time as you type, narrowing categories smoothly.',
      how: [
        'Open Search: Click the magnifying glass icon next to your profile avatar in the navigation bar.',
        'Type Keywords: A sleek, flat underline input field expands. Type any title or tag (e.g., "Date", "Rain", "Espresso").',
        'Close & Clear: If you clear the input field, the comprehensive list of memory rows immediately reappears. Click the search icon again to close the input drawer.'
      ],
      need: 'Ensures that you can retrieve very specific dates, memories, or sub-genres out of hundreds of moments in a single click, bypassing manual scrolling.'
    },
    {
      id: 'hover-preview',
      title: 'Netflix-Style Hover Preview Cards',
      category: 'playback',
      icon: Sparkles,
      description: 'Immersive absolute popovers that autoplay clips and stream detailed metadata.',
      does: 'Triggers a smooth spring-animated card growth when you hover your cursor over any thumbnail, displaying match percentage, age classification, duration, and playing a teaser snippet.',
      how: [
        'Invoke Preview: Simply rest your mouse cursor over any memory tile in a row.',
        'Wait for Activation: After a precise 380ms delay, the thumbnail gently zooms by 15% and expands into an autoplaying video trailer with detailed metadata.',
        'Dismiss Preview: Move your cursor off the expanded popover card, and it smoothly melts back into its original standard thumbnail row state.'
      ],
      need: 'Recreates the official, authentic premium Netflix UI feel and allows quick, visual-first discovery of memories without leaving your main page.'
    },
    {
      id: 'detail-modals',
      title: 'Immersive Movie Detail Modals',
      category: 'playback',
      icon: Info,
      description: 'Detailed focus pages compiling full synopses, cast directories, and romance statistics.',
      does: 'Opens a deep, distraction-free modal when you select a card, displaying beautiful high-res splash covers, detailed commentary, match progress, cast list, and intimate movie tags.',
      how: [
        'Open modal: Click directly on any memory card or its hover preview drawer.',
        'Browse content: Scroll down to read comprehensive logs, view Sia and Aman cast metadata, and see our special tags.',
        'Close modal: Click the circular "X" button on the top right, or click anywhere on the blurred background to close.'
      ],
      need: 'Serves as the main storyteller container for your diary entries, providing abundant space for high-resolution images, dates, and cast lists.'
    },
    {
      id: 'theme-shift',
      title: 'Automated Time-Aware Lighting system',
      category: 'playback',
      icon: Clock,
      description: 'Dynamic theme script that responds to your local system hour.',
      does: 'Tracks your exact local timezone hour and smoothly morphs the entire application colors between elegant cream-white and classic dark cinema.',
      how: [
        'Activating Morning Theme: Automatically transitions to a clean, eye-safe cream background (#f5f5f1) if your local computer hour is between 6:00 AM and 11:59 AM.',
        'Activating Dark Theme: Automatically transitions to a cozy night cinema background (#141414) if your local hour is between 12:00 PM and 5:59 AM.',
        'Transition Effect: Theme shifts happen automatically behind the scenes with a gorgeous 500ms soft ease transition.'
      ],
      need: 'Protects the viewer’s visual wellness, keeping the UI highly readable during bright mornings while restoring ambient cinema mood for cozy midnight sessions.'
    },
    {
      id: 'notification-bell',
      title: 'Milestone Alerts & Notification Bell',
      category: 'navigation',
      icon: Bell,
      description: 'Interactive alert counts highlighting newborn memories and milestones.',
      does: 'Draws immediate visual attention to the navigation bar using scaling indicators and a custom red badge with an active count, signaling تازه events or updates.',
      how: [
        'View Alerts: Locate the premium bell icon in the top header. Hovering over it triggers a responsive spring animation, indicating new items waiting to be explored.',
        'Clear Alerts: The red badge stays active as a symbolic reminder of the extensive, rich log and wonderful memories you have accumulated.'
      ],
      need: 'Evokes constant curiosity and makes users excited to click and see what sweet milestones are newly documented.'
    }
  ];

  const filteredArticles = articles.filter(article => {
    const matchesSearch = 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.does.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.need.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-[#0c0c0c] text-neutral-100 flex flex-col overflow-hidden font-sans"
      >
        {/* Help Centre Navigation Header */}
        <header className="border-b border-neutral-800 bg-[#121212] px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" 
              alt="Netflix" 
              className="h-6 w-auto object-contain" 
            />
            <span className="text-white font-bold text-lg border-l border-neutral-700 pl-3 flex items-center gap-2">
              <QuestionIcon className="w-5 h-5 text-red-600" />
              Help Centre
            </span>
          </div>
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-800 hover:bg-red-600 hover:text-white text-neutral-300 text-xs font-semibold transition-all shadow active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" /> Close
          </button>
        </header>

        {/* Content Container (Scrollable) */}
        <div className="flex-1 overflow-y-auto pb-16">
          {/* Hero Banner Search Bar */}
          <div className="relative overflow-hidden bg-gradient-to-r from-red-950 via-neutral-900 to-red-950 py-16 px-6 text-center border-b border-neutral-800">
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                How can we help you today?
              </h1>
              <p className="text-neutral-400 text-sm sm:text-base">
                Explore comprehensive user guides and core definitions for every single feature inside the application.
              </p>
              
              {/* Interactive Document Search */}
              <div className="relative mt-6 max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input 
                  type="text"
                  placeholder="Query guides by keywords (e.g. video, profiles, theme, search)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-900/90 border border-neutral-700 focus:border-red-600 rounded-lg py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-neutral-500 outline-none focus:ring-1 focus:ring-red-600 transition-all shadow-inner"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-full p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Workspace Body */}
          <div className="max-w-6xl mx-auto px-6 mt-8 grid md:grid-cols-[1fr_2.5fr] gap-8">
            
            {/* Sidebar Navigation Options */}
            <aside className="space-y-4">
              <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-2">Filter Categories</h2>
              <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible gap-1 pb-2 md:pb-0 scrollbar-none">
                {categories.map((cat) => {
                  const CategoryIcon = cat.icon;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                        isActive 
                          ? 'bg-red-600 text-white shadow-md font-bold' 
                          : 'bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <CategoryIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                      <span>{cat.title}</span>
                    </button>
                  );
                })}
              </div>

              <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4 space-y-3 hidden md:block">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-red-500" />
                  Need Live Support?
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Have a specific question not covered here? Reach out to Sia and Aman for personal, fast-track memory assistance.
                </p>
                <div className="text-[10px] text-red-400 font-mono">
                  Support hours: 24/7/365
                </div>
              </div>
            </aside>

            {/* Articles List / Expanded Detail Panels */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-4">
                <span className="text-sm font-bold text-neutral-400">
                  Showing {filteredArticles.length} guides
                </span>
                {searchQuery && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {filteredArticles.length === 0 ? (
                <div className="text-center py-12 bg-neutral-900/40 border border-dashed border-neutral-800 rounded-2xl">
                  <HelpCircle className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-400 font-semibold mb-1">No matching articles found</p>
                  <p className="text-xs text-neutral-500">Try modifying your keywords or switching your filter category.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredArticles.map((article) => {
                    const ArticleIcon = article.icon;
                    const isExpanded = expandedArticle === article.id;
                    return (
                      <motion.div
                        key={article.id}
                        layout
                        className="bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden shadow-sm transition-all hover:border-neutral-700"
                      >
                        {/* Header Panel */}
                        <button
                          onClick={() => setExpandedArticle(isExpanded ? null : article.id)}
                          className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer hover:bg-neutral-800/20 transition-all"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="p-2.5 rounded-lg bg-neutral-800 text-red-500 shadow-sm">
                              <ArticleIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-white tracking-tight">{article.title}</h3>
                              <p className="text-xs text-neutral-400 font-medium">{article.description}</p>
                            </div>
                          </div>
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-neutral-500"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </motion.div>
                        </button>

                        {/* Expandable Body Panel with very explicit guides */}
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-neutral-950/80 px-6 py-5 border-t border-neutral-800/80 text-sm space-y-4"
                          >
                            {/* What does it do Section */}
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-red-500 uppercase tracking-widest block">1. What does it do?</span>
                              <p className="text-neutral-300 leading-relaxed text-sm font-medium">
                                {article.does}
                              </p>
                            </div>

                            {/* How to use Section */}
                            <div className="space-y-2">
                              <span className="text-xs font-bold text-red-400 uppercase tracking-widest block">2. How to use it?</span>
                              <ol className="list-decimal list-inside space-y-1.5 pl-1.5">
                                {article.how.map((step, idx) => (
                                  <li key={idx} className="text-neutral-300 text-sm leading-relaxed pl-1">
                                    <span className="font-semibold text-white">{step.split(':')[0]}:</span>
                                    {step.split(':')[1]}
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {/* Why it is needed Section */}
                            <div className="space-y-1 bg-neutral-900/40 p-3.5 rounded-lg border border-neutral-800/80 mt-2">
                              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                                Interactive Objective & Feature Need
                              </span>
                              <p className="text-neutral-400 text-xs italic leading-relaxed">
                                {article.need}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
