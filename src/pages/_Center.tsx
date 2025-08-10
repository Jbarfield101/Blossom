import { PropsWithChildren } from "react";
export default function Center({children}:PropsWithChildren){
  return <div style={{
    height:"100vh", display:"grid", placeItems:"center",
    color:"#111", fontSize:18
  }}>{children}</div>;
}
