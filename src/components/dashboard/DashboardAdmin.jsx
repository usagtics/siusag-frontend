import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import Articulos from "../articulos/Articulos";
import Navbar from "../navbar/Navbar";
import { 
  getReporteGastos, 
  getPedidos, 
  autorizarSolicitud, 
  guardarCorte 
} from "../../services/api";
import Swal from "sweetalert2";
import { Filter, CheckCircle, Clock, Package, History } from "lucide-react"; 

export default function DashboardAdmin() {
  const [reporte, setReporte] = useState([]);
  const [todosLosPedidos, setTodosLosPedidos] = useState([]);
  const [plantelSeleccionado, setPlantelSeleccionado] = useState(null);
  const [seleccionados, setSeleccionados] = useState([]);
  const [cargandoAccion, setCargandoAccion] = useState(false);
  
  // Filtro de estatus: PENDIENTE, AUTORIZADO, CERRADO o TODOS
  const [filtroEstatus, setFiltroEstatus] = useState("PENDIENTE");

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

  useEffect(() => { cargarDatos(); }, []);

const manejarCierreMensual = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Ejecutar Corte Mensual',
      html: `
        <div class="space-y-4 text-left p-2">
          <p class="text-sm text-slate-500 mb-4">Esto archivará los pedidos actuales, calculará los ahorros y sumará el nuevo capital a todos los planteles.</p>
          <div>
            <label class="text-[10px] font-black uppercase tracking-widest text-blue-600">Nombre del Periodo</label>
            <input id="swal-periodo" class="swal2-input !m-0 !mt-2 w-full text-sm" placeholder="Ej. Abril 2026">
          </div>
          <div class="mt-4">
            <label class="text-[10px] font-black uppercase tracking-widest text-green-600">Nuevo Capital a Inyectar ($)</label>
            <input id="swal-capital" type="number" class="swal2-input !m-0 !mt-2 w-full text-sm font-black" placeholder="Ej. 2000">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Confirmar Corte',
      confirmButtonColor: '#0f172a',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const periodo = document.getElementById('swal-periodo').value;
        const capital = document.getElementById('swal-capital').value;
        if (!periodo || !capital) {
          Swal.showValidationMessage('¡Ambos campos son obligatorios!');
        }
        return { periodo, nuevoCapital: parseFloat(capital) };
      }
    });

    if (formValues) {
      try {
        Swal.fire({ title: 'Procesando...', didOpen: () => Swal.showLoading() });
        
        // Aquí mandamos el 'nuevo_capital' al backend
        const res = await guardarCorte({ 
          periodo: formValues.periodo, 
          nuevo_capital: formValues.nuevoCapital, 
          creado_por: 'Admin USAG' 
        });
        
        if (res.ok) {
          await Swal.fire({ icon: 'success', title: 'Corte Exitoso', text: res.mensaje });
          await cargarDatos();
        }
      } catch (err) {
        Swal.fire('Error', err.response?.data?.mensaje || 'Error al procesar el corte', 'error');
      }
    }
  };

  const toggleSeleccion = (idSolicitud) => {
    setSeleccionados(prev =>
      prev.includes(idSolicitud) ? prev.filter(id => id !== idSolicitud) : [...prev, idSolicitud]
    );
  };

  const autorizarMarcados = async () => {
    if (cargandoAccion) return;
    const idsUnicos = [...new Set(seleccionados)];
    if (idsUnicos.length === 0) return Swal.fire("Atención", "Selecciona folios para autorizar", "warning");

    const resultado = await Swal.fire({
      title: '¿Confirmar Autorización?',
      text: `Vas a autorizar ${idsUnicos.length} folios.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, autorizar',
      confirmButtonColor: '#10b981'
    });

    if (!resultado.isConfirmed) return;

    setCargandoAccion(true);
    try {
      for (const id of idsUnicos) { await autorizarSolicitud(id); }
      await Swal.fire("¡Autorizado!", "Folios procesados correctamente", "success");
      setSeleccionados([]);
      await cargarDatos();
    } catch (err) {
      Swal.fire("Error", "Problema al procesar solicitudes", "error");
    } finally { setCargandoAccion(false); }
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
      setTimeout(() => { detalleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
    }
  };

  const pedidosAgrupados = todosLosPedidos
    .filter(p => 
      (p.usuario_nombre || "").trim().toUpperCase() === (plantelSeleccionado || "").trim().toUpperCase() &&
      (filtroEstatus === "TODOS" ? true : p.estatus === filtroEstatus)
    )
    .reduce((acc, current) => {
      const existente = acc.find(item => item.id_solicitud === current.id_solicitud);
      if (existente) {
        if (!existente.articulo_nombre.includes(current.articulo_nombre)) {
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
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Control de suministros y presupuestos</p>
          </div>
          {totalPendientesGlobal > 0 && (
            <div className="bg-red-50 border border-red-200 px-4 py-2 rounded-2xl flex items-center gap-3 animate-pulse">
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              <p className="text-red-700 font-black text-xs uppercase tracking-tighter">{totalPendientesGlobal} Solicitudes Pendientes</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-1 space-y-4">
            <Link to="/reportes" className="flex items-center gap-4 bg-[#0f172a] text-white px-6 py-4 rounded-2xl shadow-xl hover:bg-blue-600 transition-all">
               <History size={20} className="text-blue-400" />
               <div className="text-left">
                  <p className="text-[9px] font-black uppercase opacity-50">Analítica</p>
                  <p className="text-xs font-bold uppercase">Reportes e Historial</p>
               </div>
            </Link>
            <button onClick={manejarCierreMensual} className="w-full flex items-center gap-4 bg-white text-slate-700 px-6 py-4 rounded-2xl shadow-sm border border-slate-200 hover:bg-red-50 transition-all">
               <Package size={20} className="text-red-600" />
               <div className="text-left">
                  <p className="text-[9px] font-black uppercase text-red-600">Admin</p>
                  <p className="text-xs font-bold uppercase">Cierre Mensual</p>
               </div>
            </button>

            <h2 className="text-sm font-black text-blue-900 uppercase tracking-widest pt-4 flex items-center gap-2">
               <div className="w-2 h-2 bg-blue-600 rounded-full"></div> Unidades Académicas
            </h2>

            <div className="grid grid-cols-1 gap-4">
             {reporte.map((item) => {
                const numPendientes = obtenerConteoPendientes(item.usuario_nombre);
                const gastoTotal = parseFloat(item.gasto_total || 0);
                const limitePresupuesto = parseFloat(item.limite_presupuesto || 0); // Traemos el límite real de la BD
                
                // Ahora el sobregiro es real: compara lo gastado contra el límite de ESE plantel
                const esNegativo = gastoTotal > limitePresupuesto; 

                return (
                  <button
                    key={item.usuario_nombre}
                    onClick={() => manejarSeleccion(item.usuario_nombre)}
                    className={`relative text-left rounded-3xl p-5 border transition-all ${
                      plantelSeleccionado === item.usuario_nombre ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-100' : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {numPendientes > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-bounce">{numPendientes}</span>
                    )}
                    <h3 className="font-black text-slate-700 uppercase text-xs">{item.usuario_nombre}</h3>
                    
                    {/* Monto Gastado */}
                    <div className={`text-2xl font-black ${esNegativo ? 'text-red-600' : 'text-slate-900'}`}>
                      ${gastoTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    
                    {/* Texto auxiliar para que el Admin vea de cuánto es el límite */}
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Límite: ${limitePresupuesto.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>

                    {esNegativo && <p className="text-[9px] text-red-500 font-black uppercase mt-1 animate-pulse">⚠️ Exceso de gasto</p>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="xl:col-span-3 space-y-8">
            {plantelSeleccionado && (
              <div ref={detalleRef} className="bg-white rounded-[2.5rem] shadow-xl border border-blue-100 overflow-hidden">
                <div className="bg-blue-900 p-8 flex flex-col md:flex-row justify-between items-center text-white gap-6">
                  <div className="w-full md:w-auto">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">{plantelSeleccionado}</h2>
                    
                    {/* FILTROS DE ESTATUS */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button 
                        onClick={() => setFiltroEstatus("PENDIENTE")}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${filtroEstatus === "PENDIENTE" ? 'bg-amber-500 text-white shadow-lg' : 'bg-blue-800 text-blue-300 hover:bg-blue-700'}`}
                      >
                        <Clock size={12}/> PENDIENTES
                      </button>
                      <button 
                        onClick={() => setFiltroEstatus("AUTORIZADO")}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${filtroEstatus === "AUTORIZADO" ? 'bg-green-500 text-white shadow-lg' : 'bg-blue-800 text-blue-300 hover:bg-blue-700'}`}
                      >
                        <CheckCircle size={12}/> AUTORIZADOS
                      </button>
                      <button 
                        onClick={() => setFiltroEstatus("CERRADO")}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${filtroEstatus === "CERRADO" ? 'bg-slate-500 text-white shadow-lg' : 'bg-blue-800 text-blue-300 hover:bg-blue-700'}`}
                      >
                        <Package size={12}/> CERRADOS
                      </button>
                      <button 
                        onClick={() => setFiltroEstatus("TODOS")}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black transition-all ${filtroEstatus === "TODOS" ? 'bg-white text-blue-900 shadow-lg' : 'bg-blue-800 text-blue-300 hover:bg-blue-700'}`}
                      >
                        <Filter size={12}/> TODOS
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={autorizarMarcados}
                    disabled={seleccionados.length === 0 || cargandoAccion}
                    className={`font-black px-8 py-3 rounded-2xl shadow-xl transition-all uppercase text-xs ${seleccionados.length > 0 ? 'bg-green-500 hover:bg-green-400 text-white active:scale-95' : 'bg-slate-700 text-slate-400'}`}
                  >
                    {cargandoAccion ? "Procesando..." : `✓ Autorizar (${seleccionados.length})`}
                  </button>
                </div>

                <div className="p-8">
                  {pedidosAgrupados.length === 0 ? (
                    <div className="py-20 text-center text-slate-300 font-black uppercase italic tracking-[0.2em] text-sm">
                      No hay registros {filtroEstatus.toLowerCase()}s
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-blue-900 font-black text-[10px] uppercase border-b border-slate-100">
                            <th className="py-4 w-10 text-center">OK</th>
                            <th className="py-4">Artículo / Folio</th>
                            <th className="py-4 text-center">Cant.</th>
                            <th className="py-4 text-right">Estatus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pedidosAgrupados.map((p) => (
                            <tr key={p.id_solicitud} className={`border-b border-slate-50 transition-colors ${seleccionados.includes(p.id_solicitud) ? 'bg-blue-50/50' : ''}`}>
                              <td className="py-5 text-center">
                                {p.estatus === 'PENDIENTE' ? (
                                  <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 cursor-pointer"
                                    checked={seleccionados.includes(p.id_solicitud)}
                                    onChange={() => toggleSeleccion(p.id_solicitud)}
                                  />
                                ) : (
                                  <CheckCircle className={p.estatus === 'CERRADO' ? 'text-slate-300 mx-auto' : 'text-green-500 mx-auto'} size={18} />
                                )}
                              </td>
                              <td className="py-5">
                                <div className="flex flex-col">
                                  <span className="font-black text-slate-700 uppercase text-xs italic">{p.articulo_nombre}</span>
                                  <span className="text-[10px] font-bold text-slate-400 tracking-widest">FOLIO: #{p.id_solicitud}</span>
                                </div>
                              </td>
                              <td className="py-5 text-center font-black text-blue-600">x{p.cantidadReal}</td>
                              <td className="py-5 text-right font-black">
                                <span className={`text-[9px] px-3 py-1 rounded-full uppercase border ${
                                  p.estatus === 'AUTORIZADO' ? 'bg-green-100 text-green-700 border-green-200' : 
                                  p.estatus === 'CERRADO' ? 'bg-slate-100 text-slate-500 border-slate-200' : 
                                  'bg-amber-100 text-amber-700 border-amber-200 animate-pulse'
                                }`}>
                                  {p.estatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8">
              <h2 className="text-xl font-black text-slate-800 uppercase italic mb-8">Catálogo de Suministros Global</h2>
              <Articulos isAdmin={true} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}