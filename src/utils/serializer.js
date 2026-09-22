/**
 * Serializes a Mongoose User document or plain user object into a safe public representation.
 * Strips passwordHash, __v, and any internal implementation artifacts.
 *
 * @param {Object} user - User document or object
 * @returns {Object} Safe user object
 */
const toSafeUser = (user) => {
  if (!user) return null;

  return {
    id: user._id ? user._id.toString() : user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    salonId: user.salonId ? user.salonId.toString() : null,
  };
};

module.exports = {
  toSafeUser,
};
