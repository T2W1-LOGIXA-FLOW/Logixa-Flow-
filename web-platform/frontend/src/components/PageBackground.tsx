export default function PageBackground({ 
  children, 
  overlayOpacity = 0.3,
  brightness = 1.5
}: { 
  children: React.ReactNode; 
  overlayOpacity?: number;
  brightness?: number;
}) {
  return (
    <div className="relative min-h-screen">
      {/* Background Image Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: "url('/images/page.jpg.png')",
            backgroundAttachment: 'fixed',
            filter: `brightness(${brightness})`
          }}
        />
        {/* Very Light Overlay - ပိုလင်းအောင် opacity ကို ပိုလျှော့တယ် */}
        <div 
          className="absolute inset-0 bg-slate-800"
          style={{ opacity: overlayOpacity }}
        />
      </div>
      
      {/* Content Layer - အပေါ်ဆုံး layer, z-10 ရှိတာကြောင့် background ရဲ့ အပေါ်မှာ ရှိပါတယ် */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
