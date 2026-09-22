const Client = require('../models/client.model');

class ClientService {
  /**
   * Lists clients strictly belonging to the authenticated company.
   * Supports search (by name, phone, or email) and active status filtering.
   *
   * @param {string} companyId - Authoritative companyId
   * @param {Object} [filter={}]
   * @returns {Promise<Array<Object>>}
   */
  async listClients(companyId, filter = {}) {
    const query = { companyId };

    if (filter.isActive !== undefined && filter.isActive !== 'all') {
      query.isActive = filter.isActive === 'true' || filter.isActive === true;
    }

    if (filter.search) {
      const searchRegex = new RegExp(filter.search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
      ];
    }

    const clients = await Client.find(query).sort({ createdAt: -1 });

    return clients.map((c) => ({
      id: c._id.toString(),
      _id: c._id.toString(),
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      gender: c.gender,
      dateOfBirth: c.dateOfBirth,
      notes: c.notes || '',
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Retrieves single client by ID strictly within company boundaries.
   *
   * @param {string} clientId
   * @param {string} companyId
   * @returns {Promise<Object>}
   */
  async getClientById(clientId, companyId) {
    const client = await Client.findOne({ _id: clientId, companyId });
    if (!client) {
      const err = new Error('Client not found or does not belong to your company.');
      err.status = 404;
      err.code = 'CLIENT_NOT_FOUND';
      throw err;
    }

    return {
      id: client._id.toString(),
      _id: client._id.toString(),
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      gender: client.gender,
      dateOfBirth: client.dateOfBirth,
      notes: client.notes || '',
      isActive: client.isActive,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  /**
   * Provisions a new client record strictly in the authenticated company.
   *
   * @param {string} companyId
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createClient(companyId, data) {
    const name = (data.name || '').trim();
    const phone = (data.phone || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const gender = data.gender || 'PREFER_NOT_TO_SAY';
    const dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    const notes = (data.notes || '').trim();
    const isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;

    if (!name) {
      const err = new Error('Client name is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (!phone) {
      const err = new Error('Client phone number is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // Check duplicate phone within this company
    const existingClient = await Client.findOne({ companyId, phone });
    if (existingClient) {
      const err = new Error(`A client with phone '${phone}' already exists in your company directory.`);
      err.status = 409;
      err.code = 'PHONE_EXISTS';
      throw err;
    }

    const client = await Client.create({
      companyId,
      name,
      phone,
      email,
      gender,
      dateOfBirth,
      notes,
      isActive,
    });

    return {
      id: client._id.toString(),
      name: client.name,
      phone: client.phone,
      email: client.email,
      gender: client.gender,
      dateOfBirth: client.dateOfBirth,
      notes: client.notes,
      isActive: client.isActive,
      createdAt: client.createdAt,
    };
  }

  /**
   * Updates an existing client with duplicate phone validation and company isolation.
   *
   * @param {string} clientId
   * @param {string} companyId
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateClient(clientId, companyId, updateData) {
    const client = await Client.findOne({ _id: clientId, companyId });
    if (!client) {
      const err = new Error('Client not found or does not belong to your company.');
      err.status = 404;
      err.code = 'CLIENT_NOT_FOUND';
      throw err;
    }

    if (updateData.name !== undefined) {
      const name = updateData.name.trim();
      if (!name) {
        const err = new Error('Client name cannot be empty.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      client.name = name;
    }

    if (updateData.phone !== undefined) {
      const phone = updateData.phone.trim();
      if (!phone) {
        const err = new Error('Phone number cannot be empty.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      if (phone !== client.phone) {
        const existing = await Client.findOne({ companyId, phone });
        if (existing) {
          const err = new Error(`A client with phone '${phone}' already exists in your company directory.`);
          err.status = 409;
          err.code = 'PHONE_EXISTS';
          throw err;
        }
        client.phone = phone;
      }
    }

    if (updateData.email !== undefined) {
      client.email = updateData.email.trim().toLowerCase();
    }

    if (updateData.gender !== undefined) {
      client.gender = updateData.gender;
    }

    if (updateData.dateOfBirth !== undefined) {
      client.dateOfBirth = updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : null;
    }

    if (updateData.notes !== undefined) {
      client.notes = updateData.notes.trim();
    }

    if (updateData.isActive !== undefined) {
      client.isActive = Boolean(updateData.isActive);
    }

    await client.save();

    return {
      id: client._id.toString(),
      name: client.name,
      phone: client.phone,
      email: client.email,
      gender: client.gender,
      dateOfBirth: client.dateOfBirth,
      notes: client.notes,
      isActive: client.isActive,
      updatedAt: client.updatedAt,
    };
  }

  /**
   * Performs soft deletion by marking the client as inactive.
   *
   * @param {string} clientId
   * @param {string} companyId
   * @returns {Promise<Object>}
   */
  async deleteClient(clientId, companyId) {
    const client = await Client.findOne({ _id: clientId, companyId });
    if (!client) {
      const err = new Error('Client not found or does not belong to your company.');
      err.status = 404;
      err.code = 'CLIENT_NOT_FOUND';
      throw err;
    }

    client.isActive = false;
    await client.save();

    return {
      message: `Client '${client.name}' has been deactivated.`,
      client: {
        id: client._id.toString(),
        name: client.name,
        isActive: client.isActive,
      },
    };
  }

  /**
   * Toggles client active/inactive status.
   *
   * @param {string} clientId
   * @param {string} companyId
   * @param {boolean} isActive
   * @returns {Promise<Object>}
   */
  async toggleStatus(clientId, companyId, isActive) {
    return this.updateClient(clientId, companyId, { isActive });
  }
}

module.exports = new ClientService();
