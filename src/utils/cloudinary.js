//using require syntax for cloudinary
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            return null;
        }
        // console.log("Uploading to Cloudinary:", localFilePath);

        const respond = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        // console.log("CLOUDINARY RESPOND AFTER UPLOADING", respond);

        // Delete file after upload
        await fs.promises.unlink(localFilePath);

        // ✅ Ensure the local file is deleted even if upload fails
        console.log("Local file deleted successfully");

        return respond;
    } catch (err) {
        console.error("Error occurred while uploading to cloudinary", err);
        try {
            await fs.promises.unlink(localFilePath);
            console.log("Local file deleted after failure");
        } catch (unlinkErr) {
            console.error("Error deleting local file after failure:", unlinkErr);
        }
        return null;
    }
};

const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) {
            return null;
        }
        const respond = await cloudinary.uploader.destroy(publicId);
        console.log("CLOUDINARY RESPOND AFTER DELETING", respond);
        return respond;
    } catch (err) {
        console.error("Error occurred while deleting from cloudinary", err);
        return null;
    }
};

module.exports = { uploadOnCloudinary, deleteFromCloudinary };
