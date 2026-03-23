import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/layout/navbar.jsx";
import Footer from "./components/layout/footer.jsx";
import Home from "./pages/Home.jsx";
import SignIn from "./pages/SignIn.jsx";
import SignUp from "./pages/SignUp.jsx";
import TestApiPanel from "./components/TestApiPanel.jsx";
import CreateTicket from "./pages/CreateTicket.jsx";
import MyTickets from "./pages/MyTickets.jsx";

function AppContent() {
  const location = useLocation();
  const hideNavAndFooter = location.pathname === '/signin' || location.pathname === '/signup';

  return (
    <div className="min-h-screen flex flex-col">
      {!hideNavAndFooter && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/tickets/create" element={<CreateTicket />} />
        <Route path="/my-tickets" element={<MyTickets />} />
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