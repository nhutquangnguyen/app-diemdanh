import { PASSWORD_REQUIREMENTS, validatePassword } from '@/lib/password-validation';

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

export default function PasswordRequirements({ password, className = '' }: PasswordRequirementsProps) {
  const validation = validatePassword(password);

  return (
    <div className={`bg-gray-50 rounded-lg p-4 border border-gray-200 ${className}`}>
      <p className="text-sm font-semibold text-gray-700 mb-3">Yêu cầu mật khẩu:</p>
      <ul className="space-y-2">
        {PASSWORD_REQUIREMENTS.map((requirement, index) => {
          const isMet = validation.requirementsMet[index];
          const isRequired = requirement.required;

          return (
            <li key={index} className="flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">
                {isMet ? (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth={2} />
                  </svg>
                )}
              </span>
              <span className={`text-sm ${isMet ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                {requirement.label}
                {!isRequired && (
                  <span className="ml-1 text-xs text-gray-500 italic">(khuyến nghị)</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
