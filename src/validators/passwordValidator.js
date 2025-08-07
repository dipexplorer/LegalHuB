
/**
 * Evaluates password strength and returns both errors and a strength descriptor.
 * @param {string} password
 * @returns {object} { errors: Array, score: Number, strength: String }
 */
const validatePassword = function(password) {
  const errors = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  
  else errors.push("Minimum 8 characters.");

  if (/[A-Z]/.test(password)) score += 1;
  else errors.push("At least one uppercase letter.");

  if (/[a-z]/.test(password)) score += 1;
  else errors.push("At least one lowercase letter.");

  if (/[0-9]/.test(password)) score += 1;
  else errors.push("At least one number.");

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else errors.push("At least one special character.");


  return {errors};
}

module.exports = validatePassword;
