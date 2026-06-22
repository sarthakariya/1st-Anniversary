import { Category, Profile } from './types';

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
    id: 'top-picks',
    title: "Today's Top Picks",
    memories: [
      {
        id: 'm1',
        title: 'Our First Date',
        description: 'The day my life changed forever. We went to that little cafe and talked for hours.',
        thumbnailUrl: PLACEHOLDER_IMG_1,
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-romantic-couple-by-the-lake-at-sunset-42907-large.mp4",
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
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-holding-hands-during-sunset-walk-by-the-coast-42909-large.mp4",
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
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-two-girls-enjoying-a-nighttime-ride-in-the-city-43892-large.mp4",
        matchPercentage: 100,
        year: '2023',
        duration: '45m',
        maturityRating: 'TV-14',
        cast: ['Sia', 'Aman'],
        tags: ['Cozy', 'Music', 'Vibes']
      },
      {
        id: 'm10',
        title: 'Our Rooftop Evening',
        description: 'Looking at the city lights and sharing secrets under the warm starlit sky.',
        thumbnailUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=3840&auto=format&fit=crop",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-man-and-woman-having-fun-at-night-on-street-45012-large.mp4",
        matchPercentage: 97,
        year: '2023',
        duration: '3h 10m',
        maturityRating: 'PG-13',
        cast: ['Sia', 'Aman'],
        tags: ['City Lights', 'Magical', 'Secrets']
      }
    ]
  },
  {
    id: 'continue-watching',
    title: 'Continue Watching',
    memories: [
      {
        id: 'm4',
        title: 'Movie Night Snuggles',
        description: 'Falling asleep halfway through the movie we promised we would finish.',
        thumbnailUrl: PLACEHOLDER_IMG_4,
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-young-man-sitting-under-a-fuzzy-blanket-and-watching-tv-42289-large.mp4",
        matchPercentage: 95,
        year: '2024',
        duration: '3h',
        maturityRating: 'PG',
        cast: ['Sia', 'Aman'],
        tags: ['Sleepy', 'Cute', 'Home']
      },
      {
        id: 'm11',
        title: 'Picnic in the Park',
        description: 'Homemade sandwiches and laughing until our hearts was light.',
        thumbnailUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=3840&auto=format&fit=crop",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-friends-toasting-glasses-of-red-wine-at-sunset-picnic-42468-large.mp4",
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
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-enjoying-a-romantic-candlelit-dinner-outdoors-42294-large.mp4",
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
    id: 'recent-additions',
    title: 'Recent Additions',
    memories: [
      {
        id: 'm5',
        title: 'Winter Getaway',
        description: 'Playing in the snow and drinking hot chocolate by the roasting fireplace.',
        thumbnailUrl: PLACEHOLDER_IMG_2,
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-close-up-of-hands-wrapped-around-a-steaming-mug-of-coffee-42436-large.mp4",
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
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-holding-hands-during-romantic-dinner-42295-large.mp4",
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
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-romantic-couple-on-city-walk-42908-large.mp4",
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
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-wet-road-surface-with-raindrops-rippling-at-night-44336-large.mp4",
        matchPercentage: 98,
        year: '2024',
        duration: '1h 20m',
        maturityRating: 'G',
        cast: ['Sia', 'Aman'],
        tags: ['Rain', 'Espresso', 'Spontaneous']
      }
    ]
  }
];
