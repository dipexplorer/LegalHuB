const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user.model");

// Local Strategy is auto-added by passport-local-mongoose when you call User.createStrategy()
passport.use(User.createStrategy());

// Google OAuth Strategy
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL:
                process.env.GOOGLE_CALLBACK_URL ||
                "http://localhost:8000/api/users/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Find user by Google email
                let user = await User.findOne({ email: profile.emails[0].value });

                if (!user) {
                    // If user doesn’t exist, create new
                    user = new User({
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        profilePicture: profile.photos[0].value,
                        role: "user",
                    });
                    await user.save();
                }

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

// Serialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;
