import { useState, useRef } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';

interface VideoPlayerProps {
  videoId: string;
  autoplay?: boolean;
  onDurationFetched?: (duration: number) => void;
  className?: string;
}

export default function VideoPlayer({ videoId, autoplay = false, onDurationFetched, className = '' }: VideoPlayerProps) {
  const [duration, setDuration] = useState<number | null>(null);
  const playerRef = useRef<any>(null);

  const onReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    // getDuration() returns duration in seconds
    const videoDuration = event.target.getDuration();
    if (videoDuration) {
      setDuration(videoDuration);
      if (onDurationFetched) {
        onDurationFetched(videoDuration);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    }
    return `${m}m ${s}s`;
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: autoplay ? 1 : 0,
      controls: 1,
      modestbranding: 1,
      rel: 0,
    },
  };

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      <YouTube 
        videoId={videoId} 
        opts={opts} 
        onReady={onReady} 
        className="absolute inset-0 w-full h-full"
        iframeClassName="w-full h-full border-none"
      />
      {/** Render overlay with duration if no external handler was provided **/}
      {!onDurationFetched && duration && (
        <div className="absolute bottom-4 right-4 bg-black/80 text-white px-2 py-1 text-xs font-bold rounded">
          {formatDuration(duration)}
        </div>
      )}
    </div>
  );
}
