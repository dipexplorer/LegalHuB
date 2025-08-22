// middlewares/profileUpload.middleware.js
const multer = require('multer');
const { storage } = require('../config/cloudinary.js');

const uploadProfilePic = multer({ storage }).single('uploadProfilePic');

module.exports = { uploadProfilePic };
