// CornerBrackets.jsx

export default function CornerBrackets({
  zIndex = 10,
  opacity = 0.35,
  positions = {
    topLeft: 'top-4 left-4',
    topRight: 'top-4 right-4',
    bottomLeft: 'bottom-4 left-4',
    bottomRight: 'bottom-4 right-4',
  },
  color = '#00d4ff',
}) {
  const corners = [
    {
      cls: positions.topLeft,
      path: 'M0 16 L0 0 L16 0',
    },
    {
      cls: positions.topRight,
      path: 'M20 16 L20 0 L4 0',
    },
    {
      cls: positions.bottomLeft,
      path: 'M0 4 L0 20 L16 20',
    },
    {
      cls: positions.bottomRight,
      path: 'M20 4 L20 20 L4 20',
    },
  ];

  return (
    <>
      {corners.map((c, i) => (
        <div
          key={i}
          className={`fixed pointer-events-none w-5 h-5 ${c.cls}`}
          style={{ zIndex }}
        >
          <svg
            viewBox="0 0 20 20"
            className="w-full h-full"
            style={{ opacity }}
          >
            <path
              d={c.path}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
            />
          </svg>
        </div>
      ))}
    </>
  );
}