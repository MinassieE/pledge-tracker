import express from "express";

import { adminLogin } from "./auth.controller";

const router = express.Router();

// Admin Login Route
router.post('/admin-login', adminLogin );

export default router;