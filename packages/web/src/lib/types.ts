export interface Chapter {
  id: string
  title: string
  content: string
  order: number
  created_at: string
  updated_at: string
}

export interface Book {
  id: string
  title: string
  author: string
  dedication: string | null
  created_at: string
  updated_at: string
  chapters: Chapter[]
}
