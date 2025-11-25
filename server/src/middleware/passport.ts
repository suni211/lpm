import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from '../database/db';
import { User } from '../types';

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        const existingUser = await pool.query(
          'SELECT * FROM users WHERE google_id = $1',
          [profile.id]
        );

        if (existingUser.rows.length > 0) {
          // Update last login
          await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [existingUser.rows[0].id]
          );
          return done(null, existingUser.rows[0]);
        }

        // Create new user
        const newUser = await pool.query(
          `INSERT INTO users (google_id, email, display_name, profile_picture)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [
            profile.id,
            profile.emails?.[0]?.value || '',
            profile.displayName || '',
            profile.photos?.[0]?.value || '',
          ]
        );

        // Create default team for new user
        await pool.query(
          `INSERT INTO teams (user_id, team_name)
           VALUES ($1, $2)`,
          [newUser.rows[0].id, `${profile.displayName || 'Player'}'s Team`]
        );

        // Create default facilities
        await pool.query(
          `INSERT INTO facilities (team_id)
           SELECT id FROM teams WHERE user_id = $1`,
          [newUser.rows[0].id]
        );

        // Create default roster
        await pool.query(
          `INSERT INTO rosters (team_id)
           SELECT id FROM teams WHERE user_id = $1`,
          [newUser.rows[0].id]
        );

        // Create team records
        await pool.query(
          `INSERT INTO team_records (team_id)
           SELECT id FROM teams WHERE user_id = $1`,
          [newUser.rows[0].id]
        );

        done(null, newUser.rows[0]);
      } catch (error) {
        done(error as Error, undefined);
      }
    }
  )
);

export default passport;
