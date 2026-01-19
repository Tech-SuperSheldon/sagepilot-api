const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

//url - /api/students/by-phone
router.post("/by-phone", async (req, res) => {
  try {
    const db = mongoose.connection;
    const { phone, page = 1 } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "phone is required"
      });
    }

    const usersCollection = db.collection("users");

    const limit = 5;
    const skip = (Number(page) - 1) * limit;

    // 🔎 Exact phone match
    const studentsRaw = await usersCollection
      .find({
        relation: "STUDENT",
        "userId.phoneNumber": phone
      })
      .skip(skip)
      .limit(limit)
      .toArray();

    const students = studentsRaw.map((s) => {
      const phoneNumber = s?.userId?.phoneNumber || "";

      const countryCode = phoneNumber.startsWith("+")
        ? phoneNumber.replace(/[^\d]/g, "").slice(0, 2)
        : null;

      return {
        studentId: s._id,
        name: s?.userId?.name || null,
        phoneNumber,
        email: s?.userId?.email || null,
        countryCode,
        instituteId: s.instituteId,
        status: s.status
      };
    });

    res.json({
      success: true,
      count: students.length,
      students
    });
  } catch (err) {
    console.error("❌ Fetch students by phone error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student",
      error: err.message
    });
  }
});



module.exports = router;