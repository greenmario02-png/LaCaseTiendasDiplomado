import { Router } from 'express';

import * as jobController from '../controllers/job.controller';
import { authenticate, optionalAuth } from '../middlewares/auth';
import { cvUpload } from '../middlewares/upload';
import { validate } from '../middlewares/validate';
import { applyJobSchema, listJobsSchema } from '../schemas/job.schemas';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/categories', asyncHandler(jobController.categories));
router.get('/', validate(listJobsSchema), asyncHandler(jobController.listPublic));
router.get('/applications/mine', authenticate, asyncHandler(jobController.myApplications));
router.post('/applications/:id/cv-link', authenticate, asyncHandler(jobController.cvLink));
router.get('/cv/download', asyncHandler(jobController.cvDownload));
router.get('/:id', optionalAuth, asyncHandler(jobController.detailPublic));
router.post('/:id/apply', authenticate, cvUpload.single('cv'), validate(applyJobSchema), asyncHandler(jobController.apply));
router.delete('/:id/apply', authenticate, asyncHandler(jobController.withdraw));

export default router;
