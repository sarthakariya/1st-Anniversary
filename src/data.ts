import { Category, Profile } from './types';

// Replace these URLs with your actual photos and videos!
const PLACEHOLDER_IMG_1 = "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=3840&auto=format&fit=crop";
const PLACEHOLDER_IMG_2 = "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=3840&auto=format&fit=crop";
const PLACEHOLDER_IMG_3 = "https://images.unsplash.com/photo-1494774157365-9e04c6720e47?q=80&w=3840&auto=format&fit=crop";
const PLACEHOLDER_IMG_4 = "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=3840&auto=format&fit=crop";
const HERO_BG = "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=4096&auto=format&fit=crop";

export const PROFILES: Profile[] = [
  { id: '1', name: 'Sia & Aman', avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=256&h=256&auto=format&fit=crop" },
  { id: '2', name: 'Moumita', avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&h=256&auto=format&fit=crop" },
  { id: '3', name: 'Samar :)', avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=256&h=256&auto=format&fit=crop" },
  { id: '4', name: 'Children', avatar: "https://images.unsplash.com/photo-1620331311520-246422fd82f9?q=80&w=256&h=256&auto=format&fit=crop" },
];

export const MAIN_FEATURE = {
  title: "Life of Sia and Aman",
  description: "A beautiful journey of two souls intertwining. Witness the incredible moments, the laughs, the tears, and the love that grows stronger every passing day.",
  coverUrl: HERO_BG,
  videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-romantic-couple-by-the-lake-at-sunset-42907-large.mp4", 
};

export const MOVIE_CATEGORIES: Category[] = [
  {
    id: 'popular',
    title: 'Popular on Netflix',
    memories: [
      {
        id: 'm1',
        title: 'Our First Date',
        description: 'The day my life changed forever. We went to that little cafe and talked for hours.',
        thumbnailUrl: PLACEHOLDER_IMG_1,
        matchPercentage: 99,
        year: '2023',
        duration: '2h 15m',
        maturityRating: 'TV-MA',
        cast: ['Sia', 'Aman'],
        tags: ['Romantic', 'Core Memory', 'Emotional']
      },
      {
        id: 'm2',
        title: 'Beach Day Out',
        description: 'Watching the sunset together and eating too much ice cream by the shore.',
        thumbnailUrl: PLACEHOLDER_IMG_2,
        matchPercentage: 98,
        year: '2023',
        duration: '1h 30m',
        maturityRating: 'PG',
        cast: ['Sia', 'Aman'],
        tags: ['Fun', 'Summer', 'Happy']
      },
      {
        id: 'm3',
        title: 'Late Night Drives',
        description: 'Listening to our favorite playlist with no destination in mind on rainy nights.',
        thumbnailUrl: PLACEHOLDER_IMG_3,
        matchPercentage: 100,
        year: '2023',
        duration: '45m',
        maturityRating: 'TV-14',
        cast: ['Sia', 'Aman'],
        tags: ['Cozy', 'Music', 'Vibes']
      },
      {
        id: 'm4',
        title: 'Movie Night Snuggles',
        description: 'Falling asleep halfway through the movie we promised we would finish.',
        thumbnailUrl: PLACEHOLDER_IMG_4,
        matchPercentage: 95,
        year: '2024',
        duration: '3h',
        maturityRating: 'PG',
        cast: ['Sia', 'Aman'],
        tags: ['Sleepy', 'Cute', 'Home']
      },
      {
        id: 'm10',
        title: 'Our Rooftop Evening',
        description: 'Looking at the city lights and sharing secrets under the warm starlit sky.',
        thumbnailUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=3840&auto=format&fit=crop",
        matchPercentage: 97,
        year: '2023',
        duration: '3h 10m',
        maturityRating: 'PG-13',
        cast: ['Sia', 'Aman'],
        tags: ['City Lights', 'Magical', 'Secrets']
      },
      {
        id: 'm11',
        title: 'Picnic in the Park',
        description: 'Homemade sandwiches and laughing until our hearts was light.',
        thumbnailUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=3840&auto=format&fit=crop",
        matchPercentage: 94,
        year: '2023',
        duration: '2h',
        maturityRating: 'G',
        cast: ['Sia', 'Aman'],
        tags: ['Sunny', 'Nature', 'Laughter']
      },
      {
        id: 'm12',
        title: 'Starlight Wishes',
        description: 'Counting shooting stars on a cold, serene November night.',
        thumbnailUrl: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=3840&auto=format&fit=crop",
        matchPercentage: 99,
        year: '2023',
        duration: '1h 15m',
        maturityRating: 'PG',
        cast: ['Sia', 'Aman'],
        tags: ['NightSky', 'Wishes', 'Chilly']
      }
    ]
  },
  {
    id: 'recent',
    title: 'Recently Watched',
    memories: [
      {
        id: 'm5',
        title: 'Winter Getaway',
        description: 'Playing in the snow and drinking hot chocolate by the roasting fireplace.',
        thumbnailUrl: PLACEHOLDER_IMG_2,
        matchPercentage: 97,
        year: '2024',
        duration: '3 Days',
        maturityRating: 'PG-13',
        cast: ['Sia', 'Aman'],
        tags: ['Travel', 'Cold', 'Cozy']
      },
      {
        id: 'm6',
        title: 'Anniversary Dinner',
        description: 'Getting dressed up and celebrating us in a quiet candlelight booth.',
        thumbnailUrl: PLACEHOLDER_IMG_1,
        matchPercentage: 100,
        year: '2024',
        duration: '2h 30m',
        maturityRating: 'TV-MA',
        cast: ['Sia', 'Aman'],
        tags: ['Fancy', 'Romantic', 'Milestone']
      },
      {
        id: 'm7',
        title: 'Random Tuesday Cafe',
        description: 'Doing absolutely nothing together and loving every single second of it.',
        thumbnailUrl: PLACEHOLDER_IMG_3,
        matchPercentage: 96,
        year: '2024',
        duration: 'All Day',
        maturityRating: 'G',
        cast: ['Sia', 'Aman'],
        tags: ['Lazy', 'Comfort', 'Everyday']
      },
      {
        id: 'm13',
        title: 'The Rain Coffee Hunt',
        description: 'Getting completely drenched laughing our way into the nearest espresso shop.',
        thumbnailUrl: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=3840&auto=format&fit=crop",
        matchPercentage: 98,
        year: '2024',
        duration: '1h 20m',
        maturityRating: 'G',
        cast: ['Sia', 'Aman'],
        tags: ['Rain', 'Espresso', 'Spontaneous']
      },
      {
        id: 'm14',
        title: 'Arcade Rivalry',
        description: 'A legendary competition over pinball and racing games. Aman lost.',
        thumbnailUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=3840&auto=format&fit=crop",
        matchPercentage: 92,
        year: '2024',
        duration: '2h',
        maturityRating: 'PG',
        cast: ['Sia', 'Aman'],
        tags: ['Games', 'Competitive', 'Playful']
      },
      {
        id: 'm15',
        title: 'Sunrise Walk',
        description: 'Waking up early to catch the first golden rays on the ocean tide.',
        thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=3840&auto=format&fit=crop",
        matchPercentage: 99,
        year: '2024',
        duration: '1h 50m',
        maturityRating: 'PG',
        cast: ['Sia', 'Aman'],
        tags: ['Sunrise', 'Beach', 'Calm']
      }
    ]
  }
];
