const z = require("zod");
const jwt = require("jsonwebtoken");
const argon2 = require("argon2");
const { v4: uuidv4 } = require("uuid");
const UserModel = require("../models/user.model");
const HttpError = require("../utils/http-error");
const JwtModel = require("../models/jwt.model");
const LoginAttemptsModel = require("../models/login-attempts.model");
const {
  ACCESS_TOKEN_WINDOW_SECONDS,
  REFRESH_TOKEN_WINDOW_SECONDS,
  REFRESH_TOKEN_ENABLED_WINDOW_SECONDS,
} = require("../constants/jwts");
const AppError = require("../utils/app-error");

const UserLogin = z.object({
  username: z.string(),
  password: z.string(),
});

const UserRegister = z.object({
  username: z.string().min(5),
  password: z.string().min(8),
  email: z.string().optional(),
});

class AuthenticationService {
  /**
   * @returns {Promise<UserModel | null>}
   */
  async login(loginDetails) {
    const validated = UserLogin.parse(loginDetails);

    /** @type {UserModel|null} */
    const user = await UserModel.findBy("username", validated.username);

    const validPassword = !user
      ? await argon2.verify(process.env.DUMMY_HASH, validated.password)
      : await user.verifyPassword(validated.password);
    const blocked = await this.userIsLoginBlocked(!user ? null : user.id);

    if (!user || !validPassword || blocked) {
      if (user) {
        this.failedLoginAttempt(user.id);
      }
      throw new HttpError({ code: 400, clientMessage: "Bad Login Request" });
    }

    return user;
  }

  async register(registerDetails) {
    const validatdRegisterDetails = UserRegister.parse(registerDetails);
    const user = new UserModel(
      validatdRegisterDetails.username,
      validatdRegisterDetails.email,
      validatdRegisterDetails.password,
      false,
    );

    await user.save();
  }

  /**
   * @param {number} id
   * @returns {Promise<UserModel | null>}
   */
  async getUserById(id) {
    const user = await UserModel.findById(id);
    return user;
  }

  /**
   * @param {number} userId
   * @returns {Promise<[string, string]>}
   */
  async generateTokens(userId, is_officer = 0) {
    if (!userId) {
      return [];
    }

    const accessExp =
      Math.floor(Date.now() / 1000) + ACCESS_TOKEN_WINDOW_SECONDS;
    const refreshExp =
      Math.floor(Date.now() / 1000) + REFRESH_TOKEN_WINDOW_SECONDS;

    const session_id = uuidv4();

    const access = jwt.sign(
      {
        sub: userId,
        jti: session_id,
        is_officer,
        exp: accessExp,
      },
      process.env.JWT_ACCESS_SECRET,
    );
    const refresh = jwt.sign(
      { sub: userId, jti: session_id, is_officer, exp: refreshExp },
      process.env.JWT_REFRESH_SECRET,
    );

    await this.saveToken(
      userId,
      session_id,
      access,
      "access",
      new Date(accessExp * 1000),
    );
    await this.saveToken(
      userId,
      session_id,
      refresh,
      "refresh",
      new Date(refreshExp * 1000),
    );

    return [access, refresh];
  }

  /**
   * @param {number} user_id
   * @param {string} token
   * @param {('access'|'refresh')} type
   * @param {number} expires_at
   * @returns {Promise<JwtModel>}
   */
  async saveToken(user_id, session_id, token, type, expires_at) {
    if (!user_id || !session_id || !token || !type || !expires_at) {
      return null;
    }

    return await new JwtModel(
      user_id,
      session_id,
      token,
      type,
      new Date(expires_at * 1000),
    ).save();
  }

  /**
   * @param {number} user_id
   */
  async deleteTokensForUser(user_id) {
    if (!user_id) {
      throw new HttpError({ code: 400, clientMessage: "Bad Request" });
    }

    const jwts = await JwtModel.findAllBy("user_id", user_id);
    if (jwts) {
      jwts.forEach(async (token) => {
        await token.delete();
      });
    }
  }

  /**
   * @param {number} user_id
   * @param {('access'|'refresh')} type
   */
  async deleteTokenForUser(user_id, type) {
    if (!user_id || !type) {
      throw new HttpError({ code: 400, clientMessage: "Bad Request" });
    }

    const jwt = await JwtModel.findBy(["user_id", "type"], [user_id, type]);

    if (jwt) {
      await jwt.delete();
    }
  }

  /**
   * @param {string} token
   * @param {('access'|'refresh')} [type="access"]
   */
  async verifyToken(token, type = "access") {
    const payload = jwt.verify(
      token,
      type == "refresh"
        ? process.env.JWT_REFRESH_SECRET
        : process.env.JWT_ACCESS_SECRET,
    );

    const jwtSaved = await JwtModel.findBy("session_id", payload.jti);

    if (!jwtSaved) {
      throw new HttpError({ code: 401, clientMessage: "Invalid Token" });
    }

    return payload;
  }

  /**
   * @param {string} access
   * @param {string} refresh
   */
  async refreshToken(
    access,
    refresh,
    {
      refreshTokenEnabledWindowSeconds = REFRESH_TOKEN_ENABLED_WINDOW_SECONDS,
    } = {},
  ) {
    let accessExpiresAt = null;
    try {
      const accessTokenVerified = await this.verifyToken(access, "access");
      accessExpiresAt = accessTokenVerified.exp;
    } catch {}

    if (
      accessExpiresAt !== null &&
      accessExpiresAt - Math.floor(Date.now() / 1000) >
        refreshTokenEnabledWindowSeconds
    ) {
      return [];
    }

    const refreshTokenVerified = await this.verifyToken(refresh, "refresh");

    const userId = refreshTokenVerified.sub;
    const isOfficer = refreshTokenVerified.is_officer;
    const sessionId = refreshTokenVerified.jti;

    setTimeout(() => {
      AppError.try(async () => {
        await JwtModel.deleteAllSessionTokens(sessionId);
      });
    }, 5000);

    return await this.generateTokens(userId, isOfficer);
  }

  /**
   * @description If accessToken is not provided, all valid sessions are logged out
   * Otherwise only the session attached to the token is logged out
   * accessToken must also be valid
   * @param {number} userId
   * @param {string} accessToken
   */
  async logout(userId, accessToken) {
    if (!userId) {
      throw new HttpError({ code: 400, clientMessage: "Bad Request" });
    }

    if (!accessToken) {
      return await JwtModel.deleteAllUserTokens(userId);
    }

    const tokenValidted = await this.verifyToken(accessToken);

    if (tokenValidted.sub !== userId) {
      return;
    }

    const sessionId = tokenValidted.jti;

    return await JwtModel.deleteAllSessionTokens(sessionId);
  }

  /**
   * @param {number} id
   * @returns {Promise<UserModel | null>}
   */
  async getProfile(id) {
    const userDetails = await UserModel.findById(id);
    return userDetails;
  }

  /**
   * @param {number} user_id
   */
  async failedLoginAttempt(user_id) {
    if (!user_id) {
      throw new HttpError({ code: 400, clientMessage: "Bad Request" });
    }

    /** @type {LoginAttemptsModel | null} */
    const loginAttempt =
      (await LoginAttemptsModel.findBy("user_id", user_id)) ||
      (await new LoginAttemptsModel(user_id).save());

    await loginAttempt.failedLoginAttempt();
    return loginAttempt;
  }

  /**
   * @param {number} user_id
   * @returns {Promise<boolean>}
   */
  async userIsLoginBlocked(user_id) {
    /** @type {LoginAttemptsModel | null} */
    if (!user_id) {
      await LoginAttemptsModel.findBy("user_id", -1);
      return false;
    }

    const loginAttempts = await LoginAttemptsModel.findBy("user_id", user_id);

    if (!loginAttempts) {
      return false;
    }

    if (
      Date.now() - loginAttempts.last_attempt_at >
      process.env.ACCOUNT_LOCKOUT_SECONDS * 1000
    ) {
      await loginAttempts.resetAttempts();
      return false;
    }

    if (loginAttempts.attempts >= process.env.ACCOUNT_LOCK_ATTEMPTS) {
      return true;
    }

    return false;
  }
}

const authenticationService = new AuthenticationService();

module.exports = authenticationService;
