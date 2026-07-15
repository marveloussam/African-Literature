import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Load the JSON database
const dbPath = path.join(__dirname, 'src', 'data', 'books.json');
let booksData: any[] = [];

try {
  const fileContent = fs.readFileSync(dbPath, 'utf-8');
  booksData = JSON.parse(fileContent);
} catch (error) {
  console.error('Error loading database JSON:', error);
  // Fallback empty array
  booksData = [];
}

// Global metadata for dropdowns
const getFilterMetadata = (books: any[]) => {
  const genres = Array.from(new Set(books.map(b => b.genre))).filter(Boolean).sort();
  const countries = Array.from(new Set(books.map(b => b.country))).filter(Boolean).sort();
  const languages = Array.from(new Set(books.map(b => b.language))).filter(Boolean).sort();
  return { genres, countries, languages };
};

// API: Get all books with search, filters, sorting, and pagination
app.get('/api/books', (req, res) => {
  try {
    const {
      q = '',
      genre = '',
      country = '',
      language = '',
      sortBy = 'year',
      sortOrder = 'asc',
      page = '1',
      limit = '10'
    } = req.query;

    let results = [...booksData];

    // 1. Text Search across all fields
    const queryStr = String(q).trim().toLowerCase();
    if (queryStr) {
      const searchTerms = queryStr.split(/\s+/);
      results = results.filter(book => {
        return searchTerms.every(term => {
          return (
            (book.title && book.title.toLowerCase().includes(term)) ||
            (book.author && book.author.toLowerCase().includes(term)) ||
            (book.genre && book.genre.toLowerCase().includes(term)) ||
            (book.country && book.country.toLowerCase().includes(term)) ||
            (book.language && book.language.toLowerCase().includes(term)) ||
            (book.publisher && book.publisher.toLowerCase().includes(term)) ||
            (book.description && book.description.toLowerCase().includes(term)) ||
            (book.year && String(book.year).includes(term))
          );
        });
      });
    }

    // 2. Filters
    if (genre) {
      results = results.filter(book => book.genre === genre);
    }
    if (country) {
      results = results.filter(book => book.country === country);
    }
    if (language) {
      results = results.filter(book => book.language === language);
    }

    // 3. Sorting
    results.sort((a, b) => {
      let fieldA = a[sortBy as string];
      let fieldB = b[sortBy as string];

      // Handle numerical vs string sorting
      if (typeof fieldA === 'number' && typeof fieldB === 'number') {
        return sortOrder === 'asc' ? fieldA - fieldB : fieldB - fieldA;
      }

      // Default string comparison
      fieldA = String(fieldA || '').toLowerCase();
      fieldB = String(fieldB || '').toLowerCase();

      if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
      if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // 4. Pagination
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const totalRecords = results.length;
    const totalPages = Math.ceil(totalRecords / limitNum);

    const startIndex = (pageNum - 1) * limitNum;
    const paginatedResults = results.slice(startIndex, startIndex + limitNum);

    // Get metadata based on the full database so dropdowns remain complete
    const metadata = getFilterMetadata(booksData);

    res.json({
      records: paginatedResults,
      total: totalRecords,
      page: pageNum,
      limit: limitNum,
      totalPages,
      genres: metadata.genres,
      countries: metadata.countries,
      languages: metadata.languages
    });
  } catch (error) {
    console.error('API Error in GET /api/books:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Get book by ID
app.get('/api/books/:id', (req, res) => {
  try {
    const bookId = parseInt(req.params.id, 10);
    const book = booksData.find(b => b.id === bookId);

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(book);
  } catch (error) {
    console.error('API Error in GET /api/books/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Production: Serve frontend static build files
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server
// Use 3001 as default for development (since Vite is on 3000), 3000 for production (Cloud Run)
const PORT = process.env.NODE_ENV === 'production' ? 3000 : 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server is running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
