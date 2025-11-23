import express from "express";

import { 
    adminLogin, 
    changePassword 
} from "./auth.controller";

const router = express.Router();

// Admin Login Route
router.post('/admin-login', adminLogin );
router.put('/change-password/:id', changePassword );

export default router;