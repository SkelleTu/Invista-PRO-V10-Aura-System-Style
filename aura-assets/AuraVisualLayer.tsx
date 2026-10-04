import { useEffect, useState } from "react";
import { Shield,Cpu,Database,Wifi,Lock,Code,Terminal,Cloud,Server,HardDrive,Binary,Fingerprint,Key,Globe,Zap,CircuitBoard,Layers,Network } from "lucide-react";

const icons=[Shield,Cpu,Database,Wifi,Lock,Code,Terminal,Cloud,Server,HardDrive,Binary,Fingerprint,Key,Globe,Zap,CircuitBoard,Layers,Network];

export function AuraVisualLayer(){
  const [items,setItems]=useState<any[]>([]);
  useEffect(()=>{
    setItems(Array.from({length:32},(_,i)=>({
      id:i,
      Icon:icons[Math.floor(Math.random()*icons.length)],
      x:Math.random()*94+3,
      y:Math.random()*94+3,
      size:18+Math.random()*28,
      opacity:.065+Math.random()*.09,
      duration:28+Math.random()*32,
      delay:Math.random()*-45,
      reverse:Math.random()>.5,
      drift:Math.random()>.5?"auraDriftA":"auraDriftB",
      rotateDuration:38+Math.random()*35
    })));
  },[]);
  return <div className="aura-visual-layer" aria-hidden="true">
    <div className="aura-grid-layer"/>
    <div className="aura-icons-layer">
      {items.map(({id,Icon,x,y,size,opacity,duration,delay,reverse,drift,rotateDuration})=>
        <span key={id} className="aura-floating-icon" style={{
          left:x+"%",top:y+"%",opacity,
          animationDuration:duration+"s",animationDelay:delay+"s",
          animationName:drift
        }}>
          <Icon size={size} strokeWidth={1.15} style={{
            animation:"auraRotate "+rotateDuration+"s linear infinite",
            animationDirection:reverse?"reverse":"normal"
          }}/>
        </span>
      )}
    </div>
    <div className="aura-circuit-layer"/>
    <div className="aura-scanlines-layer"/>
  </div>;
}
