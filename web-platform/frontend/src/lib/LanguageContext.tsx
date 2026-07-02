"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Locale = "en" | "mm";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string | string[];
}

const translations: Record<Locale, Record<string, string | string[]>> = {
  en: {
    // Nav
    home: "Home",
    blog: "Blog",
    insights: "Insights",
    about: "About",
    contact: "Contact",
    admin: "Admin",
    agent: "Agent",
    brain: "Brain",
    feeds: "Feeds",
    system: "System",
    signIn: "Sign In",
    getStarted: "Get Started",
    // Hero
    heroEyebrow: "MYANMAR SCM INTELLIGENCE PLATFORM",
    heroTitle: "Supply Chain Insights That Move Business Forward",
    heroSubtitle: "Actionable logistics intelligence, market signal analysis, and execution-ready guidance for supply chain operators.",
    heroDescription: "Logixa Flow delivers deep-dive supply chain intelligence, procurement signal clarity, and operational strategy for Myanmar business teams.",
    exploreInsights: "Browse Latest Insights",
    statCoreCategories: "CORE SCM CATEGORIES",
    statLatestSlots: "Featured Insight Topics",
    statApprovalWorkflow: "APPROVAL-FIRST WORKFLOW",
    statSignalMonitoring: "24/7 Signal Monitoring",
    featuredArticles: "Featured Articles",
    newsletterTitle: "Stay Informed",
    newsletterSubtitle: "Get the latest supply chain insights delivered to your inbox.",
    subscribe: "Subscribe",
    subscribeSuccess: "Thank you for subscribing!",
    smarterSupplyChain: "Smarter Supply Chain. Limitless Flow.",
    allRightsReserved: "© 2026 Logixa Flow. All rights reserved.",
    weeklySignals: "Weekly Signals",
    subscribed: "Subscribed!",
    subscribeError: "Error, try again.",
    // About
    aboutEyebrow: "About Logixa Flow",
    aboutTitle: "Supply Chain Intelligence for Myanmar Businesses",
    aboutIntro:
      "Logixa Flow is a platform that delivers data-informed insights for procurement, logistics, manufacturing, retail operations, and SME growth—aligned with Myanmar business context.",
    aboutMissionTitle: "Mission",
    aboutMissionBody:
      "Transform global supply chain shifts into actionable insights for Myanmar businesses.",
    aboutFocusTitle: "Focus Areas",
    aboutFocusBody: [
      "Supplier Risk & Inventory Optimization",
      "Demand Planning & Freight Visibility",
      "Automation-driven Operations",
      "Leadership-ready SCM Communication"
    ],
    // Contact
    contactEyebrow: "Work With Logixa Flow",
    contactTitle: "Get in touch for supply chain insight, automation, and content workflow",
    contactIntro:
      "Reach out for SCM consulting, research workflow partnerships, and platform collaborations.",
    // Blog
    blogEyebrow: "Logixa Flow Library",
    blogTitle: "SCM Insights",
    blogIntro:
      "Executive-ready supply chain, logistics, procurement, operations excellence, and news articles.",
    blogAllCategory: "All",
    // Footer
    copyright: "© 2026 Logixa Flow",
    // Admin / Dashboard
    adminDashboardTitle: "Admin Dashboard",
    adminOperations: "Metrics, CMS content, photo uploads, and AI writer model control.",
    logout: "Logout",
    loginError: "Invalid username or password. Check backend status and try again.",
    overview: "Overview",
    createInsight: "Create Insight",
    drafts: "Drafts",
    importCalendar: "Import Calendar",
    costs: "Costs",
    aiAgent: "AI Agent",
    brainQueue: "Brain Queue",
    analytics: "Analytics",
    feedsLabel: "Feeds",
    systemLabel: "System",
    premiumWorkspace: "Premium Workspace",
    quickActions: "Quick Actions",
    homepageControls: "Homepage Controls",
    flowIndexLabel: "Flow Index",
    flowIndexCopy: "Supply chain signal, capacity, and authoring pulse.",
    metricInventory: "Inventory",
    metricTransit: "Transit",
    metricAlerts: "Alerts",
    metricQuality: "Quality",
    capabilitiesEyebrow: "CAPABILITIES",
    capabilitiesTitle: "Premium SCM experience, practical business language.",
    capVisibilityTitle: "Visibility",
    capVisibilityDesc: "Real-time inventory, port flow, and demand signal clarity.",
    capLogisticsTitle: "Logistics",
    capLogisticsDesc: "Route intelligence, carrier cadence, and shipment health in one view.",
    capProcurementTitle: "Procurement",
    capProcurementDesc: "Supplier signals, contract timing, and sourcing readiness.",
    capOperationsTitle: "Operations",
    capOperationsDesc: "Daily operations flow, exception alerts, and process coherence.",
    capEditorialTitle: "Editorial",
    capEditorialDesc: "Market narratives, briefing notes, and commercial context.",
    capBrandTitle: "Brand",
    capBrandDesc: "Impact messaging, distribution plans, and product sentiment.",
    knowledgeHubEyebrow: "KNOWLEDGE HUB",
    knowledgeHubTitle: "Practical SCM playbooks, without leaving the flow.",
    khProcurementTitle: "Procurement Playbooks",
    khProcurementDesc: "Step-by-step guidance for supplier and sourcing decisions.",
    khLogisticsTitle: "Logistics Control Notes",
    khLogisticsDesc: "Actionable checklists for transport, warehousing, and delivery.",
    khOperationsTitle: "Operations Briefs",
    khOperationsDesc: "Quick summaries for execution, approval, and supply flow.",
    browseInsights: "Browse Insights",
    loadingInsight: "Loading insight...",
    operatingModelEyebrow: "OPERATING MODEL",
    operatingModelTitle: "Insight‑driven editorial flow",
    operatingModelBody:
      "Stream the decision-making model, approval workflows, and editorial signal into a single operating plane that supports execution and intelligence together.",
    latestUpdatesEyebrow: "Latest Updates",
    recentlyPublished: "Recently Published",
    sending: "Sending",
    contactName: "Name",
    contactEmail: "Email",
    contactCompany: "Company",
    contactMessage: "Message",
    contactNewsletterOptIn: "Also subscribe to the newsletter",
    contactSend: "Send Message",
    contactSending: "Sending",
    contactSuccess: "Message received. Thank you.",
    contactError: "Something went wrong. Please try again.",
    stageHomepageControls: "Stage Homepage Controls",
    writerAgentTitle: "Writer Agent",
    activeModel: "Active Model",
    saveAIModel: "Save AI Model",
    // AI Agent Sample Questions
    aiQuestion1: "How do global shipping delays affect Myanmar importers?",
    aiQuestion1Desc: "Learn about international trade",
    aiQuestion2: "What should a small business prepare before sourcing suppliers?",
    aiQuestion2Desc: "Start a small business",
    aiQuestion3: "Which affordable tools help track logistics operations?",
    aiQuestion3Desc: "Affordable technology solutions",
    aiQuestion4: "How can I reduce delivery delays in a local supply chain?",
    aiQuestion4Desc: "Supply chain logistics",
    // CTA Buttons
    readMore: "Read More",
    readInsight: "Read Insight",
    chatWithAINow: "Chat with AI Now",
    browseLatestInsights: "Browse Latest Insights",
    exploreAllInsights: "Explore All Insights",
    // UI Section Headers
    searchInsights: "Search insights by keyword",
    aiPoweredWorkflow: "AI-POWERED WORKFLOW",
    trustQualityModel: "TRUST & QUALITY MODEL",
    coreFocusAreas: "CORE FOCUS AREAS",
    premiumIntelligenceLayer: "Premium Intelligence Layer",
    operationalHighlights: "Operational Highlights",
    // Volume Calculator
    length: "Length (cm)",
    width: "Width (cm)",
    height: "Height (cm)",
    quantity: "Quantity",
    calculate: "Calculate",
    estimatedVolume: "Estimated Volume (m³)",
    under: "Under (-10%)",
    likely: "Likely (Exact)",
    over: "Over (+10%)",
  },
  mm: {
    // Nav
    home: "ပင်မစာမျက်နှာ",
    blog: "အသိပညာမျှေ",
    insights: "အသိပညာမျှေ",
    about: "ကျွန်ုပ်တို့အကြောင်း",
    contact: "ဆက်သွယ်ရန်",
    admin: "စီမံခန့်ခွဲသူ",
    agent: "အေးဂျင့်",
    brain: "ဗဟုသုတ",
    feeds: "အချက်အလက်များ",
    system: "စနစ်",
    signIn: "ဝင်ရောက်မည်",
    getStarted: "စတင်မည်",
    // Hero
    heroEyebrow: "မြန်မာ SCM ဉာဏ်ရည်တုစနစ် ပလက်ဖောင်း",
    heroTitle: "Transform Your Supply Chain",
    heroSubtitle: "Actionable logistics intelligence, market signal analysis, and execution-ready guidance for supply chain operators.",
    heroDescription: "Logixa Flow delivers deep-dive supply chain intelligence, procurement signal clarity, and operational strategy for Myanmar business teams.",
    exploreInsights: "နောက်ဆုံးရအကြောင်းအရာများကို ရှာဖွေရန်",
    statCoreCategories: "CORE SCM CATEGORIES",
    statLatestSlots: "Featured Insight Topics",
    statApprovalWorkflow: "APPROVAL-FIRST WORKFLOW",
    statSignalMonitoring: "24/7 Signal Monitoring",
    featuredArticles: "အထူးတင်ဆက်မှုများ",
    newsletterTitle: "သတင်းအချက်အလက်များ ရယူရန်",
    newsletterSubtitle: "နောက်ဆုံးရ ထောက်ပံ့ပို့ဆောင်ရေး အမြင်များကို သင့်အီးမေးလ်တွင် ရယူပါ။",
    subscribe: "စာရင်းသွင်းရန်",
    subscribeSuccess: "စာရင်းသွင်းမှု အောင်မြင်ပါသည်။ ကျေးဇူးတင်ပါသည်။",
    smarterSupplyChain: "Smarter Supply Chain. Limitless Flow.",
    allRightsReserved: "© ၂၀၂၆ Logixa Flow. All rights reserved.",
    weeklySignals: "Weekly Signals",
    subscribed: "စာရင်းသွင်းပြီးပါပြီ!",
    subscribeError: "အမှားတက်နေပါသည်၊ ထပ်မံကြိုးစားပါ။",
    // About
    aboutEyebrow: "Logixa Flow အကြောင်း",
    aboutTitle: "Supply Chain Intelligence for Myanmar Businesses",
    aboutIntro:
      "Logixa Flow is a platform that delivers data-informed insights for procurement, logistics, manufacturing, retail operations, and SME growth—aligned with Myanmar business context.",
    aboutMissionTitle: "ရည်မှန်းချက်",
    aboutMissionBody:
      "Transform global supply chain changes into actionable insights for Myanmar businesses.",
    aboutFocusTitle: "အာရုံစိုက်နယ်ပယ်များ",
    aboutFocusBody:
      "Supplier risk, inventory optimization, demand planning, freight visibility, automation, insight-driven operations နှင့် leadership-ready SCM communication။",
    // Contact
    contactEyebrow: "Logixa Flow နှင့် လုပ်ဆောင်ရန်",
    contactTitle: "Get in touch for supply chain insight, automation, and content workflow",
    contactIntro:
      "Reach out for SCM consulting, research workflow partnerships, and platform collaborations.",
    // Blog
    blogEyebrow: "Logixa Flow Library",
    blogTitle: "SCM Insights",
    blogIntro:
      "Executive-ready supply chain, logistics, procurement, operations excellence, and news articles.",
    blogAllCategory: "အားလုံး",
    // Footer
    copyright: "© ၂၀၂၆ Logixa Flow",
    // Admin / Dashboard
    adminDashboardTitle: "စီမံခန့်ခွဲမှု စာမျက်နှာ",
    adminOperations: "မက်ထရစ်များ၊ CMS ပါဝင်မှုများ၊ ဓာတ်ပုံ တင်ခြင်းနှင့် AI စာရေးမော်ဒယ် များကို ထိန်းချုပ်မည်။",
    logout: " ထွက်မည်",
    loginError: "သုံးစွဲသူနာမည် ဒါမှမဟုတ် စကားဝှက် ဖြည့်စွက်ချက် မှားနေပါသည်။ Backend အခြေအနေကို စစ်ဆေးပြီး ထပ်မံ ကြိုးစားပါ။",
    overview: "အချိုးအစား",
    createInsight: "အမြင်သစ် ရေးဆွဲမည်",
    drafts: "ပရောဖိုင်းအကြမ်း",
    importCalendar: "ပြက္ခဒိန် ထည့်သွင်းမည်",
    costs: "ကုန်ကျစရိတ်",
    aiAgent: "AI အေးဂျင့်",
    brainQueue: "ဗဟုသုတ စနစ်",
    analytics: "သုံးသပ်ချက်များ",
    feedsLabel: "Feeds",
    systemLabel: "System",
    premiumWorkspace: "အဆင့်မြင့် အလုပ်ရုံ",
    quickActions: "အမြန် လုပ်ဆောင်ချက်များ",
    homepageControls: "ပင်မစာမျက်နှာ ထိန်းချုပ်မှုများ",
    flowIndexLabel: "Flow Index",
    flowIndexCopy: "ထောက်ပံ့ပို့ဆောင်ရေး အချက်ပြမှု၊ စွမ်းဆောင်ရည်နှင့် အကြောင်းအရာ လှုပ်ရှားမှု။",
    metricInventory: "စတော့",
    metricTransit: "သယ်ယူပို့ဆောင်မှု",
    metricAlerts: "သတိပေးချက်များ",
    metricQuality: "အရည်အသွေး",
    capabilitiesEyebrow: "CAPABILITIES",
    capabilitiesTitle: "Premium SCM experience, practical business language.",
    capVisibilityTitle: "Visibility",
    capVisibilityDesc: "Real-time inventory, port flow, and demand signal clarity.",
    capLogisticsTitle: "Logistics",
    capLogisticsDesc: "Route intelligence, carrier cadence, and shipment health in one view.",
    capProcurementTitle: "Procurement",
    capProcurementDesc: "Supplier signals, contract timing, and sourcing readiness.",
    capOperationsTitle: "Operations",
    capOperationsDesc: "Daily operations flow, exception alerts, and process coherence.",
    capEditorialTitle: "Editorial",
    capEditorialDesc: "Market narratives, briefing notes, and commercial context.",
    capBrandTitle: "Brand",
    capBrandDesc: "Impact messaging, distribution plans, and product sentiment.",
    knowledgeHubEyebrow: "KNOWLEDGE HUB",
    knowledgeHubTitle: "Practical SCM playbooks, without leaving the flow.",
    khProcurementTitle: "Procurement Playbooks",
    khProcurementDesc: "Step-by-step guidance for supplier and sourcing decisions.",
    khLogisticsTitle: "Logistics Control Notes",
    khLogisticsDesc: "Actionable checklists for transport, warehousing, and delivery.",
    khOperationsTitle: "Operations Briefs",
    khOperationsDesc: "Quick summaries for execution, approval, and supply flow.",
    browseInsights: "အမြင်သစ်များ ကြည့်ရန်",
    loadingInsight: "အမြင်သစ် တင်နေသည်...",
    operatingModelEyebrow: "OPERATING MODEL",
    operatingModelTitle: "Insight‑driven editorial flow",
    operatingModelBody:
      "Stream the decision-making model, approval workflows, and editorial signal into a single operating plane that supports execution and intelligence together.",
    latestUpdatesEyebrow: "Latest Updates",
    sending: "ပို့နေသည်",
    contactName: "အမည်",
    contactEmail: "အီးမေးလ်",
    contactCompany: "ကုမ္ပဏီ",
    contactMessage: "မက်ဆေ့ချ်",
    contactNewsletterOptIn: "Newsletter တွင်စာရင်းသွင်းရန်",
    contactSend: "မက်ဆေ့ချ် ပို့မည်",
    contactSending: "ပို့နေသည်",
    contactSuccess: "မက်ဆေ့ချ် လက်ခံရရှိပါပြီ။",
    contactError: "တစ်စုံတစ်ခု မှားယွင်းနေပါသည်။ ထပ်မံကြိုးစားပါ။",
    stageHomepageControls: "Homepage ထိန်းချုပ်မှုများကို စတေ့ခ််လုပ်မည်",
    writerAgentTitle: "စာရေး အေးဂျင့်",
    activeModel: "အသုံးပြုမည့် မော်ဒယ်",
    saveAIModel: "AI မော်ဒယ် သိမ်းမည်",
    // AI Agent Sample Questions
    aiQuestion1: "မြန်မာသွင်းသူများအတွက် ကမ္ဘာ့ပို့ဆောင်ရေးနှောင်းနှေးမှုများက ဘယ်လိုအကျိုးသက်ရောက်သနည်း",
    aiQuestion1Desc: "နိုင်ငံတကာ ကုန်သွယ်ရေးကို လေ့လာရန်",
    aiQuestion2: "သေးငယ်သောလုပ်ငန်းတစ်ခုက supplier များကို ရှာဖွေခင်မှ မျက်နှာပြုရန် ဘာတွေပြင်ဆင်းသင့်",
    aiQuestion2Desc: "သေးငယ်သောလုပ်ငန်းစတင်ရန်",
    aiQuestion3: "စျေးနှုန်းခန့်ခွဲနိုင်သော ကိရိယာများက မည်သို့လုပ်ငန်းစနစ်များကို စီမံနိုင်သနည်း",
    aiQuestion3Desc: "စျေးနှုန်းခန့်ခွဲနိုင်သော နည်းပည်ဆန်းများ",
    aiQuestion4: "ဒေသဆိုင်း supply chain တွင် ပို့ဆောင်ရေးနှောင်းများကို ဘယ်လိုလျှော့ချနိုင်သနည်း",
    aiQuestion4Desc: "Supply chain စီမံခန့်ခွဲမှု",
    // CTA Buttons
    readMore: "ဆောင်းပါးဖတ်ရန်",
    readInsight: "ဆောင်းပါးဖတ်ရန်",
    chatWithAINow: "AI ဖြင့် စကားပြောရန်",
    browseLatestInsights: "နောက်ဆုံးရအကြောင်းအရာများကို ရှာဖွေရန်",
    exploreAllInsights: "ပိုမိုသိရှိရန်",
    // UI Section Headers
    searchInsights: "သော့ဂ််ဝဒ်ဖြင့် အမြင်သစ်များကို ရှာဖွေရန်",
    aiPoweredWorkflow: "AI-POWERED WORKFLOW",
    trustQualityModel: "TRUST & QUALITY MODEL",
    coreFocusAreas: "CORE FOCUS AREAS",
    premiumIntelligenceLayer: "Premium Intelligence Layer",
    operationalHighlights: "Operational Highlights",
    // Form Labels
    newsletterOptIn: "Newsletter တွင်စာရင်းသွင်းရန်",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("logixa_locale") as Locale;
    if (saved && (saved === "en" || saved === "mm")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("logixa_locale", newLocale);
  };

  const t = (key: string) => {
    return translations[locale][key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LanguageProvider");
  }
  return context;
}
