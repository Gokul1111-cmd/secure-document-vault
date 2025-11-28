export default function GlassCard({ children, className = '' }) {
  return (
    <div className={`
      relative overflow-hidden
      bg-cosmos-navy/30 backdrop-blur-xl 
      border border-white/10 
      shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]
      rounded-2xl p-8
      ${className}
    `}>
      {/* Glossy sheen effect */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      {children}
    </div>
  );
}