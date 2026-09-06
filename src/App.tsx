import { HashRouter, Routes, Route } from "react-router-dom";

import { ContentProvider } from "./hooks/useContent";
import Home from "./pages/Home";
import AdminApp from "./pages/admin/AdminApp";

const App = () => {
  return (
    <ContentProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<AdminApp />} />
        </Routes>
      </HashRouter>
    </ContentProvider>
  );
};

export default App;
