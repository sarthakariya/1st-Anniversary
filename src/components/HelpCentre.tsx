import React, { useState } from 'react';
import { X, Search, BookOpen, User, Palette, Film, Volume2, Sparkles, HelpCircle, ArrowLeft, ArrowUpRight, CheckCircle2, ChevronRight } from 'lucide-react';

interface HelpCentreProps {
  onClose: () => void;
  isMorning: boolean;
}

interface HelpArticle {
  id: string;
  category: 'profiles' | 'search' | 'player' | 'details' | 'themes' | 'list';
  title: string;
  icon: React.ReactNode;
  summary: string;
  whatItDoes: string;
  howToUse: string;
  capabilities: string[];
}

export default function HelpCentre({ onClose, isMorning }: HelpCentreProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);

  const articles: HelpArticle[] = [
    {
      id: 'h1',
      category: 'profiles',
      title: 'Dynamic Multi-Profile System & User Segregations',
      icon: <User className="w-5 h-5" />,
      summary: 'Learn how the profile switcher operates, protects custom lists, and represents different user environments.',
      whatItDoes: 'The Multi-Profile Selector represents different user sessions (such as Sia & Aman, Moumita, Samar :), and Children) allowing the stream curation to separate personalized memory timelines. Switching profiles safely refreshes the header layout, selected watch history, and content maturity filters.',
      howToUse: '1. Click on the profile photo trigger in the top right-hand corner of the browser navbar.\n2. In the dropdown, hover over and click any of the available accounts (Moumita, Samar :), or Children).\n3. The application will trigger a smooth state animation, changing your current viewing account instantenously and updating content configurations accordingly.',
      capabilities: [
        'Isolated watch states and profile listings',
        'Custom avatars loaded with referer protective headers',
        'Intuitive quick-switch triggers from the top viewport dock',
        'Dynamic profile dropdown conforming literally to the real Netflix UI specs'
      ]
    },
    {
      id: 'h2',
      category: 'search',
      title: 'Real-Time Infinite Search & Live Metadata Filter',
      icon: <Search className="w-5 h-5" />,
      summary: 'Learn how the unified, outline-free search system sweeps across titles, tags, and cast lists.',
      whatItDoes: 'The Search tool offers real-time, zero-lag content filtering. When you type in the bar, the application scans movie titles, category tags (e.g. Romantic, Fun, Cozy), and cast members (e.g. Sia, Aman) instantly updates the homepage rows without triggering page rebuilds or showing glitchy outlines.',
      howToUse: '1. Locate the Search icon in the upper right-right of the top navigation bar.\n2. Click the icon to smoothly slide out the input field. Notice the search icon sits elegantly INSIDE the field with no awkward border double outlines or glow.\n3. Type your query (e.g. "Sunset", "Romantic", "Aman", "Winter").\n4. To clear search or close, click the integrated "X" close trigger inside the bar or clear the text.',
      capabilities: [
        'Unified responsive search container holding both icon and input',
        'Full suppression of standard browser focus outlines ("Freddy Box Free")',
        'Dynamic string-matching across title, tags, and cast strings',
        'Real-time horizontal row reflows based on matching queries'
      ]
    },
    {
      id: 'h3',
      category: 'player',
      title: 'Hero Ambient Video Player & Immersive Audio Engine',
      icon: <Volume2 className="w-5 h-5" />,
      summary: 'Understand the auto-play system, mute controllers, and loop refreshers in the Hero Showcase.',
      whatItDoes: 'The Hero Spotlight card occupies the front-and-center viewport, automatically streaming a beautiful background video preview of Sia and Aman’s journey. This incorporates a responsive control layer featuring action buttons, loop-replay, and real-time audio overrides.',
      howToUse: '1. When the application loads, the main feature ambient trailer streams automatically in the background.\n2. In the bottom-right corner of the banner, click the sound toggle button to unmute or mute the audio track.\n3. Click the replay loop circular button next to the audio icon to reset the video back to timestamp 0:00.',
      capabilities: [
        'Preloaded stream buffering with automated fallback mechanisms',
        'Synchronized sound controller (Mute/Unmute state linkage)',
        'One-click instant media time-reset (0.00s restart)',
        'Integrated age rating banner (16+ MATURITY badge)'
      ]
    },
    {
      id: 'h4',
      category: 'details',
      title: 'Interactive Hover Preview Cards & Details Modal',
      icon: <Film className="w-5 h-5" />,
      summary: 'Explore the 380ms hover delays, floating trailers, and full-screen detailed memory portals.',
      whatItDoes: 'Hovering over any movie card triggers a precise floating preview resembling Netflix’s classic popover. Clicking a card opens an immersive detailed movie hub displaying high-res visual assets, matched percentage stats, duration, maturity ratings, and long-form descriptive copy.',
      howToUse: '1. Hover your cursor over any thumbnail card and wait 380 milliseconds. A floating hover preview box will zoom into focus above the card, showing a trailer preview and tags.\n2. Click on the card to open the complete details window.\n3. View movie attributes: cast members, precise genres, match score, and years.\n4. Click the "X" button or anywhere outside the modal window to close.',
      capabilities: [
        '380ms spring-damped floating interaction trigger',
        'Real-time automated trailer stream in the mini hover card',
        'Responsive details modal with a heavy gradient background',
        'Genre badge arrays colorized with transparent red alerts'
      ]
    },
    {
      id: 'h5',
      category: 'themes',
      title: 'Morning Slate vs Midnight Dark Theme Adaptor',
      icon: <Palette className="w-5 h-5" />,
      summary: 'Explore how the smart theme reader adjusts visual palettes based on your local time of day.',
      whatItDoes: 'The theme adapts itself based on your local hour of the day. Between 6:00 AM and 11:59 AM, it assumes a beautiful cream-white slate ("Morning Mode"), bringing high-contrast reading comforts. From 12:00 PM until 5:59 AM, it shifts into a cinematic dark midnight palette ("Midnight Mode").',
      howToUse: '1. The system checks your computer’s clock immediately upon launching.\n2. The main background, text, borders, buttons, and popups will seamlessly render in Light or Dark styles depending on the active hour.\n3. All cards, navigation panels, and the Help Centre dynamically conform layout colors so they remain highly readable and beautiful.',
      capabilities: [
        'Dynamic clock-checking interval (60,000ms loop checks)',
        'Transition-colors animations spanning 500 milliseconds',
        'Theme-aware class binds (`bg-[#f5f5f1]` vs `bg-[#141414]`)',
        'High compliance with contrast guidelines'
      ]
    },
    {
      id: 'h6',
      category: 'list',
      title: 'Custom List Actions & Active Notifications Count',
      icon: <Sparkles className="w-5 h-5" />,
      summary: 'Managing items in your watchlist, bookmarks, and understanding the header red counters.',
      whatItDoes: 'Allows tagging personal favorites, and features a constant notification badge on your dashboard displaying active notifications representing new entries in Sia & Aman’s memory database.',
      howToUse: '1. Look at the navigation bar to inspect the red circle badge (configured with a static notification count of 10 for alerts).\n2. Click on the "My List" navigation link to filter rows or look at curated bookmarks.\n3. Toggle addition status directly from movie pages as needed.',
      capabilities: [
        'Integrated bell icon holding a red notification indicator badge',
        'Interactive quick tools mapped within the top navbar rail',
        'High responsive layout for mobile viewport stacking'
      ]
    }
  ];

  const filteredArticles = articles.filter(article => {
    const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
    const matchesSearch = 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.whatItDoes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.howToUse.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.capabilities.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: 'all', name: 'All Features' },
    { id: 'profiles', name: 'User Profiles' },
    { id: 'search', name: 'Search Engine' },
    { id: 'player', name: 'Hero Player' },
    { id: 'details', name: 'Hover Cards & Details' },
    { id: 'themes', name: 'Theme Adaptors' },
    { id: 'list', name: 'List & Alerts' },
  ];

  // Base themes matching BrowseScreen.tsx
  const panelBg = isMorning ? 'bg-[#f0f0eb] border-gray-300' : 'bg-neutral-900 border-neutral-800';
  const mainBg = isMorning ? 'bg-[#f5f5f1] text-black' : 'bg-[#141414] text-white';
  const searchBg = isMorning ? 'bg-white border-gray-300 text-black' : 'bg-neutral-950 border-neutral-800 text-white';
  const itemHover = isMorning ? 'hover:bg-gray-200' : 'hover:bg-neutral-800';
  const dividerColor = isMorning ? 'border-gray-200' : 'border-neutral-800';
  const activeSidebar = isMorning ? 'bg-black text-white' : 'bg-white text-black';
  const normalSidebar = isMorning ? 'text-gray-600 hover:bg-gray-200' : 'text-neutral-400 hover:bg-neutral-800';

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col font-sans overflow-hidden ${mainBg}`}>
      {/* Header Panel */}
      <header className={`min-h-[70px] px-4 md:px-[60px] py-4 border-b flex items-center justify-between shadow-sm ${panelBg}`}>
        <div className="flex items-center gap-4">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" 
            alt="Netflix" 
            className="h-7 w-auto cursor-pointer" 
          />
          <div className="h-5 w-[1px] bg-neutral-600" />
          <span className="font-bold tracking-tight text-md flex items-center gap-1.5 uppercase text-red-600">
            <HelpCircle className="w-5 h-5 text-red-600" /> Help Centre
          </span>
        </div>

        <button 
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-bold bg-red-600 text-white rounded hover:bg-red-700 active:scale-95 transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Netflix
        </button>
      </header>

      {/* Main Container Grid */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Side Sidebar - Category Swaps */}
        <aside className={`w-full md:w-64 border-b md:border-b-0 md:border-r p-4 space-y-2 overflow-y-auto ${panelBg}`}>
          <div className="mb-4">
            <p className={`text-[11px] font-bold tracking-wider uppercase ${isMorning ? 'text-gray-500' : 'text-neutral-500'}`}>
              Help & Documentation
            </p>
          </div>
          <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setActiveArticleId(null);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-all flex-shrink-0 md:flex-shrink ${
                  selectedCategory === cat.id 
                    ? activeSidebar
                    : normalSidebar
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className={`hidden md:block border-t pt-4 mt-6 ${dividerColor}`}>
            <div className={`p-4 rounded-lg border text-xs leading-relaxed space-y-2 ${isMorning ? 'bg-gray-100 border-gray-300' : 'bg-neutral-950 border-neutral-800'}`}>
              <div className="flex items-center gap-1 text-red-500 font-bold uppercase tracking-wider text-[10px]">
                <Sparkles className="w-4 h-4" /> Connected Portal
              </div>
              <p className={isMorning ? 'text-gray-500' : 'text-neutral-400'}>
                This Help Centre lists all application controls engineered specifically for the Netflix memories workflow. All metrics are synced in real-time.
              </p>
            </div>
          </div>
        </aside>

        {/* Content Viewer Panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Internal Content Search bar */}
          <div className={`p-4 md:p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${dividerColor}`}>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">How can we help today?</h1>
              <p className={`text-xs md:text-sm mt-0.5 ${isMorning ? 'text-gray-500' : 'text-neutral-400'}`}>
                Explore features, action guides, and mechanical operational workflows across all media modules.
              </p>
            </div>
            
            {/* Outline-Free Help Search Bar inside the Help Center */}
            <div className={`flex items-center w-full md:w-80 rounded-md border px-3 py-2 transition-all ${searchBg}`}>
              <Search className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="Search features, tools, commands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-0 w-full text-xs outline-none focus:outline-none focus:ring-0 p-0"
              />
              {searchQuery && (
                <X 
                  className="w-4 h-4 text-gray-500 hover:text-black dark:hover:text-white cursor-pointer" 
                  onClick={() => setSearchQuery("")} 
                />
              )}
            </div>
          </div>

          {/* List of articles */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
            {filteredArticles.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-gray-500 text-sm">No instructions found matching your parameters.</p>
                <button 
                  onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
                  className="text-red-500 hover:underline text-xs font-bold uppercase transition-colors"
                >
                  Reset Filtering Queries
                </button>
              </div>
            ) : (
              filteredArticles.map((art) => {
                const isActive = activeArticleId === art.id;
                return (
                  <div 
                    key={art.id}
                    className={`rounded-lg border transition-all duration-300 ${
                      isActive 
                        ? (isMorning ? 'bg-white border-black shadow-lg' : 'bg-neutral-900 border-white shadow-[0_0_20px_rgba(255,255,255,0.05)]')
                        : `${panelBg} hover:border-[#777]/30`
                    }`}
                  >
                    {/* Header line of the item */}
                    <div 
                      onClick={() => setActiveArticleId(isActive ? null : art.id)}
                      className="p-5 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-md ${isMorning ? 'bg-gray-200 text-black' : 'bg-neutral-950 text-red-500'}`}>
                          {art.icon}
                        </div>
                        <div>
                          <h2 className="text-sm md:text-base font-bold select-none">{art.title}</h2>
                          <p className={`text-xs select-none ${isMorning ? 'text-gray-500' : 'text-neutral-400'}`}>
                            {art.summary}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isActive ? 'rotate-90' : ''}`} />
                    </div>

                    {/* Detailed Content Expandable Drawer */}
                    {isActive && (
                      <div className={`px-5 pb-6 pt-1 border-t leading-relaxed space-y-5 text-sm ${dividerColor}`}>
                        {/* What does it do */}
                        <div className="space-y-1.5">
                          <p className="font-bold text-red-600 text-xs tracking-wider uppercase flex items-center gap-1.5">
                            <span>●</span> What does this feature do?
                          </p>
                          <p className={isMorning ? 'text-gray-800' : 'text-gray-200'}>
                            {art.whatItDoes}
                          </p>
                        </div>

                        {/* How to use */}
                        <div className="space-y-1.5">
                          <p className="font-bold text-red-600 text-xs tracking-wider uppercase flex items-center gap-1.5">
                            <span>●</span> How to do it & Action Steps
                          </p>
                          <div className={`whitespace-pre-line p-4 rounded-md border text-xs font-medium space-y-2 leading-relaxed ${isMorning ? 'bg-gray-100 border-gray-300 text-gray-800' : 'bg-neutral-950 border-neutral-800 text-gray-300'}`}>
                            {art.howToUse}
                          </div>
                        </div>

                        {/* Feature Capabilities & Natives */}
                        <div className="space-y-2">
                          <p className="font-bold text-red-600 text-xs tracking-wider uppercase flex items-center gap-1.5">
                            <span>●</span> Native Capacities & Specifications
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {art.capabilities.map((cap, idx) => (
                              <div 
                                key={idx}
                                className={`flex items-start gap-2 p-2.5 rounded border ${
                                  isMorning ? 'bg-gray-50/50 border-gray-200 text-gray-700' : 'bg-neutral-950/40 border-neutral-800/60 text-gray-400'
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{cap}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
