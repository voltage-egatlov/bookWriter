import { useState } from 'react';
import { Book } from '@/lib/types';
import { FileUpload } from '@/components/FileUpload';
import { BookView } from '@/components/BookView';

export default function ViewerPage() {
  const [book, setBook] = useState<Book | null>(null);

  const handleBookParsed = (parsedBook: Book) => {
    setBook(parsedBook);
  };

  if (!book) {
    return <FileUpload onBookParsed={handleBookParsed} />;
  }

  return <BookView book={book} />;
}
