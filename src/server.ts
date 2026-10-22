import express from "express";
import path from "path";
import matchRoutes from "./routes/match.routes";

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join("__dirname", "../public")));

// Mount match routes
app.use("/api", matchRoutes);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  console.log(`Frontend dashboard available at http://localhost:${port}/`);
});