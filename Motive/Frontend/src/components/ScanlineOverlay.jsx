import CornerBrackets from "./Animations/CornerBrackets";
import GridOverlay from "./Animations/GridOverlay";
import ScanLine from "./Animations/ScanLine";

export default function ScanlineOverlay() {
  return (
    <>
      {/* Subtle scan line */}
      <ScanLine/>

      {/* Grid overlay */}
      <GridOverlay />

      {/* Vignette */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Corner decorations */}
     <CornerBrackets
  zIndex={30}
  opacity={0.25}
  size={6}
  position="absolute"
  offset={3}
  strokeWidth={1}
/>

    </>
  );
}
//copied