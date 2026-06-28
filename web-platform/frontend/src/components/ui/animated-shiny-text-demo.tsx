import { AnimatedText } from "@/components/ui/animated-shiny-text";

export function AnimatedTextDemo() {
  return (
    <div className="space-y-12">
      {/* Default gradient - Dark to Light */}
      <div>
        <h3 className="text-sm text-slate-600 mb-4">Default Gradient</h3>
        <AnimatedText 
          text="Logixa Flow" 
          textClassName="font-black"
          gradientColors="linear-gradient(90deg, #06b6d4, #ffffff, #06b6d4)"
          hoverEffect={true}
        />
      </div>

      {/* Cyan to Orange gradient */}
      <div>
        <h3 className="text-sm text-slate-600 mb-4">Cyan to Orange</h3>
        <AnimatedText 
          text="Supply Chain" 
          textClassName="font-bold"
          gradientColors="linear-gradient(90deg, #06b6d4, #ff6b35, #06b6d4)"
          hoverEffect={true}
        />
      </div>

      {/* Purple to Pink gradient */}
      <div>
        <h3 className="text-sm text-slate-600 mb-4">Purple to Pink</h3>
        <AnimatedText 
          text="Myanmar Hub" 
          textClassName="font-bold"
          gradientColors="linear-gradient(90deg, #a855f7, #ec4899, #a855f7)"
          hoverEffect={true}
        />
      </div>

      {/* Green to Blue gradient */}
      <div>
        <h3 className="text-sm text-slate-600 mb-4">Green to Blue</h3>
        <AnimatedText 
          text="Intelligence" 
          textClassName="font-bold"
          gradientColors="linear-gradient(90deg, #10b981, #3b82f6, #10b981)"
          hoverEffect={true}
        />
      </div>
    </div>
  );
}
