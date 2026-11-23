import { docRepository } from './doc.repository';
import { CreateDocDto, UpdateDocDto } from '@teamos/shared';
import { createHttpError } from '../../middleware/errorHandler';

export class DocService {
  async getDocs(workspaceId: string, projectId?: string) {
    return docRepository.findByWorkspace(workspaceId, projectId);
  }

  async getDoc(id: string, workspaceId: string) {
    const doc = await docRepository.findById(id);
    if (!doc || doc.workspaceId !== workspaceId) {
      throw createHttpError(404, 'NOT_FOUND', 'Document not found');
    }
    return doc;
  }

  async createDoc(authorId: string, workspaceId: string, dto: CreateDocDto) {
    return docRepository.create(authorId, workspaceId, dto);
  }

  async updateDoc(id: string, workspaceId: string, dto: UpdateDocDto) {
    await this.getDoc(id, workspaceId);
    return docRepository.update(id, dto);
  }

  async deleteDoc(id: string, workspaceId: string) {
    await this.getDoc(id, workspaceId);
    return docRepository.softDelete(id);
  }
}

export const docService = new DocService();
