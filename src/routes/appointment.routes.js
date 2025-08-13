const express = require("express");
const Router = express.Router();
const {
    bookAppointment,
    getAppointments,
    updateAppointmentStatus,
    cancelAppointment,
    getAvailableSlots,
    renderAppointmentStats,
} = require("../controllers/appointment.controller.js");

Router.route("/").post(bookAppointment);
Router.route("/").get(getAppointments);
Router.route("/status").put(updateAppointmentStatus);
// Use clear param name appointmentId (controller accepts either appointmentId or id)
Router.route("/:appointmentId").delete(cancelAppointment);
Router.route("/slots").get(getAvailableSlots);
Router.route("/bookings").get(renderAppointmentStats);

module.exports = Router;