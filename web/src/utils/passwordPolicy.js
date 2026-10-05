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