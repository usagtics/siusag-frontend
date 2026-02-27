import { useState } from "react";
import { loginUsuario } from "../services/api";
import logo from "../assets/logo.png";

export default function LoginForm() {
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    setLoading(true);

    try {
      const data = await loginUsuario(nombre, password);

      if (data.ok) {
        localStorage.setItem("usuario", JSON.stringify(data.usuario));
        
        const userRole = data.usuario.rol;
        const userName = data.usuario.nombre.toLowerCase();

        // --- LÓGICA DE REDIRECCIÓN ACTUALIZADA ---
        if (userRole === "admin" || userName.includes("admin")) {
          window.location.href = "/dashboardAdmin";
        } 
        else if (userName.includes("cuba")) {
          window.location.href = "/dashboard-cuba";
        } 
        else if (userName.includes("veracruz")) {
          window.location.href = "/dashboard-veracruz";
        } 
        else if (userName.includes("centro")) {
          window.location.href = "/dashboard-centro";
        } 
         else if (userName.includes("centenario")) {
          window.location.href = "/dashboard-centenario";
        } 
          else if (userName.includes("corporativo")) {
          window.location.href = "/dashboard-corporativo";
        } 
        else {
          // Redirección por defecto si no coincide con los anteriores
          window.location.href = "/dashboardCuba"; 
        }
        // -----------------------------------------

      } else {
        setMensaje("Credenciales no válidas. Intente de nuevo.");
      }
    } catch (err) {
      setMensaje("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f0f4f8] overflow-hidden font-sans">
      
      {/* SECCIÓN IZQUIERDA: DISEÑO CENTRADO */}
      <div className="hidden lg:flex lg:w-3/5 bg-[#001d3d] relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
        
        <div className="relative z-10 w-full max-w-lg text-center flex flex-col items-center">
          <div className="mb-10 p-8 bg-white/5 backdrop-blur-xl rounded-[3rem] border border-white/10 shadow-2xl transition-transform hover:scale-105">
            <img src={logo} alt="Logo USAG" className="h-40 w-auto object-contain" />
          </div>
          
          <h1 className="text-5xl xl:text-6xl font-black text-white leading-tight mb-6 tracking-tighter">
            Control de <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">
              Suministros
            </span>
          </h1>
          
          <p className="text-blue-100/60 text-lg font-medium tracking-wide italic">
            Gestión de recursos universitarios.
          </p>
        </div>
      </div>

      {/* SECCIÓN DERECHA */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-6 relative">
        <div className="lg:hidden absolute top-0 left-0 w-full h-1/3 bg-[#001d3d] -z-10"></div>
        
        <div className="w-full max-w-[420px] bg-white rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.12)] p-10 md:p-14 border border-slate-100">
          
          <div className="mb-10 text-center">
            <div className="lg:hidden flex justify-center mb-6">
                <img src={logo} alt="Logo USAG" className="h-20 w-auto bg-[#001d3d] p-4 rounded-3xl" />
            </div>
            <h3 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">¡Bienvenido!</h3>
            <p className="text-slate-400 text-sm font-medium">Ingresa para gestionar tus suministros</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Usuario</label>
              <input
                type="text"
                placeholder="Ej: Plantel Cuba o Veracruz"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full h-16 px-6 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-700 placeholder:text-slate-300"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-16 px-6 bg-slate-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-700 placeholder:text-slate-300"
                required
              />
            </div>

            {mensaje && (
              <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-[10px] font-black uppercase text-center border border-red-100">
                {mensaje}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 transition-all transform active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "Acceder al Panel"
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-50 text-center">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em]">
              Universidad San Andrés • USAG
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}