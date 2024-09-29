import {
    changeAvatar,
    changecoverimage,
    changePassword,
    getCurrentUser,
    refreshAccessToken,
    Register,
    updateUserInfo,
    loginUser,
    logoutuser,
    verifyUser,getAllUser
  } from "../controllers/user.controller.js";
  import { Router } from "express";
  
  import { upload } from "../middleware/multer.middleware.js";
  import { verifyjwt,authorizeAdmin } from "../middleware/auth.middleware.js";
  
  const router = Router();
  
  router.route("/register").post(
    upload.fields([
      {
        name: "avatar",
        maxCount: 1,
      },
      {
        name: "coverimage",
        maxCount: 1,
      },
    ]),
    Register
  );

  router.post('/verify', verifyUser);
  
  router.route("/login").post(loginUser);

  router.route("/logout").post(verifyjwt, logoutuser);
  
  router.route("/refresh-token").post(refreshAccessToken);
  router.route("/change-password").post(verifyjwt, changePassword);
  router.route("/update-account").patch(verifyjwt, updateUserInfo);
  router.route("/current-user").get(verifyjwt, getCurrentUser);
  router.route("/all-users").get(verifyjwt, authorizeAdmin,getAllUser);
  
  router.route("/avatar").patch(verifyjwt, upload.single("avatar"), changeAvatar);
  router
    .route("/cover-image")
    .patch(verifyjwt, upload.single("coverimage"), changecoverimage);
  
  export default router;
  