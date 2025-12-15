const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const User = require("../models/User");
const oauthConfig = require("./oauth");

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: oauthConfig.google.clientID,
      clientSecret: oauthConfig.google.clientSecret,
      callbackURL: oauthConfig.google.callbackURL,
      scope: ["profile", "email"]
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;

        let user = await User.findOne({ where: { email } });

        if (!user) {
          user = await User.create({
            name,
            email,
            password: Math.random().toString(36).slice(-8), // Random password for OAuth users
            role: "child", // Default role
            provider: "google",
            providerId: profile.id
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Facebook Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: oauthConfig.facebook.clientID,
      clientSecret: oauthConfig.facebook.clientSecret,
      callbackURL: oauthConfig.facebook.callbackURL,
      profileFields: ["id", "displayName", "emails"]
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;

        let user = await User.findOne({ where: { email } });

        if (!user) {
          user = await User.create({
            name,
            email,
            password: Math.random().toString(36).slice(-8),
            role: "child",
            provider: "facebook",
            providerId: profile.id
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;