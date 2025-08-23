const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model.js');

passport.use(new GoogleStrategy(
{
clientID: process.env.GOOGLE_CLIENT_ID,
clientSecret: process.env.GOOGLE_CLIENT_SECRET,
callbackURL: '/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
try {
const googleId = profile.id;
const email = profile.emails?.[0]?.value || null;
const name = profile.displayName || '';
const avatar = profile.photos?.[0]?.value || null;

  // If your schema requires email:
  if (!email) {
    return done(null, false, { message: 'Google account did not provide an email.' });
  }

  // 1) Try linked account first
  let user = await User.findOne({
    'oauth.provider': 'google',
    'oauth.providerId': googleId
  });

  // 2) Match by email and link if found
  if (!user) {
    user = await User.findOne({ email });
    if (user) {
      user.oauth = { provider: 'google', providerId: googleId };
      if (!user.name && name) user.name = name;

      if (avatar) {
        if (user.profilePicture && typeof user.profilePicture === 'object') {
          user.profilePicture.url = user.profilePicture.url || avatar;
        } else if (typeof user.profilePicture === 'string') {
          if (!user.profilePicture || user.profilePicture.includes('vectorstock')) {
            user.profilePicture = avatar;
          }
        }
      }
      await user.save();
    }
  }

  // 3) Create new
  if (!user) {
    user = new User({
      username: email || `google_${googleId}`,
      email,
      name,
      oauth: { provider: 'google', providerId: googleId }
    });

    if (avatar) {
      if (user.profilePicture && typeof user.profilePicture === 'object') {
        user.profilePicture.url = avatar;
      } else {
        user.profilePicture = avatar;
      }
    }

    await user.save();
  }

  return done(null, user);
} catch (err) {
  return done(err);
}
}
));