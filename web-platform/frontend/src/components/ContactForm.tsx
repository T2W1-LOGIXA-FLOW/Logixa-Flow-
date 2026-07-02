"use client";

import { FormEvent, useState } from "react";
import { submitContact, subscribe } from "./api";
import { useLocale } from "@/lib/LanguageContext";

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

interface FormTouched {
  name?: boolean;
  email?: boolean;
  message?: boolean;
}

export default function ContactForm() {
  const { t } = useLocale();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [formData, setFormData] = useState({ name: "", email: "", company: "", message: "" });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getFieldError = (name: string, value: string) => {
    if (name === "name" && (!value || value.trim().length < 2)) {
      return "Name must be at least 2 characters";
    }

    if (name === "email") {
      if (!value) {
        return "Email is required";
      }
      if (!validateEmail(value)) {
        return "Please enter a valid email address";
      }
    }

    if (name === "message" && (!value || value.trim().length < 10)) {
      return "Message must be at least 10 characters";
    }

    return undefined;
  };

  const validateField = (name: string, value: string) => {
    const fieldError = getFieldError(name, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (fieldError) {
        next[name as keyof FormErrors] = fieldError;
      } else {
        delete next[name as keyof FormErrors];
      }
      return next;
    });
    return fieldError;
  };

  const validateForm = () => {
    const nextErrors: FormErrors = {};
    const nameError = getFieldError("name", formData.name);
    const emailError = getFieldError("email", formData.email);
    const messageError = getFieldError("message", formData.message);

    if (nameError) nextErrors.name = nameError;
    if (emailError) nextErrors.email = emailError;
    if (messageError) nextErrors.message = messageError;

    setErrors(nextErrors);
    return nextErrors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name as keyof FormTouched]) {
      validateField(name, value);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm();
    setTouched({ name: true, email: true, message: true });

    if (Object.keys(nextErrors).length > 0) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email"));

    try {
      await submitContact({
        name: String(form.get("name")),
        email,
        company: String(form.get("company") || ""),
        message: String(form.get("message")),
      });
      if (form.get("newsletter") === "on") {
        await subscribe(email);
      }
      formElement.reset();
      setFormData({ name: "", email: "", company: "", message: "" });
      setErrors({});
      setTouched({});
      setStatus("success");
      setTimeout(() => setStatus("idle"), 5000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      <div className="form-group">
        <label className="form-label">{t("contactName")}</label>
        <input
          className={`form-input ${touched.name && errors.name ? "border-red-500" : ""} ${touched.name && !errors.name && formData.name ? "border-green-500" : ""}`}
          name="name"
          value={formData.name}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          minLength={2}
        />
        {touched.name && errors.name ? <p className="mt-1 text-xs text-red-500">Error: {errors.name}</p> : null}
        {touched.name && !errors.name && formData.name ? <p className="mt-1 text-xs text-green-500">OK: Looks good</p> : null}
      </div>

      <div className="form-group">
        <label className="form-label">{t("contactEmail")}</label>
        <input
          className={`form-input ${touched.email && errors.email ? "border-red-500" : ""} ${touched.email && !errors.email && formData.email ? "border-green-500" : ""}`}
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          required
        />
        {touched.email && errors.email ? <p className="mt-1 text-xs text-red-500">Error: {errors.email}</p> : null}
        {touched.email && !errors.email && formData.email ? <p className="mt-1 text-xs text-green-500">OK: Valid email</p> : null}
      </div>

      <div className="form-group">
        <label className="form-label">{t("contactCompany")}</label>
        <input
          className="form-input"
          name="company"
          value={formData.company}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label className="form-label">{t("contactMessage")}</label>
        <textarea
          className={`form-textarea ${touched.message && errors.message ? "border-red-500" : ""} ${touched.message && !errors.message && formData.message ? "border-green-500" : ""}`}
          name="message"
          value={formData.message}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          minLength={10}
          rows={6}
        />
        {touched.message && errors.message ? <p className="mt-1 text-xs text-red-500">Error: {errors.message}</p> : null}
        {touched.message && !errors.message && formData.message ? <p className="mt-1 text-xs text-green-500">OK: Message ready to send</p> : null}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400 hover:text-slate-300">
        <input name="newsletter" type="checkbox" className="form-checkbox" />
        <span>{t("contactNewsletterOptIn")}</span>
      </label>

      <button
        className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-orange-500 px-4 py-2.5 font-bold text-foreground transition-all hover:from-cyan-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
        type="submit"
        disabled={status === "loading" || Object.keys(errors).length > 0}
      >
        {status === "loading" ? t("contactSending") : t("contactSend")}
      </button>

      {status === "success" ? <p className="text-sm text-green-500">OK: {t("contactSuccess")}</p> : null}
      {status === "error" && Object.keys(errors).length === 0 ? <p className="text-sm text-red-500">Error: {t("contactError")}</p> : null}
    </form>
  );
}
