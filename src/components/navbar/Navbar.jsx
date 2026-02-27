import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png"; 

export default function Navbar() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const nombreUsuario = usuario?.nombre || "Invitado";
  const esAdmin = nombreUsuario.toLowerCase().includes("admin");

  return (
    <header className={`fixed inset-x-0 top-0 z-[100] w-full border-b-4 bg-blue-900/95 py-3 lg:py-5 shadow-2xl backdrop-blur-xl transition-all ${
      esAdmin ? 'border-amber-500' : 'border-blue-400'
    }`}>
      <div className="w-full px-4 lg:px-10"> 
        <div className="flex items-center justify-between">
          
          {/* Logo: Se hace más pequeño en móvil */}
          <div className="flex items-center gap-2 lg:gap-5 cursor-pointer" onClick={() => navigate(-1)}>
            <img className="h-9 lg:h-14 w-auto transition-transform duration-700" src={logo} alt="Logo" />
           
          </div>

          {/* Identidad: En móvil ocultamos el texto "Usuario:" para ahorrar espacio */}
          <div className="flex items-center gap-3 lg:gap-8">
            <div className="flex flex-col items-end pr-3 border-r border-white/20">
                <span className="hidden lg:block text-xs font-bold text-blue-200 uppercase">Usuario:</span>
                <span className="text-[10px] lg:text-xl font-black text-white uppercase truncate max-w-[80px] lg:max-w-none">
                    {nombreUsuario}
                </span>
            </div>

            {/* Badge: En móvil solo mostramos el círculo brillante para no saturar */}
            <div className={`flex items-center gap-2 px-3 py-1.5 lg:px-6 lg:py-3 rounded-xl border ${
                esAdmin ? 'bg-amber-600/20 border-amber-500' : 'bg-blue-800/40 border-blue-600'
            }`}>
              <div className={`h-2 lg:h-3.5 w-2 lg:w-3.5 rounded-full animate-pulse ${
                  esAdmin ? 'bg-amber-400' : 'bg-cyan-400'
              }`}></div>
              <span className="hidden md:block text-white text-[9px] lg:text-sm font-black uppercase tracking-widest">
                {esAdmin ? "ADMIN" : "PLANTEL"}
              </span>
            </div>
            
            <button onClick={() => { localStorage.removeItem("usuario"); navigate("/"); }}
              className="bg-red-600 text-white p-2 lg:px-8 lg:py-3.5 rounded-xl font-black text-[10px] transition-all active:scale-95"
            >
              <span className="hidden lg:inline">CERRAR SESIÓN</span>
              <span className="lg:hidden">❌</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}