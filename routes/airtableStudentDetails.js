const express = require("express");
const axios = require("axios");
const router = express.Router();

// url - /api/airtable-students/search
router.post("/search", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "phone is required"
      });
    }

    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableId = process.env.AIRTABLE_TABLE_ID;
    const apiKey = process.env.AIRTABLE_API_KEY;

    // Airtable API URL
    const url = `https://api.airtable.com/v0/${baseId}/${tableId}`;

    // Construct the filter formula
    // This searches for an EXACT match in the specific column
    const filterFormula = `{Student Contact Number (from Student ID)} = '${phone}'`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      params: {
        filterByFormula: filterFormula,
        maxRecords: 5 // Limit results
      }
    });

    const records = response.data.records.map((record) => ({
      id: record.id,
      fields: record.fields, // Contains Name, Email, Status, etc.
      createdTime: record.createdTime
    }));

    res.json({
      success: true,
      count: records.length,
      students: records
    });

  } catch (error) {
    console.error("❌ Airtable search error:", error?.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to search Airtable",
      error: error?.response?.data || error.message
    });
  }
});

module.exports = router;