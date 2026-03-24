import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/layout/navbar.jsx";
import Footer from "./components/layout/footer.jsx";
import Home from "./pages/Home.jsx";
import SignIn from "./pages/SignIn.jsx";
import OAuthCallback from "./pages/OAuthCallback.jsx";
import TechnicianDashboard from "./pages/TechnicianDashboard.jsx";
import CreateTicket from "./pages/CreateTicket.jsx";
import MyTickets from "./pages/MyTickets.jsx";
import TicketDetails from "./pages/TicketDetails.jsx";
import AdminTicketDashboard from "./pages/adminticketdashboard.jsx";
import AdminTechnicianDashboard from "./pages/AdminTechnicianDashboard.jsx";
import ManageAccount from "./pages/ManageAccount.jsx";

function AppContent() {
  const location = useLocation();
  const hideNavAndFooter =
    location.pathname === "/signin" ||
    location.pathname === "/oauth/callback" ||
    location.pathname === "/adminticket" ||
    location.pathname.startsWith("/admin") ||
    location.pathname === "/technician" ||
    location.pathname === "/account";

  return (
    <div className="min-h-screen flex flex-col">
      {!hideNavAndFooter && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/technician" element={<TechnicianDashboard />} />
        <Route path="/tickets/create" element={<CreateTicket />} />
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/tickets/:id" element={<TicketDetails />} />
        <Route path="/admin" element={<AdminTechnicianDashboard />} />
        <Route path="/adminticket" element={<AdminTicketDashboard />} />
        <Route path="/account" element={<ManageAccount />} />
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