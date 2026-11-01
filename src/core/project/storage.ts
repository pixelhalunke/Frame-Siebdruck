import { openDB } from 'idb';
import { projectSchema, type Project } from './model';
const database = () => openDB('frame-studio', 1, { upgrade(db) { db.createObjectStore('projects', { keyPath: 'id' }); } });
export async function saveProject(project: Project) {
  const db = await database();
  try { await db.put('projects', projectSchema.parse(project)); } finally { db.close(); }
}
export async function listProjects(): Promise<Project[]> {
  const db = await database();
  try {
    const raw: unknown[] = await db.getAll('projects');
    return raw.map(p => projectSchema.parse(p)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } finally { db.close(); }
}
export async function deleteProject(id: string) {
  const db = await database();
  try { await db.delete('projects', id); } finally { db.close(); }
}
