const userService = require('../services/user.service');
const { getSalonIdFromUser } = require('../utils/tenant');

class UserController {
  /**
   * GET /api/users
   */
  async listUsers(req, res, next) {
    try {
      const tenantSalonId = getSalonIdFromUser(req);
      const users = await userService.getUsers({
        tenantSalonId,
        currentUserRole: req.user.role,
        filter: req.query,
      });

      return res.status(200).json({ users });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/users/:id
   */
  async getUser(req, res, next) {
    try {
      const tenantSalonId = getSalonIdFromUser(req);
      const user = await userService.getUserById(req.params.id, {
        tenantSalonId,
        currentUserRole: req.user.role,
      });

      return res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/users
   */
  async createUser(req, res, next) {
    try {
      const tenantSalonId = getSalonIdFromUser(req);
      const user = await userService.createUser(req.body, {
        tenantSalonId,
        currentUserRole: req.user.role,
      });

      return res.status(201).json({ user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/:id
   */
  async updateUser(req, res, next) {
    try {
      const tenantSalonId = getSalonIdFromUser(req);
      const user = await userService.updateUser(req.params.id, req.body, {
        tenantSalonId,
        currentUserRole: req.user.role,
      });

      return res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/:id/status
   */
  async toggleStatus(req, res, next) {
    try {
      const { isActive } = req.body;
      if (isActive === undefined) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'isActive boolean flag is required.',
        });
      }

      const tenantSalonId = getSalonIdFromUser(req);
      const user = await userService.setUserActiveStatus(req.params.id, isActive, {
        tenantSalonId,
        currentUserRole: req.user.role,
      });

      return res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
