const roleService = require('../services/role.service');
const { getSalonIdFromUser } = require('../utils/tenant');

class RoleController {
  /**
   * GET /api/v1/roles
   */
  async listRoles(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const roles = await roleService.listRoles(salonId);
      return res.status(200).json({
        success: true,
        roles,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/roles/:id
   */
  async getRole(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const data = await roleService.getRoleById(req.params.id, salonId);
      return res.status(200).json({
        success: true,
        ...data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/roles
   */
  async createRole(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const role = await roleService.createRole(salonId, req.body);
      return res.status(201).json({
        success: true,
        role,
        message: 'Role created successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/roles/:id
   */
  async updateRole(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const role = await roleService.updateRole(req.params.id, salonId, req.body);
      return res.status(200).json({
        success: true,
        role,
        message: 'Role updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/roles/:id
   */
  async deleteRole(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const result = await roleService.deleteRole(req.params.id, salonId);
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/roles/:id/permissions
   */
  async getRolePermissions(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const data = await roleService.getRolePermissions(req.params.id, salonId);
      return res.status(200).json({
        success: true,
        ...data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/roles/:id/permissions
   */
  async updateRolePermissions(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const result = await roleService.updateRolePermissions(
        req.params.id,
        salonId,
        req.body.permissions
      );
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RoleController();
