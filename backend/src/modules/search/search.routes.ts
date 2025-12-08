import { Router } from 'express';
import { SearchController } from './search.controller';
import { authenticate } from '../../lib/auth/auth';

const router = Router();
const searchController = new SearchController();

// All routes require authentication
router.use(authenticate);

router.get('/pages', searchController.getAllPages.bind(searchController));
router.get('/pages/search', searchController.searchPages.bind(searchController));
router.get('/pages/categories', searchController.getPagesByCategory.bind(searchController));

export default router;
