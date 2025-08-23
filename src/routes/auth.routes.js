const express = require('express');
const passport = require('passport');

const router = express.Router();

// Start Google OAuth
router.get(
'/auth/google',
// (req, res, next) => { console.log('[AUTH] /auth/google hit'); return next(); },
passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })
);

// Callback
router.get(
'/auth/google/callback',
// (req, res, next) => { console.log('[AUTH] /auth/google/callback hit'); return next(); },
passport.authenticate('google', {
failureRedirect: '/login',
failureFlash: true
}),
(req, res) => {
// console.log('[AUTH] callback success, user:', req.user && req.user._id);
const redirectTo = req.session.redirectUrl || '/';
delete req.session.redirectUrl;
req.flash('success', 'Logged in with Google');
res.redirect(redirectTo);
}
);

module.exports = router;