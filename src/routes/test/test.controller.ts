// import { Request, Response } from "express";
import { RequestHandler } from "express";

export const testServer: RequestHandler = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, message: "Works like a charm 🚀" });
  } catch (err) {
    next(err);
  }
};