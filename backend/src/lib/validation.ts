import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errors';

export const validateRequest = <T extends z.ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new ValidationError('Validation failed', error.errors));
      }
      return next(error);
    }
  };
};

// Validation schemas
export const soldierSchema = z.object({
  personalNumber: z.string().min(1, 'Personal number is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  type: z.enum(['CONSCRIPT', 'PERMANENT'], {
    errorMap: () => ({ message: 'Type must be CONSCRIPT or PERMANENT' }),
  }),
  departmentId: z.number().int().positive('Department ID must be a positive integer'),
  roleId: z.number().int().positive('Role ID must be a positive integer').optional(),
  isCommander: z.boolean().optional().default(false),
});

export const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
});

export const roleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
});

export const roomSchema = z.object({
  name: z.string().min(1, 'Room name is required'),
  capacity: z.number().int().positive('Capacity must be a positive integer'),
});

