import { Route, Routes } from "react-router";
import PublicLayout from "./layouts/PublicLayout";
import SlaPerformance from "./pages/SlaPerformance";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<SlaPerformance />} />
      </Route>
    </Routes>
  );
}
