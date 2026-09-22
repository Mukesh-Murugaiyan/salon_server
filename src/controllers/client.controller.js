const clientService = require('../services/client.service');
const { getCompanyIdFromUser } = require('../utils/tenant');

class ClientController {
  /**
   * GET /api/v1/clients
   */
  async listClients(req, res, next) {
    try {
      const companyId = getCompanyIdFromUser(req);
      const clients = await clientService.listClients(companyId, req.query);

      return res.status(200).json({
        success: true,
        clients,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/clients/:id
   */
  async getClient(req, res, next) {
    try {
      const companyId = getCompanyIdFromUser(req);
      const client = await clientService.getClientById(req.params.id, companyId);

      return res.status(200).json({
        success: true,
        client,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/clients
   */
  async createClient(req, res, next) {
    try {
      const companyId = getCompanyIdFromUser(req);
      const client = await clientService.createClient(companyId, req.body);

      return res.status(201).json({
        success: true,
        client,
        message: 'Client created successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/clients/:id or PATCH /api/v1/clients/:id
   */
  async updateClient(req, res, next) {
    try {
      const companyId = getCompanyIdFromUser(req);
      const client = await clientService.updateClient(req.params.id, companyId, req.body);

      return res.status(200).json({
        success: true,
        client,
        message: 'Client updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/clients/:id
   */
  async deleteClient(req, res, next) {
    try {
      const companyId = getCompanyIdFromUser(req);
      const result = await clientService.deleteClient(req.params.id, companyId);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/clients/:id/status
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

      const companyId = getCompanyIdFromUser(req);
      const client = await clientService.toggleStatus(req.params.id, companyId, isActive);

      return res.status(200).json({
        success: true,
        client,
        message: `Client status changed to ${isActive ? 'active' : 'inactive'}.`,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ClientController();
