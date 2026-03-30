import React, { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Search, FileDown, Eye, TrendingUp, Building2, Hash, 
  AlertCircle, ChevronLeft, ChevronRight, X, Save, History, CalendarCheck, Filter, RotateCcw, Printer
} from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import * as XLSX from 'xlsx'; // <-- LA NUEVA LIBRERÍA DE EXCEL
import Navbar from "../navbar/Navbar";
import { 
  getMetricasReportes, 
  getDetallePlantel, 
  getArticulos,
  guardarCorteOficial,
  getHistorialReportes 
} from "../../services/api";
import logoUsag from "../../assets/logo.png"; 
import Swal from "sweetalert2";

const COLORS = ['#1e293b', '#3b82f6', '#6366f1', '#94a3b8', '#cbd5e1'];

export default function DashboardReportes() {
  const [reporte, setReporte] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [articulos, setArticulos] = useState([]);
  
  // ESTADOS PARA FILTROS
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [detallePlantel, setDetallePlantel] = useState([]);
  const [plantelSeleccionado, setPlantelSeleccionado] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 5;

  const cargarDatos = useCallback(async (inicio = "", fin = "") => {
    try {
      const [resMetricas, resArticulos, resHistorial] = await Promise.all([
        getMetricasReportes(),
        getArticulos(),
        getHistorialReportes(inicio, fin) 
      ]);
      if (resMetricas.ok) setReporte(resMetricas.reporte);
      if (resArticulos.ok) setArticulos(resArticulos.articulos);
      if (resHistorial.ok) setHistorial(resHistorial.historial);
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const manejarFiltro = () => {
    if (fechaInicio && fechaFin) {
      cargarDatos(fechaInicio, fechaFin);
    } else {
      Swal.fire("Atención", "Selecciona ambas fechas para filtrar", "info");
    }
  };

  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    cargarDatos();
  };

  const handleCerrarMes = async () => {
    const { value: periodo } = await Swal.fire({
      title: '¿Generar Cierre Mensual?',
      text: "Esto guardará los totales actuales físicamente en la tabla de históricos.",
      input: 'text',
      inputPlaceholder: 'Ejem: FEBRERO 2026',
      showCancelButton: true,
      confirmButtonText: 'Guardar Reporte',
      confirmButtonColor: '#3b82f6',
      inputValidator: (value) => {
        if (!value) return '¡Necesitas escribir el nombre del periodo!'
      }
    });

    if (periodo) {
      try {
        const usuario = JSON.parse(localStorage.getItem("usuario"));
        const res = await guardarCorteOficial(periodo.toUpperCase(), usuario?.nombre);
        if (res.ok) {
          Swal.fire('¡Éxito!', res.mensaje, 'success');
          cargarDatos(fechaInicio, fechaFin); 
        }
      } catch (err) {
        Swal.fire('Error', 'No se pudo guardar el reporte físico', 'error');
      }
    }
  };

  const productoMasBajo = [...articulos].sort((a, b) => (a.stock || 0) - (b.stock || 0))[0];
  const reporteFiltrado = reporte.filter(item => item.usuario_nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const totalPaginas = Math.ceil(reporteFiltrado.length / itemsPorPagina);
  const itemsPaginados = reporteFiltrado.slice((paginaActual - 1) * itemsPorPagina, paginaActual * itemsPorPagina);

  const inversionTotal = reporte.reduce((acc, curr) => acc + parseFloat(curr.gasto_total || 0), 0);
  const totalFolios = reporte.reduce((acc, curr) => acc + parseInt(curr.total_folios || 0), 0);

  const verDetalle = async (nombre) => {
    const data = await getDetallePlantel(nombre);
    if (data.ok) { setDetallePlantel(data.detalle); setPlantelSeleccionado(nombre); setModalAbierto(true); }
  };

  // --- FUNCIÓN ORIGINAL: PDF INDIVIDUAL ---
  const exportarPDF = async (plantel) => {
    try {
      const data = await getDetallePlantel(plantel);
      if (!data.ok) return;
      const doc = new jsPDF();
      const img = new Image();
      img.src = logoUsag;
      img.onload = () => {
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 45, 'F');
        doc.addImage(img, 'PNG', 15, 10, 45, 25); 
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14); doc.text("UNIVERSIDAD SAN ANDRÉS DE GUANAJUATO", 125, 25, { align: "center" });
        autoTable(doc, {
          startY: 60,
          head: [['FOLIO', 'PRODUCTO', 'COSTO']], 
          body: data.detalle.map(art => [`#${art.id_solicitud}`, art.articulo_nombre.toUpperCase(), `$${parseFloat(art.total_pedido).toFixed(2)}`]),
          headStyles: { fill: [15, 23, 42] }
        });
        doc.save(`Reporte_${plantel}.pdf`);
      };
    } catch (err) { console.error(err); }
  };

  // --- NUEVA FUNCIÓN: EXPORTAR A EXCEL ---
  const exportarExcel = () => {
    if (reporte.length === 0) return Swal.fire('Sin datos', 'No hay registros para exportar', 'info');

    const datosExcel = reporte.map(item => ({
      'Unidad Académica': item.usuario_nombre,
      'Total de Folios': item.total_folios,
      'Artículos Consumidos': item.total_articulos,
      'Gasto Acumulado ($)': parseFloat(item.gasto_total).toFixed(2),
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Consumo_USAG");
    XLSX.writeFile(workbook, `Reporte_Consumo_USAG_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  };

  // --- NUEVA FUNCIÓN: IMPRIMIR CIERRES HISTÓRICOS ---
  const exportarHistorialPDF = () => {
    if (historial.length === 0) return Swal.fire('Sin datos', 'No hay cierres para imprimir', 'info');

    const doc = new jsPDF();
    const img = new Image();
    img.src = logoUsag;

    img.onload = () => {
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, 210, 40, 'F');
      doc.addImage(img, 'PNG', 15, 8, 35, 20); 
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("UNIVERSIDAD SAN ANDRÉS DE GUANAJUATO", 125, 20, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("REPORTE HISTÓRICO DE CIERRES MENSUALES", 125, 28, { align: "center" });

      const tableData = historial.map(h => [
        h.mes_reportado,
        h.usuario_nombre,
        `$${parseFloat(h.gasto_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        new Date(h.fecha_cierre).toLocaleDateString(),
        h.creado_por
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['Mes Reportado', 'Unidad Académica', 'Inversión', 'Fecha de Cierre', 'Autorizó']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
        styles: { fontSize: 9, halign: 'center' }
      });

      doc.save(`Historico_Cierres_USAG.pdf`);
    };
    
    img.onerror = () => {
      console.warn("No se pudo cargar el logo, generando PDF sin imagen.");
      doc.setFontSize(16);
      doc.text("UNIVERSIDAD SAN ANDRÉS - HISTÓRICO", 105, 20, { align: "center" });
      const tableData = historial.map(h => [ h.mes_reportado, h.usuario_nombre, `$${parseFloat(h.gasto_total).toFixed(2)}`, new Date(h.fecha_cierre).toLocaleDateString(), h.creado_por ]);
      autoTable(doc, { startY: 30, head: [['Mes', 'Plantel', 'Gasto', 'Fecha', 'Autorizó']], body: tableData, theme: 'grid' });
      doc.save(`Historico_Cierres_USAG.pdf`);
    };
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white text-slate-400 animate-pulse uppercase tracking-widest text-xs">Analizando Datos USAG...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <Navbar />
      
      <div className="bg-slate-900 pt-32 pb-24 px-6 rounded-b-[3rem] shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Análisis Presupuestal</h1>
            <div className="flex gap-4 mt-3">
               <button onClick={handleCerrarMes} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-500 transition-all shadow-lg">
                 <Save size={16}/> GUARDAR CORTE MENSUAL
               </button>
            </div>
          </div>
          <div className="w-full md:w-96 relative group">
            <Search className="absolute left-4 top-4 text-slate-500" size={20} />
            <input type="text" placeholder="BUSCAR PLANTEL..." className="w-full bg-slate-800/50 border-2 border-slate-700 text-white p-4 pl-12 rounded-2xl focus:border-blue-500 outline-none text-sm font-bold uppercase" onChange={(e) => {setBusqueda(e.target.value); setPaginaActual(1);}} />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto -mt-12 px-6 space-y-12">
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 flex items-center gap-5">
             <div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><TrendingUp /></div>
             <div>
               <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Inversión Total</span>
               <h2 className="text-2xl font-black text-slate-900 mt-1">${inversionTotal.toLocaleString('en-US')}</h2>
             </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 flex items-center gap-5">
             <div className="bg-slate-100 p-4 rounded-2xl text-slate-700"><Hash /></div>
             <div>
               <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Folios Autorizados</span>
               <h2 className="text-2xl font-black text-slate-900 mt-1">{totalFolios}</h2>
             </div>
          </div>
          <div className={`p-6 rounded-[2rem] shadow-xl border flex items-center gap-5 transition-all ${productoMasBajo?.stock < 5 ? 'bg-red-50 border-red-200 ring-4 ring-red-500/10' : 'bg-white border-slate-100'}`}>
             <div className={`p-4 rounded-2xl ${productoMasBajo?.stock < 5 ? 'bg-red-500 text-white animate-bounce' : 'bg-green-100 text-green-600'}`}>
                <AlertCircle />
             </div>
             <div className="overflow-hidden">
               <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Stock Crítico:</span>
               <h2 className="text-xs font-black text-slate-800 mt-1 uppercase truncate">
                 {productoMasBajo ? `${productoMasBajo.nombre} (${productoMasBajo.stock})` : 'Cargando...'}
               </h2>
             </div>
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-50">
            <h3 className="font-black text-slate-800 mb-8 text-xs uppercase tracking-[0.2em]">📊 Distribución de Gastos</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={reporte} dataKey="gasto_total" nameKey="usuario_nombre" innerRadius={60} outerRadius={90} paddingAngle={8}>
                    <Tooltip />
                    {reporte.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-50">
            <h3 className="font-black text-slate-800 mb-8 text-xs uppercase tracking-[0.2em]">📈 Actividad por Plantel</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={reporte}>
                  <XAxis dataKey="usuario_nombre" hide />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="total_folios" fill="#3b82f6" radius={[10, 10, 10, 10]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* TABLA PRINCIPAL */}
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
             
             {/* AQUÍ VA EL BOTÓN DE EXCEL */}
             <div className="px-10 py-8 border-b flex flex-col md:flex-row justify-between items-center gap-4">
               <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Registros de Consumo Actual</h3>
               <button onClick={exportarExcel} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-400 transition-all shadow-lg active:scale-95">
                 <FileDown size={14} /> EXPORTAR A EXCEL
               </button>
             </div>
             
             <div className="overflow-x-auto px-4">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className="px-8 py-6">Unidad</th>
                      <th className="px-8 py-6 text-center">Folios</th>
                      <th className="px-8 py-6 text-right">Gasto</th>
                      <th className="px-8 py-6 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {itemsPaginados.map(item => (
                      <tr key={item.usuario_nombre} className="group hover:bg-blue-50/40 transition-all">
                         <td className="px-8 py-6 flex items-center gap-3">
                            <Building2 size={18} className="text-slate-300 group-hover:text-blue-500"/>
                            <span className="font-black text-slate-700 uppercase text-sm">{item.usuario_nombre}</span>
                         </td>
                         <td className="px-8 py-6 text-center font-bold text-slate-400">#{item.total_folios}</td>
                         <td className="px-8 py-6 text-right font-black text-slate-900 text-lg">${parseFloat(item.gasto_total).toLocaleString()}</td>
                         <td className="px-8 py-6 flex justify-center gap-3">
                            <button onClick={() => verDetalle(item.usuario_nombre)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Eye size={18}/></button>
                            <button onClick={() => exportarPDF(item.usuario_nombre)} className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-xl hover:bg-blue-500 transition-all"><Printer size={18}/></button>
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             <div className="p-8 bg-slate-50 flex items-center justify-between border-t">
                <span className="text-[10px] font-black text-slate-400 uppercase">Página {paginaActual} de {totalPaginas}</span>
                <div className="flex gap-2">
                   <button disabled={paginaActual === 1} onClick={() => setPaginaActual(p => p - 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30 hover:bg-blue-600 hover:text-white transition-all"><ChevronLeft size={18}/></button>
                   <button disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual(p => p + 1)} className="p-2 border rounded-lg bg-white disabled:opacity-30 hover:bg-blue-600 hover:text-white transition-all"><ChevronRight size={18}/></button>
                </div>
             </div>
        </div>

        {/* SECCIÓN DE HISTORIAL */}
        <div className="space-y-4 pb-10">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 px-4">
            
            {/* AQUÍ VA EL BOTÓN DE IMPRIMIR HISTÓRICO PDF */}
            <div className="flex items-center justify-between w-full md:w-auto">
              <div className="flex items-center gap-2 text-slate-500 font-black uppercase text-xs tracking-widest">
                  <History size={18} className="text-blue-500"/>
                  <h2>Historial de Cierres Oficiales (Físicos)</h2>
              </div>
              <button onClick={exportarHistorialPDF} className="ml-4 flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-slate-800 transition-all shadow-lg active:scale-95">
                <Printer size={14} /> IMPRIMIR PDF
              </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 bg-white p-2 px-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 border-r pr-3 border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Desde:</span>
                    <input type="date" value={fechaInicio} onChange={(e)=>setFechaInicio(e.target.value)} className="text-xs font-bold text-slate-600 outline-none" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Hasta:</span>
                    <input type="date" value={fechaFin} onChange={(e)=>setFechaFin(e.target.value)} className="text-xs font-bold text-slate-600 outline-none" />
                </div>
                <button onClick={manejarFiltro} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Filter size={14}/></button>
                <button onClick={limpiarFiltros} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-200 transition-all"><RotateCcw size={14}/></button>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-4">Mes Reportado</th>
                  <th className="px-8 py-4">Unidad Académica</th>
                  <th className="px-8 py-4 text-right">Inversión Guardada</th>
                  <th className="px-8 py-4 text-center">Fecha de Cierre</th>
                  <th className="px-8 py-4">Autorizado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historial.length > 0 ? (
                  historial.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-5">
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">{h.mes_reportado}</span>
                      </td>
                      <td className="px-8 py-5 font-bold text-slate-700 uppercase text-xs">{h.usuario_nombre}</td>
                      <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">
                        ${Number(h.gasto_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-8 py-5 text-center text-slate-400 text-[11px] font-medium italic">{new Date(h.fecha_cierre).toLocaleString()}</td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-600 uppercase flex items-center gap-2">
                         <CalendarCheck size={14} className="text-emerald-500"/> {h.creado_por}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" className="p-10 text-center text-slate-300 italic uppercase text-xs">No hay cierres guardados físicamente</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL DETALLE */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-10 border-b flex justify-between items-center bg-slate-50/50">
               <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{plantelSeleccionado}</h3>
                  <p className="text-blue-500 text-[10px] font-black uppercase mt-1 tracking-widest">Auditoría de Insumos</p>
               </div>
               <button onClick={() => setModalAbierto(false)} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl text-slate-400 hover:text-red-500 hover:rotate-90 transition-all shadow-sm"><X size={24}/></button>
            </div>
            <div className="p-10 max-h-[60vh] overflow-y-auto">
               <table className="w-full">
                  <tbody>
                    {detallePlantel.map((art, idx) => (
                      <tr key={idx} className="border-b border-slate-50 group hover:bg-slate-50 transition-colors">
                        <td className="py-4 text-blue-600 font-bold italic">#{art.id_solicitud}</td>
                        <td className="py-4 font-black text-slate-700 uppercase text-xs">{art.articulo_nombre}</td>
                        <td className="py-4 text-right font-black text-slate-900">${parseFloat(art.total_pedido).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
            <div className="p-6 bg-slate-900 text-center uppercase tracking-[0.5em] text-[8px] text-slate-500 font-black italic">Fin de Auditoría Operativa 2026</div>
          </div>
        </div>
      )}
    </div>
  );
}