require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const {connect} = require("./db");

const app = express();

/* ------------------ MIDDLEWARE ------------------ */
app.use(cors());
app.use(express.json());

/* ------------------ HEALTH CHECK ------------------ */
app.get("/", (req, res) => {
  res.send("🚀 Server is running");
});

/* ------------------ FETCH SESSIONS + DEMO_SCHEDULED (LIMIT 20) ------------------ */
app.get("/api/all-schedules", async (req, res) => {
  try {
    const db = mongoose.connection;
    const limit = 20;
    const page = parseInt(req.query.page || "1", 10);
    const skip = (page - 1) * limit;

    const sessionsCollection = db.collection("sessions");
    const demoScheduledCollection = db.collection("demo_scheduled");

    const [sessions, demoRaw] = await Promise.all([
      sessionsCollection
        .find({})
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      demoScheduledCollection
        .find({})
        .sort({ createdTime: -1 })
        .skip(skip)
        .limit(limit)
        .toArray()
    ]);

    /* ------------------ MAP DEMO_SCHEDULED CLEANLY ------------------ */
    const demo_scheduled = demoRaw.map(d => ({
      _id: d._id,
      airtableId: d.airtableId || d.id,
      autoId: d["Auto ID"],

      // Student info
      student_id: d["Student ID"],
      student_name: d["Student Name (from Student ID)"],
      student_phone: d["Full contact number"] || d["Student Contact Number (from Student ID)"],
      student_country: d["Country (from Student ID)"],
      student_timezone: d["Student Time Zone"],

      // Guardian
      guardian_name: d["Guardian Name (from Student ID)"],
      guardian_relation: d["Guardian's relation (from Student ID)"],

      // Demo details
      demo_id: d["Demo ID"],
      demo_subject: d["Demo Subject"],
      demo_session_subject: d["Demo Session Subject (from Student ID)"],
      grade: d["Grade (from Student ID)"],
      preferred_topic: d["Preferred topic for demo session (from Student ID)"],

      // Teacher
      teacher_id: d["Teacher ID (from Teacher onboarding form)"],
      teacher_name: d["Demo Teacher Name"],
      teacher_phone: d["Teacher's Contact number (from Teacher onboarding form)"],

      // Schedule times
      demo_date_time_cx: d["Demo Class Date and time (CX TZ) (from Student ID)"],
      demo_date_time_ist: d["Demo class date and time in IST (As per CX)"],
      final_demo_time: d["Final Demo date and time"],
      final_demo_time_cx: d["Final Demo Date and Time (CX TZ)"],

      final_date_meta: d["Final Date ( CX TZ - Meta )"],
      final_time_meta: d["Final Time ( CX TZ - Meta )"],

      // Status flags
      demo_scheduled: d["Demo Scheduled"],
      demo_completed: d["Demo Completed"],
      demo_15mins: d["Demo_15mins"],
      demo_2hrs: d["Demo_2hrs"],

      // Communication logs
      cx_msg_sent: d["CX Msg sent"],
      cx_mail_sent: d["CX Mail sent"],
      teacher_msg_sent: d["Teacher Msg sent"],
      teacher_mail_sent: d["Teacher Mail sent"],

      // Misc
      booked_by: d["Who Booked the trial class"],
      meeting_link: d["Meeting link"],
      notes: d["Mention your conversation with parents in detail (from Student ID)"],

      created_time: d.createdTime
    }));

    res.status(200).json({
      success: true,
      page,
      limit,
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
