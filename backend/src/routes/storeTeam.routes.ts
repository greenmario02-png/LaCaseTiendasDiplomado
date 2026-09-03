import { Router } from 'express';

import * as storeTeamController from '../controllers/storeTeam.controller';
import { authenticate } from '../middlewares/auth';
import { requireStoreAdmin } from '../middlewares/roles';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authenticate);

router.post('/team/invite', asyncHandler(storeTeamController.inviteEmployee));
router.get('/team', asyncHandler(storeTeamController.listEmployees));
router.get('/team/users/search', requireStoreAdmin, asyncHandler(storeTeamController.searchUsers));
router.put('/team/:id/role', asyncHandler(storeTeamController.updateEmployeeRole));
router.delete('/team/:id', asyncHandler(storeTeamController.removeEmployee));

export default router;
