import { Request, Response, NextFunction } from 'express';
import { TracksService, CreateTrackData, UpdateTrackData } from './tracks.service';
import { z } from 'zod';

const tracksService = new TracksService();

const createTrackSchema = z.object({
  name: z.string().min(1, 'שם מגמה הוא שדה חובה'),
  description: z.string().optional(),
});

const updateTrackSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export class TracksController {
  /**
   * Create a new track
   * POST /api/tracks
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createTrackSchema.parse(req.body);
      const result = await tracksService.create(validated);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all tracks
   * GET /api/tracks
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      };
      const tracks = await tracksService.getAll(filters);
      res.json(tracks);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get track by ID
   * GET /api/tracks/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const track = await tracksService.getById(id);
      res.json(track);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update track
   * PUT /api/tracks/:id
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const validated = updateTrackSchema.parse(req.body);
      const result = await tracksService.update(id, validated);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete track (hard delete for inactive tracks only)
   * DELETE /api/tracks/:id
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid track ID' });
      }
      const result = await tracksService.delete(id);
      res.json({ success: true, track: result });
    } catch (error) {
      next(error);
    }
  }
}
