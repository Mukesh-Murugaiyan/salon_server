const Salon = require('../models/salon.model');

class SalonService {
  /**
   * Retrieves paginated salons based on search and status filters.
   *
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async listSalons({ search, isActive, page = 1, limit = 20 }) {
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true' || isActive === true;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [salons, total] = await Promise.all([
      Salon.find(query)
        .populate('currentPlanId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take),
      Salon.countDocuments(query),
    ]);

    return {
      salons,
      total,
      page: parseInt(page, 10) || 1,
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  /**
   * Retrieves a single salon by ID.
   *
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getSalonById(id) {
    const salon = await Salon.findById(id).populate('currentPlanId', 'name price durationInDays maxStaff maxAppointments');
    if (!salon) {
      const error = new Error('Salon not found.');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    return salon;
  }

  /**
   * Creates a new salon tenant.
   *
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createSalon(data) {
    // Ensure code uniqueness
    if (data.code) {
      const existing = await Salon.findOne({ code: data.code.toUpperCase() });
      if (existing) {
        const error = new Error(`Salon code '${data.code.toUpperCase()}' is already in use.`);
        error.status = 400;
        error.code = 'DUPLICATE_CODE';
        throw error;
      }
    }

    const salon = await Salon.create(data);
    return salon;
  }

  /**
   * Updates an existing salon.
   *
   * @param {string} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateSalon(id, data) {
    const salon = await Salon.findById(id);
    if (!salon) {
      const error = new Error('Salon not found.');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Ensure code uniqueness if code is being updated
    if (data.code && data.code.toUpperCase() !== salon.code) {
      const existing = await Salon.findOne({ code: data.code.toUpperCase() });
      if (existing) {
        const error = new Error(`Salon code '${data.code.toUpperCase()}' is already in use.`);
        error.status = 400;
        error.code = 'DUPLICATE_CODE';
        throw error;
      }
    }

    // Apply allowed updates
    const allowedFields = ['name', 'code', 'email', 'phone', 'address', 'latitude', 'longitude', 'allowedRadiusInMeters'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        salon[field] = data[field];
      }
    }

    await salon.save();
    return salon;
  }

  /**
   * Toggles the active status of a salon.
   *
   * @param {string} id
   * @param {boolean} isActive
   * @returns {Promise<Object>}
   */
  async toggleStatus(id, isActive) {
    const salon = await Salon.findById(id);
    if (!salon) {
      const error = new Error('Salon not found.');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    salon.isActive = isActive;
    await salon.save();
    return salon;
  }
}

module.exports = new SalonService();
