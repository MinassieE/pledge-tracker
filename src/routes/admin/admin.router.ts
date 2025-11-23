import express from "express";

import { 
    addFollowUp, 
    getAllFollowUps,
    addPledge,
    updatePledge,
    assignPledgeToFollowUp,
    assignMultiplePledgesToFollowUp
} from "./admin.controller";

const adminRouter = express.Router();

// Admin Login Route
adminRouter.post('/addFollowUp', addFollowUp );
adminRouter.get('/getAllFollowUps', getAllFollowUps );
adminRouter.post('/addPledge', addPledge );
adminRouter.post('/updatePledge', updatePledge);
adminRouter.post('/assignPledgeToFollowUp', assignPledgeToFollowUp);
adminRouter.post('/assignMultiplePledgesToFollowUp', assignMultiplePledgesToFollowUp);

export default adminRouter;