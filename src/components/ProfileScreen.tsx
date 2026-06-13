import { motion, AnimatePresence } from 'motion/react';
import { Profile } from '../types';

interface ProfileScreenProps {
  profiles: Profile[];
  onSelect: (profile: Profile) => void;
  isMorning: boolean;
}

export default function ProfileScreen({ profiles, onSelect, isMorning }: ProfileScreenProps) {
  const textColor = isMorning ? 'text-black' : 'text-white';
  const mutedTextColor = isMorning ? 'text-gray-500' : 'text-gray-400';
  
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-3xl md:text-5xl font-bold mb-8 text-center ${textColor}`}
      >
        Who's Watching?
      </motion.h1>

      <div className="flex flex-wrap justify-center gap-6 md:gap-8 max-w-4xl">
        <AnimatePresence>
          {profiles.map((profile, i) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="group flex flex-col items-center cursor-pointer"
              onClick={() => onSelect(profile)}
            >
              <div className={`w-24 h-24 md:w-32 md:h-32 rounded-md overflow-hidden border-2 border-transparent transition-all duration-300 ${isMorning ? 'group-hover:border-black' : 'group-hover:border-white'}`}>
                <img 
                  src={profile.avatar} 
                  alt={profile.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className={`mt-4 text-center font-medium transition-colors duration-300 ${mutedTextColor} ${isMorning ? 'group-hover:text-black' : 'group-hover:text-white'}`}>
                {profile.name}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className={`mt-12 px-6 py-2 border ${isMorning ? 'border-gray-400 text-gray-500 hover:text-black hover:border-black' : 'border-gray-500 text-gray-400 hover:text-white hover:border-white'} tracking-widest text-sm transition-colors`}
      >
        MANAGE PROFILES
      </motion.button>
    </div>
  );
}
