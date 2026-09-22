const userService = require('../services/user.service');
const { getSalonIdFromUser } = require('../utils/tenant');

class UserController {
  /**
   * GET /api/v1/users
   */
  async listUsers(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const users = await userService.getUsers(salonId, req.query);

      return res.status(200).json({
        success: true,
        users,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/users/:id
   */
  async getUser(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const user = await userService.getUserById(req.params.id, salonId);

      return res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/users
   */
  async createUser(req, res, next) {
    try {
      const authSalonId = getSalonIdFromUser(req);
      const salonId = authSalonId || req.body.salonId || null;
      const user = await userService.createUser(salonId, req.body);

      return res.status(201).json({
        success: true,
        user,
        message: 'User created successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/users/:id or PATCH /api/v1/users/:id
   */
  async updateUser(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const user = await userService.updateUser(req.params.id, salonId, req.body);

      return res.status(200).json({
        success: true,
        user,
        message: 'User updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/users/:id
   */
  async deleteUser(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const result = await userService.deleteUser(req.params.id, salonId);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/users/:id/status
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

      const salonId = getSalonIdFromUser(req);
      const user = await userService.updateUser(req.params.id, salonId, { isActive });

      return res.status(200).json({
        success: true,
        user,
        message: `User status changed to ${isActive ? 'active' : 'inactive'}.`,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
