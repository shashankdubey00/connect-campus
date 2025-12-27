import { useMemo } from 'react';
import './PasswordStrength.css';

const PasswordStrength = ({ password }) => {
  const strength = useMemo(() => {
    if (!password) return { level: 0, label: '', color: '' };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^a-zA-Z0-9]/.test(password),
    };

    Object.values(checks).forEach((check) => {
      if (check) score++;
    });

    if (score <= 2) return { level: 1, label: 'Weak', color: '#ff4444' };
    if (score <= 3) return { level: 2, label: 'Fair', color: '#ffaa00' };
    if (score <= 4) return { level: 3, label: 'Good', color: '#00aa00' };
    return { level: 4, label: 'Strong', color: '#00ff00' };
  }, [password]);

  if (!password) return null;

  return (
    <div className="password-strength">
      <div className="password-strength-bars">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`password-strength-bar ${
              level <= strength.level ? 'active' : ''
            }`}
            style={{
              backgroundColor:
                level <= strength.level ? strength.color : '#333',
            }}
          />
        ))}
      </div>
      <span
        className="password-strength-label"
        style={{ color: strength.color }}
      >
        {strength.label}
      </span>
    </div>
  );
};

export default PasswordStrength;



