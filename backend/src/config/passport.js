import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // Check if user exists with this email
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          await user.save();
          return done(null, user);
        }

        // Create new user
        user = new User({
          email: profile.emails[0].value,
          googleId: profile.id,
          isEmailVerified: true, // Google emails are verified
        });

        await user.save();

        // Create user profile
        const userProfile = new UserProfile({
          userId: user._id,
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          displayName: profile.displayName || profile.emails[0].value,
          profilePicture: profile.photos?.[0]?.value || '',
        });

        await userProfile.save();

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;










