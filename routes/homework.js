const express = require("express");
const axios = require("axios");
const router = express.Router();

//url- /api/homework/by-phone
router.post("/by-phone", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "phone is required" });
    }

    const instituteId = process.env.WISE_INSTITUTE_ID;
    const apiKey = process.env.WISE_API_KEY;
    const namespace = process.env.WISE_NAMESPACE;
    const authHeader = process.env.WISE_AUTH_HEADER;
    const baseUrl = process.env.WISE_BASE_URL || "https://api.wiseapp.live";

    // 1. Fetch all students from Wise
    const studentsUrl = `${baseUrl}/institutes/${instituteId}/students?status=ACCEPTED`;
    const studentsResponse = await axios.get(studentsUrl, {
      headers: { 
        "Authorization": authHeader, 
        "x-api-key": apiKey, 
        "x-wise-namespace": namespace, 
        "Content-Type": "application/json" 
      }
    });

    const allStudents = studentsResponse.data.data.students || [];

    // 2. Find student by phone number 
    const cleanInputPhone = phone.replace(/\s+/g, '');
    const targetStudent = allStudents.find(s => {
      const studentPhone = s.userId?.phoneNumber || "";
      return studentPhone.replace(/\s+/g, '') === cleanInputPhone;
    });

    if (!targetStudent) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // 3. Fetch tests from the content timeline for each class
    const studentClasses = targetStudent.classes || [];
    const availableTests = [];

    await Promise.all(studentClasses.map(async (cls) => {
      try {
        const contentUrl = `${baseUrl}/user/classes/${cls._id}/contentTimeline`;
        
        const contentRes = await axios.get(contentUrl, {
          params: { showSequentialLearningDisabledSections: true },
          headers: { 
            "Authorization": authHeader, 
            "x-api-key": apiKey, 
            "x-wise-namespace": namespace, 
            "Content-Type": "application/json" 
          }
        });

        const timeline = contentRes.data.data.timeline || [];

        // 4. Extract active tests and generate links
        timeline.forEach(section => {
          if (section.entities) {
            section.entities.forEach(entity => {
              if (entity.entityType === "test" && entity.status === "ACTIVE") {
                
                // Link logic: Test ID + Last 8 chars of Class ID
                const classIdSuffix = cls._id.slice(-8);
                const testLink = `https://supersheldon.wise.live/tests/${entity._id}${classIdSuffix}`;

                availableTests.push({
                  test_name: entity.name,
                  subject: cls.subject,
                  class_name: cls.name,
                  duration: entity.duration,
                  max_marks: entity.maxMarks,
                  created_at: entity.createdAt,
                  test_link: testLink
                });
              }
            });
          }
        });

      } catch (err) {
        // Continue to next class if one fails
      }
    }));

    // Sort by newest first
    availableTests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      student: {
        id: targetStudent._id,
        name: targetStudent.userId.name,
        phone: targetStudent.userId.phoneNumber
      },
      count: availableTests.length,
      tests: availableTests
    });

  } catch (error) {
    console.error("API Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;