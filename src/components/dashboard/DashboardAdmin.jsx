import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom"; 
import Articulos from "../articulos/Articulos";
import Navbar from "../navbar/Navbar";
import { getReporteGastos, getPedidos, autorizarSolicitud } from "../../services/api";
// 1. Importamos SweetAlert2
import Swal from "sweetalert2";

export default function DashboardAdmin() {
  const [reporte, setReporte] = useState([]);
  const [todosLosPedidos, setTodosLosPedidos] = useState([]);
  const [plantelSeleccionado, setPlantelSeleccionado] = useState(null);
  const [seleccionados, setSeleccionados] = useState([]); 
  const [cargandoAccion, setCargandoAccion] = useState(false);
  
  const detalleRef = useRef(null);

  const cargarDatos = async () => {
    try {
      const [resReporte, resPedidos] = await Promise.all([
        getReporteGastos(),
        getPedidos()
      ]);
      if (resReporte.ok) setReporte(resReporte.reporte);
      if (resPedidos.ok) setTodosLosPedidos(resPedidos.pedidos);
    } catch (err) {
      console.error("Error al cargar datos", err);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const toggleSeleccion = (idSolicitud) => {
    setSeleccionados(prev => 
      prev.includes(idSolicitud) 
        ? prev.filter(id => id !== idSolicitud) 
        : [...prev, idSolicitud]
    );
  };

  const autorizarMarcados = async () => {
    if (cargandoAccion) return;

    const idsUnicos = [...new Set(seleccionados)];
    
    // Alerta si no hay nada seleccionado
    if (idsUnicos.length === 0) {
      return Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Selecciona al menos un artículo para autorizar.',
        confirmButtonColor: '#3b82f6'
      });
    }
const resultado = await Swal.fire({
  title: '¿Confirmar Autorización?',
  text: `Vas a autorizar ${idsUnicos.length} folios. Esta acción descontará stock y capital.`,
  icon: 'question',
  showCancelButton: true,
  confirmButtonText: 'Sí, autorizar',
  cancelButtonText: 'Cancelar',
  // Colores oficiales USAG
  confirmButtonColor: '#10b981', // Verde éxito
  cancelButtonColor: '#ef4444',  // Rojo error
  reverseButtons: true,
  background: '#ffffff',
  customClass: {
    confirmButton: 'text-white font-bold uppercase text-xs px-6 py-3 rounded-xl shadow-lg',
    cancelButton: 'text-white font-bold uppercase text-xs px-6 py-3 rounded-xl shadow-lg'
  }
});

if (!resultado.isConfirmed) return;

Swal.fire({
  title: 'Procesando...',
  text: 'Actualizando inventario y presupuestos',
  allowOutsideClick: false,
  showConfirmButton: false,
  willOpen: () => {
    Swal.showLoading();
  }
});

    if (!resultado.isConfirmed) return;

    setCargandoAccion(true);
    
    // Mostrar loader mientras procesa
    Swal.fire({
      title: 'Procesando...',
      text: 'Actualizando inventario y presupuestos',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      for (const id of idsUnicos) {
        await autorizarSolicitud(id);
      }

      // Alerta de éxito
      await Swal.fire({
        icon: 'success',
        title: '¡Autorizado!',
        text: 'Los folios han sido procesados correctamente.',
        timer: 2000,
        showConfirmButton: false
      });

      setSeleccionados([]); 
      await cargarDatos(); 
    } catch (err) {
      console.error("Error en el proceso masivo:", err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un problema al procesar la solicitud. Revisa la conexión.',
      });
    } finally {
      setCargandoAccion(false);
    }
  };

  const obtenerConteoPendientes = (nombrePlantel) => {
    return todosLosPedidos.filter(p => 
      (p.usuario_nombre || "").trim().toUpperCase() === (nombrePlantel || "").trim().toUpperCase() &&
      p.estatus === 'PENDIENTE'
    ).length;
  };

  const totalPendientesGlobal = todosLosPedidos.filter(p => p.estatus === 'PENDIENTE').length;

  const manejarSeleccion = (nombre) => {
    setSeleccionados([]); 
    if (plantelSeleccionado === nombre) {
      setPlantelSeleccionado(null);
    } else {
      setPlantelSeleccionado(nombre);
      setTimeout(() => {
        detalleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const pedidosAgrupados = todosLosPedidos
    .filter(p => {
      const nombrePedido = (p.usuario_nombre || "").trim().toUpperCase();
      const nombreSeleccionado = (plantelSeleccionado || "").trim().toUpperCase();
      return nombrePedido === nombreSeleccionado;
    })
    .reduce((acc, current) => {
      const existente = acc.find(item => item.id_solicitud === current.id_solicitud);
      if (existente) {
        if(!existente.articulo_nombre.includes(current.articulo_nombre)) {
            existente.articulo_nombre += `, ${current.articulo_nombre}`;
        }
      } else {
        acc.push({ ...current, cantidadReal: current.cantidad || 1 });
      }
      return acc;
    }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />
      <main className="pt-24 pb-12 px-6 max-w-[1600px] mx-auto">
        
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter italic uppercase">
              Panel de Control <span className="text-blue-600">USAG</span>
            </h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
              Control de suministros y existencias
            </p>
          </div>
          
          {totalPendientesGlobal > 0 && (
            <div className="bg-red-50 border border-red-200 px-4 py-2 rounded-2xl flex items-center gap-3 animate-pulse">
               <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              <p className="text-red-700 font-black text-xs uppercase tracking-tighter">
                {totalPendientesGlobal} Solicitudes Pendientes
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-1 space-y-6">
            <Link 
              to="/reportes" 
              className="flex items-center gap-4 bg-[#0f172a] hover:bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-xl transition-all active:scale-95 group border-b-2 border-slate-700"
            >
              <div className="bg-white/10 p-1.5 rounded-lg group-hover:bg-white/20 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-[9px] font-black uppercase opacity-50 leading-none mb-0.5">Módulo Analítico</p>
                <p className="text-xs font-bold uppercase tracking-tight">Reportes Oficiales</p>
              </div>
            </Link>

            <h2 className="text-sm font-black text-blue-900 uppercase tracking-widest flex items-center gap-2 pt-2">
              <span className="w-4 h-1 bg-blue-600 rounded-full"></span> Unidades Académicas
            </h2>

            <div className="grid grid-cols-1 gap-4">
                {reporte.map((item) => {
                  const numPendientes = obtenerConteoPendientes(item.usuario_nombre);
                  return (
                    <button 
                      key={item.usuario_nombre} 
                      onClick={() => manejarSeleccion(item.usuario_nombre)}
                      className={`relative text-left rounded-3xl p-5 border transition-all ${
                        plantelSeleccionado === item.usuario_nombre 
                        ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-100' 
                        : 'bg-white border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {numPendientes > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                          {numPendientes}
                        </span>
                      )}
                      <h3 className="font-black text-slate-700 uppercase text-xs flex items-center gap-2">
                        {item.usuario_nombre}
                        {numPendientes > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                      </h3>
                      <div className="text-2xl font-black text-slate-900">${parseFloat(item.gasto_total || 0).toLocaleString()}</div>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="xl:col-span-3 space-y-8">
            {plantelSeleccionado && (
              <div ref={detalleRef} className="bg-white rounded-[2.5rem] shadow-xl border border-blue-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-blue-900 p-8 flex justify-between items-center text-white">
                  <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">{plantelSeleccionado}</h2>
                    <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">Validación de existencias antes de aprobar</p>
                  </div>
                  
                  <button 
                    onClick={autorizarMarcados}
                    disabled={seleccionados.length === 0 || cargandoAccion}
                    className={`font-black px-8 py-3 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-xs border-b-4 ${seleccionados.length > 0 ? 'bg-green-500 hover:bg-green-400 text-white border-green-700' : 'bg-slate-700 text-slate-400 border-slate-800 cursor-not-allowed'}`}
                  >
                    {cargandoAccion ? "Procesando..." : `✓ Autorizar (${seleccionados.length}) Marcados`}
                  </button>
                </div>
                
                <div className="p-8">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-blue-900 font-black text-[10px] uppercase border-b border-slate-100">
                        <th className="py-4 w-10 text-center">OK</th>
                        <th className="py-4">Artículo solicitado</th>
                        <th className="py-4 text-center">Cantidad</th>
                        <th className="py-4 text-right">Estatus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidosAgrupados.map((p) => (
                        <tr key={p.id_solicitud} className={`border-b border-slate-50 transition-colors ${seleccionados.includes(p.id_solicitud) ? 'bg-blue-50/50' : ''}`}>
                          <td className="py-5 text-center">
                            {p.estatus !== 'AUTORIZADO' ? (
                              <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                checked={seleccionados.includes(p.id_solicitud)}
                                onChange={() => toggleSeleccion(p.id_solicitud)}
                              />
                            ) : (
                              <span className="text-green-500 font-black">✓</span>
                            )}
                          </td>
                          <td className="py-5 font-bold text-slate-700 uppercase text-xs italic">{p.articulo_nombre} <span className="text-[10px] text-slate-400 font-normal">#{p.id_solicitud}</span></td>
                          <td className="py-5 text-center font-black text-blue-600">x{p.cantidadReal}</td>
                          <td className="py-5 text-right font-black">
                            <div className="flex flex-col items-end gap-2">
                              <span className={`text-[9px] px-3 py-1 rounded-full uppercase ${p.estatus === 'AUTORIZADO' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700 animate-pulse'}`}>
                                {p.estatus || 'POR VALIDAR'}
                              </span>
                              {p.estatus === 'AUTORIZADO' && (
                                <div className="text-[9px] text-slate-500 font-bold uppercase leading-tight bg-slate-50 p-2 rounded-xl border border-slate-100">
                                  <p className="flex items-center justify-end gap-1">
                                    Solicitó: <span className="text-blue-600">{p.usuario_nombre}</span>
                                  </p>
                                  <p className="text-slate-400 mt-1 flex items-center justify-end gap-1">
                                    {new Date(p.fecha).toLocaleDateString()} | {new Date(p.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} hrs
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8">
              <h2 className="text-xl font-black text-slate-800 uppercase italic mb-8">Catálogo de Inventario Maestro</h2>
              <Articulos isAdmin={true} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}