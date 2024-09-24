import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();


app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    methods:['GET','POST','DELETE','PUT'] ,
    allowedHeaders:[
      "Content-Type",
      "Authorization",
      "Cache-control",
      "Expires",
      "Pragma"
    ],
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "16kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "16kb",
  })
);

app.use(express.static("public"));
app.use(cookieParser());

// for user
import userrouter from "./routes/user.routes.js";

app.use("/api/v1/users", userrouter);




export { app };
