const Staff = require('../models/staff.model');
const subscriptionService = require('./subscription.service');

class StaffService {
  /**
   * Lists staff members strictly belonging to the authenticated company.
   * Supports search (by name, phone, email, title, or specialization) and status filtering.
   *
   * @param {string} companyId - Authoritative companyId
   * @param {Object} [filter={}]
   * @returns {Promise<Array<Object>>}
   */
  async listStaff(companyId, filter = {}) {
    const query = { companyId };

    if (filter.isActive !== undefined && filter.isActive !== 'all') {
      query.isActive = filter.isActive === 'true' || filter.isActive === true;
    }

    if (filter.title) {
      query.title = filter.title;
    }

    if (filter.search) {
      const searchRegex = new RegExp(filter.search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { title: searchRegex },
        { specialization: searchRegex },
      ];
    }

    const staffList = await Staff.find(query).sort({ createdAt: -1 });

    return staffList.map((s) => ({
      id: s._id.toString(),
      _id: s._id.toString(),
      name: s.name,
      phone: s.phone,
      email: s.email || '',
      title: s.title,
      specialization: s.specialization || '',
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  /**
   * Retrieves single staff member by ID strictly within company boundaries.
   *
   * @param {string} staffId
   * @param {string} companyId
   * @returns {Promise<Object>}
   */
  async getStaffById(staffId, companyId) {
    const staff = await Staff.findOne({ _id: staffId, companyId });
    if (!staff) {
      const err = new Error('Staff member not found or does not belong to your company.');
      err.status = 404;
      err.code = 'STAFF_NOT_FOUND';
      throw err;
    }

    return {
      id: staff._id.toString(),
      _id: staff._id.toString(),
      name: staff.name,
      phone: staff.phone,
      email: staff.email || '',
      title: staff.title,
      specialization: staff.specialization || '',
      isActive: staff.isActive,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
    };
  }

  /**
   * Provisions a new staff member record in the company directory.
   *
   * @param {string} companyId
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createStaff(companyId, data) {
    const name = (data.name || '').trim();
    const phone = (data.phone || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const title = (data.title || '').trim();
    const specialization = (data.specialization || '').trim();
    const isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;

    if (!name) {
      const err = new Error('Staff name is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (!phone) {
      const err = new Error('Phone number is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (!title) {
      const err = new Error('Staff title/position is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // Check duplicate phone within this company
    const existing = await Staff.findOne({ companyId, phone });
    if (existing) {
      const err = new Error(`A staff member with phone '${phone}' already exists in your company directory.`);
      err.status = 409;
      err.code = 'PHONE_EXISTS';
      throw err;
    }

    // Enforce subscription plan staff limit
    if (isActive) {
      await subscriptionService.validateStaffLimit(companyId);
    }

    const staff = await Staff.create({
      companyId,
      name,
      phone,
      email,
      title,
      specialization,
      isActive,
    });

    return {
      id: staff._id.toString(),
      name: staff.name,
      phone: staff.phone,
      email: staff.email,
      title: staff.title,
      specialization: staff.specialization,
      isActive: staff.isActive,
      createdAt: staff.createdAt,
    };
  }

  /**
   * Updates an existing staff record within tenant boundaries.
   *
   * @param {string} staffId
   * @param {string} companyId
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateStaff(staffId, companyId, updateData) {
    const staff = await Staff.findOne({ _id: staffId, companyId });
    if (!staff) {
      const err = new Error('Staff member not found or does not belong to your company.');
      err.status = 404;
      err.code = 'STAFF_NOT_FOUND';
      throw err;
    }

    if (updateData.name !== undefined) {
      const name = updateData.name.trim();
      if (!name) {
        const err = new Error('Staff name cannot be empty.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      staff.name = name;
    }

    if (updateData.phone !== undefined) {
      const phone = updateData.phone.trim();
      if (!phone) {
        const err = new Error('Phone number cannot be empty.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      if (phone !== staff.phone) {
        const existing = await Staff.findOne({ companyId, phone });
        if (existing) {
          const err = new Error(`A staff member with phone '${phone}' already exists in your company directory.`);
          err.status = 409;
          err.code = 'PHONE_EXISTS';
          throw err;
        }
        staff.phone = phone;
      }
    }

    if (updateData.email !== undefined) {
      staff.email = updateData.email.trim().toLowerCase();
    }

    if (updateData.title !== undefined) {
      const title = updateData.title.trim();
      if (!title) {
        const err = new Error('Staff title cannot be empty.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      staff.title = title;
    }

    if (updateData.specialization !== undefined) {
      staff.specialization = updateData.specialization.trim();
    }

    if (updateData.isActive !== undefined) {
      const nextActive = Boolean(updateData.isActive);
      if (nextActive && !staff.isActive) {
        await subscriptionService.validateStaffLimit(companyId);
      }
      staff.isActive = nextActive;
    }

    await staff.save();

    return {
      id: staff._id.toString(),
      name: staff.name,
      phone: staff.phone,
      email: staff.email,
      title: staff.title,
      specialization: staff.specialization,
      isActive: staff.isActive,
      updatedAt: staff.updatedAt,
    };
  }

  /**
   * Performs soft deletion by marking the staff member as inactive.
   *
   * @param {string} staffId
   * @param {string} companyId
   * @returns {Promise<Object>}
   */
  async deleteStaff(staffId, companyId) {
    const staff = await Staff.findOne({ _id: staffId, companyId });
    if (!staff) {
      const err = new Error('Staff member not found or does not belong to your company.');
      err.status = 404;
      err.code = 'STAFF_NOT_FOUND';
      throw err;
    }

    staff.isActive = false;
    await staff.save();

    return {
      message: `Staff member '${staff.name}' has been deactivated.`,
      staff: {
        id: staff._id.toString(),
        name: staff.name,
        isActive: staff.isActive,
      },
    };
  }

  /**
   * Toggles staff active status.
   *
   * @param {string} staffId
   * @param {string} companyId
   * @param {boolean} isActive
   * @returns {Promise<Object>}
   */
  async toggleStatus(staffId, companyId, isActive) {
    return this.updateStaff(staffId, companyId, { isActive });
  }
}

module.exports = new StaffService();
