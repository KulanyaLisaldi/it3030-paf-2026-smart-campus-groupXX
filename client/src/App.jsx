import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/layout/navbar.jsx";
import Footer from "./components/layout/footer.jsx";
import Home from "./pages/Home.jsx";
import ResourcesPage from "./pages/ResourcesPage.jsx";
import ResourceDetailsPage from "./pages/ResourceDetailsPage.jsx";
import BookResourcePage from "./pages/BookResourcePage.jsx";
import SignIn from "./pages/SignIn.jsx";
import OAuthCallback from "./pages/OAuthCallback.jsx";
import TechnicianDashboard from "./pages/TechnicianDashboard.jsx";
import TechnicianTicketDashboard from "./pages/TechnicianTicketDashboard.jsx";
import CreateTicket from "./pages/CreateTicket.jsx";
import MyTickets from "./pages/MyTickets.jsx";
import TicketDetails from "./pages/TicketDetails.jsx";
import AdminTicketDashboard from "./pages/adminticketdashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminUsersPage from "./pages/AdminUsersPage.jsx";
import AdminResourcesPage from "./pages/AdminResourcesPage.jsx";
import AdminResourceDetailsPage from "./pages/AdminResourceDetailsPage.jsx";
import AdminBookingsPage from "./pages/AdminBookingsPage.jsx";
import AdminQrCheckInPage from "./pages/AdminQrCheckInPage.jsx";
import AdminNotificationsPage from "./pages/AdminNotificationsPage.jsx";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage.jsx";
import AdminContactMessagesPage from "./pages/AdminContactMessagesPage.jsx";
import ContactUs from "./pages/ContactUs.jsx";
import AboutUs from "./pages/AboutUs.jsx";
import FaqPage from "./pages/FaqPage.jsx";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage.jsx";
import TermsOfUsePage from "./pages/TermsOfUsePage.jsx";
import AccountPersonalPage from "./pages/AccountPersonalPage.jsx";
import AccountBookingsPage from "./pages/AccountBookingsPage.jsx";
import AccountContactMessagesPage from "./pages/AccountContactMessagesPage.jsx";
import AccountNotificationsPage from "./pages/AccountNotificationsPage.jsx";
import { getAuthToken } from "./api/http";
import { readCampusUser } from "./utils/campusUserStorage";
import UnauthorizedPage from "./pages/UnauthorizedPage.jsx";

function currentUserRole() {
  const user = readCampusUser();
  return String(user?.role || "").toUpperCase();
}

function RequireAuth({ children }) {
  const location = useLocation();
  if (!getAuthToken()) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function RequireRole({ roles, children }) {
  const location = useLocation();
  if (!getAuthToken()) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }
  const allowedRoles = (Array.isArray(roles) ? roles : [roles]).map((r) => String(r || "").toUpperCase());
  if (!allowedRoles.includes(currentUserRole())) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}

function AppContent() {
  const location = useLocation();
  const hideNavAndFooter =
    location.pathname === "/signin" ||
    location.pathname === "/oauth/callback" ||
    location.pathname === "/adminticket" ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/technician") ||
    location.pathname.startsWith("/account") ||
    location.pathname === "/my-tickets";

  return (
    <div className="min-h-screen flex flex-col">
      {!hideNavAndFooter && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route
          path="/resources/:id"
          element={(
            <RequireAuth>
              <ResourceDetailsPage />
            </RequireAuth>
          )}
        />
        <Route
          path="/book-resource"
          element={(
            <RequireAuth>
              <BookResourcePage />
            </RequireAuth>
          )}
        />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-of-use" element={<TermsOfUsePage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/technician" element={<RequireRole roles={["TECHNICIAN", "ADMIN"]}><TechnicianDashboard /></RequireRole>} />
        <Route path="/technician/tickets" element={<RequireRole roles={["TECHNICIAN", "ADMIN"]}><TechnicianTicketDashboard /></RequireRole>} />
        <Route path="/tickets/create" element={<RequireAuth><CreateTicket /></RequireAuth>} />
        <Route path="/my-tickets" element={<RequireAuth><MyTickets /></RequireAuth>} />
        <Route path="/tickets/:id" element={<RequireAuth><TicketDetails /></RequireAuth>} />
        <Route path="/admin" element={<RequireRole roles="ADMIN"><AdminDashboard /></RequireRole>} />
        <Route path="/adminusers" element={<RequireRole roles="ADMIN"><AdminUsersPage /></RequireRole>} />
        <Route path="/admincontactmessages" element={<RequireRole roles="ADMIN"><AdminContactMessagesPage /></RequireRole>} />
        <Route path="/adminresources" element={<RequireRole roles="ADMIN"><AdminResourcesPage /></RequireRole>} />
        <Route path="/adminresources/:id" element={<RequireRole roles="ADMIN"><AdminResourceDetailsPage /></RequireRole>} />
        <Route path="/adminbookings" element={<RequireRole roles="ADMIN"><AdminBookingsPage /></RequireRole>} />
        <Route path="/admin/qr-checkin" element={<RequireRole roles="ADMIN"><AdminQrCheckInPage /></RequireRole>} />
        <Route path="/adminnotifications" element={<RequireRole roles="ADMIN"><AdminNotificationsPage /></RequireRole>} />
        <Route path="/adminanalytics" element={<RequireRole roles="ADMIN"><AdminAnalyticsPage /></RequireRole>} />
        <Route path="/adminticket" element={<RequireRole roles="ADMIN"><AdminTicketDashboard /></RequireRole>} />
        <Route path="/account" element={<RequireAuth><AccountPersonalPage /></RequireAuth>} />
        <Route path="/account/bookings/history" element={<RequireAuth><AccountBookingsPage /></RequireAuth>} />
        <Route path="/account/bookings" element={<RequireAuth><AccountBookingsPage /></RequireAuth>} />
        <Route path="/account/contact-messages" element={<RequireAuth><AccountContactMessagesPage /></RequireAuth>} />
        <Route path="/account/notifications" element={<RequireAuth><AccountNotificationsPage /></RequireAuth>} />
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