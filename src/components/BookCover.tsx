import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';

interface BookCoverProps {
  id: number;
  title: string;
  author: string;
  year?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// In-memory cache to prevent duplicate outstanding network requests for the same book ID
const pendingRequests = new Map<number, Promise<string | null>>();

// Background themes based on book ID for the fallback academic placeholder
const getPlaceholderTheme = (id: number) => {
  const themes = [
    { bg: 'from-blue-900 to-slate-800', text: 'text-blue-100', accent: 'border-blue-400' },
    { bg: 'from-emerald-900 to-neutral-800', text: 'text-emerald-100', accent: 'border-emerald-400' },
    { bg: 'from-amber-950 to-stone-900', text: 'text-amber-100', accent: 'border-amber-400' },
    { bg: 'from-red-950 to-zinc-900', text: 'text-red-100', accent: 'border-red-400' },
    { bg: 'from-indigo-950 to-slate-900', text: 'text-indigo-100', accent: 'border-indigo-400' },
    { bg: 'from-cyan-950 to-zinc-900', text: 'text-cyan-100', accent: 'border-cyan-400' },
    { bg: 'from-teal-950 to-slate-900', text: 'text-teal-100', accent: 'border-teal-400' },
  ];
  return themes[id % themes.length];
};

export default function BookCover({ id, title, author, year, className = '', size = 'md' }: BookCoverProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaceholder, setIsPlaceholder] = useState(false);

  useEffect(() => {
    let active = true;

    // 1. Check Memory/Local Storage Cache
    const cacheKey = `african_lit_cover_${id}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const { url, isPlaceholder: placeholder } = JSON.parse(cached);
        if (active) {
          setCoverUrl(url);
          setIsPlaceholder(placeholder);
          setLoading(false);
        }
        return;
      } catch (e) {
        console.warn('Failed to parse cached cover for ID', id, e);
      }
    }

    // 2. Fetch cover URL from Google Books and Open Library
    const fetchCover = async (): Promise<string | null> => {
      // Clean query strings to improve match rates
      const cleanTitle = title.replace(/[^\w\s']/gi, '').trim();
      const cleanAuthor = author.replace(/[^\w\s']/gi, '').trim();

      // Check if a promise is already in progress for this book
      if (pendingRequests.has(id)) {
        return pendingRequests.get(id)!;
      }

      const requestPromise = (async () => {
        try {
          // A: Query Google Books API
          const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(cleanTitle)}+inauthor:${encodeURIComponent(cleanAuthor)}&maxResults=1`;
          const googleResponse = await fetch(googleUrl);
          
          if (googleResponse.ok) {
            const googleData = await googleResponse.json();
            const volume = googleData.items?.[0]?.volumeInfo;
            const thumbnail = volume?.imageLinks?.thumbnail || volume?.imageLinks?.smallThumbnail;
            
            if (thumbnail) {
              // Standardize to HTTPS to prevent mixed-content blocks
              return thumbnail.replace(/^http:/i, 'https:');
            }
          }

          // B: Query Open Library Search API
          const openLibUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(cleanTitle)}&author=${encodeURIComponent(cleanAuthor)}&limit=1`;
          const openLibResponse = await fetch(openLibUrl);
          
          if (openLibResponse.ok) {
            const openLibData = await openLibResponse.json();
            const coverId = openLibData.docs?.[0]?.cover_i;
            
            if (coverId) {
              return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
            }
          }
        } catch (error) {
          console.error(`Error querying cover APIs for book ID ${id} (${title}):`, error);
        }
        return null;
      })();

      pendingRequests.set(id, requestPromise);
      return requestPromise;
    };

    setLoading(true);
    fetchCover().then((url) => {
      if (!active) return;

      const cacheData = {
        url: url || '',
        isPlaceholder: !url,
      };

      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch (e) {
        console.warn('LocalStorage limit reached or disabled, skipping write', e);
      }

      setCoverUrl(url);
      setIsPlaceholder(!url);
      setLoading(false);
      pendingRequests.delete(id);
    });

    return () => {
      active = false;
    };
  }, [id, title, author]);

  // Design standard container classes
  const sizeClasses = {
    sm: 'w-10 h-14 text-[6px]',
    md: 'w-24 sm:w-28 aspect-[2/3] text-[9px]',
    lg: 'w-44 sm:w-56 aspect-[2/3] text-xs',
  };

  const containerClass = `relative select-none rounded-md shadow-md border border-slate-200/20 overflow-hidden flex-shrink-0 ${sizeClasses[size]} ${className}`;

  // Skeleton Loader State
  if (loading) {
    return (
      <div className={`${containerClass} bg-slate-100 animate-pulse flex flex-col justify-between p-2`}>
        <div className="space-y-1.5">
          <div className="h-2 bg-slate-200 rounded w-1/3" />
          <div className="h-4 bg-slate-200 rounded w-5/6" />
          <div className="h-3 bg-slate-200 rounded w-2/3" />
        </div>
        <div className="border-t border-slate-200 pt-2 flex flex-col gap-1">
          <div className="h-3 bg-slate-200 rounded w-1/2" />
          <div className="h-2 bg-slate-200 rounded w-1/4" />
        </div>
      </div>
    );
  }

  // Render Image Cover
  if (coverUrl && !isPlaceholder) {
    return (
      <div className={containerClass}>
        {/* Academic Spine Shadow */}
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/15 shadow-inner z-10" />
        <div className="absolute left-2.5 top-0 bottom-0 w-[0.5px] bg-white/10 z-10" />
        <img
          src={coverUrl}
          alt={`Cover of ${title}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover relative z-0 transition-opacity duration-300"
          onError={() => {
            // Fallback immediately if CDN URL fails to render
            setIsPlaceholder(true);
            const cacheKey = `african_lit_cover_${id}`;
            localStorage.setItem(cacheKey, JSON.stringify({ url: '', isPlaceholder: true }));
          }}
        />
      </div>
    );
  }

  // Render Premium Fallback CSS/SVG Book Cover Design
  const theme = getPlaceholderTheme(id);

  return (
    <div className={`${containerClass} bg-gradient-to-br ${theme.bg} border-t-4 ${theme.accent} flex flex-col justify-between p-3`}>
      {/* Spine Accent */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/15 shadow-inner" />
      <div className="absolute left-2 top-0 bottom-0 w-[0.5px] bg-white/10" />

      {/* Header and Title */}
      <div className="flex flex-col gap-1 pt-1 pl-1 z-10">
        <span className={`uppercase font-bold tracking-widest text-[8px] sm:text-[9px] ${theme.text} opacity-60 font-mono`}>
          Literature
        </span>
        <h4 className="font-serif font-extrabold text-white leading-tight tracking-tight line-clamp-3">
          {title}
        </h4>
      </div>

      {/* Footer and Author */}
      <div className="pt-1 border-t border-white/15 pl-1 z-10">
        <p className="font-sans font-semibold text-white/90 truncate leading-snug">
          {author}
        </p>
        <div className="flex justify-between items-center mt-1 text-[8px] font-mono text-white/50">
          <span>{year || ''}</span>
          <span>#{id.toString().padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  );
}
