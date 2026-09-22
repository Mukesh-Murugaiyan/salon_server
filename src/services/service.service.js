const Service = require('../models/service.model');

class ServiceService {
  /**
   * Lists services strictly belonging to the authenticated salon.
   * Supports search (by name or description) and status filtering.
   *
   * @param {string} salonId - Authoritative salonId
   * @param {Object} [filter={}]
   * @returns {Promise<Array<Object>>}
   */
  async listServices(salonId, filter = {}) {
    const query = { salonId };

    if (filter.isActive !== undefined && filter.isActive !== 'all') {
      query.isActive = filter.isActive === 'true' || filter.isActive === true;
    }

    if (filter.search) {
      const searchRegex = new RegExp(filter.search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
      ];
    }

    const services = await Service.find(query).sort({ name: 1, createdAt: -1 });

    return services.map((s) => ({
      id: s._id.toString(),
      _id: s._id.toString(),
      name: s.name,
      description: s.description || '',
      durationInMinutes: s.durationInMinutes,
      price: s.price,
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  /**
   * Retrieves single service by ID strictly within salon boundaries.
   *
   * @param {string} serviceId
   * @param {string} salonId
   * @returns {Promise<Object>}
   */
  async getServiceById(serviceId, salonId) {
    const service = await Service.findOne({ _id: serviceId, salonId });
    if (!service) {
      const err = new Error('Service not found or does not belong to your salon.');
      err.status = 404;
      err.code = 'SERVICE_NOT_FOUND';
      throw err;
    }

    return {
      id: service._id.toString(),
      _id: service._id.toString(),
      name: service.name,
      description: service.description || '',
      durationInMinutes: service.durationInMinutes,
      price: service.price,
      isActive: service.isActive,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  /**
   * Creates a new service record for the salon.
   *
   * @param {string} salonId
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createService(salonId, data) {
    const name = (data.name || '').trim();
    const description = (data.description || '').trim();
    const durationInMinutes = Number(data.durationInMinutes);
    const price = Number(data.price);
    const isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;

    if (!name) {
      const err = new Error('Service name is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (isNaN(durationInMinutes) || durationInMinutes <= 0) {
      const err = new Error('Duration must be a valid positive number greater than 0.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (isNaN(price) || price < 0) {
      const err = new Error('Price must be a valid non-negative number.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // Check for duplicate active service name within this salon (case-insensitive)
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await Service.findOne({
      salonId,
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      isActive: true,
    });

    if (existing) {
      const err = new Error(`An active service with the name '${name}' already exists in your salon.`);
      err.status = 409;
      err.code = 'SERVICE_EXISTS';
      throw err;
    }

    const service = await Service.create({
      salonId,
      name,
      description,
      durationInMinutes,
      price,
      isActive,
    });

    return {
      id: service._id.toString(),
      _id: service._id.toString(),
      name: service.name,
      description: service.description,
      durationInMinutes: service.durationInMinutes,
      price: service.price,
      isActive: service.isActive,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  /**
   * Updates an existing service record within tenant boundaries.
   *
   * @param {string} serviceId
   * @param {string} salonId
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateService(serviceId, salonId, data) {
    const service = await Service.findOne({ _id: serviceId, salonId });
    if (!service) {
      const err = new Error('Service not found or does not belong to your salon.');
      err.status = 404;
      err.code = 'SERVICE_NOT_FOUND';
      throw err;
    }

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        const err = new Error('Service name cannot be empty.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      const targetIsActive = data.isActive !== undefined ? Boolean(data.isActive) : service.isActive;

      // Check if duplicate name exists among other active services
      if (targetIsActive) {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existing = await Service.findOne({
          salonId,
          _id: { $ne: serviceId },
          name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
          isActive: true,
        });

        if (existing) {
          const err = new Error(`An active service with the name '${name}' already exists in your salon.`);
          err.status = 409;
          err.code = 'SERVICE_EXISTS';
          throw err;
        }
      }

      service.name = name;
    }

    if (data.description !== undefined) {
      service.description = data.description.trim();
    }

    if (data.durationInMinutes !== undefined) {
      const duration = Number(data.durationInMinutes);
      if (isNaN(duration) || duration <= 0) {
        const err = new Error('Duration must be a valid positive number greater than 0.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      service.durationInMinutes = duration;
    }

    if (data.price !== undefined) {
      const price = Number(data.price);
      if (isNaN(price) || price < 0) {
        const err = new Error('Price must be a valid non-negative number.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      service.price = price;
    }

    if (data.isActive !== undefined) {
      const newIsActive = Boolean(data.isActive);
      // If reactivating, verify no duplicate active service with this name
      if (!service.isActive && newIsActive) {
        const escapedName = service.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existing = await Service.findOne({
          salonId,
          _id: { $ne: serviceId },
          name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
          isActive: true,
        });
        if (existing) {
          const err = new Error(`An active service with the name '${service.name}' already exists in your salon.`);
          err.status = 409;
          err.code = 'SERVICE_EXISTS';
          throw err;
        }
      }
      service.isActive = newIsActive;
    }

    await service.save();

    return {
      id: service._id.toString(),
      _id: service._id.toString(),
      name: service.name,
      description: service.description,
      durationInMinutes: service.durationInMinutes,
      price: service.price,
      isActive: service.isActive,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  /**
   * Soft deletes a service record by marking isActive = false.
   *
   * @param {string} serviceId
   * @param {string} salonId
   * @returns {Promise<Object>}
   */
  async deleteService(serviceId, salonId) {
    const service = await Service.findOne({ _id: serviceId, salonId });
    if (!service) {
      const err = new Error('Service not found or does not belong to your salon.');
      err.status = 404;
      err.code = 'SERVICE_NOT_FOUND';
      throw err;
    }

    service.isActive = false;
    await service.save();

    return {
      id: service._id.toString(),
      _id: service._id.toString(),
      name: service.name,
      isActive: false,
      message: 'Service deactivated successfully (soft-deleted).',
    };
  }

  /**
   * Toggles the active status of a service.
   *
   * @param {string} serviceId
   * @param {string} salonId
   * @returns {Promise<Object>}
   */
  async toggleStatus(serviceId, salonId) {
    const service = await Service.findOne({ _id: serviceId, salonId });
    if (!service) {
      const err = new Error('Service not found or does not belong to your salon.');
      err.status = 404;
      err.code = 'SERVICE_NOT_FOUND';
      throw err;
    }

    const nextState = !service.isActive;

    // If activating, verify no other active service with same name exists
    if (nextState) {
      const escapedName = service.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existing = await Service.findOne({
        salonId,
        _id: { $ne: serviceId },
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
        isActive: true,
      });

      if (existing) {
        const err = new Error(`An active service with the name '${service.name}' already exists in your salon.`);
        err.status = 409;
        err.code = 'SERVICE_EXISTS';
        throw err;
      }
    }

    service.isActive = nextState;
    await service.save();

    return {
      id: service._id.toString(),
      _id: service._id.toString(),
      name: service.name,
      isActive: service.isActive,
    };
  }
}

module.exports = new ServiceService();
