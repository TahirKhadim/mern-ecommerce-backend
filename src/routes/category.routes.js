import { addCategory, deleteCategory, getAllcategory, updateCategory } from "../controllers/Category.controller.js";
import { Router } from "express";

import { upload } from "../middleware/multer.middleware.js";
import { verifyjwt,authorizeAdmin } from "../middleware/auth.middleware.js";



const router = Router();
  
router.route("/add").post(
  upload.fields([
    {
      name: "image",
      maxCount: 1,
    },
    
  ]),
  addCategory
);

router.route('/allcat').get(getAllcategory)
router.route('/delete/:id').delete(deleteCategory)
router.route('/update/:id').patch(
    upload.fields([
      {
        name: "image",
        maxCount: 1,
      },
      
    ]),updateCategory);

export default router;