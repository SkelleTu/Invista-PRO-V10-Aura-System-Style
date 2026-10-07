import { Shield, Cpu, Database, Wifi, Lock, Code, Terminal, Cloud, Server, Binary, Key, Globe, Zap, Layers } from "lucide-react";

const icons = [Shield, Cpu, Database, Wifi, Lock, Code, Terminal, Cloud, Server, Binary, Key, Globe, Zap, Layers];

const placements = [
  [7,14,22,.10,42,-2],[23,31,18,.07,51,0],[41,11,26,.08,58,-3],[62,27,20,.07,47,2],
  [84,13,24,.09,55,-1],[12,58,19,.07,49,1],[31,72,25,.08,61,-2],[55,53,18,.06,52,0],
  [76,68,23,.08,57,2],[92,46,17,.07,46,-1],[68,91,20,.07,64,1],[18,91,16,.06,56,-2]
];

export function AuraVisualLayer() {
  return (
    <div className="aura-visual-layer" aria-hidden="true">
      <div className="aura-ambient aura-ambient-a" />
      <div className="aura-ambient aura-ambient-b" />
      <div className="aura-ambient aura-ambient-c" />
      <div className="aura-grid-layer" />
      <div className="aura-circuit-layer" />
      <div className="aura-icons-layer">
        {placements.map(([x, y, size, opacity, duration, delay], index) => {
          const Icon = icons[index % icons.length];
          return (
            <span
              key={index}
              className={"aura-floating-icon " + (index % 3 === 0 ? "aura-float-active" : "")}
              style={{
                left: x + "%",
                top: y + "%",
                width: size + "px",
                height: size + "px",
                opacity,
                animationDuration: duration + "s",
                animationDelay: delay + "s",
              }}
            >
              <Icon size={size} strokeWidth={1.1} />
            </span>
          );
        })}
      </div>
      <div className="aura-scanlines-layer" />
    </div>
  );
}
