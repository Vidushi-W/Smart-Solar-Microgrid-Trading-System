/**
 * Client-side password checklist for signup, profile, and user forms. A strong password needs 8 characters, both letter cases, a digit, and a special character. The API still decides whether to accept it.
 */
// A special character is any symbol that is not a letter, digit, or whitespace.
export function passwordRequirements(password) {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "An uppercase letter", met: /[A-Z]/.test(password) },
    { label: "A lowercase letter", met: /[a-z]/.test(password) },
    { label: "A number", met: /[0-9]/.test(password) },
    { label: "A special character", met: /[^A-Za-z0-9\s]/.test(password) },
  ];
}

export function isPasswordStrong(password) {
  return passwordRequirements(password).every((requirement) => requirement.met);
}