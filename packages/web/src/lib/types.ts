export interface Book {
  id: string
  title: string
  author: string
  createdAt: string
  updatedAt: string
  chapters: Chapter[]
}

export interface Chapter {
  id: string
  title: string
  content: string
  order: number
  createdAt: string
  updatedAt: string
}
