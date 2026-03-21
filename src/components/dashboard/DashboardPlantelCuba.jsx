import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../navbar/Navbar";
import Articulos from "../articulos/Articulos";
import { getPedidos, getMetricasPorPlantel } from "../../services/api";
import { 
  Wallet, Clock, TrendingUp, TrendingDown, Minus, 
  Filter, CheckCircle, Package, Calendar, Search, X, ChevronRight, History 
} from "lucide-react";

export default function DashboardPlantel() {
  const [metricas, setMetricas] = useState({ 
    presupuesto_inicial: 0, 
    gasto_total: 0, 
    saldo_pendiente: 0 
  });
  const [historial, setHistorial] = useState([]);
  const [historialFiltrado, setHistorialFiltrado] = useState([]);
  const [montoEnEspera, setMontoEnEspera] = useState(0);
  
  const [filtroEstatus, setFiltroEstatus] = useState("TODOS"); 
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [loading, setLoading] = useState(true);
  
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  const cargarInformacion = useCallback(async () => {
    try {
      const [resPedidos, resMetricas] = await Promise.all([
        getPedidos(),
        getMetricasPorPlantel(usuario.nombre)
      ]);

      if (resMetricas.ok) {
        const m = resMetricas.metricas;
        setMetricas({
          presupuesto_inicial: parseFloat(m.presupuesto_inicial || 0), 
          gasto_total: parseFloat(m.gasto_total || 0),
          saldo_pendiente: parseFloat(m.saldo_pendiente || 0) 
        });
      }

      if (resPedidos.ok) {
        const misPedidosRaw = resPedidos.pedidos.filter(p => p.usuario_nombre === usuario.nombre);
        
        const sumaPendiente = misPedidosRaw
          .filter(p => p.estatus !== 'AUTORIZADO' && p.estatus !== 'ENTREGADO' && p.estatus !== 'CERRADO')
          .reduce((acc, current) => acc + parseFloat(current.total_pedido || 0), 0);
        
        setMontoEnEspera(sumaPendiente);

        const agrupadosPorFolio = misPedidosRaw.reduce((acc, current) => {
          const existente = acc.find(item => item.id_solicitud === current.id_solicitud);
          if (existente) {
            const nombresArticulos = existente.articulo_nombre.split(', ');
            if (!nombresArticulos.includes(current.articulo_nombre)) {
                existente.articulo_nombre += `, ${current.articulo_nombre}`;
                existente.cantidad += parseInt(current.cantidad || 0);
                existente.total_acumulado += parseFloat(current.total_pedido || 0);
            }
          } else {
            acc.push({ 
              ...current, 
              cantidad: parseInt(current.cantidad || 0), 
              total_acumulado: parseFloat(current.total_pedido || 0) 
            });
          }
          return acc;
        }, []);

        const ordenados = agrupadosPorFolio.sort((a, b) => b.id_solicitud - a.id_solicitud);
        setHistorial(ordenados);
        setHistorialFiltrado(ordenados);
      }
    } catch (err) {
      console.error("Error al sincronizar dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [usuario.nombre]);

  useEffect(() => { cargarInformacion(); }, [cargarInformacion]);

  useEffect(() => {
    let filtrados = [...historial];
    if (filtroEstatus !== "TODOS") {
      filtrados = filtrados.filter(p => p.estatus === filtroEstatus || (!p.estatus && filtroEstatus === "PENDIENTE"));
    }
    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59);
      filtrados = filtrados.filter(p => {
        const fechaPedido = new Date(p.fecha);
        return fechaPedido >= inicio && fechaPedido <= fin;
      });
    }
    setHistorialFiltrado(filtrados);
  }, [filtroEstatus, historial, fechaInicio, fechaFin]);

  const limpiarFiltros = () => {
    setFiltroEstatus("TODOS");
    setFechaInicio("");
    setFechaFin("");
  };

  const descontar = () => {
    setTimeout(() => { cargarInformacion(); }, 800);
  };

  // --- LÓGICA DE NEGOCIO REAL ---
  const capitalAsignado = metricas.presupuesto_inicial; // Ejemplo: 1500
  const loYaGastado = metricas.gasto_total; // Ejemplo: lo que lleven este mes
  const dineroHoy = capitalAsignado - loYaGastado - montoEnEspera;
  
  const porcentajeUso = capitalAsignado > 0 ? (loYaGastado / capitalAsignado) * 100 : 0;
  const esCritico = dineroHoy < (capitalAsignado * 0.1);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a192f] text-blue-400 animate-pulse font-black uppercase text-xs tracking-widest">
      Sincronizando USAG Cloud...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f7fa] font-sans selection:bg-blue-100 pb-10">
      <Navbar />
      
      <div className={`fixed top-0 left-0 w-full h-80 -z-10 rounded-b-[4rem] shadow-2xl transition-all duration-1000 
        ${esCritico ? 'bg-orange-600' : dineroHoy < 0 ? 'bg-red-700' : 'bg-[#0a192f]'}`}>
      </div>

      <main className="pt-24 md:pt-32 px-4 md:px-8 max-w-[1600px] mx-auto space-y-8">
        
        {/* CARDS SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {/* Card 1: Lo que el Admin le asignó */}
  <div className="bg-[#0a192f] p-8 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden group transition-all hover:scale-[1.02] flex flex-col justify-between min-h-[200px]">
    <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform text-white">
        <Wallet size={140} />
    </div>
    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 z-10 block">Dinero Recibido</span>
    <div className="z-10 flex items-baseline gap-2">
      <h2 className="text-5xl font-black text-white italic tracking-tighter">
        ${capitalAsignado.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </h2>
    </div>
    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest italic z-10">Monto inicial del mes</p>
  </div>

  {/* Card 2: Lo que ya se gastó (Pedidos Autorizados) */}
  <div className="bg-[#0a192f] p-8 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden group transition-all hover:scale-[1.02] flex flex-col justify-between min-h-[200px]">
    <div className="flex justify-between items-center z-10">
      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">Ya me gasté</span>
      <TrendingUp size={20} className="text-blue-500" />
    </div>
    <div className="z-10">
      <h2 className="text-4xl font-black text-white italic tracking-tighter">
        ${loYaGastado.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </h2>
    </div>
    <p className="text-[9px] font-bold uppercase text-slate-500 tracking-widest z-10">Total en compras listas</p>
  </div>

  {/* Card 3: Lo que queda realmente en la bolsa hoy */}
  <div className={`p-8 rounded-[2.5rem] shadow-2xl border transition-all hover:scale-[1.02] flex flex-col justify-between min-h-[200px] relative overflow-hidden
    ${dineroHoy < 0 ? 'bg-red-900 border-red-500' : 'bg-[#0a192f] border-white/10'}`}>
    <span className={`text-[10px] font-black uppercase tracking-[0.4em] block z-10 ${dineroHoy < 0 ? 'text-white' : 'text-blue-400'}`}>Tengo disponible</span>
    <div className="z-10">
      <h2 className="text-5xl font-black italic tracking-tighter text-white">
        ${dineroHoy.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </h2>
    </div>
    <div className={`z-10 flex items-center gap-2 font-black text-[10px] uppercase ${dineroHoy < 0 ? 'text-red-200' : 'text-amber-500'}`}>
       <Clock size={14}/> {montoEnEspera > 0 ? `Apartado en espera: $${montoEnEspera.toLocaleString()}` : "Cuentas al día"}
    </div>
  </div>
</div>

        {/* BARRA DE CONSUMO */}
        <div className="bg-[#0a192f] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
                <p className="text-white text-2xl font-black tracking-tighter italic">
                  {porcentajeUso.toFixed(1)}% <span className="text-xs ml-3 uppercase text-slate-500 tracking-[0.3em]">Utilizado del total</span>
                </p>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Límite: ${capitalAsignado.toFixed(2)}</span>
            </div>
            <div className="h-5 w-full bg-slate-800/50 rounded-full p-1.5 border border-white/5 shadow-inner">
              <div 
                  className={`h-full rounded-full transition-all duration-1000 ${dineroHoy < 0 ? 'bg-red-600' : 'bg-blue-600'}`} 
                  style={{ width: `${Math.min(porcentajeUso, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* HISTORIAL DETALLADO */}
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[750px]">
             <div className="p-8 border-b border-slate-100 bg-white">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg"><History size={20}/></div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Historial de <span className="text-blue-600 font-black">Pedidos</span></h3>
                </div>
                <button onClick={limpiarFiltros} className="p-2.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-full transition-all"><X size={20}/></button>
              </div>
              
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {["TODOS", "PENDIENTE", "AUTORIZADO", "CERRADO"].map((status) => (
                    <button 
                      key={status} 
                      onClick={() => setFiltroEstatus(status)}
                      className={`px-5 py-2.5 rounded-2xl text-[9px] font-black transition-all ${filtroEstatus === status ? 'bg-[#0a192f] text-white shadow-xl' : 'bg-slate-50 text-slate-400 border border-slate-200/50'}`}
                    >
                      {status === "PENDIENTE" ? "EN ESPERA" : status === "AUTORIZADO" ? "LISTO" : status}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-inner">
                  <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="bg-transparent border-none text-[11px] font-bold text-slate-600 w-full" />
                  <ChevronRight size={14} className="text-slate-300" />
                  <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="bg-transparent border-none text-[11px] font-bold text-slate-600 w-full" />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
               <table className="w-full text-left">
                <tbody className="divide-y divide-slate-100">
                  {historialFiltrado.length > 0 ? (
                    historialFiltrado.map((p) => (
                      <tr key={p.id_solicitud} className="hover:bg-slate-50/50 transition-all group">
                        <td className="py-6 px-4">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[14px] font-black text-slate-700 uppercase italic group-hover:text-blue-700">{p.articulo_nombre}</span>
                            <div className="flex items-center gap-3 text-slate-400 font-bold text-[9px] italic">
                               <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg not-italic">#{p.id_solicitud}</span>
                               <Calendar size={10}/> {new Date(p.fecha).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="py-6 text-right px-4">
                          <div className="flex flex-col items-end gap-2.5">
                            <span className={`px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 ${p.estatus === 'AUTORIZADO' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-amber-600 bg-amber-50 border-amber-100'}`}>{p.estatus || 'PENDIENTE'}</span>
                            <span className="text-16px font-black text-[#0a192f]">${parseFloat(p.total_acumulado || 0).toFixed(2)}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td className="py-32 text-center text-slate-300 font-black uppercase text-[10px]">Sin movimientos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SUMINISTROS */}
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[750px]">
            <div className="p-8 border-b border-slate-100 bg-[#0a192f]/5 flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-xl text-white shadow-lg"><Package size={20}/></div>
                <h3 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Suministros <span className="text-blue-600">USAG</span></h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              <Articulos isAdmin={false} onConsumo={descontar} saldoDisponible={dineroHoy} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}