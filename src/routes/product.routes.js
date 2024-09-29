import {
  createProduct,
  deleteProduct,
  updateProduct,
  getAllProduct,
  productByCategory,
  productById,
} from "../controllers/product.controller.js";
import { Router } from "express";

import { upload } from "../middleware/multer.middleware.js";
import { verifyjwt, authorizeAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/product").post(
  upload.fields([
    {
      name: "images",
      maxCount: 3,
    },
  ]),
  createProduct
);

router.route("/product").get(getAllProduct);
router.route("/product/category:id").get(productByCategory);
router.route("/product/:id").get(productById);
router.route("product/:id").delete(deleteProduct);
router.route("product/:id").patch(
  upload.fields([
    {
      name: "images",
      maxCount: 4,
    },
  ]),
  updateProduct
);

export default router;
