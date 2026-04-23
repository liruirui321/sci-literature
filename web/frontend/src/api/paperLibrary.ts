import { openDB, IDBPDatabase } from 'idb'

export interface PaperFile {
  id: string
  folderId: string
  filename: string
  title: string
  authors: string[]
  year?: number
  journal?: string
  doi?: string
  abstract?: string
  method?: string
  findings?: string
  limitations?: string
  keywords?: string[]
  pdfBlob?: Blob
  addedAt: number
  analyzedAt?: number
  [key: string]: unknown
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
  createdAt: number
}

let dbInstance: IDBPDatabase | null = null

async function getDB() {
  if (dbInstance) return dbInstance

  dbInstance = await openDB('paper-library', 1, {
    upgrade(db) {
      const paperStore = db.createObjectStore('papers', { keyPath: 'id' })
      paperStore.createIndex('by-folder', 'folderId')

      const folderStore = db.createObjectStore('folders', { keyPath: 'id' })
      folderStore.createIndex('by-parent', 'parentId')

      folderStore.add({
        id: 'root',
        name: 'My Library',
        parentId: null,
        createdAt: Date.now(),
      })
    },
  })

  return dbInstance
}

// Folder operations
export async function getAllFolders(): Promise<Folder[]> {
  const db = await getDB()
  return db.getAll('folders')
}

export async function getFolder(id: string): Promise<Folder | undefined> {
  const db = await getDB()
  return db.get('folders', id)
}

export async function getSubfolders(parentId: string | null): Promise<Folder[]> {
  const db = await getDB()
  return db.getAllFromIndex('folders', 'by-parent', parentId)
}

export async function createFolder(name: string, parentId: string | null = 'root'): Promise<Folder> {
  const db = await getDB()
  const folder: Folder = {
    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    parentId,
    createdAt: Date.now(),
  }
  await db.add('folders', folder)
  return folder
}

export async function renameFolder(id: string, newName: string): Promise<void> {
  const db = await getDB()
  const folder = await db.get('folders', id)
  if (folder) {
    folder.name = newName
    await db.put('folders', folder)
  }
}

export async function deleteFolder(id: string): Promise<void> {
  if (id === 'root') throw new Error('Cannot delete root folder')
  const db = await getDB()

  // Delete all subfolders recursively
  const subfolders = await getSubfolders(id)
  for (const sub of subfolders) {
    await deleteFolder(sub.id)
  }

  // Delete all papers in this folder
  const papers = await getPapersByFolder(id)
  for (const paper of papers) {
    await db.delete('papers', paper.id)
  }

  // Delete the folder itself
  await db.delete('folders', id)
}

export async function moveFolder(id: string, newParentId: string | null): Promise<void> {
  if (id === 'root') throw new Error('Cannot move root folder')
  const db = await getDB()
  const folder = await db.get('folders', id)
  if (folder) {
    folder.parentId = newParentId
    await db.put('folders', folder)
  }
}

// Paper operations
export async function getAllPapers(): Promise<PaperFile[]> {
  const db = await getDB()
  return db.getAll('papers')
}

export async function getPaper(id: string): Promise<PaperFile | undefined> {
  const db = await getDB()
  return db.get('papers', id)
}

export async function getPapersByFolder(folderId: string): Promise<PaperFile[]> {
  const db = await getDB()
  return db.getAllFromIndex('papers', 'by-folder', folderId)
}

export async function addPaper(paper: Omit<PaperFile, 'id' | 'addedAt'>): Promise<PaperFile> {
  const db = await getDB()
  const newPaper: PaperFile = {
    id: `paper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    addedAt: Date.now(),
    ...paper,
  }
  await db.add('papers', newPaper)
  return newPaper
}

export async function updatePaper(id: string, updates: Partial<PaperFile>): Promise<void> {
  const db = await getDB()
  const paper = await db.get('papers', id)
  if (paper) {
    Object.assign(paper, updates)
    await db.put('papers', paper)
  }
}

export async function deletePaper(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('papers', id)
}

export async function movePaper(id: string, newFolderId: string): Promise<void> {
  const db = await getDB()
  const paper = await db.get('papers', id)
  if (paper) {
    paper.folderId = newFolderId
    await db.put('papers', paper)
  }
}

// Batch operations
export async function getPapersRecursive(folderId: string): Promise<PaperFile[]> {
  const papers = await getPapersByFolder(folderId)
  const subfolders = await getSubfolders(folderId)

  for (const sub of subfolders) {
    const subPapers = await getPapersRecursive(sub.id)
    papers.push(...subPapers)
  }

  return papers
}

export async function getFolderTree(): Promise<Folder[]> {
  return getAllFolders()
}

// Stats
export async function getFolderStats(folderId: string): Promise<{ paperCount: number; subfolderCount: number }> {
  const papers = await getPapersByFolder(folderId)
  const subfolders = await getSubfolders(folderId)
  return {
    paperCount: papers.length,
    subfolderCount: subfolders.length,
  }
}
