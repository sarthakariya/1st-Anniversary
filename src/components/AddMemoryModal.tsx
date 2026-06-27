import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Film, Image as ImageIcon, Tag, Calendar, Clock, ShieldAlert, Sparkles, Plus } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface AddMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMorning: boolean;
  profileName: string;
  profileId: string;
  onSuccess: (message: string) => void;
}

const TEMPLATES = [
  {
    name: "☕ Rainy Coffee Date",
    title: "Rainy Afternoon Coffee",
    description: "Getting caught in the sudden downpour and laughing our way into that cozy little local espresso shop.",
    thumbnailUrl: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1000&auto=format&fit=crop",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-wet-road-surface-with-raindrops-rippling-at-night-44336-large.mp4",
    tags: "Rainy, Spontaneous, Cozy",
    duration: "1h 15m",
    year: "2024",
    rating: "G"
  },
  {
    name: "🌅 Sunset Coastal Walk",
    title: "Walking along the golden shore",
    description: "Witnessing the sky dissolve into infinite shades of orange and pink, feeling the cool ocean spray.",
    thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-holding-hands-during-sunset-walk-by-the-coast-42909-large.mp4",
    tags: "Sunset, Coastal, Love",
    duration: "45m",
    year: "2023",
    rating: "PG"
  }
];

export default function AddMemoryModal({
  isOpen,
  onClose,
  isMorning,
  profileName,
  profileId,
  onSuccess
}: AddMemoryModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [year, setYear] = useState('2024');
  const [duration, setDuration] = useState('1h 30m');
  const [maturityRating, setMaturityRating] = useState('PG-13');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setTitle(tpl.title);
    setDescription(tpl.description);
    setThumbnailUrl(tpl.thumbnailUrl);
    setVideoUrl(tpl.videoUrl);
    setTagsInput(tpl.tags);
    setDuration(tpl.duration);
    setYear(tpl.year);
    setMaturityRating(tpl.rating);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert("Title and Description are required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArray = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        desc: description.trim(), // Dual support
        videoUrl: videoUrl.trim() || 'https://assets.mixkit.co/videos/preview/mixkit-romantic-couple-by-the-lake-at-sunset-42907-large.mp4',
        thumbnailUrl: thumbnailUrl.trim() || 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1000&auto=format&fit=crop',
        thumbnail: thumbnailUrl.trim() || 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1000&auto=format&fit=crop', // Dual support
        year: year.trim() || '2024',
        duration: duration.trim() || '2h',
        maturityRating: maturityRating,
        rating: maturityRating, // Dual support
        cast: ['Sia', 'Aman'],
        tags: tagsArray.length > 0 ? tagsArray : ['Love', 'Core Memory'],
        matchPercentage: Math.floor(Math.random() * 6) + 95, // 95% - 100%
        category: "recent-additions",
        type: "video",
        dateAdded: Date.now(),
        uploadedBy: profileName,
        ownerId: profileId
      };

      await addDoc(collection(db, 'memories'), payload);
      onSuccess("Your memory has been successfully saved to Netflix and synced in real-time!");
      
      // Clear fields
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setThumbnailUrl('');
      setTagsInput('');
      onClose();
    } catch (error) {
      console.error("Error adding document to Firestore: ", error);
      alert("Failed to save memory to your database. Please check Firestore security rules.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-y-auto bg-black/85 backdrop-blur-md">
        {/* Clickable Backdrop mask */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 cursor-default"
        />

        {/* Modal container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className={`relative w-full max-w-2xl rounded-2xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 border ${
            isMorning ? 'bg-[#f5f5f1] border-gray-200 text-neutral-800' : 'bg-[#181818] border-neutral-800 text-white'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 border-b border-neutral-800/10 dark:border-neutral-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Film className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="text-xl md:text-2xl font-black tracking-tight leading-none">Share a New Memory</h3>
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block mt-1">
                  Adding to {profileName}'s profile
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors ${
                isMorning ? 'hover:bg-neutral-200 text-neutral-500 hover:text-black' : 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick templates auto-fill section */}
          <div className="mb-6 p-4 rounded-xl border border-dashed border-red-500/25 bg-red-600/5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-500 uppercase tracking-wider mb-2.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Test Templates (Auto-populate)</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 hover:scale-[1.02] cursor-pointer ${
                    isMorning 
                      ? 'bg-white border-neutral-300 hover:border-red-500 text-neutral-700' 
                      : 'bg-[#121212] border-neutral-800 hover:border-red-600 text-neutral-300'
                  }`}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 block">Memory Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paris Sunrise Picnic"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full text-sm font-semibold rounded-lg px-3.5 py-2.5 outline-none focus:ring-1 focus:ring-red-600 ${
                    isMorning ? 'bg-white border border-gray-300 text-black' : 'bg-neutral-900 border border-neutral-800 text-white'
                  }`}
                />
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 block">Tags / Genre (Comma separated)</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-3.5 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Romantic, Paris, Cozy"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className={`w-full text-sm font-semibold rounded-lg pl-10 pr-3 py-2.5 outline-none focus:ring-1 focus:ring-red-600 ${
                      isMorning ? 'bg-white border border-gray-300 text-black' : 'bg-neutral-900 border border-neutral-800 text-white'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 block">Description *</label>
              <textarea
                required
                placeholder="Share the details and warm feelings of this beautiful moment..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full text-sm font-semibold rounded-lg px-3.5 py-2.5 outline-none focus:ring-1 focus:ring-red-600 ${
                  isMorning ? 'bg-white border border-gray-300 text-black' : 'bg-neutral-900 border border-neutral-800 text-white'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Video URL */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 block">Video Stream URL (Optional)</label>
                <div className="relative">
                  <Film className="absolute left-3 top-3.5 w-4 h-4 text-neutral-500" />
                  <input
                    type="url"
                    placeholder="Direct MP4 video stream link"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className={`w-full text-sm font-semibold rounded-lg pl-10 pr-3 py-2.5 outline-none focus:ring-1 focus:ring-red-600 ${
                      isMorning ? 'bg-white border border-gray-300 text-black' : 'bg-neutral-900 border border-neutral-800 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Thumbnail URL */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 block">Thumbnail Image URL (Optional)</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-3.5 w-4 h-4 text-neutral-500" />
                  <input
                    type="url"
                    placeholder="Unsplash, Imgur, or direct image link"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    className={`w-full text-sm font-semibold rounded-lg pl-10 pr-3 py-2.5 outline-none focus:ring-1 focus:ring-red-600 ${
                      isMorning ? 'bg-white border border-gray-300 text-black' : 'bg-neutral-900 border border-neutral-800 text-white'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Year */}
              <div className="space-y-1">
                <label className="text-[10px] md:text-xs font-extrabold uppercase tracking-wider text-neutral-500 block">Year</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-3 w-3.5 h-3.5 text-neutral-500" />
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className={`w-full text-xs font-bold rounded-lg pl-8 pr-2 py-2 outline-none focus:ring-1 focus:ring-red-600 text-center ${
                      isMorning ? 'bg-white border border-gray-300 text-black' : 'bg-neutral-900 border border-neutral-800 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-1">
                <label className="text-[10px] md:text-xs font-extrabold uppercase tracking-wider text-neutral-500 block">Duration</label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-3 w-3.5 h-3.5 text-neutral-500" />
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className={`w-full text-xs font-bold rounded-lg pl-8 pr-2 py-2 outline-none focus:ring-1 focus:ring-red-600 text-center ${
                      isMorning ? 'bg-white border border-gray-300 text-black' : 'bg-neutral-900 border border-neutral-800 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Maturity Rating */}
              <div className="space-y-1">
                <label className="text-[10px] md:text-xs font-extrabold uppercase tracking-wider text-neutral-500 block">Maturity Rating</label>
                <div className="relative">
                  <ShieldAlert className="absolute left-2.5 top-3 w-3.5 h-3.5 text-neutral-500" />
                  <select
                    value={maturityRating}
                    onChange={(e) => setMaturityRating(e.target.value)}
                    className={`w-full text-xs font-bold rounded-lg pl-8 pr-2 py-2 outline-none focus:ring-1 focus:ring-red-600 text-center cursor-pointer appearance-none ${
                      isMorning ? 'bg-white border border-gray-300 text-black' : 'bg-neutral-900 border border-neutral-800 text-white'
                    }`}
                  >
                    <option value="G">G</option>
                    <option value="PG">PG</option>
                    <option value="PG-13">PG-13</option>
                    <option value="TV-14">TV-14</option>
                    <option value="TV-MA">TV-MA</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800/10 dark:border-neutral-800 mt-6">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors cursor-pointer ${
                  isMorning 
                    ? 'bg-neutral-100 border-neutral-300 text-neutral-700 hover:bg-neutral-200' 
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 rounded-lg text-sm font-black bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5 shadow-[0_4px_15px_rgba(220,38,38,0.25)]"
              >
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Add to Library</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
