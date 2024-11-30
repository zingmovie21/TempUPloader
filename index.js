const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const cron = require("node-cron");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const TEMP_DIR = path.join(__dirname, "temp");
const METADATA_FILE = path.join(__dirname, "metadata.json");

// Ensure the temporary directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

// Ensure metadata file exists
if (!fs.existsSync(METADATA_FILE)) {
  fs.writeFileSync(METADATA_FILE, JSON.stringify([]));
}

// Enable CORS
app.use(cors());
app.use(express.static("public"));

// Utility: Sanitize file names
const sanitizeFileName = (name) =>
  name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9.\-_]/g, "_");

// Multer configuration
const storage = multer.diskStorage({
  destination: TEMP_DIR,
  filename: (req, file, cb) => {
    const sanitizedName = sanitizeFileName(file.originalname);
    const uniqueName = `${uuidv4()}-${sanitizedName}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB limit
});

// Save metadata to JSON
const saveMetadata = (metadata) => {
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
};

// Load metadata from JSON
const loadMetadata = () => {
  if (fs.existsSync(METADATA_FILE)) {
    return JSON.parse(fs.readFileSync(METADATA_FILE));
  }
  return [];
};

// Upload endpoint
app.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).send("No file uploaded.");
  }

  const uploadTime = Date.now();
  const expirationTime = uploadTime + 2 * 60 * 60 * 1000; // 2 hours
  const fileMetadata = {
    filename: file.filename,
    originalname: file.originalname,
    uploadTime,
    expirationTime,
  };

  const metadata = loadMetadata();
  metadata.push(fileMetadata);
  saveMetadata(metadata);

  const fileUrl = `${req.protocol}://${req.get("host")}/${file.filename}`;
  res.status(200).json({ message: "File uploaded successfully.", url: fileUrl });
});

// Download endpoint
app.get("/:fileName", (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(TEMP_DIR, fileName);

  if (fs.existsSync(filePath)) {
    res.download(filePath, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        res.status(500).send("Error downloading the file.");
      }
    });
  } else {
    res.status(404).send("File not found.");
  }
});

// Cleanup expired files (runs every 30 minutes)
cron.schedule("*/30 * * * *", () => {
  console.log("Running cleanup task...");
  const metadata = loadMetadata();
  const currentTime = Date.now();
  const updatedMetadata = metadata.filter((file) => {
    if (file.expirationTime > currentTime) {
      return true;
    } else {
      const filePath = path.join(TEMP_DIR, file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // Delete expired file
        console.log(`Deleted expired file: ${file.filename}`);
      }
      return false;
    }
  });

  saveMetadata(updatedMetadata);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
