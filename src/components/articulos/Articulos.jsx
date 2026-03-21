import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { 
  Search, Package, AlertTriangle, Trash2, Edit3, 
  RefreshCw, Plus, Save, X, ChevronLeft, ChevronRight, Filter 
} from "lucide-react";
import { 
  getArticulos, createArticulo, updateArticulo, 
  deleteArticulo, consumirItemDinamico, getCategorias, getUnidades 
} from "../../services/api";

export default function Articulos({ isAdmin = false, onConsumo, saldoDisponible = Infinity }) {
  const [articulos, setArticulos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; 

  const [cantidades, setCantidades] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  
  const [form, setForm] = useState({ 
    id: null, nombre: "", categoria_id: "", unidad_id: "", 
    presentacion: "", precio_unitario: "", stock: "" 
  });
  const [editing, setEditing] = useState(false);

  const usuario = JSON.parse(localStorage.getItem("usuario"));

  useEffect(() => { 
    fetchArticulos(); 
    fetchCategorias();
    fetchUnidades();
  }, []);

  const fetchArticulos = async () => {
    const res = await getArticulos();
    if (res?.ok) setArticulos(res.articulos || []);
  };

  const fetchCategorias = async () => {
    const res = await getCategorias();
    if (res?.ok) setCategorias(res.categorias || []);
  };

  const fetchUnidades = async () => {
    const res = await getUnidades();
    if (res?.ok) setUnidades(res.unidades || []);
  };

  const handleCantChange = (id, value) => {
    const val = parseInt(value);
    setCantidades(prev => ({ ...prev, [id]: val > 0 ? val : 1 }));
  };

  const filteredArticulos = articulos.filter(art => {
    const matchNombre = art.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = filterCategoria === "" || art.categoria_id?.toString() === filterCategoria;
    return matchNombre && matchCategoria;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredArticulos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredArticulos.length / itemsPerPage);

  const paginate = (direction) => {
    if (direction === 'next' && currentPage < totalPages) setCurrentPage(currentPage + 1);
    if (direction === 'prev' && currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { 
      ...form, 
      nombre: form.nombre.toUpperCase(),
      presentacion: form.presentacion.toUpperCase(),
      categoria_id: parseInt(form.categoria_id),
      unidad_id: parseInt(form.unidad_id),
      precio_unitario: parseFloat(form.precio_unitario),
      stock: parseInt(form.stock)
    };
    try {
      const res = editing ? await updateArticulo(form.id, data) : await createArticulo(data);
      if (res?.ok) {
        Swal.fire("¡Éxito!", res.mensaje, "success");
        cancelarEdicion();
        fetchArticulos();
      }
    } catch (err) { Swal.fire("Error", "No se pudo guardar", "error"); }
  };

  const cancelarEdicion = () => {
    setForm({ id: null, nombre: "", categoria_id: "", unidad_id: "", presentacion: "", precio_unitario: "", stock: "" });
    setEditing(false);
  };

  const manejarConsumo = async (art) => {
    if (loadingId !== null) return; 

    const cantElegida = cantidades[art.id] || 1;
    const totalSimulado = art.precio_unitario * cantElegida;

    // 1. EL STOCK SIGUE SIENDO OBLIGATORIO (No podemos dar lo que no existe físicamente)
    if (art.stock < cantElegida) return Swal.fire("Error", "No hay stock suficiente", "error");

    // 2. LÓGICA DE SOBREGIRO (AQUÍ ESTÁ EL CAMBIO CLAVE)
    if (totalSimulado > saldoDisponible) {
      const confirmacion = await Swal.fire({
        title: '¡Saldo Insuficiente!',
        text: `Esta solicitud excede tu capital actual por $${(totalSimulado - saldoDisponible).toFixed(2)}. El monto se descontará de tu presupuesto del próximo mes. ¿Deseas continuar?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Sí, solicitar sobregiro',
        cancelButtonText: 'Cancelar'
      });

      // Si el usuario se arrepiente, cancelamos
      if (!confirmacion.isConfirmed) return;
    }

    setLoadingId(art.id);
    try {
      const res = await consumirItemDinamico({
        usuario_nombre: usuario.nombre,
        articulo_nombre: art.nombre,
        precio_unitario: art.precio_unitario,
        cantidad: cantElegida,
        plantel_id: usuario.plantel_id,
        usuario_id: usuario.id
      });

      if (res.ok) {
        if (onConsumo) onConsumo();
        await fetchArticulos();
        setCantidades(prev => ({ ...prev, [art.id]: 1 }));
        Swal.fire({ 
          icon: 'success', 
          title: 'Solicitud Creada', 
          text: totalSimulado > saldoDisponible ? 'Se ha registrado el sobregiro correctamente.' : '',
          toast: true, 
          position: 'top-end', 
          timer: 3000 
        });
      }
    } catch (err) {
      Swal.fire("Error", "Error de red", "error");
    } finally {
      setLoadingId(null); 
    }
  };

  // Encontramos TODOS los productos que tengan menos de 5 en stock
  const productosCriticos = articulos.filter(art => (art.stock || 0) < 5);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 animate-in fade-in duration-500">
      
      {/* TARJETAS DE MÉTRICAS */}
      <div className={`grid grid-cols-1 gap-6 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <div className="bg-blue-600 p-6 rounded-2xl shadow-xl text-white flex items-center gap-4">
          <div className="bg-blue-400/30 p-3 rounded-xl"><Package size={32} /></div>
          <div><p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">Total Productos</p><h3 className="text-3xl font-black italic">{articulos.length}</h3></div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-100 flex items-center gap-4">
          <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl"><RefreshCw size={32} /></div>
          <div><p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Existencia Global</p><h3 className="text-3xl font-black text-slate-700 italic">{articulos.reduce((acc, art) => acc + (art.stock || 0), 0)}</h3></div>
        </div>
        
        {/* TARJETA MODIFICADA: Ahora muestra una lista de los urgentes, SOLO visible para ADMIN */}
        {isAdmin && (
          <div className={`p-6 rounded-2xl shadow-md border flex flex-col justify-start overflow-hidden h-32
            ${productosCriticos.length > 0 ? 'bg-red-50 border-red-500 border-l-8' : 'bg-white border-slate-100 border-l-8 border-emerald-500'}`}>
            
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className={productosCriticos.length > 0 ? "text-red-500" : "text-emerald-500"} size={20}/>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                {productosCriticos.length > 0 ? 'Urgente reponer:' : 'Stock Saludable'}
              </p>
            </div>
            
            <div className="overflow-y-auto pr-2 scrollbar-thin">
              {productosCriticos.length > 0 ? (
                <div className="space-y-1">
                  {productosCriticos.map(prod => (
                    <h3 key={prod.id} className="text-xs font-black text-slate-800 uppercase italic flex justify-between">
                      <span className="truncate">{prod.nombre}</span>
                      <span className="text-red-600 ml-2">({prod.stock})</span>
                    </h3>
                  ))}
                </div>
              ) : (
                <h3 className="text-sm font-black text-slate-400 mt-1 uppercase italic">Nada por ahora</h3>
              )}
            </div>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 animate-in zoom-in duration-500">
          <h2 className="text-2xl font-black text-slate-800 uppercase italic mb-6 flex items-center gap-2">
            <Plus className="text-blue-600" /> {editing ? 'Editar Suministro' : 'Nuevo Registro USAG'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input type="text" placeholder="NOMBRE" className="p-3 bg-slate-50 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
            <select className="p-3 bg-slate-50 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500" value={form.categoria_id} onChange={e => setForm({...form, categoria_id: e.target.value})} required>
              <option value="">CATEGORÍA</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <select className="p-3 bg-slate-50 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500" value={form.unidad_id} onChange={e => setForm({...form, unidad_id: e.target.value})} required>
              <option value="">UNIDAD</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
            <input type="text" placeholder="PRESENTACIÓN" className="p-3 bg-slate-50 rounded-xl text-xs font-bold uppercase outline-none" value={form.presentacion} onChange={e => setForm({...form, presentacion: e.target.value})} />
            <input type="number" step="0.01" placeholder="COSTO" className="p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none" value={form.precio_unitario} onChange={e => setForm({...form, precio_unitario: e.target.value})} required />
            <input type="number" placeholder="STOCK" className="p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required />
            <div className="flex gap-2 md:col-span-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white font-black text-[10px] uppercase p-3 rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2"><Save size={16}/> {editing ? 'Actualizar' : 'Guardar'}</button>
              {editing && <button type="button" onClick={cancelarEdicion} className="bg-slate-200 p-3 rounded-xl"><X size={16}/></button>}
            </div>
          </form>
        </div>
      )}

      {/* FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 text-slate-300" size={18} />
          <input type="text" placeholder="BUSCAR SUMINISTRO..." className="w-full bg-slate-50 border-none py-3.5 pl-12 pr-4 rounded-xl outline-none text-[11px] font-black uppercase" value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} />
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-4 rounded-xl">
          <Filter size={16} className="text-slate-400" />
          <select className="bg-transparent border-none text-[11px] font-black uppercase outline-none py-3" value={filterCategoria} onChange={(e) => {setFilterCategoria(e.target.value); setCurrentPage(1);}}>
            <option value="">TODAS LAS CATEGORÍAS</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-blue-900 text-[10px] font-black uppercase tracking-widest">
                <th className="p-6">Suministro / Presentación</th>
                <th className="p-6 text-center">Categoría</th>
                <th className="p-6 text-center">Stock</th>
                <th className="p-6 text-right italic">Costo</th>
                {!isAdmin && <th className="p-6 text-center">Cantidad</th>}
                <th className="p-6 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentItems.map((art) => (
                <tr key={art.id} className="hover:bg-blue-50/30 transition-all group">
                  <td className="p-6">
                    <div className="font-black text-slate-700 uppercase text-xs italic group-hover:text-blue-600 transition-colors">{art.nombre}</div>
                    <div className="text-[9px] text-blue-500 font-bold uppercase mt-1">{art.presentacion || 'ESTÁNDAR'}</div>
                  </td>
                  <td className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">
                    {art.categoria_nombre || "General"}
                  </td>
                  <td className="p-6 text-center">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border ${art.stock < 5 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-green-50 text-green-700 border-green-100'}`}>{art.stock}</span>
                  </td>
                  <td className="p-6 text-right font-black text-slate-900 italic">${parseFloat(art.precio_unitario).toFixed(2)}</td>
                  
                  {!isAdmin && (
                    <td className="p-6 text-center">
                      <input 
                        type="number" 
                        min="1" 
                        max={art.stock}
                        className="w-16 p-2 bg-slate-50 rounded-lg text-center font-black text-xs outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                        value={cantidades[art.id] || 1}
                        onChange={(e) => handleCantChange(art.id, e.target.value)}
                      />
                    </td>
                  )}

                  <td className="p-6 text-center">
                    {isAdmin ? (
                      <div className="flex justify-center gap-2">
                        <button onClick={() => {setForm(art); setEditing(true); window.scrollTo({top:0, behavior:'smooth'});}} className="p-2 text-blue-500 hover:bg-blue-100 rounded-lg"><Edit3 size={18}/></button>
                        <button onClick={() => deleteArticulo(art.id).then(fetchArticulos)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                      </div>
                    ) : (
                      <button 
                        disabled={loadingId !== null || art.stock <= 0} 
                        onClick={() => manejarConsumo(art)} 
                        className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 
                          ${loadingId !== null ? 'bg-slate-300 cursor-not-allowed text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                      >
                        {loadingId === art.id ? <RefreshCw size={14} className="animate-spin mx-auto" /> : 'Solicitar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-slate-50/50 flex items-center justify-between border-t border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">Página {currentPage} de {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => paginate('prev')} disabled={currentPage === 1} className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm disabled:opacity-30 hover:bg-blue-50 transition-colors"><ChevronLeft size={16}/></button>
            <button onClick={() => paginate('next')} disabled={currentPage === totalPages} className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm disabled:opacity-30 hover:bg-blue-50 transition-colors"><ChevronRight size={16}/></button>
          </div>
        </div>
      </div>
    </div>
  );
}