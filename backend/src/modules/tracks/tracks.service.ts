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
   * isActive is calculated based on whether the track has at least one student
   * (checks both Student.track field and Enrollment -> Class.track)
   */
  async getAll(filters?: { isActive?: boolean }) {
    const tracks = await prisma.track.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    // Calculate isActive for each track based on student count
    const tracksWithActivity = await Promise.all(
      tracks.map(async (track) => {
        // Get unique students in two ways (a student might appear in both):
        // 1. Students with track field matching track name
        // 2. Students enrolled in classes with track matching track name
        // Use Set to deduplicate by student ID to avoid double-counting
        const [studentsInTrack, studentsInClasses] = await Promise.all([
          prisma.student.findMany({
            where: {
              track: track.name,
            },
            select: { id: true },
          }),
          prisma.student.findMany({
            where: {
              enrollments: {
                some: {
                  class: {
                    track: track.name,
                  },
                },
              },
            },
            select: { id: true },
          }),
        ]);

        // Get unique student IDs to avoid double counting
        const uniqueStudentIds = new Set([
          ...studentsInTrack.map(s => s.id),
          ...studentsInClasses.map(s => s.id),
        ]);

        const totalStudents = uniqueStudentIds.size;
        const isActive = totalStudents > 0;

        // Apply filter if provided
        if (filters?.isActive !== undefined && filters.isActive !== isActive) {
          return null;
        }

        return {
          ...track,
          isActive,
        };
      })
    );

    // Filter out null values (tracks that didn't match the filter)
    return tracksWithActivity.filter((track) => track !== null) as typeof tracks;
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
   * Delete track
   * Only allows deletion of inactive tracks (tracks with no students)
   * Performs hard delete (permanently removes from database)
   */
  async delete(id: number) {
    const track = await prisma.track.findUnique({
      where: { id },
    });

    if (!track) {
      throw new NotFoundError('Track');
    }

    // Check if track has any students
    // We need to count unique students (a student might appear in both queries)
    const [studentsWithTrackField, studentsInClasses] = await Promise.all([
      prisma.student.findMany({
        where: {
          track: track.name,
        },
        select: { id: true },
      }),
      prisma.student.findMany({
        where: {
          enrollments: {
            some: {
              class: {
                track: track.name,
              },
            },
          },
        },
        select: { id: true },
      }),
    ]);

    // Get unique student IDs to avoid double counting
    const uniqueStudentIds = new Set([
      ...studentsWithTrackField.map(s => s.id),
      ...studentsInClasses.map(s => s.id),
    ]);

    const totalStudents = uniqueStudentIds.size;

    if (totalStudents > 0) {
      throw new ValidationError(`לא ניתן למחוק מגמה פעילה (יש ${totalStudents} תלמידים במגמה זו)`);
    }

    // Hard delete - permanently remove from database
    try {
      const deleted = await prisma.track.delete({
        where: { id },
      });
      return deleted;
    } catch (error: any) {
      // If there's a foreign key constraint error, provide a better message
      if (error.code === 'P2003') {
        throw new ValidationError('לא ניתן למחוק מגמה זו - היא בשימוש במערכת');
      }
      throw error;
    }
  }
}
