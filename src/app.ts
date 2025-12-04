import express, { Express }from "express";
import mongoose, { ConnectOptions } from "mongoose";
import bodyParser from "body-parser";
import cors from "cors";
import dev from "../config/default";

import testRouter from "./routes/test/test.router";
import { createInitialAdmin } from "./modules/createSystemAdmin";
import authRoutes from "./routes/auth/auth.router";
import adminRouter from "./routes/admin/admin.router";

import { validateToken } from './utils/jwtAuth';
import { authorize } from "./utils/authorize"



const app: Express = express();

app.use(cors({
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed methods
  credentials: true, // Include credentials in requests (optional)
}));

// mongoose
//   .connect(dev.db.dbUrl, { useNewUrlParser: true } as ConnectOptions)
//   .then(async (res) => {
//     console.log("Connected to db");
//     await createInitialAdmin();
//   })
//   .catch((err) => {
//     console.log("dbUrl ", dev.db.dbUrl);
//     console.log("Error while connecting to db " + err);
// });

mongoose
  .connect(dev.db.dbUrl)
  .then(async () => {
    console.log("Connected to db");
    await createInitialAdmin();
  })
  .catch((err) => {
    console.log("dbUrl ", dev.db.dbUrl);
    console.log("Error while connecting to db", err);
  });

app.use(bodyParser.json()); //To enable the submitting of json to this application
app.use(bodyParser.urlencoded({ extended: true })); //To enable the submitting of urlencoded data like the get request

app.use("/test", testRouter);
app.use("/auth", authRoutes);
app.use("/admin", validateToken, adminRouter);

export default app
