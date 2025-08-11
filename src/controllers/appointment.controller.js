const Appointment = require("../models/appointment.model.js");
const User = require("../models/user.model.js");
const LawyerProfile = require("../models/lawyer.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");

/**
 * Helper: normalize date to date-only (midnight local)
 */
function normalizeDateOnly(dateInput) {
    const d = new Date(dateInput);
    d.setHours(0, 0, 0, 0);
    return d;
}

/** Book Appointment */
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
    if (
        !lawyerUser ||
        !lawyerUser.lawyerProfile ||
        !lawyerUser.lawyerProfile.isVerified
    ) {
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
                    "Appointment booked successfully"
                )
            );
    } catch (err) {
        // handle duplicate key (unique index) gracefully
        if (err.code === 11000) {
            throw new apiError(
                409,
                "Time slot already taken (race condition). Try another slot."
            );
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
        .json(
            new apiResponse(
                200,
                appointments,
                "Appointments fetched successfully"
            )
        );
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
            throw new apiError(
                403,
                "You are not authorized to update this appointment"
            );
        }
    } else if (user.role !== "admin") {
        throw new apiError(
            403,
            "You are not authorized to update this appointment"
        );
    }

    appointment.status = status;
    await appointment.save();

    if (req.accepts("html")) {
        req.flash("success", "Appointment status updated successfully");
        return res.redirect("/appointments");
    }
    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                appointment,
                "Appointment status updated successfully"
            )
        );
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
            throw new apiError(
                403,
                "You are not authorized to cancel this appointment"
            );
        }
    } else if (user.role === "lawyer") {
        if (appointment.lawyer.toString() !== user._id.toString()) {
            throw new apiError(
                403,
                "You are not authorized to cancel this appointment"
            );
        }
    } else if (user.role !== "admin") {
        throw new apiError(
            403,
            "You are not authorized to cancel this appointment"
        );
    }

    appointment.status = "cancelled";
    await appointment.save();

    if (req.accepts("html")) {
        req.flash("success", "Appointment cancelled successfully");
        return res.redirect("/appointments");
    }
    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                appointment,
                "Appointment cancelled successfully"
            )
        );
});

/** Get available slots for a lawyer on a date */
const getAvailableSlots = asyncHandler(async (req, res) => {
    const { lawyerId, date } = req.query;
    if (!lawyerId || !date) throw new apiError(400, "Missing parameters");

    const lawyerUser = await User.findById(lawyerId).populate("lawyerProfile");
    if (!lawyerUser || !lawyerUser.lawyerProfile)
        throw new apiError(404, "Lawyer not found");

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
    const freeSlots = availableSlots.filter(
        (slot) => !bookedSlots.includes(slot)
    );

    return res
        .status(200)
        .json(new apiResponse(200, freeSlots, "Available slots fetched"));
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
    user,
  });
});

module.exports = {
    bookAppointment,
    getAppointments,
    updateAppointmentStatus,
    cancelAppointment,
    getAvailableSlots,
    renderAppointmentStats,
};
