const authService = require('../services/auth.service');
const { validateLoginInput } = require('../validators/auth.validator');

class AuthController {
  /**
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const validation = validateLoginInput(req.body);
      if (!validation.isValid) {
        return res.status(400).json(validation.error);
      }

      const { user, token } = await authService.login(
        validation.normalizedEmail,
        validation.password
      );

      return res.status(200).json({
        user,
        token,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   */
  async getMe(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id);

      return res.status(200).json({
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req, res) {
    // In stateless JWT authentication, the client discards the token.
    return res.status(200).json({
      message: 'Logged out successfully.',
    });
  }
}

module.exports = new AuthController();
