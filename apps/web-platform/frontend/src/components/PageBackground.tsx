export default function PageBackground({
  children,
  overlayOpacity = 0.3,
  brightness = 1.5,
}: {
  children: React.ReactNode;
  overlayOpacity?: number;
  brightness?: number;
}) {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/page.jpg.png')",
            backgroundAttachment: "scroll",
            filter: `brightness(${brightness})`,
          }}
        />
        <div className="absolute inset-0 bg-slate-950" style={{ opacity: overlayOpacity }} />
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}
