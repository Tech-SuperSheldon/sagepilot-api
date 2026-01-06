require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { connect } = require("./db");

const app = express();

/* ------------------ MIDDLEWARE ------------------ */
app.use(cors());
app.use(express.json());

app.use(express.static("public"));


// /* ------------------ HEALTH CHECK ------------------ */
// app.get("/", (req, res) => {
//   res.send("🚀 Server is running");
// });

/* ------------------ FETCH TEACHER SESSIONS + DEMO_SCHEDULED ------------------ */
app.post("/api/all-schedules", async (req, res) => {
  try {
    const db = mongoose.connection;

    const { phoneNumber, page = 1 } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "phoneNumber is required"
      });
    }

    const now = new Date();

    const teachersCollection = db.collection("teachers");
    const sessionsCollection = db.collection("sessions");
    const demoScheduledCollection = db.collection("meeting_links");


    /* ------------------ STEP 1: FIND TEACHER BY PHONE ------------------ */
    const teacher = await teachersCollection.findOne({
      "userId.phoneNumber": phoneNumber,
      relation: "TEACHER",
      status: "ACCEPTED"
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found for this phone number"
      });
    }

    const teacherUserId = teacher.userId._id;

    /* ------------------ STEP 2: FETCH UPCOMING SESSIONS ------------------ */
    const sessions = await sessionsCollection
      .aggregate([
        {
          $match: {
            "userId._id": teacherUserId,
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

    /* ------------------ DEMO_SCHEDULED (UNCHANGED) ------------------ */
    const limit = 5;
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
        index: d.Index || null,
        meeting_link: d["New link"] || d.Link || null,
        original_link: d.Link || null,
        created_time: d.createdTime
      }));


    /* ------------------ RESPONSE ------------------ */
    res.status(200).json({
      success: true,
      teacher: {
        id: teacherUserId,
        name: teacher.userId.name,
        phoneNumber: teacher.userId.phoneNumber
      },
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
