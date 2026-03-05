import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/layout/navbar.jsx";
import Footer from "./components/layout/footer.jsx";
import Home from "./pages/Home.jsx";
import SignIn from "./pages/SignIn.jsx";
import TestApiPanel from "./components/TestApiPanel.jsx";

function AppContent() {
  const location = useLocation();
  const hideNavAndFooter = location.pathname === '/signin';

  return (
    <div className="min-h-screen flex flex-col">
      {!hideNavAndFooter && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/test" element={
          <main className="grow">
            <TestApiPanel />
          </main>
        } />
      </Routes>
      {!hideNavAndFooter && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}