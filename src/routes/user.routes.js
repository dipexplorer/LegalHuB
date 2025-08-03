const express = require("express");
const passport = require("passport");
const {
registerUser,
loginUser,
logoutUser,
getUserProfile,
updateUser,
deleteUser,
} = require("../controllers/user.controller.js");
const {
isLoggedIn,
saveRedirectUrl,
} = require("../middlewares/auth.middleware.js");

const router = express.Router();

router.get("/login", (req, res) => {
res.render("pages/login", { error: req.flash("error") });
});

router.post("/register", registerUser);

router.post("/login", saveRedirectUrl, (req, res, next) => {
passport.authenticate("local", (err, user, info) => {
if (err) return next(err);
if (!user) {
req.flash("error", info?.message || "Invalid username or password");
return res.redirect("/login");
}
req.logIn(user, (err) => {
if (err) return next(err);
return res.redirect(req.session.returnTo || "/");
});
})(req, res, next);
});

router.get("/logout", logoutUser);

router.get("/profile", isLoggedIn, getUserProfile);

router.put("/update", isLoggedIn, updateUser);

router.delete("/delete", isLoggedIn, deleteUser);

module.exports = router;