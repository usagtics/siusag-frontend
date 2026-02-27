import React, { useState, useEffect } from "react";
import Navbar from "../navbar/Navbar";
import Articulos from "../articulos/Articulos";
import { getPedidos } from "../../services/api";

export default function DashboardPlantelCorporativo() {
  const PRESUPUESTO_INICIAL = 8000.0; 
  
  const [saldo, setSaldo] = useState(PRESUPUESTO_INICIAL);
  const [historial, setHistorial] = useState([]);
  const [historialFiltrado, setHistorialFiltrado] = useState([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  const cargarHistorial = async () => {
    try {
      const data = await getPedidos();
      if (data.ok) {
        // Filtramos específicamente por el nombre del usuario logueado (Veracruz)
        const misPedidosRaw = data.pedidos.filter(p => p.usuario_nombre === usuario.nombre);
        
        const agrupadosPorFolio = misPedidosRaw.reduce((acc, current) => {
          const existente = acc.find(item => item.id_solicitud === current.id_solicitud);
          if (existente) {
            existente.cantidad += 1;
            existente.total_acumulado += parseFloat(current.total_pedido);
            if(!existente.articulo_nombre.includes(current.articulo_nombre)) {
                existente.articulo_nombre += `, ${current.articulo_nombre}`;
            }
          } else {
            acc.push({ ...current, cantidad: 1, total_acumulado: parseFloat(current.total_pedido) });
          }
          return acc;
        }, []);

        const ordenados = agrupadosPorFolio.sort((a, b) => b.id_solicitud - a.id_solicitud);
        setHistorial(ordenados);
        setHistorialFiltrado(ordenados);

        const gastado = misPedidosRaw.reduce((acc, p) => acc + parseFloat(p.total_pedido), 0);
        setSaldo(PRESUPUESTO_INICIAL - gastado);
      }
    } catch (err) {
      console.error("Error al cargar historial", err);
    }
  };

  const filtrarPorFecha = () => {
    if (!fechaInicio || !fechaFin) {
      setHistorialFiltrado(historial);
      return;
    }

    const inicio = new Date(fechaInicio + "T00:00:00");
    const fin = new Date(fechaFin + "T23:59:59");

    const filtrados = historial.filter((p) => {
      const fechaPedido = new Date(p.fecha);
      return fechaPedido >= inicio && fechaPedido <= fin;
    });

    setHistorialFiltrado(filtrados);
  };

  useEffect(() => { 
    cargarHistorial(); 
  }, []);

  const descontar = (monto) => {
    setSaldo(prev => prev - monto);
    // Recarga suave del historial para reflejar el nuevo pedido
    setTimeout(() => { cargarHistorial(); }, 600);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans selection:bg-blue-100">
      <Navbar />
      {/* Fondo decorativo */}
      <div className="fixed top-0 left-0 w-full h-64 md:h-80 bg-[#0f172a] -z-10 rounded-b-[2rem] md:rounded-b-[4rem] shadow-2xl"></div>

      <main className="pt-24 md:pt-32 pb-12 px-4 md:px-8 max-w-full mx-auto space-y-6 md:space-y-10">
        
        {/* INDICADORES DE PRESUPUESTO - VERACRUZ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          <div className="bg-[#1e293b] border border-white/10 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl transition-transform hover:scale-[1.01]">
            <span className="text-blue-400 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] block mb-2">Presupuesto Corporativo</span>
            <div className="flex items-baseline gap-2 md:gap-3">
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter italic">
                ${saldo.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h2>
              <span className="text-blue-400/80 font-black text-sm md:text-xl italic">MXN</span>
            </div>
          </div>

          <div className="bg-[#1e293b] border border-white/10 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col justify-center">
            <div className="space-y-4 md:space-y-6">
              <p className="text-white text-xl md:text-3xl font-black tracking-tighter">
                {((PRESUPUESTO_INICIAL - saldo) / PRESUPUESTO_INICIAL * 100).toFixed(1)}% 
                <span className="opacity-50 text-sm ml-2">Ejercido</span>
              </p>
              <div className="h-3 md:h-4 w-full bg-slate-900 rounded-full p-1">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                  style={{ width: `${((PRESUPUESTO_INICIAL - saldo) / PRESUPUESTO_INICIAL * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          
          {/* COLUMNA IZQUIERDA: HISTORIAL */}
          <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[500px] md:h-[700px]">
            <div className="p-6 md:p-10 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl md:text-3xl font-black text-slate-800 uppercase italic tracking-tighter mb-4">
                Pedidos <span className="text-blue-600">Corporativo</span>
              </h3>
              
              <div className="flex flex-wrap gap-3 items-end bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex flex-col">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Desde</label>
                  <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} 
                         className="bg-slate-50 border-none rounded-xl text-[11px] font-bold p-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex flex-col">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Hasta</label>
                  <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} 
                         className="bg-slate-50 border-none rounded-xl text-[11px] font-bold p-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={filtrarPorFecha} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase px-4 py-2.5 rounded-xl transition-all active:scale-95">
                  Filtrar
                </button>
                <button onClick={() => { setFechaInicio(""); setFechaFin(""); setHistorialFiltrado(historial); }} 
                        className="text-slate-400 text-[9px] font-black uppercase hover:text-slate-600 mb-2 ml-2">
                  Limpiar
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
              <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-50">
                  <tr className="text-blue-900 font-black text-[10px] uppercase tracking-wider">
                    <th className="p-4">Artículo / Folio</th>
                    <th className="p-4 text-center">Estatus</th>
                    <th className="p-4 text-center">Inversión</th>
                    <th className="p-4 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {historialFiltrado.map((p) => (
                    <tr key={p.id_solicitud} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-700 uppercase italic leading-tight">
                            {p.articulo_nombre}
                          </span>
                          <span className="text-[10px] font-bold text-blue-500">
                            Folio: #{p.id_solicitud} • x{p.cantidad}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-tighter ${
                          p.estatus === 'AUTORIZADO' 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse'
                        }`}>
                          {p.estatus || 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="p-4 text-center font-black text-slate-800 italic">
                        ${parseFloat(p.total_acumulado).toFixed(2)}
                      </td>
                      <td className="p-4 text-right text-[10px] font-black text-slate-400 uppercase italic">
                        {new Date(p.fecha).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* COLUMNA DERECHA: SOLICITUD DE ARTÍCULOS */}
          <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[500px] md:h-[700px]">
            <div className="p-6 md:p-10 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl md:text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Suministros <span className="text-blue-600">USAG</span></h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin">
              <Articulos isAdmin={false} onConsumo={descontar} />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}