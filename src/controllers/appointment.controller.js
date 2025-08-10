const Appointment = require("../models/appointment.model.js");
const User = require("../models/user.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");

// Book Appointment
const bookAppointment = asyncHandler(async (req, res) => {
    const clientId = req.user._id;
    const {lawyerId, date, timeSlot, notes} = req.body;
    
    if(!lawyerId || !date || !timeSlot) {
        throw new apiError(400, "Please provide lawyerId, date and timeSlot");
    }

    // validate lawyer existance
    const lawyer = await User.findOne({_id: lawyerId, role: "lawyer", isActive: true}).populate("lawyerProfile");
    if(!lawyer || !lawyer.lawyerProfile.isVerified) {
        throw new apiError(400, "Lawyer not found or not verified");
    }

    const appointmentDate = new Date(date);
    if(appointmentDate < new Date()) {
        throw new apiError(400, "Date must be today or future");
    }

    // Check for existing appointment conflicts (lawyer and client)
    const existingAppointments = await Appointment.find({
        lawyer: lawyerId,
        date: appointmentDate,
        timeSlot,
        status: { $in: ["pending", "approved"] }
    });

    if (existingAppointments.length > 0) {
        throw new apiError(400, "Lawyer is already scheduled for this time slot");
    }

    const existingClientAppointments = await Appointment.find({
        client: clientId,
        date: appointmentDate,
        timeSlot,
        status: { $in: ["pending", "approved"] }
    });
    
    if(existingClientAppointments.length > 0) {
        throw new apiError(400, "You already have an appointment for this time slot");
    }

    const appointment = await Appointment.create({
        client: clientId,
        lawyer: lawyerId,
        date : appointmentDate,
        timeSlot,
        notes,
        status: "pending"
    });

    if(req.accepts("html")) {
        req.flash("success", "Appointment Booked Successfully!");
        return res.redirect("/appointments");
    }
    return res.status(200).json(new apiResponse(200, appointment, "Appointment Booked Successfully"));
});


// Get appointments for logged-in user (client or lawyer)
const getAppointments = asyncHandler(async (req, res) => {
    const user = req.user;
    let filter = {};

    if(user.role === "client") {
        filter.client = user._id;
    } else if(user.role === "lawyer") {
        filter.lawyer = user._id;
    } else if(user.role === "admin") {
        if(req.query.clientId) filter.client = req.query.clientId;
        if(req.query.lawyerId) filter.lawyer = req.query.lawyerId;
    }

    const appointments = await Appointment.find(filter)
    .populate("client", "name email")
    .populate("lawyer", "name email")
    .populate("lawyer.lawyerProfile", "specialization licenseNumber isVerified")
    .sort({ date: 1, timeSlot: 1 });

    if(req.accepts("html")) {
        req.flash("success", "Appointments fetched successfully");
        return res.render("pages/appointments", { appointments });
    } else {
        return res.status(200).json(new apiResponse(200, appointments, "Appointments fetched successfully"));
    }
});

// Update appointment status (approve/reject/cancel) - Lawyer/Admin only
const updateAppoitmentStatus = asyncHandler(async (req, res) => {
    const user = req.user;
    const { appointmentId, status } = req.body;

    if(!["approved", "rejected", "cancelled", "completed"].includes(status)) {
        throw new apiError(400, "Invalid status");
    }

    const appointment = await Appointment.findById(appointmentId);
    if(!appointment) {
        throw new apiError(404, "Appointment not found");
    }

    if(user.role !== "lawyer" && user.role !== "admin") {
        throw new apiError(403, "You are not authorized to update this appointment");
    }

    if(user.role === "lawyer" && user._id.toString() !== appointment.lawyer.toString()) {
        throw new apiError(403, "You are not authorized to update this appointment");
    }

    appointment.status = status;
    await appointment.save();

    if(req.accepts("html")) {
        req.flash("success", "Appointment status updated successfully");
        return res.redirect("/appointments");
    } else {
        return res.status(200).json(new apiResponse(200, appointment, "Appointment status updated successfully"));
    }
});

// Cancel appointment
const cancelAppointment = asyncHandler(async (req, res) => {
    const user = req.user;
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId);
    if(!appointment) {
        throw new apiError(404, "Appointment not found");
    }
    
    // unauthorize owner cannot cancel
    if(user.role === "client" && user._id.toString() !== appointment.client.toString()) {
        throw new apiError(403, "You are not authorized to cancel this appointment");
    }

    if(user.role === "lawyer" && user._id.toString() !== appointment.lawyer.toString()) {
        throw new apiError(403, "You are not authorized to cancel this appointment");
    }

    appointment.status = "cancelled";
    await appointment.save();

    if(req.accepts("html")) {
        req.flash("success", "Appointment cancelled successfully");
        return res.redirect("/appointments");
    } else {
        return res.status(200).json(new apiResponse(200, appointment, "Appointment cancelled successfully"));
    }
});

module.exports = {
    bookAppointment,
    getAppointments,
    updateAppoitmentStatus,
    cancelAppointment
};