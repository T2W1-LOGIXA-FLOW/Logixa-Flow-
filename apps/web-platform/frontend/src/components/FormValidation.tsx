"use client";

import { useState, useCallback } from "react";

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  custom?: (value: unknown) => boolean | string;
}

export interface FormErrors {
  [field: string]: string;
}

/**
 * Form Validation Hook
 * Provides real-time form validation with error messages
 */
export function useFormValidation<T extends Record<string, unknown>>(initialValues: T, onSubmit?: (values: T) => Promise<void>) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name: string, value: unknown, rules: ValidationRule) => {
    // Required validation
    if (rules.required && (!value || (typeof value === "string" && value.trim() === ""))) {
      return "This field is required";
    }

    // String validations
    if (typeof value === "string") {
      if (rules.minLength && value.length < rules.minLength) {
        return `Minimum ${rules.minLength} characters required`;
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        return `Maximum ${rules.maxLength} characters allowed`;
      }
      if (rules.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return "Please enter a valid email address";
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        return "Invalid format";
      }
    }

    // Custom validation
    if (rules.custom) {
      const result = rules.custom(value);
      if (typeof result === "string") {
        return result;
      }
      if (result === false) {
        return "Validation failed";
      }
    }

    return "";
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, rules?: ValidationRule) => {
      const { name, value, type } = e.target;
      const finalValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

      setValues((prev) => ({ ...prev, [name]: finalValue }));

      // Real-time validation if touched
      if (touched[name] && rules) {
        const error = validateField(name, finalValue, rules);
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    },
    [touched, validateField]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, rules?: ValidationRule) => {
      const { name } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));

      if (rules) {
        const error = validateField(name, values[name], rules);
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    },
    [values, validateField]
  );

  const validateForm = useCallback((allRules: Record<string, ValidationRule>): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.entries(allRules).forEach(([field, rules]) => {
      const error = validateField(field, values[field], rules);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField]);

  const handleSubmit = useCallback(
    (allRules: Record<string, ValidationRule>) => async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      if (validateForm(allRules)) {
        try {
          await onSubmit?.(values);
        } finally {
          setIsSubmitting(false);
        }
      } else {
        setIsSubmitting(false);
      }
    },
    [validateForm, values, onSubmit]
  );

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setValues,
    setErrors,
  };
}

/**
 * Common validation rules presets
 */
export const validationRules = {
  email: {
    required: true,
    email: true,
  } as ValidationRule,
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]/,
  } as ValidationRule,
  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_-]+$/,
  } as ValidationRule,
  fullName: {
    required: true,
    minLength: 2,
    maxLength: 50,
  } as ValidationRule,
  phone: {
    required: true,
    pattern: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
  } as ValidationRule,
  url: {
    required: true,
    custom: (value) => {
      if (typeof value !== "string" || !value.trim()) return "Please enter a valid URL";
      try {
        const parsed = new URL(value.includes("://") ? value : `https://${value}`);
        return parsed.protocol === "http:" || parsed.protocol === "https:" || "Please enter a valid URL";
      } catch {
        return "Please enter a valid URL";
      }
    },
  } as ValidationRule,
  creditCard: {
    required: true,
    pattern: /^[0-9]{13,19}$/,
  } as ValidationRule,
};

/**
 * Real-time password strength validator
 */
export function usePasswordStrength() {
  const [strength, setStrength] = useState(0);
  const [feedback, setFeedback] = useState("");

  const checkStrength = useCallback((password: string) => {
    let score = 0;
    const feedback: string[] = [];

    if (!password) {
      setStrength(0);
      setFeedback("");
      return;
    }

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[@$!%*#?&]/.test(password)) score++;

    if (score < 2) feedback.push("Very weak");
    if (score >= 2 && score < 4) feedback.push("Weak");
    if (score >= 4 && score < 5) feedback.push("Good");
    if (score >= 5) feedback.push("Strong");

    setStrength(score);
    setFeedback(feedback[0] || "");
  }, []);

  return { strength, feedback, checkStrength };
}

/**
 * Multi-step form validation
 */
export function useMultiStepForm<T extends Record<string, unknown>>(initialValues: T, steps: Array<{ name: string; fields: string[] }>) {
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState(initialValues);
  const [errors] = useState<FormErrors>({});

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, steps.length]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
  }, []);

  return {
    currentStep,
    totalSteps: steps.length,
    currentStepName: steps[currentStep].name,
    currentStepFields: steps[currentStep].fields,
    values,
    errors,
    handleNext,
    handlePrev,
    handleFieldChange,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
  };
}
