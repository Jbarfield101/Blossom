import React from "react";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black z-50">
      <img src="/flower.svg" alt="Loading" className="w-24 h-24 splash-flower" />
      <style>{`
        @keyframes splash-bloom {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .splash-flower {
          animation: splash-bloom 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
