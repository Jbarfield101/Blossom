import { PropsWithChildren } from "react";
export default function Center({ children }: PropsWithChildren) {
  return (
    <div
      style={{
        height: "calc(100vh - var(--top-bar-height))",
        display: "grid",
        placeItems: "center",
        color: "#111",
        fontSize: 18,
      }}
    >
      {children}
    </div>
  );
}
