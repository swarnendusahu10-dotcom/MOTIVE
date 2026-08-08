export default function GridOverlay({
  size = 60,
  opacity = 0.025,
  color = '0,212,255',
}) {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(
            rgba(${color}, ${opacity}) 1px,
            transparent 1px
          ),
          linear-gradient(
            90deg,
            rgba(${color}, ${opacity}) 1px,
            transparent 1px
          )
        `,
        backgroundSize: `${size}px ${size}px`,
      }}
    />
  );
}