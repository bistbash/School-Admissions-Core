import { prisma } from '../../lib/database/prisma';
import { NotFoundError, ValidationError } from '../../lib/utils/errors';

export interface CreateTrackData {
  name: string;
  description?: string;
}

export interface UpdateTrackData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export class TracksService {
  /**
   * Create a new track
   */
  async create(data: CreateTrackData) {
    // Check if track with this name already exists
    const existing = await prisma.track.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ValidationError('מגמה עם שם זה כבר קיימת');
    }

    return prisma.track.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        isActive: true,
      },
    });
  }

  /**
   * Get all tracks
   */
  async getAll(filters?: { isActive?: boolean }) {
    const where: any = {};
    
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return prisma.track.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Get track by ID
   */
  async getById(id: number) {
    const track = await prisma.track.findUnique({
      where: { id },
    });

    if (!track) {
      throw new NotFoundError('Track');
    }

    return track;
  }

  /**
   * Update track
   */
  async update(id: number, data: UpdateTrackData) {
    const track = await prisma.track.findUnique({
      where: { id },
    });

    if (!track) {
      throw new NotFoundError('Track');
    }

    // If name is being updated, check if new name already exists
    if (data.name && data.name !== track.name) {
      const existing = await prisma.track.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        throw new ValidationError('מגמה עם שם זה כבר קיימת');
      }
    }

    return prisma.track.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        description: data.description?.trim() || undefined,
        isActive: data.isActive,
      },
    });
  }

  /**
   * Delete track (soft delete)
   */
  async delete(id: number) {
    const track = await prisma.track.findUnique({
      where: { id },
    });

    if (!track) {
      throw new NotFoundError('Track');
    }

    return prisma.track.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}
