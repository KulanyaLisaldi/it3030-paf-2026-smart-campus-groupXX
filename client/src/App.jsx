import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
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
import AccountPersonalPage from "./pages/AccountPersonalPage.jsx";
import AccountBookingsPage from "./pages/AccountBookingsPage.jsx";
import AccountContactMessagesPage from "./pages/AccountContactMessagesPage.jsx";
import AccountNotificationsPage from "./pages/AccountNotificationsPage.jsx";

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
        <Route path="/resources/:id" element={<ResourceDetailsPage />} />
        <Route path="/book-resource" element={<BookResourcePage />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/technician" element={<TechnicianDashboard />} />
        <Route path="/technician/tickets" element={<TechnicianTicketDashboard />} />
        <Route path="/tickets/create" element={<CreateTicket />} />
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/tickets/:id" element={<TicketDetails />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/adminusers" element={<AdminUsersPage />} />
        <Route path="/admincontactmessages" element={<AdminContactMessagesPage />} />
        <Route path="/adminresources" element={<AdminResourcesPage />} />
        <Route path="/adminresources/:id" element={<AdminResourceDetailsPage />} />
        <Route path="/adminbookings" element={<AdminBookingsPage />} />
        <Route path="/admin/qr-checkin" element={<AdminQrCheckInPage />} />
        <Route path="/adminnotifications" element={<AdminNotificationsPage />} />
        <Route path="/adminanalytics" element={<AdminAnalyticsPage />} />
        <Route path="/adminticket" element={<AdminTicketDashboard />} />
        <Route path="/account" element={<AccountPersonalPage />} />
        <Route path="/account/bookings/history" element={<AccountBookingsPage />} />
        <Route path="/account/bookings" element={<AccountBookingsPage />} />
        <Route path="/account/contact-messages" element={<AccountContactMessagesPage />} />
        <Route path="/account/notifications" element={<AccountNotificationsPage />} />
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