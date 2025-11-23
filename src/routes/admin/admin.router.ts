import express from "express";

import { 
    addFollowUp, 
    getAllFollowUps,
    getFollowUpById,
    updateFollowUpStatus,
    addPledge,
    getAllPledges,
    getPledgeById,
    updatePledge,
    getUnassignedPledges,
    assignPledgeToFollowUp,
    assignMultiplePledgesToFollowUp
} from "./admin.controller";

const adminRouter = express.Router();

// Admin Login Route
adminRouter.post('/addFollowUp', addFollowUp );
adminRouter.get('/getAllFollowUps', getAllFollowUps );
adminRouter.get('/getFollowUpById/:id', getFollowUpById);
adminRouter.put('/updateFollowUpStatus/:id', updateFollowUpStatus);
adminRouter.post('/addPledge', addPledge );
adminRouter.get('/getAllPledges', getAllPledges);
adminRouter.get('/getPledgeById/:id', getPledgeById);
adminRouter.put('/updatePledge/:id', updatePledge);
adminRouter.get('/getUnassignedPledges', getUnassignedPledges);
adminRouter.post('/assignPledgeToFollowUp', assignPledgeToFollowUp);
adminRouter.post('/assignMultiplePledgesToFollowUp', assignMultiplePledgesToFollowUp);

export default adminRouter;