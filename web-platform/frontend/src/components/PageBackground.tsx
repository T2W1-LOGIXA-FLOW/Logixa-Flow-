export default function PageBackground({ 
  children, 
  overlayOpacity = 0.85 
}: { 
  children: React.ReactNode; 
  overlayOpacity?: number;
}) {
  return (
    <div className="relative min-h-screen">
      {/* Background Image Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: "url('/images/page.jpg.png')",
            backgroundAttachment: 'fixed'
          }}
        />
        {/* Dark Overlay */}
        <div 
          className="absolute inset-0 bg-slate-950"
          style={{ opacity: overlayOpacity }}
        />
      </div>
      
      {/* Content Layer */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
