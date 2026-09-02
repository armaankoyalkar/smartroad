import { Router } from "express";
import { getCategories, getEnums } from "../controllers/meta.controller.js";

export const metaRouter: Router = Router();

metaRouter.get("/categories", getCategories);
metaRouter.get("/enums", getEnums);
