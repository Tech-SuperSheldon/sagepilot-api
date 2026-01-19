const express = require("express");
const axios = require("axios"); 
const router = express.Router();

//url - /api/upcoming-sessions
router.get("/", async (req, res) => {
  try {
    const baseUrl = process.env.WISE_BASE_URL || "https://api.wiseapp.live";
    const url = `${baseUrl}/institutes/${process.env.WISE_INSTITUTE_ID}/sessions`;

    const response = await axios.get(url, {
      params: {
        paginateBy: "COUNT",
        page_number: 1,
        page_size: 5,
        status: "FUTURE"
      },
      headers: {
        "Authorization": process.env.WISE_AUTH_HEADER,
        "x-api-key": process.env.WISE_API_KEY,
        "x-wise-namespace": process.env.WISE_NAMESPACE, 
        "Content-Type": "application/json"
      }
    });

    const sessions = response?.data?.data || [];

    res.status(200).json({
      success: true,
      count: sessions.length,
      sessions
    });

  } catch (error) {
    console.error(
      "Wise API error:",
      error?.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch upcoming sessions",
      error: error?.response?.data || error.message
    });
  }
});

module.exports = router;