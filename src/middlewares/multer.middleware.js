const multer = require("multer");
const { storage } = require("../config/cloudinary");

const upload = multer({ storage });

module.exports = upload;
