const Appointment = require("../models/appointment.model.js");
const User = require("../models/user.model.js");
const LawyerProfile = require("../models/lawyer.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");
const shortid = require("shortid");
const QRCode = require("qrcode");
const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const nodemailer = require("nodemailer");
const { createNotification } = require("../utils/notificationService.js");

//Helper: normalize date to date-only (midnight local)
function normalizeDateOnly(dateInput) {
    const d = new Date(dateInput);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Helper fn convert EJS to HTML and return PDF buffer ---
async function generateAppointmentPdfBuffer(templatePath, templateData) {
    // 🔹 Render EJS template to HTML
    const html = await ejs.renderFile(templatePath, templateData);

    // 🔹 launch puppeteer, convert HTML to PDF buffer
    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        //🔹 Convert to PDF
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" },
        });

        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

// Book Appointment
const bookAppointment = asyncHandler(async (req, res) => {
    const clientId = req.user._id;
    const { lawyerId, date, timeSlot, notes } = req.body;

    if (!lawyerId || !date || !timeSlot) {
        throw new apiError(400, "Please provide lawyerId, date and timeSlot");
    }

    // Validate lawyer existence (User document with role 'lawyer')
    const lawyerUser = await User.findOne({
        _id: lawyerId,
        role: "lawyer",
        isActive: true,
    }).populate("lawyerProfile");
    if (!lawyerUser || !lawyerUser.lawyerProfile || !lawyerUser.lawyerProfile.isVerified) {
        throw new apiError(404, "Lawyer not found or not verified");
    }

    // Prevent client booking themselves (edge case)
    if (clientId.toString() === lawyerId.toString()) {
        throw new apiError(400, "Cannot book an appointment with yourself");
    }

    // Normalize date to date-only
    const appointmentDate = normalizeDateOnly(date);
    const today = normalizeDateOnly(new Date());
    if (appointmentDate < today) {
        throw new apiError(400, "Date must be today or in the future");
    }

    // Check for existing appointment conflicts (lawyer)
    const existing = await Appointment.findOne({
        lawyer: lawyerId,
        date: appointmentDate,
        timeSlot,
        status: { $in: ["pending", "approved"] },
    });

    if (existing) {
        throw new apiError(
            409,
            "Selected time slot is already booked for this lawyer on this date please select another time slot"
        );
    }

    // Check client doesn't have overlapping appointment
    const clientConflict = await Appointment.findOne({
        client: clientId,
        date: appointmentDate,
        timeSlot,
        status: { $in: ["pending", "approved"] },
    });
    if (clientConflict) {
        throw new apiError(409, "You already have an appointment at this time");
    }

    try {
        const appointment = await Appointment.create({
            client: clientId,
            lawyer: lawyerId,
            date: appointmentDate,
            timeSlot,
            notes,
            status: "pending",
        });

        // Generate unique appointment card ID and expiration date
        const cardId = `LH-${shortid.generate().toUpperCase()}`;
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

        // Optional: QR code with appointmentId
        const qrData = `${process.env.APP_URL}/lawyers/${lawyerId}`;
        const qrCode = await QRCode.toDataURL(qrData);

        appointment.appointmentCard = { cardId, expiresAt, qrCode };
        await appointment.save();

        // after saving appointment
        await createNotification({
            user: req.user._id,
            type: "appointment.created",
            title: "New Appointment",
            message: `${req.user.username} booked an appointment with you on ${appointment.date}`,
            relatedId: appointment._id,
            relatedModel: "Appointment",
            priority: "high",
            channels: { inApp: true, email: true },
        });

        if (req.accepts("html")) {
            req.flash("success", "Appointment Booked Successfully!");
            return res.redirect("/appointments");
        }
        return res
            .status(201)
            .json(
                new apiResponse(
                    201,
                    appointment,
                    "Appointment booked successfully with visiting card."
                )
            );
    } catch (err) {
        // handle duplicate key (unique index) gracefully
        if (err.code === 11000) {
            throw new apiError(409, "Time slot already taken (race condition). Try another slot.");
        }
        throw err;
    }
});

/** Get appointments for logged-in user (user/lawyer/admin) */
const getAppointments = asyncHandler(async (req, res) => {
    const user = req.user;
    const filter = {};

    if (user.role === "user") {
        filter.client = user._id;
    } else if (user.role === "lawyer") {
        filter.lawyer = user._id;
    } else if (user.role === "admin") {
        // optional filters for admin
        if (req.query.clientId) filter.client = req.query.clientId;
        if (req.query.lawyerId) filter.lawyer = req.query.lawyerId;
        if (req.query.status) filter.status = req.query.status;
    } else {
        throw new apiError(403, "Unauthorized");
    }

    const appointments = await Appointment.find(filter)
        .populate("client", "username name email profilePicture")
        .populate({
            path: "lawyer",
            select: "username name email profilePicture",
            populate: {
                path: "lawyerProfile",
                model: "LawyerProfile",
                select: "specialization licenseNumber experience city state isVerified fees",
            },
        })
        .sort({ date: 1, timeSlot: 1 });

    if (req.accepts("html")) {
        return res.render("pages/appointments", { appointments });
    }
    return res
        .status(200)
        .json(new apiResponse(200, appointments, "Appointments fetched successfully"));
});

/** Update appointment status (approve/reject/cancel/complete) - only lawyer or admin */
const updateAppointmentStatus = asyncHandler(async (req, res) => {
    const user = req.user;
    const { appointmentId, status } = req.body;

    const allowed = ["approved", "rejected", "cancelled", "completed"];
    if (!allowed.includes(status)) {
        throw new apiError(400, "Invalid status");
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new apiError(404, "Appointment not found");

    // Authorization: lawyer who owns it or admin
    if (user.role === "lawyer") {
        if (appointment.lawyer.toString() !== user._id.toString()) {
            throw new apiError(403, "You are not authorized to update this appointment");
        }
    } else if (user.role !== "admin") {
        throw new apiError(403, "You are not authorized to update this appointment");
    }

    appointment.status = status;
    await appointment.save();

    if (req.accepts("html")) {
        req.flash("success", "Appointment status updated successfully");
        return res.redirect("/appointments");
    }
    return res
        .status(200)
        .json(new apiResponse(200, appointment, "Appointment status updated successfully"));
});

/** Cancel appointment (client or lawyer who owns it, or admin) */
const cancelAppointment = asyncHandler(async (req, res) => {
    const user = req.user;
    // accept either param name for backwards compatibility
    const appointmentId = req.params.appointmentId || req.params.id;
    if (!appointmentId) throw new apiError(400, "Missing appointment id");

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new apiError(404, "Appointment not found");

    // client may cancel their own:
    if (user.role === "user") {
        if (appointment.client.toString() !== user._id.toString()) {
            throw new apiError(403, "You are not authorized to cancel this appointment");
        }
    } else if (user.role === "lawyer") {
        if (appointment.lawyer.toString() !== user._id.toString()) {
            throw new apiError(403, "You are not authorized to cancel this appointment");
        }
    } else if (user.role !== "admin") {
        throw new apiError(403, "You are not authorized to cancel this appointment");
    }

    appointment.status = "cancelled";
    await appointment.save();

    if (req.accepts("html")) {
        req.flash("success", "Appointment cancelled successfully");
        return res.redirect("/appointments");
    }
    return res
        .status(200)
        .json(new apiResponse(200, appointment, "Appointment cancelled successfully"));
});

/** Get available slots for a lawyer on a date */
const getAvailableSlots = asyncHandler(async (req, res) => {
    const { lawyerId, date } = req.query;
    if (!lawyerId || !date) throw new apiError(400, "Missing parameters");

    const lawyerUser = await User.findById(lawyerId).populate("lawyerProfile");
    if (!lawyerUser || !lawyerUser.lawyerProfile) throw new apiError(404, "Lawyer not found");

    // Normalize date-only
    const appointmentDate = normalizeDateOnly(date);

    // Get all booked slots for date
    const bookedAppointments = await Appointment.find({
        lawyer: lawyerId,
        date: appointmentDate,
        status: { $in: ["pending", "approved"] },
    });

    const bookedSlots = bookedAppointments.map((a) => a.timeSlot);

    // availableSlots might be stored as an array or JSON-string; be flexible
    let availableSlots = [];
    const v = lawyerUser.lawyerProfile.availableSlots;
    if (!v) availableSlots = [];
    else if (Array.isArray(v)) availableSlots = v;
    else {
        try {
            availableSlots = JSON.parse(v);
            if (!Array.isArray(availableSlots)) availableSlots = [];
        } catch (err) {
            // if it's a comma separated string e.g. "10:00 AM,11:00 AM"
            availableSlots = String(v)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
        }
    }

    // remove booked
    const freeSlots = availableSlots.filter((slot) => !bookedSlots.includes(slot));

    return res.status(200).json(new apiResponse(200, freeSlots, "Available slots fetched"));
});

const renderAppointmentStats = asyncHandler(async (req, res) => {
    const user = req.user;

    let filter = {};
    if (user.role === "user") {
        // User sees only their own appointments as client
        filter = { client: user._id };
    } else if (user.role === "lawyer") {
        // Lawyer sees only appointments where they are the lawyer
        filter = { lawyer: user._id };
    } else {
        // Admin sees all appointments
        filter = {};
    }
    const appointments = await Appointment.find(filter)
        .populate("client", "username email")
        .populate({
            path: "lawyer",
            populate: {
                path: "lawyerProfile",
                select: "username specialization licenseNumber experience isVerified",
            },
        })
        .sort({ date: 1, timeSlot: 1 });

    res.render("pages/appointments", {
        appointments,
        user: req.user,
    });
});

const viewAppointmentCard = asyncHandler(async (req, res) => {
    const appointmentId = req.params.appointmentId || req.params.id;
    if (!appointmentId) throw new apiError(400, "Missing appointment id");

    const appointment = await Appointment.findById(appointmentId)
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

    res.render("pages/appointment-card", { appointment });
});

// Generate Appointment Card PDF
const downloadAppointmentCard = asyncHandler(async (req, res) => {
    const appointmentId = req.params.appointmentId || req.params.id;
    if (!appointmentId) throw new apiError(400, "Missing appointment id");
    const appointment = await Appointment.findById(appointmentId)
        .populate("client", "username fullName email")
        .populate({
            path: "lawyer",
            select: "username fullName email",
            populate: {
                path: "lawyerProfile",
                select: "specialization licenseNumber experience isVerified",
            },
        });

    if (!appointment) throw new apiError(404, "Appointment not found");
    if (!appointment.appointmentCard) throw new apiError(404, "Appointment card not found");

    // 🔹 Prepare data for template
    const templateData = {
        lawyer: appointment.lawyer?.fullName || appointment.lawyer?.username || "N/A",
        client: appointment.client
            ? appointment.client.fullName || appointment.client.username
            : "N/A",
        venue: appointment.venue || "To be decided",
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        cardId: appointment.appointmentCard.cardId,
        address: appointment.address || "Not provided",
        qrCode: appointment.appointmentCard.qrCode,
        appointment,
    };

    const templatePath = path.join(__dirname, "../views/pages/download_appointment_card.ejs");
    const pdfBuffer = await generateAppointmentPdfBuffer(templatePath, templateData);

    // 🔹 Send as download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=appointment_${appointment._id}.pdf`);

    return res.end(pdfBuffer); // ✅ use res.end() instead of res.send()
});

// --- NEW: Email the appointment card to the client ---
const emailAppointmentCard = asyncHandler(async (req, res) => {
    const appointmentId = req.params.appointmentId || req.params.id;
    if (!appointmentId) throw new apiError(400, "Missing appointment id");

    const appointment = await Appointment.findById(appointmentId)
        .populate("client", "username email fullName")
        .populate({
            path: "lawyer",
            select: "username email fullName",
            populate: {
                path: "lawyerProfile",
                select: "specialization licenseNumber experience isVerified",
            },
        });

    if (!appointment) throw new apiError(404, "Appointment not found");
    if (!appointment.appointmentCard) throw new apiError(404, "Appointment card not found");
    if (!appointment.client || !appointment.client.email)
        throw new apiError(400, "Client has no email");

    // template data same as download
    const templateData = {
        lawyer: appointment.lawyer?.fullName || appointment.lawyer?.username || "N/A",
        client: appointment.client?.fullName || appointment.client?.username || "N/A",
        venue: appointment.venue || "To be decided",
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        cardId: appointment.appointmentCard.cardId,
        address: appointment.address || "Not provided",
        qrCode: appointment.appointmentCard.qrCode,
        appointment,
    };

    const templatePath = path.join(__dirname, "../views/pages/download_appointment_card.ejs");

    // Generate PDF buffer
    const pdfBuffer = await generateAppointmentPdfBuffer(templatePath, templateData);

    // prepare nodemailer transport (from .env)
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    // optional: verify connection (helps detect auth issues early)
    try {
        await transporter.verify();
    } catch (err) {
        // don't leak credentials in response
        console.error("SMTP verify failed:", err);
        throw new apiError(500, "Email configuration error. Check server logs.");
    }

    // construct email
    const appointmentUrl =
        (process.env.APP_URL || `${req.protocol}://${req.get("host")}`) +
        `/api/appointment/${appointment._id}/card/view`;

    const formattedDate = new Date(templateData.date).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    const formattedTime = templateData.timeSlot || "Time not specified";

    const mailOptions = {
        from: `"LegalHub" <${process.env.SMTP_USER}>`, // ✅ Gmail safe sender
        to: appointment.client.email,
        subject: `Appointment Confirmation with ${templateData.lawyer} — ${formattedDate}`,
        text: `Hello ${templateData.client},

    Your appointment has been scheduled successfully.

    📅 Date: ${formattedDate}
    🕒 Time: ${formattedTime}
    👨‍⚖️ Lawyer: ${templateData.lawyer}
    📍 Venue: ${templateData.venue}
    🏠 Address: ${templateData.address}

    We have attached your appointment card as a PDF.  
    You can also view it online here: ${appointmentUrl}

    Thank you for choosing LegalHub.  

    Best regards,  
    LegalHub Team`,
        attachments: [
            {
                filename: `appointment_${appointment._id}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf",
            },
        ],
    };

    // send
    try {
        await transporter.sendMail(mailOptions);
    } catch (err) {
        console.error("Error sending email:", err);
        throw new apiError(500, "Failed to send email. See server logs.");
    }

    return res.status(200).json({ message: "Appointment card emailed to client" });
});

module.exports = {
    bookAppointment,
    getAppointments,
    updateAppointmentStatus,
    cancelAppointment,
    getAvailableSlots,
    renderAppointmentStats,
    viewAppointmentCard,
    downloadAppointmentCard,
    emailAppointmentCard,
};
