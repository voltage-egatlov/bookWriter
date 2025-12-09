export type BlockType = 'Page'

export interface Block {
  id: string
  content: string
  order: number
  block_type: BlockType
}

export interface Chapter {
  id: string
  title: string
  blocks: Block[]
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
