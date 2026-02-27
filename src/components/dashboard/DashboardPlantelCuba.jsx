import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../navbar/Navbar";
import Articulos from "../articulos/Articulos";
import { getPedidos, getMetricasPorPlantel } from "../../services/api";
import { Wallet, Clock } from "lucide-react";

export default function DashboardPlantel() {
  const [metricas, setMetricas] = useState({ 
    presupuesto_inicial: 0, 
    gasto_total: 0, 
    saldo_pendiente: 0 
  });
  const [historial, setHistorial] = useState([]);
  const [historialFiltrado, setHistorialFiltrado] = useState([]);
  const [montoEnEspera, setMontoEnEspera] = useState(0);
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
    presupuesto_inicial: parseFloat(m.presupuesto_inicial || 5000), 
    gasto_total: parseFloat(m.gasto_total || 0),
    saldo_pendiente: parseFloat(m.saldo_pendiente || 0) 
  });
}

      if (resPedidos.ok) {
        const misPedidosRaw = resPedidos.pedidos.filter(p => p.usuario_nombre === usuario.nombre);
        
        // Solo sumamos como "espera" aquello que NO sea un pedido ya procesado en DB
        const sumaPendiente = misPedidosRaw
          .filter(p => p.estatus !== 'AUTORIZADO' && p.estatus !== 'ENTREGADO')
          .reduce((acc, current) => acc + parseFloat(current.total_pedido || 0), 0);
        
        setMontoEnEspera(sumaPendiente);

       // --- DENTRO DE cargarInformacion ---
const agrupadosPorFolio = misPedidosRaw.reduce((acc, current) => {
  // Buscamos si ya existe este folio en nuestro acumulador
  const existente = acc.find(item => item.id_solicitud === current.id_solicitud);
  
  if (existente) {
    // IMPORTANTE: Solo agregamos si el artículo NO ha sido contabilizado 
    // en este mismo folio para evitar duplicados visuales
    const nombresArticulos = existente.articulo_nombre.split(', ');
    if (!nombresArticulos.includes(current.articulo_nombre)) {
        existente.articulo_nombre += `, ${current.articulo_nombre}`;
        // Sumamos cantidad y total solo de artículos nuevos en el folio
        existente.cantidad += parseInt(current.cantidad || 0);
        existente.total_acumulado += parseFloat(current.total_pedido || 0);
    }
  } else {
    // Si es un folio nuevo, creamos el registro base
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

  const descontar = () => {
    setTimeout(() => { cargarInformacion(); }, 800);
  };

  // --- LÓGICA DE SALDOS ---
  const saldoDisponibleReal = parseFloat(metricas.saldo_pendiente || 0); 
  // Evitamos que el saldo proyectado sea menor a 0 si no hay presupuesto cargado
  const saldoProyectado = metricas.presupuesto_inicial > 0 
    ? Math.max(0, saldoDisponibleReal - montoEnEspera)
    : 0;
  
  const presupuestoCritico = saldoProyectado < (metricas.presupuesto_inicial * 0.1);
  const porcentajeUtilizado = metricas.presupuesto_inicial > 0 
    ? ((metricas.presupuesto_inicial - saldoProyectado) / metricas.presupuesto_inicial) * 100 
    : 0;
    
  const hayDeuda = saldoDisponibleReal <= 0;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 animate-pulse font-black uppercase text-xs tracking-widest">
      Sincronizando Capital USAG...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans selection:bg-blue-100">
      <Navbar />
      
      <div className={`fixed top-0 left-0 w-full h-64 md:h-80 -z-10 rounded-b-[2rem] md:rounded-b-[4rem] shadow-2xl transition-colors duration-700 ${presupuestoCritico ? 'bg-orange-900' : hayDeuda ? 'bg-red-950' : 'bg-[#0f172a]'}`}></div>

      <main className="pt-24 md:pt-32 pb-12 px-4 md:px-8 max-w-full mx-auto space-y-6 md:space-y-10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          {/* Card 1: Capital Real en SQL */}
          <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border bg-[#1e293b] border-white/10 transition-all hover:scale-[1.01]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] block mb-2 text-blue-400">
                Capital Autorizado (BD)
              </span>
              <Wallet size={18} className="text-blue-400/50" />
            </div>
            <div className="flex items-baseline gap-2 md:gap-3">
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter italic">
                ${saldoDisponibleReal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h2>
              <span className="text-blue-400/80 font-black text-sm md:text-xl italic">MXN</span>
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase mt-2 italic">Saldo contable actual en sistema</p>
          </div>

          {/* Card 2: Simulación de lo que viene */}
          <div className={`p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border transition-all hover:scale-[1.01] relative overflow-hidden ${presupuestoCritico ? 'bg-orange-600/20 border-orange-500/50' : 'bg-slate-900 border-blue-500/20'}`}>
            <span className={`text-[10px] md:text-xs font-black uppercase tracking-[0.3em] block mb-2 ${presupuestoCritico ? 'text-orange-400' : 'text-slate-400'}`}>
              Saldo Proyectado (Simulación)
            </span>
            <div className="flex items-baseline gap-2 md:gap-3">
              <h2 className={`text-4xl md:text-6xl font-black tracking-tighter italic ${presupuestoCritico ? 'text-orange-500' : 'text-blue-400'}`}>
                ${saldoProyectado.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h2>
              <span className="text-slate-500 font-black text-sm md:text-xl italic">MXN</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase">
               <Clock size={14} className={montoEnEspera > 0 ? "animate-spin-slow" : ""}/> 
               {montoEnEspera > 0 
                ? `Simulando descuento de: $${montoEnEspera.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : "Sin cargos pendientes de simular"}
            </div>
          </div>
        </div>

        {/* Barra de Progreso */}
        <div className="bg-[#1e293b] border border-white/10 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl">
          <div className="space-y-4 md:space-y-6">
            <div className="flex justify-between items-end">
                <p className="text-white text-xl md:text-3xl font-black tracking-tighter">
                  {porcentajeUtilizado.toFixed(1)}% 
                  <span className={`text-sm ml-2 uppercase ${presupuestoCritico ? 'text-orange-500' : 'text-slate-500'}`}>
                    {presupuestoCritico ? 'Límite de Presupuesto' : 'Gasto Proyectado Mensual'}
                  </span>
                </p>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                    Meta: ${metricas.presupuesto_inicial.toLocaleString()}
                </span>
            </div>
            <div className="h-3 md:h-4 w-full bg-slate-900 rounded-full p-1">
              <div 
                  className={`h-full rounded-full transition-all duration-1000 ${presupuestoCritico ? 'bg-orange-500' : 'bg-blue-600'}`} 
                  style={{ width: `${Math.min(porcentajeUtilizado, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          {/* Tabla de Historial */}
          <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[500px] md:h-[700px]">
             <div className="p-6 md:p-10 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl md:text-3xl font-black text-slate-800 uppercase italic tracking-tighter mb-4">
                Pedidos <span className="text-blue-600">Consulta</span>
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
               <table className="w-full text-left">
                <thead className="bg-white border-b border-slate-50 sticky top-0 z-10">
                  <tr className="text-blue-900 font-black text-[10px] uppercase tracking-wider">
                    <th className="p-4">Artículo / Folio</th>
                    <th className="p-4 text-center">Estatus</th>
                    <th className="p-4 text-center">Inversión</th>
                    <th className="p-4 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {historialFiltrado.map((p) => (
                    <tr key={p.id_solicitud} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-700 uppercase italic group-hover:text-blue-600 transition-colors leading-tight">
                            {p.articulo_nombre}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
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
                        ${parseFloat(p.total_acumulado || 0).toFixed(2)}
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

          {/* Componente Artículos */}
          <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[500px] md:h-[700px]">
            <div className="p-6 md:p-10 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl md:text-3xl font-black text-slate-800 uppercase italic tracking-tighter">Suministros <span className="text-blue-600">USAG</span></h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin">
              <Articulos 
                isAdmin={false} 
                onConsumo={descontar} 
                saldoDisponible={saldoProyectado} 
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}