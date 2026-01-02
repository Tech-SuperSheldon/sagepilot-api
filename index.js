require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { connect } = require("./db");

const app = express();

/* ------------------ MIDDLEWARE ------------------ */
app.use(cors());
app.use(express.json());

/* ------------------ HEALTH CHECK ------------------ */
app.get("/", (req, res) => {
  res.send("🚀 Server is running");
});

/* ------------------ FETCH TEACHER SESSIONS + DEMO_SCHEDULED ------------------ */
app.get("/api/all-schedules", async (req, res) => {
  try {
    const db = mongoose.connection;

    const teacherId = req.query.teacher_id;
    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message: "teacher_id is required"
      });
    }

    const now = new Date();

    const sessionsCollection = db.collection("sessions");
    const demoScheduledCollection = db.collection("demo_scheduled");

    /* ------------------ FETCH NEXT 5 UPCOMING SESSIONS ------------------ */
    const sessions = await sessionsCollection
      .aggregate([
        {
          $match: {
            "userId._id": teacherId,
            meetingStatus: "UPCOMING"
          }
        },
        {
          $addFields: {
            scheduledStartTimeDate: {
              $toDate: "$scheduledStartTime"
            }
          }
        },
        {
          $match: {
            scheduledStartTimeDate: { $gte: now }
          }
        },
        {
          $sort: { scheduledStartTimeDate: 1 }
        },
        {
          $limit: 5
        }
      ])
      .toArray();

    /* ------------------ FETCH DEMO_SCHEDULED (UNCHANGED) ------------------ */
    const limit = 5;
    const page = parseInt(req.query.page || "1", 10);
    const skip = (page - 1) * limit;

    const demoRaw = await demoScheduledCollection
      .find({})
      .sort({ createdTime: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const demo_scheduled = demoRaw.map(d => ({
      _id: d._id,
      airtableId: d.airtableId || d.id,
      autoId: d["Auto ID"],
      student_name: d["Student Name (from Student ID)"],
      teacher_name: d["Demo Teacher Name"],
      meeting_link: d["Meeting link"],
      created_time: d.createdTime
    }));

    res.status(200).json({
      success: true,
      teacher_id: teacherId,
      counts: {
        sessions: sessions.length,
        demo_scheduled: demo_scheduled.length
      },
      sessions,
      demo_scheduled
    });

  } catch (error) {
    console.error("❌ Error fetching schedules:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch schedules",
      error: error.message
    });
  }
});



/* ------------------ START SERVER ------------------ */
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connect();

    mongoose.connection.on("connected", () => {
      console.log("Connected to MongoDB");
    });
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });
    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected");
    });

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start:", err);
    process.exit(1);
  }
}

start();
