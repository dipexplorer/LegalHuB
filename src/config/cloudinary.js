// config/cloudinary.js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
api_key: process.env.CLOUDINARY_API_KEY,
api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Pick ONE folder name you prefer:
const DEFAULT_FOLDER = "LegalHuB"; // or 'profile_images'

const storage = new CloudinaryStorage({
cloudinary,
params: {
folder: DEFAULT_FOLDER,
allowed_formats: ["jpg", "jpeg", "png"],
// Optional transformation for profile-like images; remove if not desired
// transformation: [{ width: 500, height: 500, crop: "limit" }],
},
});

module.exports = { cloudinary, storage };