import express from "express";
import { validateToken } from "../../utils/jwtAuth";

import { 
    adminLogin 
} from "./auth.controller";

import {
    forgotPassword,
    verifyOTP,
    resetPassword,
    changePassword
} from "./password.controller";

const router = express.Router();

// Admin Login Route
router.post('/admin-login', adminLogin);

// Password Management Routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.post('/change-password', validateToken, changePassword);

export default router;