export interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  required: boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    label: 'Ít nhất 6 ký tự',
    test: (password: string) => password.length >= 6,
    required: true,
  },
  {
    label: 'Ít nhất 1 chữ thường (a-z)',
    test: (password: string) => /[a-z]/.test(password),
    required: true,
  },
  {
    label: 'Ít nhất 1 chữ hoa (A-Z)',
    test: (password: string) => /[A-Z]/.test(password),
    required: true,
  },
  {
    label: 'Ít nhất 1 chữ số (0-9)',
    test: (password: string) => /[0-9]/.test(password),
    required: true,
  },
  {
    label: 'Ít nhất 1 ký tự đặc biệt (@#$%...)',
    test: (password: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    required: false, // Recommended but not required
  },
];

export interface PasswordValidationResult {
  isValid: boolean;
  requirementsMet: boolean[];
  failedRequirements: string[];
}

/**
 * Validates a password against all requirements
 * @param password - The password to validate
 * @returns Validation result with details about which requirements are met
 */
export function validatePassword(password: string): PasswordValidationResult {
  const requirementsMet = PASSWORD_REQUIREMENTS.map((req) => req.test(password));
  const failedRequirements = PASSWORD_REQUIREMENTS
    .filter((req, index) => req.required && !requirementsMet[index])
    .map((req) => req.label);

  // Password is valid if all required requirements are met
  const isValid = PASSWORD_REQUIREMENTS
    .filter((req) => req.required)
    .every((req) => req.test(password));

  return {
    isValid,
    requirementsMet,
    failedRequirements,
  };
}

/**
 * Gets a user-friendly error message for invalid password
 * @param password - The password that failed validation
 * @returns Vietnamese error message
 */
export function getPasswordErrorMessage(password: string): string {
  const validation = validatePassword(password);

  if (validation.isValid) {
    return '';
  }

  if (password.length < 6) {
    return 'Mật khẩu phải có ít nhất 6 ký tự';
  }

  if (validation.failedRequirements.length > 0) {
    return `Mật khẩu thiếu: ${validation.failedRequirements.join(', ')}`;
  }

  return 'Mật khẩu không đáp ứng yêu cầu bảo mật';
}
