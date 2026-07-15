import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  BookOpen,
  Globe,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
  Bookmark,
  Building,
  FileText,
  BookmarkCheck,
  X,
  Info,
  LayoutGrid,
  Table
} from 'lucide-react';
import BookCover from './components/BookCover';

interface Book {
  id: number;
  title: string;
  author: string;
  genre: string;
  year: number;
  country: string;
  language: string;
  publisher: string;
  description: string;
}

interface ApiResponse {
  records: Book[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  genres: string[];
  countries: string[];
  languages: string[];
}

const FEATURED_BOOKS = [
  {
    id: 1,
    title: "Things Fall Apart",
    author: "Chinua Achebe",
    genre: "Fiction",
    year: 1958,
    country: "Nigeria",
    language: "English",
    publisher: "Heinemann",
    description: "Follows Okonkwo, a proud Igbo leader, as colonial rule and missionary influence unravel his village's traditions."
  },
  {
    id: 5,
    title: "Half of a Yellow Sun",
    author: "Chimamanda Ngozi Adichie",
    genre: "Historical Fiction",
    year: 2006,
    country: "Nigeria",
    language: "English",
    publisher: "Knopf",
    description: "Follows several intertwined lives before and during the Biafran War in the late 1960s."
  },
  {
    id: 8,
    title: "The Joys of Motherhood",
    author: "Buchi Emecheta",
    genre: "Fiction",
    year: 1979,
    country: "Nigeria",
    language: "English",
    publisher: "Allison & Busby",
    description: "Examines the pressures of motherhood and tradition on a woman navigating colonial-era Lagos."
  }
];

export default function App() {
  // Query States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [sortBy, setSortBy] = useState('year');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filter bookmark only state
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState(false);

  // Data States
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Meta States (Dropdown lists)
  const [genres, setGenres] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);

  // View States
  const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedBookLoading, setSelectedBookLoading] = useState(false);

  // Citation States
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Bookmark list (stored in localStorage)
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    const saved = localStorage.getItem('african_lit_bookmarks');
    return saved ? JSON.parse(saved) : [];
  });

  // Save bookmarks
  useEffect(() => {
    localStorage.setItem('african_lit_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Fetch records with all queries
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // If we are showing only bookmarks, fetch a larger batch so we can filter client-side reliably
      const fetchLimit = showOnlyBookmarks ? 100 : limit;
      const fetchPage = showOnlyBookmarks ? 1 : page;

      const params = new URLSearchParams({
        q: searchQuery,
        genre: selectedGenre,
        country: selectedCountry,
        language: selectedLanguage,
        sortBy,
        sortOrder,
        page: fetchPage.toString(),
        limit: fetchLimit.toString()
      });

      const response = await fetch(`/api/books?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to retrieve literature data');
      }
      const data: ApiResponse = await response.json();

      let finalRecords = data.records;
      let finalTotal = data.total;
      let finalTotalPages = data.totalPages;

      if (showOnlyBookmarks) {
        // Filter by bookmarks locally
        const bookmarkedRecords = data.records.filter(book => bookmarks.includes(book.id));
        finalTotal = bookmarkedRecords.length;
        finalTotalPages = Math.ceil(finalTotal / limit);
        
        // Paginate locally
        const startIndex = (page - 1) * limit;
        finalRecords = bookmarkedRecords.slice(startIndex, startIndex + limit);
      }

      setBooks(finalRecords);
      setTotal(finalTotal);
      setTotalPages(Math.max(1, finalTotalPages));

      // Only set dropdown filter options on initial or if they are not already filled
      if (genres.length === 0) setGenres(data.genres || []);
      if (countries.length === 0) setCountries(data.countries || []);
      if (languages.length === 0) setLanguages(data.languages || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while fetching books.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedGenre, selectedCountry, selectedLanguage, sortBy, sortOrder, page, limit, showOnlyBookmarks, bookmarks, genres.length, countries.length, languages.length]);

  // Fetch details for a specific book
  const fetchBookDetails = useCallback(async (id: number) => {
    setSelectedBookLoading(true);
    try {
      const response = await fetch(`/api/books/${id}`);
      if (!response.ok) {
        throw new Error('Could not load record details');
      }
      const data: Book = await response.json();
      setSelectedBook(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading record.');
    } finally {
      setSelectedBookLoading(false);
    }
  }, []);

  // Fetch books on state change
  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Trigger book detail load
  useEffect(() => {
    if (selectedBookId !== null) {
      fetchBookDetails(selectedBookId);
    }
  }, [selectedBookId, fetchBookDetails]);

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedGenre('');
    setSelectedCountry('');
    setSelectedLanguage('');
    setShowOnlyBookmarks(false);
    setSortBy('year');
    setSortOrder('asc');
    setPage(1);
  };

  // Toggle bookmark
  const toggleBookmark = (id: number) => {
    setBookmarks(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Generate citation strings
  const getAPA = (book: Book) => {
    return `${book.author}. (${book.year}). _${book.title}_. ${book.publisher || 'Heinemann'}.`;
  };

  const getMLA = (book: Book) => {
    return `${book.author}. _${book.title}_. ${book.publisher || 'Heinemann'}, ${book.year}.`;
  };

  const getChicago = (book: Book) => {
    return `${book.author}. _${book.title}_. ${book.country}: ${book.publisher || 'Heinemann'}, ${book.year}.`;
  };

  const handleCopyCitation = (text: string, format: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  // Switch to detail view
  const handleViewDetail = (id: number) => {
    setSelectedBookId(id);
    setCurrentView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Go back to search list
  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedBookId(null);
    setSelectedBook(null);
  };

  // Related Books logic (books from same genre/country, excluding current)
  const getRelatedBooks = () => {
    if (!selectedBook) return [];
    return books
      .filter(b => b.id !== selectedBook.id && (b.genre === selectedBook.genre || b.country === selectedBook.country))
      .slice(0, 3);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased" id="app-root">
      {/* Top Academic Banner */}
      <div className="bg-blue-900 h-1.5 w-full" />

      {/* Modern Institutional Header */}
      <header className="bg-white border-b border-slate-200 py-6 px-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]" id="app-header">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-100" id="header-logo-container">
                <BookOpen className="h-6 w-6" id="header-logo-icon" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700 font-mono block">University Digital Library</span>
                <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight leading-tight" id="app-title">
                  African Literature Bibliographic Repository
                </h1>
              </div>
            </div>
            <p className="mt-2 text-slate-500 max-w-2xl text-xs sm:text-sm leading-relaxed" id="app-subtitle">
              An academic Information Retrieval System compiling seminal monographs of African fiction, drama, and poetry. Built for bibliographic research, catalog indexing, and text exploration.
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-lg p-3.5 self-start md:self-auto shadow-sm" id="stats-banner-container">
            <div className="flex items-center gap-3.5 border-r border-slate-200 pr-4">
              <div className="text-right">
                <span className="block text-[10px] uppercase text-slate-400 font-bold tracking-wider">Indexed Volumes</span>
                <span className="text-base font-mono font-bold text-slate-900" id="total-records-count">50 Monographs</span>
              </div>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-slate-400 font-bold tracking-wider">Citations Saved</span>
              <span className="text-base font-mono font-bold text-blue-700">
                {bookmarks.length} Saved {bookmarks.length === 1 ? 'Volume' : 'Volumes'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6" id="main-content">
        {currentView === 'list' ? (
          <div className="space-y-6" id="search-view-container">
            
            {/* Search and Advanced Filters Bento Grid */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 md:p-6" id="search-controls-section">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Search className="h-4 w-4 text-blue-600" />
                Database Query Panel
              </h2>

              {/* Main Search Input */}
              <div className="relative mb-5" id="search-bar-wrapper">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-4.5 w-4.5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Filter across title, creator, synopsis, region, or publication year..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-11 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm transition-colors duration-150"
                  id="main-search-input"
                />
                {(searchQuery || selectedGenre || selectedCountry || selectedLanguage || showOnlyBookmarks) && (
                  <button
                    onClick={handleResetFilters}
                    className="absolute right-3.5 inset-y-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded transition-colors duration-150 flex items-center gap-1 cursor-pointer border border-slate-200"
                    id="clear-search-btn"
                  >
                    <X className="h-3 w-3" /> Clear Filters
                  </button>
                )}
              </div>

              {/* Filter Parameters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4" id="filters-grid">
                {/* Genre Filter */}
                <div className="flex flex-col gap-1.5" id="genre-filter-wrapper">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    Genre Classification
                  </label>
                  <select
                    value={selectedGenre}
                    onChange={(e) => {
                      setSelectedGenre(e.target.value);
                      setShowOnlyBookmarks(false);
                      setPage(1);
                    }}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 text-slate-700 py-1.5 px-3 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    id="genre-dropdown"
                  >
                    <option value="">All Genres</option>
                    {genres.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Country Filter */}
                <div className="flex flex-col gap-1.5" id="country-filter-wrapper">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    Geographic Origin
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      setPage(1);
                    }}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 text-slate-700 py-1.5 px-3 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    id="country-dropdown"
                  >
                    <option value="">All Countries</option>
                    {countries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Language Filter */}
                <div className="flex flex-col gap-1.5" id="language-filter-wrapper">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    Primary Language
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value);
                      setPage(1);
                    }}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 text-slate-700 py-1.5 px-3 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    id="language-dropdown"
                  >
                    <option value="">All Languages</option>
                    {languages.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                {/* Year Sorting */}
                <div className="flex flex-col gap-1.5" id="sorting-wrapper">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    Chronology / Order
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value);
                        setPage(1);
                      }}
                      className="flex-1 bg-white border border-slate-200 text-slate-700 py-1.5 px-3 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                      id="sort-by-dropdown"
                    >
                      <option value="year">Publication Year</option>
                      <option value="title">Title (A-Z)</option>
                      <option value="author">Author (A-Z)</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      title="Toggle Sort Order"
                      className="px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                      id="sort-order-toggle-btn"
                    >
                      <ArrowUpDown className={`h-3.5 w-3.5 transform transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Filter Chips Bar */}
              {(searchQuery || selectedGenre || selectedCountry || selectedLanguage || showOnlyBookmarks) && (
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-100" id="active-filters-container">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">Active Queries:</span>
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs rounded-md">
                      Text: "{searchQuery}"
                      <button onClick={() => setSearchQuery('')} className="hover:text-blue-900 cursor-pointer text-xs font-bold leading-none">×</button>
                    </span>
                  )}
                  {selectedGenre && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs rounded-md">
                      Genre: {selectedGenre}
                      <button onClick={() => setSelectedGenre('')} className="hover:text-blue-900 cursor-pointer text-xs font-bold leading-none">×</button>
                    </span>
                  )}
                  {selectedCountry && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs rounded-md">
                      Region: {selectedCountry}
                      <button onClick={() => setSelectedCountry('')} className="hover:text-blue-900 cursor-pointer text-xs font-bold leading-none">×</button>
                    </span>
                  )}
                  {selectedLanguage && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs rounded-md">
                      Language: {selectedLanguage}
                      <button onClick={() => setSelectedLanguage('')} className="hover:text-blue-900 cursor-pointer text-xs font-bold leading-none">×</button>
                    </span>
                  )}
                  {showOnlyBookmarks && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 text-xs rounded-md">
                      Citations Saved
                      <button onClick={() => setShowOnlyBookmarks(false)} className="hover:text-amber-900 cursor-pointer text-xs font-bold leading-none">×</button>
                    </span>
                  )}
                  <button
                    onClick={handleResetFilters}
                    className="text-[11px] text-slate-400 hover:text-blue-700 font-bold transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </section>

            {/* Curated/Featured Section */}
            <section className="bg-slate-50 border border-slate-200 rounded-xl p-6" id="featured-books-section">
              <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3 mb-5">
                <div className="p-1.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-slate-900 text-base">Seminal Curated Masterpieces</h3>
                  <p className="text-[11px] text-slate-500">Selected foundational works from the modern African literary canon</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="featured-grid">
                {FEATURED_BOOKS.map((book) => (
                  <div
                    key={book.id}
                    onClick={() => handleViewDetail(book.id)}
                    className="bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-lg p-4 flex gap-4 cursor-pointer transition-all duration-200 group"
                    id={`featured-card-${book.id}`}
                  >
                    <BookCover
                      id={book.id}
                      title={book.title}
                      author={book.author}
                      year={book.year}
                      size="sm"
                      className="shadow-sm border border-slate-200/50 group-hover:scale-[1.02] transition-transform duration-200 self-start"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-blue-700 font-bold font-mono bg-blue-50 px-1.5 py-0.5 rounded">{book.genre}</span>
                        <h4 className="font-serif font-bold text-slate-950 text-xs sm:text-sm leading-tight group-hover:text-blue-700 transition-colors line-clamp-1 mt-1.5">
                          {book.title}
                        </h4>
                        <p className="text-slate-600 text-xs font-medium truncate mt-0.5">by {book.author}</p>
                        <p className="text-slate-500 text-[11px] line-clamp-2 mt-2 leading-relaxed font-sans">
                          {book.description}
                        </p>
                      </div>
                      <span className="text-[10px] text-blue-600 font-bold group-hover:underline mt-2.5 flex items-center gap-1">
                        Access Record →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Results Grid / Table */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" id="results-table-section">
              
              {/* Table Header Controls */}
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-serif font-bold text-slate-900 flex items-center gap-2 text-base">
                    <span>Repository Catalog Index</span>
                    <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-800 text-xs font-bold rounded" id="query-results-badge">
                      {total} {total === 1 ? 'Volume' : 'Volumes'} Retrieved
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Search results compiled according to active index queries</p>
                </div>

                {/* View Mode Controls & Items per page selector */}
                <div className="flex items-center gap-3.5 self-start sm:self-auto flex-wrap sm:flex-nowrap" id="results-controls-wrapper">
                  {/* View Mode Segmented Control */}
                  <div className="flex items-center bg-slate-200/60 rounded-md p-0.5" id="view-mode-toggle-group">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        viewMode === 'grid'
                          ? 'bg-white text-blue-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Display search results in card grid"
                      id="view-grid-btn"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" /> Grid
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                        viewMode === 'table'
                          ? 'bg-white text-blue-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Display search results in catalog table"
                      id="view-table-btn"
                    >
                      <Table className="h-3.5 w-3.5" /> Table
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="hidden sm:block h-4 w-[1px] bg-slate-300" />

                  {/* Page Size Select */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold" id="page-size-selector-wrapper">
                    <span className="text-slate-500">Page size:</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(parseInt(e.target.value, 10));
                        setPage(1);
                      }}
                      className="bg-white border border-slate-200 py-1 px-1.5 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs cursor-pointer"
                      id="page-size-dropdown"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Compact Quick Category Chips Row */}
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/30 overflow-x-auto" id="quick-chips-container">
                <div className="flex items-center gap-2" id="quick-filter-chips-row">
                  <button
                    onClick={() => {
                      setSelectedGenre('');
                      setShowOnlyBookmarks(false);
                      setPage(1);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded border transition-all cursor-pointer whitespace-nowrap ${
                      selectedGenre === '' && !showOnlyBookmarks
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    All Volumes
                  </button>

                  <button
                    onClick={() => {
                      setShowOnlyBookmarks(prev => !prev);
                      setSelectedGenre('');
                      setPage(1);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded border transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      showOnlyBookmarks
                        ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                        : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    <Bookmark className={`h-3 w-3 ${showOnlyBookmarks ? 'fill-current' : ''}`} />
                    Saved Citations ({bookmarks.length})
                  </button>

                  <div className="h-4 w-[1px] bg-slate-200 mx-1 flex-shrink-0" />

                  {genres.map(g => (
                    <button
                      key={g}
                      onClick={() => {
                        setSelectedGenre(g === selectedGenre ? '' : g);
                        setShowOnlyBookmarks(false);
                        setPage(1);
                      }}
                      className={`px-3 py-1 text-xs font-semibold rounded border transition-all cursor-pointer whitespace-nowrap ${
                        selectedGenre === g
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid / Table Content */}
              <div className="w-full" id="results-content-wrapper">
                {loading ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500" id="results-loading-indicator">
                    <RefreshCw className="h-7 w-7 text-blue-600 animate-spin" />
                    <p className="text-xs font-bold text-slate-500 tracking-wider uppercase font-mono">Querying database records...</p>
                  </div>
                ) : error ? (
                  <div className="p-10 text-center" id="results-error-alert">
                    <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-5 text-red-700 text-xs">
                      <p className="font-extrabold mb-1">Bibliographic Error</p>
                      <p>{error}</p>
                      <button
                        onClick={fetchBooks}
                        className="mt-3.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold uppercase tracking-wider text-[10px]"
                      >
                        Retry Retrieval
                      </button>
                    </div>
                  </div>
                ) : books.length === 0 ? (
                  <div className="py-20 text-center" id="results-empty-alert">
                    <div className="max-w-sm mx-auto text-slate-500 flex flex-col items-center gap-3 p-5">
                      <FileText className="h-8 w-8 text-slate-300" />
                      <div>
                        <p className="font-serif font-bold text-slate-800 text-sm">No Bibliographic Records Found</p>
                        <p className="text-xs text-slate-400 mt-1">Your query coordinates returned 0 results from our index. Adjust search queries or filters.</p>
                      </div>
                      <button
                        onClick={handleResetFilters}
                        className="mt-2.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider rounded"
                      >
                        Reset Query Options
                      </button>
                    </div>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-5 sm:p-6" id="results-grid">
                    {books.map((book) => {
                      const isBookmarked = bookmarks.includes(book.id);
                      return (
                        <div
                          key={book.id}
                          onClick={() => handleViewDetail(book.id)}
                          className="bg-white border border-slate-200 hover:border-blue-400 rounded-lg p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group duration-200 relative"
                          id={`book-card-${book.id}`}
                        >
                          <div className="flex gap-4 items-start">
                            <BookCover
                              id={book.id}
                              title={book.title}
                              author={book.author}
                              year={book.year}
                              size="md"
                              className="shadow-sm border border-slate-200/40 group-hover:scale-[1.02] transition-transform duration-200"
                            />
                            
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 self-stretch">
                              <div>
                                <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase tracking-wider">Accession Code: #{book.id.toString().padStart(3, '0')}</span>
                                <h4 className="font-serif font-bold text-slate-900 group-hover:text-blue-700 leading-snug transition-colors line-clamp-2 mt-1 text-sm sm:text-base">
                                  {book.title}
                                </h4>
                                <p className="text-slate-700 text-xs font-medium truncate mt-1">by {book.author}</p>
                                
                                <div className="flex flex-wrap gap-1 mt-2.5">
                                  <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[9px] font-semibold text-slate-600">
                                    {book.genre}
                                  </span>
                                  <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[9px] font-semibold text-slate-600">
                                    {book.country}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="text-[10px] sm:text-xs text-slate-400 font-mono mt-3.5 flex justify-between items-center border-t border-slate-100 pt-2">
                                <span>Published: {book.year}</span>
                                <span className="text-slate-400 italic truncate max-w-[90px]" title={book.publisher}>{book.publisher || 'Heinemann'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t border-slate-150/60 mt-4 pt-3.5 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleViewDetail(book.id)}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group-hover:underline cursor-pointer"
                            >
                              Retrieve Full Record →
                            </button>
                            <button
                              onClick={() => toggleBookmark(book.id)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isBookmarked
                                  ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100'
                                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                              }`}
                              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Masterpiece'}
                            >
                              <Bookmark className="h-3.5 w-3.5 fill-current" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full" id="results-table-wrapper">
                    <table className="w-full text-left border-collapse" id="results-main-table">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 font-mono">
                          <th className="py-3 px-5">Title / Accession</th>
                          <th className="py-3 px-4">Author</th>
                          <th className="py-3 px-4">Country</th>
                          <th className="py-3 px-4">Genre</th>
                          <th className="py-3 px-4 text-center">Year</th>
                          <th className="py-3 px-4">Language</th>
                          <th className="py-3 px-4">Publisher</th>
                          <th className="py-3 px-5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {books.map((book) => {
                          const isBookmarked = bookmarks.includes(book.id);
                          return (
                            <tr
                              key={book.id}
                              className="hover:bg-slate-50/60 group transition-all cursor-pointer text-xs sm:text-sm"
                              onClick={() => handleViewDetail(book.id)}
                              id={`book-row-${book.id}`}
                            >
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-3.5">
                                  <span className="text-slate-400 text-xs font-mono font-bold" title="Database ID">
                                    #{book.id.toString().padStart(3, '0')}
                                  </span>
                                  <BookCover id={book.id} title={book.title} author={book.author} size="sm" className="shadow-sm flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <span className="font-serif font-bold text-slate-900 group-hover:text-blue-700 group-hover:underline block transition-all truncate">
                                      {book.title}
                                    </span>
                                    <span className="text-xs text-slate-400 line-clamp-1 max-w-sm mt-0.5 font-normal">
                                      {book.description}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-800 font-semibold whitespace-nowrap">
                                {book.author}
                              </td>
                              <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5">
                                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                                  {book.country}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded whitespace-nowrap">
                                  {book.genre}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center text-slate-900 font-mono font-bold">
                                {book.year}
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                {book.language}
                              </td>
                              <td className="py-3 px-4 text-slate-600 italic">
                                {book.publisher || 'Heinemann'}
                              </td>
                              <td className="py-3 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleViewDetail(book.id)}
                                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap"
                                    title="View full record card"
                                    id={`row-view-btn-${book.id}`}
                                  >
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => toggleBookmark(book.id)}
                                    className={`p-1.5 rounded border transition-all cursor-pointer ${
                                      isBookmarked
                                        ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100'
                                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                    }`}
                                    title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Masterpiece'}
                                    id={`row-bookmark-btn-${book.id}`}
                                  >
                                    <Bookmark className="h-3.5 w-3.5 fill-current" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Classic Academic Pagination controls */}
              {!loading && !error && books.length > 0 && (
                <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center sm:justify-between gap-4" id="results-footer-pagination">
                  <div className="text-xs text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-800">{books.length}</span> of{' '}
                    <span className="font-bold text-slate-800">{total}</span> indexed publications
                  </div>

                  <div className="flex items-center gap-2" id="pagination-buttons-wrapper">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 disabled:opacity-45 disabled:pointer-events-none transition-all flex items-center gap-1 text-xs font-bold cursor-pointer"
                      id="prev-page-btn"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Previous
                    </button>

                    <div className="flex items-center gap-1" id="page-numbers-wrapper">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                        <button
                          key={num}
                          onClick={() => setPage(num)}
                          className={`px-3 py-1 border rounded text-xs font-bold transition-all cursor-pointer ${
                            page === num
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                              : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                          id={`page-btn-${num}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 disabled:opacity-45 disabled:pointer-events-none transition-all flex items-center gap-1 text-xs font-bold cursor-pointer"
                      id="next-page-btn"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : (
          /* SINGLE RECORD DETAIL VIEW (ACTS AS A DETAILED SUBPAGE) */
          <div className="space-y-6 animate-fade-in" id="record-detail-container">
            {/* Navigation back */}
            <div className="flex items-center justify-between" id="detail-nav-bar">
              <button
                onClick={handleBackToList}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-sm font-bold rounded-md shadow-sm transition-all cursor-pointer"
                id="back-to-retrieval-btn"
              >
                <ChevronLeft className="h-4 w-4" /> Return to Catalog Desk
              </button>

              {selectedBook && (
                <button
                  onClick={() => toggleBookmark(selectedBook.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 border rounded-md shadow-sm text-sm font-bold transition-all cursor-pointer ${
                    bookmarks.includes(selectedBook.id)
                      ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                  id="detail-bookmark-toggle-btn"
                >
                  <Bookmark className={`h-4 w-4 ${bookmarks.includes(selectedBook.id) ? 'fill-current text-amber-600' : ''}`} />
                  {bookmarks.includes(selectedBook.id) ? 'Citation Saved' : 'Save Bibliographic Citation'}
                </button>
              )}
            </div>

            {selectedBookLoading || !selectedBook ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 py-32 flex flex-col items-center justify-center gap-3 animate-pulse" id="detail-loading-wrapper">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                <p className="text-slate-500 font-bold text-xs tracking-wider uppercase font-mono">Querying catalogue monograph sheet...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="detail-content-grid">
                {/* Book Cover and Metadata Summary (Left Column) */}
                <div className="lg:col-span-1 space-y-6" id="detail-left-column">
                  
                  {/* Styled Book Profile Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center text-center relative" id="academic-poster-card">
                    <div className="mb-6">
                      <BookCover
                        id={selectedBook.id}
                        title={selectedBook.title}
                        author={selectedBook.author}
                        year={selectedBook.year}
                        size="lg"
                        className="shadow-md border border-slate-200/50 hover:scale-[1.01] transition-transform duration-300"
                      />
                    </div>

                    <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-xs font-bold text-blue-800 mb-3.5">
                      {selectedBook.genre}
                    </span>

                    <h2 className="font-serif font-bold text-xl leading-snug text-slate-900">
                      {selectedBook.title}
                    </h2>

                    <p className="text-slate-600 text-xs font-semibold mt-1.5">
                      by {selectedBook.author}
                    </p>

                    <p className="text-slate-400 text-xs font-mono font-bold uppercase tracking-wider mt-1 border-b border-slate-100 pb-4 w-full">
                      First Published: {selectedBook.year}
                    </p>

                    <div className="w-full text-left space-y-3.5 text-xs text-slate-600 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] font-mono">Accession Identifier</span>
                        <span className="font-mono font-bold text-slate-800">#DB-{selectedBook.id.toString().padStart(3, '0')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] font-mono">Principal Language</span>
                        <span className="text-slate-800 font-semibold">{selectedBook.language}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] font-mono">Origin Region</span>
                        <span className="text-slate-800 font-semibold">{selectedBook.country}</span>
                      </div>
                    </div>
                  </div>

                  {/* Academic Citation Box */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5" id="academic-citation-card">
                    <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2.5 mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                      <BookmarkCheck className="h-4 w-4 text-blue-600" /> Scholarly Citation Cards
                    </h3>

                    <div className="space-y-4" id="citation-formats-list">
                      {/* APA */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <span className="font-extrabold text-slate-400 uppercase tracking-wider font-mono">APA Format</span>
                          <button
                            onClick={() => handleCopyCitation(getAPA(selectedBook), 'APA')}
                            className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors cursor-pointer text-xs"
                          >
                            {copiedFormat === 'APA' ? (
                              <>
                                <Check className="h-3 w-3 text-green-600" /> <span className="text-green-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copy Citation
                              </>
                            )}
                          </button>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded text-xs font-mono text-slate-600 leading-relaxed">
                          {getAPA(selectedBook)}
                        </div>
                      </div>

                      {/* MLA */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <span className="font-extrabold text-slate-400 uppercase tracking-wider font-mono">MLA Format</span>
                          <button
                            onClick={() => handleCopyCitation(getMLA(selectedBook), 'MLA')}
                            className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors cursor-pointer text-xs"
                          >
                            {copiedFormat === 'MLA' ? (
                              <>
                                <Check className="h-3 w-3 text-green-600" /> <span className="text-green-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copy Citation
                              </>
                            )}
                          </button>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded text-xs font-mono text-slate-600 leading-relaxed">
                          {getMLA(selectedBook)}
                        </div>
                      </div>

                      {/* Chicago */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <span className="font-extrabold text-slate-400 uppercase tracking-wider font-mono">Chicago Format</span>
                          <button
                            onClick={() => handleCopyCitation(getChicago(selectedBook), 'Chicago')}
                            className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors cursor-pointer text-xs"
                          >
                            {copiedFormat === 'Chicago' ? (
                              <>
                                <Check className="h-3 w-3 text-green-600" /> <span className="text-green-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copy Citation
                              </>
                            )}
                          </button>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded text-xs font-mono text-slate-600 leading-relaxed">
                          {getChicago(selectedBook)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Details Panel (Right Columns) */}
                <div className="lg:col-span-2 space-y-6" id="detail-right-column">
                  {/* Synopsis and Literary Context */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6" id="synopsis-panel">
                    <div>
                      <h3 className="text-2xl font-serif font-bold text-slate-900 border-b border-slate-150 pb-3" id="detail-title-heading">
                        {selectedBook.title}
                      </h3>
                      <p className="text-slate-500 text-xs sm:text-sm mt-2 font-medium">
                        Catalogued Creator: <span className="text-slate-800 font-bold">{selectedBook.author}</span>
                      </p>
                    </div>

                    <div className="space-y-3.5">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                        <FileText className="h-4 w-4 text-blue-600" /> Bibliographic Plot Synopsis & Critical Context
                      </h4>
                      <p className="text-slate-700 text-sm sm:text-base leading-relaxed font-serif" id="detail-description-text">
                        {selectedBook.description}
                      </p>
                    </div>

                    {/* Full Metadata Grid */}
                    <div className="pt-6 border-t border-slate-200">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 mb-4">
                        <Info className="h-4 w-4 text-blue-600" /> Repository Index Metadata
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="metadata-details-grid">
                        <div className="bg-slate-50 border border-slate-150 rounded-lg p-3.5 flex items-start gap-3">
                          <User className="h-4.5 w-4.5 text-blue-600 mt-0.5" />
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">Monograph Creator</span>
                            <span className="text-slate-900 font-bold text-xs sm:text-sm">{selectedBook.author}</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-150 rounded-lg p-3.5 flex items-start gap-3">
                          <Calendar className="h-4.5 w-4.5 text-blue-600 mt-0.5" />
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">Publication Chronology</span>
                            <span className="text-slate-900 font-bold text-xs sm:text-sm">{selectedBook.year}</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-150 rounded-lg p-3.5 flex items-start gap-3">
                          <Globe className="h-4.5 w-4.5 text-blue-600 mt-0.5" />
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">Geographic Origin</span>
                            <span className="text-slate-900 font-bold text-xs sm:text-sm">{selectedBook.country}</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-150 rounded-lg p-3.5 flex items-start gap-3">
                          <Bookmark className="h-4.5 w-4.5 text-blue-600 mt-0.5" />
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">Subject Classification</span>
                            <span className="text-slate-900 font-bold text-xs sm:text-sm">{selectedBook.genre}</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-150 rounded-lg p-3.5 flex items-start gap-3">
                          <FileText className="h-4.5 w-4.5 text-blue-600 mt-0.5" />
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">Primary Language</span>
                            <span className="text-slate-900 font-bold text-xs sm:text-sm">{selectedBook.language}</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-150 rounded-lg p-3.5 flex items-start gap-3">
                          <Building className="h-4.5 w-4.5 text-blue-600 mt-0.5" />
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold font-mono">Publisher / Press Agency</span>
                            <span className="text-slate-900 font-bold text-xs sm:text-sm italic">{selectedBook.publisher || 'Heinemann'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Related Works Recommendations */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6" id="related-works-panel">
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                      <BookOpen className="h-3.5 w-3.5 text-blue-600" /> Semantically Related Monographs
                    </h3>

                    {getRelatedBooks().length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No corresponding monographs cataloged under this matching geographic region or genre filter.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="related-works-grid">
                        {getRelatedBooks().map(book => (
                          <div
                            key={book.id}
                            onClick={() => handleViewDetail(book.id)}
                            className="bg-slate-50/50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-200 p-3 rounded-lg cursor-pointer transition-all flex gap-3 group"
                            id={`related-card-${book.id}`}
                          >
                            <BookCover id={book.id} title={book.title} author={book.author} size="sm" className="shadow-sm flex-shrink-0" />
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                              <div>
                                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5 font-mono">{book.genre}</span>
                                <h4 className="font-serif font-bold text-slate-900 text-xs group-hover:text-blue-700 leading-tight transition-colors line-clamp-1">
                                  {book.title}
                                </h4>
                                <p className="text-slate-500 text-[11px] truncate mt-0.5">by {book.author}</p>
                              </div>
                              <span className="text-[10px] font-bold text-blue-600 group-hover:underline mt-1 block">
                                Access Sheet →
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="bg-[#0f172a] border-t border-slate-800 text-slate-400 text-xs py-8 px-6 mt-12" id="app-footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <span className="font-serif text-white font-bold tracking-tight text-sm block">African Literature Bibliographic Repository</span>
            <p className="mt-1 text-[11px] text-slate-400 max-w-xl">
              A scholarly depository recording the continent's monumental modern narratives. Structured for university research, preservation cataloging, and bibliographic information retrieval.
            </p>
          </div>
          <div className="flex gap-4 text-[11px] text-slate-500 font-mono" id="footer-links-container">
            <span>Faculty of Comparative Literature</span>
            <span>•</span>
            <span>Local Index Directory</span>
            <span>•</span>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
