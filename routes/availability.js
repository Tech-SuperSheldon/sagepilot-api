const express = require("express");
const router = express.Router();

//url - /api/availability
router.get("/", async (req, res) => {
  const { teacherId, startTime, endTime } = req.query;

  if (!teacherId || !startTime || !endTime) {
    return res.status(400).json({ error: "Missing required params" });
  }

  const host = "https://api.wiseapp.live";
  const instituteId = process.env.WISE_INSTITUTE_ID;
  const url = `${host}/institutes/${instituteId}/teachers/${teacherId}/availability?startTime=${startTime}&endTime=${endTime}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "user-agent": "SagePilot/1.0",
        "x-api-key": process.env.WISE_API_KEY,
        "x-wise-namespace": process.env.WISE_NAMESPACE,
        "Authorization": process.env.WISE_AUTH_HEADER
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const rawSlots = data.data && data.data.workingHours && data.data.workingHours.slots 
      ? data.data.workingHours.slots 
      : [];

    const simplifiedSlots = rawSlots.slice(0, 5).map(slot => ({
      startTime: slot.startTime,
      endTime: slot.endTime
    }));

    res.status(200).json({
      teacher_id: teacherId,
      available_slots: simplifiedSlots
    });

  } catch (error) {
    console.error("❌ Error fetching availability:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;