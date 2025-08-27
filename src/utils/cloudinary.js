// utils/cloudinary.js
const { cloudinary } = require("../config/cloudinary");

const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null;
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (err) {
        console.error("Error deleting from Cloudinary:", err);
        return null;
    }
};

module.exports = { deleteFromCloudinary };
