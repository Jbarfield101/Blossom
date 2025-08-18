import { Box, IconButton } from "@mui/material";
import {
  FaMusic, FaCubes, FaCameraRetro, FaRobot, FaBolt, FaCalendarAlt, FaFilm
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function DashboardIcons({ onHoverColor }:{ onHoverColor:(c:string)=>void }) {
  const nav = useNavigate();

  const items = [
    { icon:<FaCubes/>,       label:"3D Object",     color:"rgba(165,216,255,0.55)", path:"/objects" },
    { icon:<FaMusic/>,       label:"Lo‑Fi Music",   color:"rgba(245,176,194,0.55)", path:"/music" },
    { icon:<FaCalendarAlt/>, label:"Calendar",      color:"rgba(211,200,255,0.55)", path:"/calendar" },
    { icon:<FaCameraRetro/>, label:"ComfyUI",       color:"rgba(255,213,165,0.55)", path:"/comfy" },
    { icon:<FaRobot/>,       label:"AI Assistant",  color:"rgba(175,245,215,0.55)", path:"/assistant" },
    { icon:<FaBolt/>,        label:"Laser Lab",     color:"rgba(255,180,180,0.55)", path:"/laser" },
    { icon:<FaFilm/>,       label:"Shorts",        color:"rgba(200,200,200,0.55)", path:"/shorts" },
  ];

  return (
    <Box display="flex" justifyContent="center" alignItems="center" gap={48}
         sx={{ height:"100vh", position:"relative", zIndex:1, flexWrap:"wrap" }}>
      {items.map((it,i)=>(
        <div key={i} style={{ textAlign:"center" }}>
          <IconButton
            sx={{
              fontSize:"3rem", color:"white", transition:"all .2s",
              "&:hover":{ color:it.color.replace("0.55","1"), transform:"scale(1.08)",
                          filter:"drop-shadow(0 8px 18px rgba(0,0,0,.18))" }
            }}
            onMouseEnter={()=>onHoverColor(it.color)}
            onMouseLeave={()=>onHoverColor("rgba(255,255,255,0.22)")}
            onClick={()=>nav(it.path)}
            aria-label={it.label}
          >
            {it.icon}
          </IconButton>
          <div style={{ color:"#222", marginTop:8, fontSize:14 }}>{it.label}</div>
        </div>
      ))}
    </Box>
  );
}
