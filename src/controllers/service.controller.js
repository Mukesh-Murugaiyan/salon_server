const serviceService = require('../services/service.service');
const { getSalonIdFromUser } = require('../utils/tenant');

class ServiceController {
  /**
   * GET /api/v1/services
   */
  async listServices(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const services = await serviceService.listServices(salonId, req.query);

      return res.status(200).json({
        success: true,
        services,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/services/:id
   */
  async getService(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const service = await serviceService.getServiceById(req.params.id, salonId);

      return res.status(200).json({
        success: true,
        service,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/services
   */
  async createService(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const service = await serviceService.createService(salonId, req.body);

      return res.status(201).json({
        success: true,
        service,
        message: 'Service created successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/services/:id
   */
  async updateService(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const service = await serviceService.updateService(req.params.id, salonId, req.body);

      return res.status(200).json({
        success: true,
        service,
        message: 'Service updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/services/:id
   */
  async deleteService(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const result = await serviceService.deleteService(req.params.id, salonId);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/services/:id/status
   */
  async toggleStatus(req, res, next) {
    try {
      const salonId = getSalonIdFromUser(req);
      const service = await serviceService.toggleStatus(req.params.id, salonId);

      return res.status(200).json({
        success: true,
        service,
        message: `Service marked as ${service.isActive ? 'active' : 'inactive'}.`,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ServiceController();
