import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginForm from "./components/LoginForm";
import DashboardPlantelCuba from "./components/dashboard/DashboardPlantelCuba";
import DashboardAdmin from "./components/dashboard/DashboardAdmin";
import DashboardReportes from "./components/dashboard/DashboardReportes";
import DashboardPlantelVeracruz from "./components/dashboard/DashboardPlantelVeracruz";
import DashboardPlantelCentro from "./components/dashboard/DashboardPlantelCentro";
import DashboardPlantelCentenario from "./components/dashboard/DashboardPlantelCentenario";
import DashboardPlantelCorporativo from "./components/dashboard/DashboardPlantelCorpoativo";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/dashboard-cuba" element={<DashboardPlantelCuba />} />
        <Route path="/dashboard-veracruz" element={<DashboardPlantelVeracruz />} />
        <Route path="/dashboard-centro" element={<DashboardPlantelCentro />} />
        <Route path="/dashboard-corporativo" element={<DashboardPlantelCorporativo />} />
        <Route path="/dashboard-centenario" element={<DashboardPlantelCentenario />} />
        <Route path="/dashboardAdmin" element={<DashboardAdmin />} />
        <Route path="/reportes" element={<DashboardReportes />} />
      </Routes>
    </Router>
  );
}

export default App;