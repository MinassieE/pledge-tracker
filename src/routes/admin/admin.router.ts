import express from "express";
import { authorize } from "../../utils/authorize"

import { 
    addAdmin,
    addFollowUp, 
    getAllFollowUps,
    getFollowUpById,
    updateFollowUpStatus,
    addPledge,
    bulkAddPledges,
    getAllPledges,
    getPledgeById,
    updatePledge,
    getUnassignedPledges,
    assignPledgeToFollowUp,
    assignMultiplePledgesToFollowUp,
    getMyPledges,
    getMyPledgeById,
    updateMyPledge,
    getPledgesByFollowUp,
    getPledgesByStatus,
    getPledgesByContributionType,
    getDueMonthlyPledges,
    getOverduePledges,
    getAllAdmins,
    getAdminById,
    updateAdmin,
    deleteAdmin,
    deleteFollowUp,
    deletePledge,
} from "./admin.controller";

import { 
    getTotalCollectionStats,
    getMonthlyCollectionReport,
    getFollowUpPerformance,
    getAllFollowUpPerformance
 } from "./report/admin.report.controller";

const adminRouter = express.Router();

// Admin Login Route
adminRouter.post('/addAdmin', authorize("superAdmin"), addAdmin );
adminRouter.post('/addFollowUp', authorize(["superAdmin", "admin"]), addFollowUp );
adminRouter.get('/getAllFollowUps', authorize(["superAdmin", "admin"]), getAllFollowUps );
adminRouter.get('/getFollowUpById/:id', authorize(["superAdmin", "admin"]), getFollowUpById);
adminRouter.put('/updateFollowUpStatus/:id', authorize(["superAdmin", "admin"]), updateFollowUpStatus);
adminRouter.post('/addPledge', authorize(["superAdmin", "admin"]), addPledge );
adminRouter.post('/bulkAddPledges', authorize(["superAdmin", "admin"]), bulkAddPledges );
adminRouter.get('/getAllPledges', authorize(["superAdmin", "admin"]), getAllPledges);
adminRouter.get('/getPledgeById/:id', authorize(["superAdmin", "admin"]), getPledgeById);
adminRouter.put('/updatePledge/:id', authorize(["superAdmin", "admin"]), updatePledge);
adminRouter.get('/getUnassignedPledges', authorize(["superAdmin", "admin"]), getUnassignedPledges);
adminRouter.post('/assignPledgeToFollowUp', authorize(["superAdmin", "admin"]), assignPledgeToFollowUp);
adminRouter.post('/assignMultiplePledgesToFollowUp', authorize(["superAdmin", "admin"]), assignMultiplePledgesToFollowUp);

adminRouter.get('/getPledgesByFollowUp/:followUpId', authorize(["superAdmin", "admin"]), getPledgesByFollowUp);
adminRouter.get('/getPledgesByStatus/:status', authorize(["superAdmin", "admin"]), getPledgesByStatus);
adminRouter.get('/getPledgesByContributionType/:contributionType', authorize(["superAdmin", "admin"]), getPledgesByContributionType);
adminRouter.get('/getDueMonthlyPledges', authorize(["superAdmin", "admin", "followUp"]), getDueMonthlyPledges); 
adminRouter.get('/getOverduePledges', authorize(["superAdmin", "admin", "followUp"]), getOverduePledges);   

// Admin management (SuperAdmin only)
adminRouter.get("/getAllAdmins", authorize("superAdmin"), getAllAdmins);
adminRouter.get("/getAdminById/:id", authorize("superAdmin"), getAdminById);
adminRouter.put("/updateAdmin/:id", authorize("superAdmin"), updateAdmin);
adminRouter.delete("/deleteAdmin/:id", authorize("superAdmin"), deleteAdmin);

// Follow-up & pledge deletion
adminRouter.delete("/deleteFollowUp/:id", authorize(["superAdmin", "admin"]), deleteFollowUp);
adminRouter.delete("/deletePledge/:id", authorize(["superAdmin", "admin"]), deletePledge);

// ------------------------
// Follow-Up Endpoints
// ------------------------
adminRouter.get('/myPledges', authorize("followUp"), getMyPledges);
adminRouter.get('/myPledges/:id', authorize("followUp"), getMyPledgeById);
adminRouter.put('/myPledges/:id', authorize("followUp"), updateMyPledge);

//-------------------------
// Report Endpoints
//-------------------------
adminRouter.get('/reports/totalCollectionStats', authorize(["superAdmin", "admin"]), getTotalCollectionStats);
adminRouter.get('/reports/monthlyCollectionReport/:year/:month', authorize(["superAdmin", "admin"]), getMonthlyCollectionReport);
adminRouter.get('/reports/followUpPerformance/:id', authorize(["superAdmin", "admin"]), getFollowUpPerformance);

adminRouter.get("/allFollowUpPerformance", authorize(["superAdmin", "admin"]), getAllFollowUpPerformance);

export default adminRouter;