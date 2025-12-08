import { Request, Response, NextFunction } from 'express';
import { SearchService } from './search.service';

const searchService = new SearchService();

export class SearchController {
  /**
   * Search for pages
   */
  async searchPages(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const query = (req.query.q as string) || '';

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const pages = await searchService.searchPages(user.userId, query);
      res.json(pages);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all accessible pages
   */
  async getAllPages(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const pages = await searchService.getAllAccessiblePages(user.userId);
      res.json(pages);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pages grouped by category
   */
  async getPagesByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const grouped = await searchService.getPagesByCategory(user.userId);
      res.json(grouped);
    } catch (error) {
      next(error);
    }
  }
}

