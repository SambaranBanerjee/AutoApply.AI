import express from "express";
import matchRoutes from "./routes/match.routes";

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount match routes
app.use("/api", matchRoutes);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});