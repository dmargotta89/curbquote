import { Navigate, Route, Routes } from "react-router-dom";
import LeadsPage from "./LeadsPage.jsx";
import QuoteFlow from "./QuoteFlow.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<QuoteFlow />} />
      <Route path="/leads" element={<LeadsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
