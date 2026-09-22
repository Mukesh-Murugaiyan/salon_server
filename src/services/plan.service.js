const Plan = require('../models/plan.model');

class PlanService {
  /**
   * Lists available subscription plans.
   *
   * @param {Object} [filter={}]
   * @returns {Promise<Array<Object>>}
   */
  async listPlans(filter = {}) {
    const query = {};
    if (filter.isActive !== undefined && filter.isActive !== 'all') {
      query.isActive = filter.isActive === 'true' || filter.isActive === true;
    }

    const plans = await Plan.find(query).sort({ price: 1, createdAt: -1 });

    return plans.map((p) => ({
      id: p._id.toString(),
      _id: p._id.toString(),
      name: p.name,
      description: p.description || '',
      price: p.price,
      durationInDays: p.durationInDays,
      maxStaff: p.maxStaff,
      maxAppointments: p.maxAppointments,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  /**
   * Retrieves single plan by ID.
   *
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getPlanById(id) {
    const plan = await Plan.findById(id);
    if (!plan) {
      const err = new Error('Plan not found.');
      err.status = 404;
      err.code = 'PLAN_NOT_FOUND';
      throw err;
    }

    return {
      id: plan._id.toString(),
      _id: plan._id.toString(),
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      durationInDays: plan.durationInDays,
      maxStaff: plan.maxStaff,
      maxAppointments: plan.maxAppointments,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  /**
   * Creates a new subscription plan tier.
   *
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createPlan(data) {
    const name = (data.name || '').trim();
    const description = (data.description || '').trim();
    const price = Number(data.price);
    const durationInDays = Number(data.durationInDays);
    const maxStaff = Number(data.maxStaff);
    const maxAppointments = Number(data.maxAppointments);
    const isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;

    if (!name) {
      const err = new Error('Plan name is required.');
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

    if (isNaN(durationInDays) || durationInDays < 1) {
      const err = new Error('Duration in days must be at least 1.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (isNaN(maxStaff) || maxStaff < 1) {
      const err = new Error('Max staff must be at least 1.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (isNaN(maxAppointments) || maxAppointments < 1) {
      const err = new Error('Max appointments must be at least 1.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const existing = await Plan.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      const err = new Error(`A plan with the name '${name}' already exists.`);
      err.status = 409;
      err.code = 'PLAN_NAME_EXISTS';
      throw err;
    }

    const plan = await Plan.create({
      name,
      description,
      price,
      durationInDays,
      maxStaff,
      maxAppointments,
      isActive,
    });

    return {
      id: plan._id.toString(),
      _id: plan._id.toString(),
      name: plan.name,
      description: plan.description,
      price: plan.price,
      durationInDays: plan.durationInDays,
      maxStaff: plan.maxStaff,
      maxAppointments: plan.maxAppointments,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  /**
   * Updates an existing subscription plan.
   *
   * @param {string} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updatePlan(id, data) {
    const plan = await Plan.findById(id);
    if (!plan) {
      const err = new Error('Plan not found.');
      err.status = 404;
      err.code = 'PLAN_NOT_FOUND';
      throw err;
    }

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) {
        const err = new Error('Plan name cannot be empty.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      const existing = await Plan.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name}$`, 'i') },
      });
      if (existing) {
        const err = new Error(`A plan with the name '${name}' already exists.`);
        err.status = 409;
        err.code = 'PLAN_NAME_EXISTS';
        throw err;
      }
      plan.name = name;
    }

    if (data.description !== undefined) {
      plan.description = data.description.trim();
    }

    if (data.price !== undefined) {
      const price = Number(data.price);
      if (isNaN(price) || price < 0) {
        const err = new Error('Price must be a non-negative number.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      plan.price = price;
    }

    if (data.durationInDays !== undefined) {
      const duration = Number(data.durationInDays);
      if (isNaN(duration) || duration < 1) {
        const err = new Error('Duration must be at least 1 day.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      plan.durationInDays = duration;
    }

    if (data.maxStaff !== undefined) {
      const maxStaff = Number(data.maxStaff);
      if (isNaN(maxStaff) || maxStaff < 1) {
        const err = new Error('Max staff must be at least 1.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      plan.maxStaff = maxStaff;
    }

    if (data.maxAppointments !== undefined) {
      const maxAppointments = Number(data.maxAppointments);
      if (isNaN(maxAppointments) || maxAppointments < 1) {
        const err = new Error('Max appointments must be at least 1.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      plan.maxAppointments = maxAppointments;
    }

    if (data.isActive !== undefined) {
      plan.isActive = Boolean(data.isActive);
    }

    await plan.save();

    return {
      id: plan._id.toString(),
      _id: plan._id.toString(),
      name: plan.name,
      description: plan.description,
      price: plan.price,
      durationInDays: plan.durationInDays,
      maxStaff: plan.maxStaff,
      maxAppointments: plan.maxAppointments,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  /**
   * Soft deletes a plan by setting isActive = false.
   *
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async deletePlan(id) {
    const plan = await Plan.findById(id);
    if (!plan) {
      const err = new Error('Plan not found.');
      err.status = 404;
      err.code = 'PLAN_NOT_FOUND';
      throw err;
    }

    plan.isActive = false;
    await plan.save();

    return {
      id: plan._id.toString(),
      _id: plan._id.toString(),
      name: plan.name,
      isActive: false,
      message: 'Plan deactivated successfully.',
    };
  }
}

module.exports = new PlanService();
