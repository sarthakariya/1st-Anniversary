import { Category, Profile } from './types';

// Replace these URLs with your actual photos and videos!
const PLACEHOLDER_IMG_1 = "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=800&auto=format&fit=crop";
const PLACEHOLDER_IMG_2 = "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=800&auto=format&fit=crop";
const PLACEHOLDER_IMG_3 = "https://images.unsplash.com/photo-1494774157365-9e04c6720e47?q=80&w=800&auto=format&fit=crop";
const PLACEHOLDER_IMG_4 = "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=800&auto=format&fit=crop";
const HERO_BG = "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1920&auto=format&fit=crop";

export const PROFILES: Profile[] = [
  { id: '1', name: '1 month', avatar: PLACEHOLDER_IMG_1 },
  { id: '2', name: '3 months', avatar: PLACEHOLDER_IMG_2 },
  { id: '3', name: '5 months', avatar: PLACEHOLDER_IMG_3 },
  { id: '4', name: '6 months', avatar: PLACEHOLDER_IMG_4 },
];

export const MAIN_FEATURE = {
  title: "Life of Sia and Aman",
  description: "A beautiful journey of two souls intertwining. Witness the incredible moments, the laughs, the tears, and the love that grows stronger every passing day.",
  coverUrl: HERO_BG,
  videoUrl: "", // Add a video URL here if you want trailer autoplay
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
        title: 'Beach Day',
        description: 'Watching the sunset together and eating too much ice cream.',
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
        description: 'Listening to our favorite playlist with no destination in mind.',
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
        title: 'Movie Night',
        description: 'Falling asleep halfway through the movie we promised we would finish.',
        thumbnailUrl: PLACEHOLDER_IMG_4,
        matchPercentage: 95,
        year: '2024',
        duration: '3h',
        maturityRating: 'PG',
        cast: ['Sia', 'Aman'],
        tags: ['Sleepy', 'Cute', 'Home']
      }
    ]
  },
  {
    id: 'recent',
    title: 'Recently Watched',
    memories: [
      {
        id: 'm5',
        title: 'Winter Trip',
        description: 'Playing in the snow and drinking hot chocolate by the fire.',
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
        description: 'Getting dressed up and celebrating us.',
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
        title: 'Random Tuesday',
        description: 'Doing absolutely nothing together and loving every second of it.',
        thumbnailUrl: PLACEHOLDER_IMG_3,
        matchPercentage: 96,
        year: '2024',
        duration: 'All Day',
        maturityRating: 'G',
        cast: ['Sia', 'Aman'],
        tags: ['Lazy', 'Comfort', 'Everyday']
      }
    ]
  }
];
