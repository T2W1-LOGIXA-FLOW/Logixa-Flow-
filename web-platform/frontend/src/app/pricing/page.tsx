"use client";

import { useState } from "react";
import PageBackground from "@/components/PageBackground";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 29,
    description: "For lean teams getting clarity fast",
    features: [
      "Core SCM Categories",
      "10 Insight Slots",
      "3 Data Signals",
      "Email support",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: 79,
    description: "For growing operations teams",
    features: [
      "Core SCM Categories",
      "100 Insight Slots",
      "20 Data Signals",
      "Priority support",
    ],
    cta: "Subscribe",
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    description: "For multi-site organizations",
    features: [
      "Core SCM Categories",
      "Unlimited Insight Slots",
      "Unlimited Data Signals",
      "Dedicated onboarding",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const handleCheckout = async (planId: string) => {
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingCycle }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    }
  };

  return (
    <PageBackground overlayOpacity={0.85}>
      <div className="min-h-screen text-slate-100 py-24 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-500 to-orange-500 bg-clip-text text-transparent">
            Flexible Supply Chain Intelligence Plans
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            Choose the right level of control, visibility, and automation for your supply chain operations.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={billingCycle === "monthly" ? "text-white" : "text-slate-400"}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
              className="bg-slate-800 rounded-full p-1 w-14 h-8 flex items-center transition-all"
            >
              <div
                className={`w-6 h-6 rounded-full bg-gradient-to-r from-cyan-500 to-orange-500 transition-transform ${
                  billingCycle === "yearly" ? "translate-x-6" : ""
                }`}
              />
            </button>
            <span className={billingCycle === "yearly" ? "text-white" : "text-slate-400"}>
              Yearly
              <span className="ml-2 text-sm text-green-400">(Save 20%)</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-lg p-8 transition-all ${
                plan.highlighted
                  ? "bg-gradient-to-br from-cyan-900/40 to-orange-900/40 border-2 border-cyan-500 relative"
                  : "bg-slate-900/50 border border-slate-700 hover:border-slate-600"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-cyan-500 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-slate-400 text-sm mb-6">{plan.description}</p>

              <div className="mb-6">
                {plan.price !== null ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold">${plan.price}</span>
                      <span className="text-slate-400">
                        /{billingCycle === "monthly" ? "month" : "year"}
                      </span>
                    </div>
                    {billingCycle === "yearly" && (
                      <p className="text-sm text-green-400 mt-2">
                        ${Math.round((plan.price * 12 * 0.8) / 12)}/month billed annually
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-5xl font-bold text-transparent bg-gradient-to-r from-cyan-500 to-orange-500 bg-clip-text">
                    Custom
                  </div>
                )}
              </div>

              <button
                onClick={() => handleCheckout(plan.id)}
                className={`w-full py-3 rounded-lg font-semibold transition-all mb-8 ${
                  plan.highlighted
                    ? "bg-gradient-to-r from-cyan-500 to-orange-500 text-white hover:from-cyan-600 hover:to-orange-600"
                    : "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-600"
                }`}
              >
                {plan.cta}
              </button>

              <div className="mb-4 text-sm uppercase tracking-[0.2em] text-slate-500">
                Plan details
              </div>
              <ul className="space-y-4">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-cyan-500 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "Can I change plans anytime?",
                a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.",
              },
              {
                q: "Is there a free trial?",
                a: "Yes, Pro plan includes a 14-day free trial. No credit card required to start.",
              },
              {
                q: "What if I need custom features?",
                a: "Contact our sales team for Enterprise plans with custom features and integrations.",
              },
              {
                q: "Do you offer refunds?",
                a: "We offer a 30-day money-back guarantee if you're not satisfied with your subscription.",
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <h3 className="font-semibold mb-3 text-white">{faq.q}</h3>
                <p className="text-slate-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </PageBackground>
  );
}
