"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Locale = "en" | "mm";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const translations: Record<Locale, Record<string, string>> = {
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
    statLatestSlots: "LATEST INSIGHT SLOTS",
    statApprovalWorkflow: "APPROVAL-FIRST WORKFLOW",
    statSignalMonitoring: "SIGNAL MONITORING CONCEPT",
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
      "Transform global supply chain changes into insights Myanmar businesses can act on.",
    aboutFocusTitle: "Focus Areas",
    aboutFocusBody:
      "Supplier risk, inventory optimization, demand planning, freight visibility, automation, insight-driven operations, and leadership-ready SCM communication.",
    // Contact
    contactEyebrow: "Work With Logixa Flow",
    contactTitle: "Get in touch for supply chain insight, automation, and content workflow",
    contactIntro:
      "Send a message for consulting, SCM knowledge content, research workflow, newsletter partnership, or platform collaboration.",
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
    blog: "ဘလော့ဂ်",
    insights: "အမြင်သစ်များ",
    about: "ကျွန်တော်တို့အကြောင်း",
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
    heroTitle: "Supply Chain Insights That Move Business Forward",
    heroSubtitle: "အရာဝတျ သတင်းများ၊ အချက်အလက်များနှင့် လုံလုံခြုံခြုံ ဆောင်ရွက်နိုင်သော လမ်းညွှန်ချက်များကို ပေးသည်။",
    heroDescription: "Logixa Flow သည် မြန်မာ့ စွမ်းဆောင်ရည်မြှင့် Supply Chain အဖွဲ့များအတွက် နက်ရှိုင်းသော သတင်းအချက်အလက်များ၊ ဝယ်ယူခြင်း လမ်းကြောင်းများနှင့် အဆင့်ဆင့် ပြုပြင်နိုင်သော မဟာဗျူဟာများကို တင်ဆက်ပေးသည်။",
    exploreInsights: "အမြန်တင်ဆက်များ",
    statCoreCategories: "အဓိက SCM အမျိုးအစားများ",
    statLatestSlots: "နောက်ဆုံး အမြင်သစ် နေရာများ",
    statApprovalWorkflow: "အတည်ပြုချက် ဦးစားပေး လုပ်ငန်းစဉ်",
    statSignalMonitoring: "အချက်ပြမှု စောင့်ကြည့်ရေး",
    featuredArticles: "အထူးတင်ဆက်မှုများ",
    newsletterTitle: "သတင်းအချက်အလက်များ ရယူရန်",
    newsletterSubtitle: "နောက်ဆုံးရ ထောက်ပံ့ပို့ဆောင်ရေး အမြင်များကို သင့်အီးမေးလ်တွင် ရယူပါ။",
    subscribe: "စာရင်းသွင်းမည်",
    subscribeSuccess: "စာရင်းသွင်းမှု အောင်မြင်ပါသည်။ ကျေးဇူးတင်ပါသည်။",
    smarterSupplyChain: "Smarter Supply Chain. Limitless Flow.",
    allRightsReserved: "© ၂၀၂၆ Logixa Flow. All rights reserved.",
    weeklySignals: "Weekly Signals",
    subscribed: "စာရင်းသွင်းပြီးပါပြီ!",
    subscribeError: "အမှားတက်နေပါသည်၊ ထပ်မံကြိုးစားပါ။",
    // About
    aboutEyebrow: "Logixa Flow အကြောင်း",
    aboutTitle: "မြန်မာလုပ်ငန်းများအတွက် Supply Chain Intelligence",
    aboutIntro:
      "Logixa Flow သည် procurement, logistics, manufacturing, retail operations နှင့် SME growth အတွက် data-informed insight များကို မြန်မာ business context နှင့်ကိုက်ညီအောင် တင်ဆက်သည့် platform ဖြစ်သည်။",
    aboutMissionTitle: "ရည်မှန်းချက်",
    aboutMissionBody:
      "Global supply chain change များကို မြန်မာလုပ်ငန်းများ လက်တွေ့ဆုံးဖြတ်ချက်ချနိုင်သည့် insight အဖြစ် ပြောင်းလဲပေးရန်။",
    aboutFocusTitle: "အာရုံစိုက်နယ်ပယ်များ",
    aboutFocusBody:
      "Supplier risk, inventory optimization, demand planning, freight visibility, automation, insight-driven operations နှင့် leadership-ready SCM communication။",
    // Contact
    contactEyebrow: "Logixa Flow နှင့် လုပ်ဆောင်ရန်",
    contactTitle: "Supply chain insight, automation, content workflow အတွက် ဆက်သွယ်ရန်",
    contactIntro:
      "Consulting, SCM knowledge content, research workflow, newsletter partnership သို့မဟုတ် platform collaboration အတွက် message ပို့နိုင်ပါသည်။",
    // Blog
    blogEyebrow: "Logixa Flow စာကြည့်တိုက်",
    blogTitle: "SCM Insights",
    blogIntro:
      "Executive-ready supply chain, logistics, procurement, operations excellence နှင့် news articles များ။",
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
    capabilitiesEyebrow: "စွမ်းရည်များ",
    capabilitiesTitle: "Premium SCM အတွေ့အကြုံ၊ လက်တွေ့လုပ်ငန်းဘာသာစကား။",
    capVisibilityTitle: "Visibility",
    capVisibilityDesc: "Real-time inventory, port flow နှင့် demand signal ကြည်လင်မှု။",
    capLogisticsTitle: "Logistics",
    capLogisticsDesc: "Route intelligence, carrier cadence နှင့် shipment health တစ်နေရာတည်း။",
    capProcurementTitle: "Procurement",
    capProcurementDesc: "Supplier signals, contract timing နှင့် sourcing readiness။",
    capOperationsTitle: "Operations",
    capOperationsDesc: "နေ့စဉ် လုပ်ငန်းလည်ပတ်မှု၊ exception alerts နှင့် process coherence။",
    capEditorialTitle: "Editorial",
    capEditorialDesc: "Market narratives, briefing notes နှင့် commercial context။",
    capBrandTitle: "Brand",
    capBrandDesc: "Impact messaging, distribution plans နှင့် product sentiment။",
    knowledgeHubEyebrow: "KNOWLEDGE HUB",
    knowledgeHubTitle: "လက်တွေ့ SCM playbooks များ — flow မထွက်ဘဲ ရယူပါ။",
    khProcurementTitle: "Procurement Playbooks",
    khProcurementDesc: "Supplier နှင့် sourcing ဆုံးဖြတ်ချက်များအတွက် အဆင့်ဆင့် လမ်းညွှန်။",
    khLogisticsTitle: "Logistics Control Notes",
    khLogisticsDesc: "သယ်ယူပို့ဆောင်ရေး၊ ဂိုဒေါင်နှင့် ပို့ဆောင်မှုအတွက် လုပ်ဆောင်နိုင်သော checklist များ။",
    khOperationsTitle: "Operations Briefs",
    khOperationsDesc: "လုပ်ဆောင်မှု၊ အတည်ပြုချက်နှင့် supply flow အတွက် အကျဉ်းချုပ် မှတ်တမ်းများ။",
    browseInsights: "အမြင်သစ်များ ကြည့်ရန်",
    loadingInsight: "အမြင်သစ် တင်နေသည်...",
    operatingModelEyebrow: "လုပ်ဆောင်မှု မော်ဒယ်",
    operatingModelTitle: "Insight‑driven editorial flow",
    operatingModelBody:
      "ဆုံးဖြတ်ချက်လုပ်ငန်းစဉ်၊ approval workflows နှင့် editorial signal ကို execution နှင့် intelligence ကို တစ်ပြိုင်တည်း ထောက်ပံ့သော operating plane တစ်ခုတည်းတွင် စုစည်းပါ။",
    latestUpdatesEyebrow: "နောက်ဆုံး အပ်ဒိတ်များ",
    recentlyPublished: "မကြာသေးမီ ထုတ်ဝေထားသော",
    sending: "ပို့နေသည်",
    contactName: "အမည်",
    contactEmail: "အီးမေးလ်",
    contactCompany: "ကုမ္ပဏီ",
    contactMessage: "မက်ဆေ့ချ်",
    contactNewsletterOptIn: "Newsletter ပါ subscribe လုပ်ရန်",
    contactSend: "မက်ဆေ့ချ် ပို့မည်",
    contactSending: "ပို့နေသည်",
    contactSuccess: "Message လက်ခံရရှိပါပြီ။",
    contactError: "မအောင်မြင်ပါ။ ပြန်စမ်းပါ။",
    stageHomepageControls: "Homepage ထိန်းချုပ်မှုများကို စတေ့ခ််လုပ်မည်",
    writerAgentTitle: "စာရေး အေးဂျင့်",
    activeModel: "အသုံးပြုမည့် မော်ဒယ်",
    saveAIModel: "AI မော်ဒယ် သိမ်းမည်",
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
