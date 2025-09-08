const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const errorHandler = require("./middleware/ErrorHandler");
const dotenv = require("dotenv").config();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const emailRoutes = require("./routes/emailRoutes");
const tagRoute = require("./routes/tagRoute");
const ticketRoutes = require("./routes/ticketRoutes");
const viewsRoutes = require("./routes/viewRoutes");
const userRoute = require("./routes/userRoute");
const internalNotesRoutes = require("./routes/internalNotesRoutes");
const path = require("path");
const facebookRoutes = require('./routes/facebook.routes');

const app = express();

app.use(
  cors({
    // origin: ["http://localhost:5174"],
    // credentials: true,
    origin: '*',

    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  })
);

//Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.json());

//Upload Attachment for Email Path
app.use("/media", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/tags", tagRoute)
app.use("/api/users", userRoute);
app.use("/api/views", viewsRoutes)
app.use("/api/emails", emailRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/internal-notes", internalNotesRoutes);
app.use('/api', facebookRoutes);
//Routes
app.get("/", (req, res) => {
  res.send("Home Page!");
});

//Error Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;


let emailMonitorStarted = false;

// Mongoose connection options with retries
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Try connecting for 5 seconds
};

// --- Connect to MongoDB ---
mongoose.connect(process.env.MONGO_URI, mongooseOptions)
  .then(() => {
    console.log('✅ MongoDB initial connection established');

    // Start server only after successful DB connection
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });

    // Start the email monitor once when DB is ready
    startEmailMonitor();
  })
  .catch((err) => {
    console.error('❌ Initial MongoDB connection error:', err.message);
    process.exit(1);
  });

mongoose.connection.on('connected', () => {
  console.log('🟢 MongoDB reconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});

function startEmailMonitor() {
  if (emailMonitorStarted) return;

  try {
    require('./jobs/EmailMonitor');
    emailMonitorStarted = true;
    console.log('📧 EmailMonitor job started');
  } catch (err) {
    console.error('❌ Failed to start EmailMonitor:', err.message);
  }
}

