const express = require("express");
const router = express.Router();
const { emailAppointmentCard } = require("../controllers/emailController");

router.post(
    "/appointments/:appointmentId/card/email",

    emailAppointmentCard
);

module.exports = router;
