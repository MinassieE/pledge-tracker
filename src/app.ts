import express, { Express }from "express";
import mongoose, { ConnectOptions } from "mongoose";
import bodyParser from "body-parser";
import dev from "../config/default";

import testRouter from "./routes/test/test.router";
import { createInitialAdmin } from "./modules/createSystemAdmin";
import authRoutes from "./routes/auth/auth.router";
import adminRouter from "./routes/admin/admin.router";

const app: Express = express();

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
app.use("/admin", adminRouter);

export default app
