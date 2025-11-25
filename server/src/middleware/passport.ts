import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { query } from '../database/db';
import { User } from '../types';

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const result = await query('SELECT * FROM users WHERE id = ?', [id]);
    done(null, result[0] || null);
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
      passReqToCallback: true, // req 객체를 콜백에 전달
    },
    async (req: any, accessToken, refreshToken, profile, done) => {
      try {
        // IP 주소 추출
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
                          req.headers['x-real-ip'] ||
                          req.connection.remoteAddress ||
                          req.socket.remoteAddress ||
                          '';

        // Check if user exists
        const existingUser = await query(
          'SELECT * FROM users WHERE google_id = ?',
          [profile.id]
        );

        if (existingUser.length > 0) {
          // Update last login
          await query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [existingUser[0].id]
          );
          return done(null, existingUser[0]);
        }

        // ⛔ IP 기반 계정 생성 제한 - 같은 IP로 이미 계정이 있는지 확인
        const existingIpUser = await query(
          'SELECT u.* FROM users u INNER JOIN user_ip_tracking ipt ON u.id = ipt.user_id WHERE ipt.ip_address = ?',
          [ipAddress]
        );

        if (existingIpUser.length > 0) {
          // 같은 IP로 이미 계정이 존재함
          return done(new Error('DUPLICATE_IP_ERROR: 이 IP 주소로 이미 계정이 생성되었습니다. 같은 IP로는 여러 계정을 만들 수 없습니다.'), undefined);
        }

        // Create new user
        const [newUserResult]: any = await (await import('../database/db')).default.query(
          `INSERT INTO users (google_id, email, display_name, profile_picture)
           VALUES (?, ?, ?, ?)`,
          [
            profile.id,
            profile.emails?.[0]?.value || '',
            profile.displayName || '',
            profile.photos?.[0]?.value || '',
          ]
        );

        const newUserId = newUserResult.insertId;

        // IP 주소 기록
        await query(
          `INSERT INTO user_ip_tracking (user_id, ip_address) VALUES (?, ?)`,
          [newUserId, ipAddress]
        );

        // Get the newly created user
        const newUser = await query('SELECT * FROM users WHERE id = ?', [newUserId]);

        // Create default team for new user
        await query(
          `INSERT INTO teams (user_id, team_name)
           VALUES (?, ?)`,
          [newUserId, `${profile.displayName || 'Player'}'s Team`]
        );

        // Create default facilities
        await query(
          `INSERT INTO facilities (team_id)
           SELECT id FROM teams WHERE user_id = ?`,
          [newUserId]
        );

        // Create default roster
        await query(
          `INSERT INTO rosters (team_id)
           SELECT id FROM teams WHERE user_id = ?`,
          [newUserId]
        );

        // Create team records
        await query(
          `INSERT INTO team_records (team_id)
           SELECT id FROM teams WHERE user_id = ?`,
          [newUserId]
        );

        done(null, newUser[0]);
      } catch (error) {
        done(error as Error, undefined);
      }
    }
  )
);

export default passport;
