require("dotenv").config();
const express = require("express");
const cors = require("cors");

const donorRoutes = require("./routes/donorRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", donorRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.get("/api", (req, res) => {
  res.json({
    message: "WLR Blood Network API",
    version: "1.0",
    status: "Active",
    endpoints: {
      "GET /api/donors": "Return the full donor list from donors.json",
      "POST /api/match-donors": "Find matching donors by blood group",
      "POST /api/notify": "Notify selected donors",
      "POST /api/sos": "Send emergency SMS alert"
    }
  });
});

const PORT = 5001;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Error handling
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});