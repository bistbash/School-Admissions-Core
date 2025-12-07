import { Router } from 'express';
import { DocsController } from './docs.controller';

const router = Router();
const docsController = new DocsController();

// Public endpoint - no authentication required
router.get('/', docsController.getDocs.bind(docsController));

export default router;
