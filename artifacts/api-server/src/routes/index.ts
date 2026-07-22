import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import settingsRouter from "./settings";
import languagesRouter from "./languages";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import analyticsRouter from "./analytics";
import aiRouter from "./ai";
import menuRouter from "./menu";
import storageRouter from "./storage";
import importRouter from "./import";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(settingsRouter);
router.use(languagesRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(analyticsRouter);
router.use(aiRouter);
router.use(menuRouter);
router.use(storageRouter);
router.use(importRouter);

export default router;
