"use client";

import React from "react";

interface FeatureCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  borderColor: string;
  bgColor: string;
  iconColor: string;
}

const features: FeatureCard[] = [
  {
    title: "Real-Time Analytics",
    description: "Get instant insights into your finances with live dashboards.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14 18.667V24.5m4.668-8.167V24.5m4.664-12.833V24.5m2.333-21L15.578 13.587a.584.584 0 0 1-.826 0l-3.84-3.84a.583.583 0 0 0-.825 0L2.332 17.5M4.668 21v3.5m4.664-8.167V24.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    borderColor: "border-violet-200 dark:border-violet-700/50",
    bgColor: "bg-violet-100 dark:bg-violet-900/20",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    title: "Bank-Grade Security",
    description:
      "End-to-end encryption, 2FA, compliance with GDPR standards.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14 11.667A2.333 2.333 0 0 0 11.667 14c0 1.19-.117 2.929-.304 4.667m4.972-3.36c0 2.776 0 7.443-1.167 10.36m5.004-1.144c.14-.7.502-2.683.583-3.523M2.332 14a11.667 11.667 0 0 1 21-7m-21 11.667h.01m23.092 0c.233-2.333.152-6.246 0-7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.832 22.75C6.415 21 6.999 17.5 6.999 14a7 7 0 0 1 .396-2.333m2.695 13.999c.245-.77.525-1.54.665-2.333m-.255-15.4A7 7 0 0 1 21 14v2.333"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    borderColor: "border-green-200 dark:border-green-700/50",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    iconColor: "text-green-600 dark:text-green-400",
  },
  {
    title: "Customizable Reports",
    description:
      "Export professional, audit-ready financial reports for tax or internal review.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4.668 25.666h16.333a2.333 2.333 0 0 0 2.334-2.333V8.166L17.5 2.333H7a2.333 2.333 0 0 0-2.333 2.333v4.667"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16.332 2.333V7a2.334 2.334 0 0 0 2.333 2.333h4.667m-21 8.167h11.667M10.5 21l3.5-3.5-3.5-3.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    borderColor: "border-orange-200 dark:border-orange-700/50",
    bgColor: "bg-orange-100 dark:bg-orange-900/20",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
];

export function FeaturesSection() {
  return (
    <div className="px-4 md:px-8 py-16">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
      `}</style>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground dark:text-white mb-4">
            Powerful Features
          </h2>
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            Everything you need to manage, track, and grow your finances, securely and efficiently.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="flex items-start justify-center flex-wrap gap-6">
          {features.map((feature, idx) => (
            <div
              key={`feature-${idx}`}
              className={`flex flex-col text-center items-center justify-center rounded-xl p-6 border ${feature.borderColor} gap-6 max-w-sm hover:shadow-lg dark:hover:shadow-lg/30 transition-all duration-300 logixa-card`}
            >
              <div className={`p-6 aspect-square ${feature.bgColor} rounded-full`}>
                <div className={`${feature.iconColor} w-7 h-7`}>
                  {feature.icon}
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-foreground dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
