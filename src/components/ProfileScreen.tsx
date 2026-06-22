import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Profile } from '../types';
import { Shield, Delete, CornerUpLeft } from 'lucide-react';

interface ProfileScreenProps {
  profiles: Profile[];
  onSelect: (profile: Profile) => void;
  isMorning: boolean;
}

const PROFILE_PINS: Record<string, string> = {
  '1': '1111', // Sia & Aman
  '2': '2222', // Moumita
  '3': '3333', // Samar :)
  '4': '4444', // Children
};

export default function ProfileScreen({ profiles, onSelect, isMorning }: ProfileScreenProps) {
  const [pendingProfile, setPendingProfile] = useState<Profile | null>(null);
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [isErrorFlashing, setIsErrorFlashing] = useState<boolean>(false);
  const [justTypedIndex, setJustTypedIndex] = useState<number | null>(null);

  const textColor = isMorning ? 'text-black' : 'text-white';
  const mutedTextColor = isMorning ? 'text-gray-500' : 'text-gray-400';
  const lockBg = isMorning ? 'bg-white/95 border-gray-200 shadow-xl' : 'bg-neutral-900/90 border-neutral-800 shadow-2xl';

  const handleType = (digit: string) => {
    if (isExiting) return;
    const nextEmptyIdx = pin.indexOf('');
    if (nextEmptyIdx !== -1) {
      const nextPin = [...pin];
      nextPin[nextEmptyIdx] = digit;
      setPin(nextPin);
      setJustTypedIndex(nextEmptyIdx);

      // Reset the typed index briefly to register subsequent keystrokes cleanly
      setTimeout(() => setJustTypedIndex(null), 150);

      // If the PIN field is now fully loaded
      if (nextEmptyIdx === 3) {
        const enteredPin = nextPin.join('');
        const actualPin = PROFILE_PINS[pendingProfile?.id || ''] || '1111';

        if (enteredPin === actualPin) {
          // Play the success sound block if possible or proceed to exit
          setIsExiting(true);
        } else {
          // Flash error red block
          setIsErrorFlashing(true);
          setErrorCount((prev) => prev + 1);
          setTimeout(() => {
            setPin(['', '', '', '']);
            setIsErrorFlashing(false);
          }, 800);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (isExiting) return;
    const lastFilledIdx = pin.map(x => x !== '').lastIndexOf(true);
    if (lastFilledIdx !== -1) {
      const nextPin = [...pin];
      nextPin[lastFilledIdx] = '';
      setPin(nextPin);
      setJustTypedIndex(null);
    }
  };

  // Keyboard support for input
  useEffect(() => {
    if (!pendingProfile || isExiting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleType(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        setPendingProfile(null);
        setPin(['', '', '', '']);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingProfile, pin, isExiting]);

  return (
    <div className="relative flex-grow flex items-center justify-center min-h-screen px-4 overflow-hidden select-none">
      {/* Background Profile Selection Grid */}
      <motion.div
        animate={
          pendingProfile
            ? { scale: 0.95, opacity: 0.2, filter: 'blur(3px)', pointerEvents: 'none' }
            : { scale: 1, opacity: 1, filter: 'blur(0px)' }
        }
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        className="flex-grow flex flex-col items-center justify-center py-12 max-w-full"
      >
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-3xl md:text-5xl font-extrabold mb-10 text-center tracking-tight ${textColor}`}
        >
          Who's Watching?
        </motion.h1>

        <div className="flex flex-wrap justify-center gap-6 md:gap-10 max-w-4xl px-4">
          <AnimatePresence>
            {profiles.map((profile, i) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                className="group flex flex-col items-center cursor-pointer"
                onClick={() => {
                  setPendingProfile(profile);
                  setPin(['', '', '', '']);
                }}
              >
                {/* Profile Box with zoom effect and soft shadow but strictly NO borders */}
                <motion.div
                  whileHover={{
                    scale: 1.12,
                    y: -6,
                    boxShadow: isMorning
                      ? '0 12px 30px -4px rgba(0,0,0,0.15), 0 4px 12px -2px rgba(0,0,0,0.1)'
                      : '0 20px 40px -8px rgba(0,0,0,0.9), 0 8px 16px -4px rgba(0,0,0,0.7)',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-md overflow-hidden relative hardware-accelerated"
                >
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Subtle inner overlay for visual depth */}
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                </motion.div>

                <span
                  className={`mt-4 text-center font-semibold text-sm md:text-base tracking-wide transition-colors duration-300 ${mutedTextColor} ${
                    isMorning ? 'group-hover:text-black' : 'group-hover:text-white'
                  }`}
                >
                  {profile.name}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className={`mt-14 px-7 py-2.5 border-2 text-xs font-bold tracking-widest uppercase transition-all duration-300 ${
            isMorning
              ? 'border-gray-400 text-gray-500 hover:text-black hover:border-black hover:bg-black/5'
              : 'border-neutral-700 text-gray-400 hover:text-white hover:border-white hover:bg-white/5'
          }`}
        >
          MANAGE PROFILES
        </motion.button>
      </motion.div>

      {/* Profile PIN Input Box Reveal (Centered overlay) */}
      <AnimatePresence>
        {pendingProfile && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-transparent">
            {/* Soft background clicks block dismissal */}
            <div
              className="absolute inset-0"
              onClick={() => {
                if (!isExiting) {
                  setPendingProfile(null);
                  setPin(['', '', '', '']);
                }
              }}
            />

            {/* PIN Input Capsule Panel Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={
                isExiting
                  ? { scaleX: 0.85, x: '-110vw', opacity: 0 }
                  : { opacity: 1, y: 0 }
              }
              exit={{ opacity: 0, y: 20 }}
              transition={
                isExiting
                  ? { duration: 0.45, ease: [0.25, 1, 0.4, 1] }
                  : { duration: 0.4, ease: 'easeOut' }
              }
              onAnimationComplete={() => {
                if (isExiting) {
                  onSelect(pendingProfile);
                }
              }}
              className={`relative w-[380px] max-w-full p-8 rounded-2xl flex flex-col items-center border ${lockBg}`}
            >
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-md overflow-hidden shadow-lg mb-4">
                  <img
                    src={pendingProfile.avatar}
                    alt={pendingProfile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className={`text-xl font-bold tracking-tight ${textColor}`}>
                  Profile Lock Active
                </h2>
                <p className={`text-xs mt-1 font-medium ${mutedTextColor}`}>
                  Enter PIN to access <span className="font-semibold text-red-500">{pendingProfile.name}</span>
                </p>
              </div>

              {/* Input Digit Fields with Elastic Boundary expansion pulses */}
              <div
                className={`flex gap-3 justify-center mb-6 transition-transform ${
                  isErrorFlashing ? 'animate-bounce scale-102 text-red-500' : ''
                }`}
              >
                {pin.map((digit, i) => {
                  const isJustTyped = justTypedIndex === i;
                  const isFocused = pin.findIndex((val) => val === '') === i;

                  return (
                    <motion.div
                      key={i}
                      // 1.05x elastic scaling on registration
                      animate={isJustTyped ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 10 }}
                      className={`w-12 h-12 rounded-lg border-2 bg-black/20 text-xl font-extrabold flex items-center justify-center transition-all duration-250 hardware-accelerated ${
                        isErrorFlashing
                          ? 'border-red-500 bg-red-500/10 text-red-500'
                          : digit
                          ? 'border-red-600 text-white shadow-md'
                          : isFocused
                          ? 'border-neutral-400 focus:border-red-600'
                          : 'border-neutral-700/80'
                      }`}
                    >
                      {digit ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-white block shadow-sm shadow-black" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-600/50" />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Secure visual keypad block */}
              <div className="grid grid-cols-3 gap-3 w-8/12 max-w-[240px] mb-6">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleType(val)}
                    className={`h-11 rounded-lg text-sm font-bold flex items-center justify-center transition-colors shadow-sm cursor-pointer ${
                      isMorning
                        ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                        : 'bg-neutral-800/80 hover:bg-neutral-700 text-white'
                    }`}
                  >
                    {val}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setPin(['', '', '', '']);
                    setJustTypedIndex(null);
                  }}
                  className={`h-11 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer ${
                    isMorning ? 'text-gray-500 hover:bg-neutral-100' : 'text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  Clear
                </button>
                <button
                  onClick={() => handleType('0')}
                  className={`h-11 rounded-lg text-sm font-bold flex items-center justify-center transition-colors shadow-sm cursor-pointer ${
                    isMorning
                      ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                      : 'bg-neutral-800/80 hover:bg-neutral-700 text-white'
                  }`}
                >
                  0
                </button>
                <button
                  onClick={handleBackspace}
                  className={`h-11 rounded-lg text-sm font-bold flex items-center justify-center transition-colors cursor-pointer ${
                    isMorning ? 'text-gray-500 hover:bg-neutral-100' : 'text-neutral-400 hover:bg-neutral-800/80'
                  }`}
                >
                  <Delete size={18} />
                </button>
              </div>

              {/* Helpful tips to satisfy workspace usage */}
              <div className="w-full flex justify-between items-center px-4 mt-2">
                <button
                  onClick={() => {
                    setPendingProfile(null);
                    setPin(['', '', '', '']);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:underline cursor-pointer"
                >
                  <CornerUpLeft size={12} /> Return
                </button>
                <span className="text-[10px] uppercase tracking-wide font-mono opacity-60 flex items-center gap-1">
                  <Shield size={10} /> PIN lock active
                </span>
              </div>

              {/* Simple subtle visual cue */}
              <p className="mt-5 text-[10px] font-medium text-neutral-500 text-center select-none font-mono">
                PIN Hint: {PROFILE_PINS[pendingProfile.id] || '1111'}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
