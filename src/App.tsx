import { useState, useEffect } from 'react';
import ProfileScreen from './components/ProfileScreen';
import BrowseScreen from './components/BrowseScreen';
import { PROFILES } from './data';
import { Profile } from './types';

export default function App() {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isMorning, setIsMorning] = useState(false);

  useEffect(() => {
    // Check user's local time to determine the theme behavior
    const checkTime = () => {
      const hour = new Date().getHours();
      // Morning is considered between 6 AM and 11:59 AM
      setIsMorning(hour >= 6 && hour < 12);
    };

    checkTime();
    // Optional: Update time check periodically
    const interval = setInterval(checkTime, 60000); 
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`min-h-screen text-white select-none transition-colors duration-500 ${isMorning ? 'bg-[#f5f5f1]' : 'bg-[#141414]'}`}>
      {!selectedProfile ? (
        <ProfileScreen 
          profiles={PROFILES} 
          onSelect={setSelectedProfile} 
          isMorning={isMorning}
        />
      ) : (
        <BrowseScreen 
          profile={selectedProfile} 
          isMorning={isMorning}
          onSwitchProfile={setSelectedProfile}
          onSignOut={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
}
