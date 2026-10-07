import { Shield, Cpu, Database, Wifi, Lock, Code, Terminal, Cloud, Server, HardDrive, Binary, Fingerprint, Key, Globe, Zap, CircuitBoard, Layers, Network } from "lucide-react";

const icons = [Shield, Cpu, Database, Wifi, Lock, Code, Terminal, Cloud, Server, HardDrive, Binary, Fingerprint, Key, Globe, Zap, CircuitBoard, Layers, Network];

const placements = [
  [4,10,20,.08,32,-3,"auraDriftA",46],[14,24,26,.07,38,0,"auraDriftB",53],
  [26,8,18,.06,34,-8,"auraDriftA",61],[38,18,30,.075,42,-4,"auraDriftB",49],
  [52,7,22,.065,36,2,"auraDriftA",57],[65,21,28,.075,44,0,"auraDriftB",63],
  [78,9,19,.06,39,4,"auraDriftA",51],[91,27,25,.07,47,0,"auraDriftB",58],
  [7,48,27,.065,41,3,"auraDriftB",55],[20,61,21,.075,36,-5,"auraDriftA",64],
  [34,45,29,.06,43,1,"auraDriftB",52],[48,58,18,.07,39,-2,"auraDriftA",59],
  [62,44,26,.065,45,5,"auraDriftB",67],[76,60,20,.075,40,-4,"auraDriftA",54],
  [89,49,28,.06,46,2,"auraDriftB",62],[12,84,19,.07,35,0,"auraDriftA",48],
  [29,91,27,.065,44,3,"auraDriftB",56],[45,82,22,.075,37,-3,"auraDriftA",65],
  [59,93,30,.06,43,4,"auraDriftB",50],[74,80,19,.07,39,-1,"auraDriftA",60],
  [88,88,24,.065,46,2,"auraDriftB",57],[96,72,18,.07,35,-2,"auraDriftA",63],
];

export function AuraVisualLayer() {
  return (
    <div className="aura-visual-layer" aria-hidden="true">
      <div className="aura-grid-layer" />
      <div className="aura-icons-layer">
        {placements.map(([x, y, size, opacity, duration, delay, drift, rotateDuration], index) => {
          const Icon = icons[index % icons.length];
          return (
            <span
              key={index}
              className="aura-floating-icon"
              style={{
                left: x + "%", top: y + "%", width: size + "px", height: size + "px",
                opacity, animationDuration: duration + "s", animationDelay: delay + "s",
                animationName: drift as string,
              }}
            >
              <Icon
                size={size}
                strokeWidth={1.15}
                style={{
                  animation: "auraRotate " + rotateDuration + "s linear infinite",
                  animationDirection: index % 2 ? "reverse" : "normal",
                }}
              />
            </span>
          );
        })}
      </div>
      <div className="aura-circuit-layer" />
      <div className="aura-scanlines-layer" />
    </div>
  );
}
