export default function ScanLine({
  color = '#00d4ff',
  opacity = 0.07,
  duration = 8,
  thickness = 1,
  zIndex = 20,
}) {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{
        opacity,
        zIndex,
      }}
    >
      <div
        className="absolute left-0 right-0"
        style={{
          height: `${thickness}px`,
          background: `
            linear-gradient(
              to right,
              transparent,
              ${color} 30%,
              ${color} 70%,
              transparent
            )
          `,
          animation: `scanLine ${duration}s linear infinite`,
        }}
      />
    </div>
  );
}