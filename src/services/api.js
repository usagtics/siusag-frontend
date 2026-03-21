import axios from "axios";

const API_BASE = "http://localhost:3001";

// Función para login
export const loginUsuario = async (nombre, password) => {
  try {
    const res = await axios.post(`${API_BASE}/login`, { nombre, password });
    return res.data;
  } catch (err) {
    console.error("Error en login:", err);
    throw err;
  }
};

// Función para obtener artículos
export const getArticulos = async () => {
  try {
    const res = await axios.get(`${API_BASE}/articulos`);
    return res.data;
  } catch (err) {
    console.error("Error al obtener artículos:", err);
    throw err;
  }
};

// --- FUNCIÓN DESHABILITADA PARA EVITAR DOBLE DESCUENTO ---
// Esta función restaba stock inmediatamente sin autorización. 
// Se recomienda no usarla para el flujo de pedidos de planteles.
/*
export const consumirArticulo = async (id) => {
  try {
    const res = await axios.put(`${API_BASE}/articulos/consumir/${id}`);
    return res.data;
  } catch (err) {
    console.error("Error al consumir artículo:", err);
    throw err;
  }
};
*/

export const createArticulo = async (articulo) => {
  try {
    const res = await axios.post(`${API_BASE}/articulos`, articulo);
    return res.data;
  } catch (err) {
    console.error("Error al crear artículo:", err);
    throw err;
  }
};

export const updateArticulo = async (id, articulo) => {
  try {
    const res = await axios.put(`${API_BASE}/articulos/${id}`, articulo);
    return res.data;
  } catch (err) {
    console.error("Error al actualizar artículo:", err);
    throw err;
  }
};

export const deleteArticulo = async (id) => {
  try {
    const res = await axios.delete(`${API_BASE}/articulos/${id}`);  
    return res.data;
  } catch (err) {
    console.error("Error al eliminar artículo:", err);
    throw err;
  }
};

export const getReporteGastos = async () => {
  try {
    const res = await axios.get(`${API_BASE}/pedidos/totales`); 
    return res.data;
  } catch (err) {
    console.error("Error al obtener reporte de gastos:", err);
    throw err;
  }
};

// 1. REGISTRO DE PEDIDO (Solo crea el folio PENDIENTE, no descuenta stock)
export const consumirItemDinamico = async (datos) => {
  try {
    const res = await axios.post(`${API_BASE}/pedidos/consumir`, datos);
    return res.data;
  } catch (err) {
    console.error("Error al registrar solicitud:", err);
    throw err;
  }
};

export const getPedidos = async () => {
  try {
    const res = await axios.get(`${API_BASE}/pedidos`);
    return res.data;
  } catch (err) {
    console.error("Error al obtener la lista de pedidos:", err);
    throw err;
  }
};

// 2. AUTORIZACIÓN (Aquí es donde realmente se descuenta Stock y Capital)
export const autorizarSolicitud = async (id_solicitud) => {
  try {
    const res = await axios.put(`${API_BASE}/pedidos/autorizar/${id_solicitud}`);
    return res.data;
  } catch (err) {
    console.error("Error al autorizar la solicitud:", err);
    throw err;
  }
};

// 3. MÉTRICAS DASHBOARD (Consulta el saldo real de SQL)
export const getMetricasPorPlantel = async (nombre) => {
  try {
    const res = await axios.get(`${API_BASE}/pedidos/metricas/${encodeURIComponent(nombre)}`);
    return res.data;
  } catch (err) {
    console.error("Error al obtener métricas del plantel:", err);
    throw err;
  }
};

// --- OTROS SERVICIOS DE REPORTES ---

export const getMetricasReportes = async () => {
  try {
    const res = await axios.get(`${API_BASE}/api/reportes/metricas`);
    return res.data;
  } catch (err) {
    console.error("Error al obtener métricas del reporte:", err);
    throw err;
  }
};

export const getDetallePlantel = async (nombre) => {
  try {
    const res = await axios.get(`${API_BASE}/api/reportes/detalle/${encodeURIComponent(nombre)}`);
    return res.data;
  } catch (err) {
    console.error("Error al obtener detalle:", err);
    throw err;
  }
};

export const getCategorias = async () => {
  try {
    const res = await axios.get(`${API_BASE}/categorias/`); 
    return res.data; 
  } catch (err) {
    console.error("Error al obtener categorías:", err);
    throw err;
  }
};

export const getUnidades = async () => {
  try {
    const res = await axios.get(`${API_BASE}/unidades`);
    return res.data;
  } catch (err) {
    console.error("Error al obtener unidades:", err);
    throw err;
  }
};

export const guardarCorteOficial = async (periodo, creadoPor) => {
  try {
    const res = await axios.post(`${API_BASE}/api/reportes/guardar-corte`, { 
      periodo, 
      creado_por: creadoPor 
    });
    return res.data;
  } catch (err) {
    console.error("Error al guardar corte:", err);
    throw err;
  }
};

export const getHistorialReportes = async (inicio = "", fin = "") => {
  try {
    const res = await axios.get(`${API_BASE}/api/reportes/historial`, {
      params: { 
        inicio: inicio || undefined, 
        fin: fin || undefined 
      }
    });
    return res.data;
  } catch (err) {
    console.error("Error al obtener historial de cortes:", err);
    throw err;
  }
};
// SERVICIO PARA CORTE MENSUAL Y REINICIO DE PRESUPUESTOS
export const guardarCorte = async (datos) => {
  try {
    const res = await axios.post(`${API_BASE}/api/reportes/guardar-corte`, datos);
    return res.data;
  } catch (err) {
    console.error("Error al ejecutar el corte mensual:", err);
    throw err;
  }
};