import express from "express";
import { testServer } from "./test.controller";

const testRouter = express.Router();

testRouter.get("/", testServer);

export default testRouter;