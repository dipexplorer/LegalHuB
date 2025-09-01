const Appointment = require("../models/appointment.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");
const ejs = require("ejs");
const path = require("path");
const puppeteer = require("puppeteer");
const sendEmail = require("../utils/emailService.js");

const USE_FAKE_DATA = process.env.USE_FAKE_DATA === "true";

// Send Appointment Card via Email
const emailAppointmentCard = asyncHandler(async (req, res) => {
    const appointmentId = req.params.appointmentId || req.params.id;
    if (!appointmentId && !USE_FAKE_DATA) {
        throw new apiError(400, "Missing appointment id");
    }

    let appointment;

    if (USE_FAKE_DATA) {
        // 🔹 Fake data for local dev
        appointment = {
            _id: "fake123",
            client: { username: "TestClient", email: "apnashark@gmail.com" },
            lawyer: { username: "TestLawyer" },
            venue: "Court Room A",
            date: "2025-09-05",
            timeSlot: ["10:00 AM - 11:00 AM"],
            address: "123 Legal Street",
            appointmentCard: { cardId: "CARD123", qrCode: "fakeQr.png" },
        };
    } else {
        // 🔹 Normal DB query
        appointment = await Appointment.findById(appointmentId)
            .populate("client", "username email")
            .populate({
                path: "lawyer",
                select: "username email",
                populate: {
                    path: "lawyerProfile",
                    select: "specialization licenseNumber experience isVerified",
                },
            });

        if (!appointment) throw new apiError(404, "Appointment not found");
        if (!appointment.appointmentCard) throw new apiError(404, "Appointment card not found");
    }

    // 🔹 Prepare data for template
    const templateData = {
        lawyer: appointment.lawyer.username,
        client: appointment.client.username,
        venue: appointment.venue,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        cardId: appointment.appointmentCard.cardId,
        address: appointment.address,
        qrCode: appointment.appointmentCard.qrCode,
    };

    // 🔹 Render EJS template
    const html = await ejs.renderFile(
        path.join(__dirname, "../views/pages/download_appointment_card.ejs"),
        templateData
    );

    // 🔹 Generate PDF
    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" },
    });

    await browser.close();

    // 🔹 Send Email
    await sendEmail({
        to: appointment.client.email,
        subject: "Your Appointment Card",
        text: "Please find attached your appointment card.",
        attachments: [
            {
                filename: `appointment_${appointment._id}.pdf`,
                content: pdfBuffer,
            },
        ],
    });

    return res
        .status(200)
        .json(new apiResponse(200, {}, "Appointment card sent to email successfully"));
});

module.exports = { emailAppointmentCard };
