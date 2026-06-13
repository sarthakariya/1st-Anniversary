export interface Profile {
  id: string;
  name: string;
  avatar: string;
}

export interface Memory {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl?: string;
  matchPercentage: number;
  year: string;
  duration: string;
  maturityRating: string;
  cast: string[];
  tags: string[];
}

export interface Category {
  id: string;
  title: string;
  memories: Memory[];
}
