import { useState } from 'react';
import { Book } from '@/lib/types';
import { FileDialog } from '@/components/FileDialog';
import { BookView } from '@/components/BookView';

export function ViewerPage() {
  const [book, setBook] = useState<Book | null>(null);

  const handleBookLoaded = (loadedBook: Book) => {
    setBook(loadedBook);
  };

  if (!book) {
    return <FileDialog onBookLoaded={handleBookLoaded} />;
  }

  return <BookView book={book} />;
}
