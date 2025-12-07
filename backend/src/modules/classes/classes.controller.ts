import { Request, Response, NextFunction } from 'express';
import { ClassesService } from './classes.service';

const classesService = new ClassesService();

export class ClassesController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const academicYear = req.query.academicYear ? Number(req.query.academicYear) : undefined;
      const classes = await classesService.getAll(academicYear);
      res.json(classes);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const classRecord = await classesService.getById(Number(req.params.id));
      res.json(classRecord);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const classRecord = await classesService.create(req.body);
      res.status(201).json(classRecord);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const classRecord = await classesService.update(Number(req.params.id), req.body);
      res.json(classRecord);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await classesService.delete(Number(req.params.id));
      res.json({ message: 'Class deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
