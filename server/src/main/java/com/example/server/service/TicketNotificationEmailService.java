package com.example.server.service;

import com.example.server.model.Ticket;
import com.example.server.model.User;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Optional;

/**
 * HTML notifications for ticket lifecycle and chat. Sends are best-effort and never throw to callers.
 */
@Service
public class TicketNotificationEmailService {

    private static final Logger log = LoggerFactory.getLogger(TicketNotificationEmailService.class);
    private static final DateTimeFormatter TS =
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'UTC'").withZone(ZoneOffset.UTC);

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String frontendBaseUrl;
    private final String mailHost;

    public TicketNotificationEmailService(
        JavaMailSender mailSender,
        @Value("${app.mail.from:no-reply@smartcampus.local}") String fromAddress,
        @Value("${app.frontend-url:http://localhost:5173}") String frontendBaseUrl,
        @Value("${spring.mail.host:}") String mailHost
    ) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        String base = frontendBaseUrl == null ? "" : frontendBaseUrl.trim();
        this.frontendBaseUrl = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        this.mailHost = mailHost == null ? "" : mailHost.trim();
    }

    private boolean canSend() {
        return !mailHost.isEmpty();
    }

    public void notifyAssignment(Ticket ticket, User technicianUser) {
        if (ticket == null) {
            return;
        }
        String reporterEmail = normalizeEmail(ticket.getEmail());
        if (reporterEmail != null) {
            sendHtml(
                reporterEmail,
                "Your ticket has been assigned — Smart Campus",
                wrapBody(
                    "Technician assigned",
                    "<p>Hello,</p>"
                        + "<p>A technician has been assigned to your support ticket. Details below.</p>"
                        + ticketSummaryTable(ticket)
                        + assignedTechnicianBlock(technicianUser, ticket)
                        + viewTicketLink(ticket)
                        + footerNote()
                )
            );
        }
        String techEmail =
            technicianUser != null && technicianUser.getEmail() != null
                ? normalizeEmail(technicianUser.getEmail())
                : null;
        if (techEmail != null) {
            sendHtml(
                techEmail,
                "New ticket assigned to you — Smart Campus",
                wrapBody(
                    "New assignment",
                    "<p>Hello " + escapeHtml(displayName(technicianUser)) + ",</p>"
                        + "<p>A ticket has been assigned to you. Please review and take action in the technician portal.</p>"
                        + ticketSummaryTable(ticket)
                        + reporterBlock(ticket)
                        + viewTicketLink(ticket)
                        + footerNote()
                )
            );
        }
    }

    public void notifyTicketResolved(Ticket ticket) {
        if (ticket == null) {
            return;
        }
        String to = normalizeEmail(ticket.getEmail());
        if (to == null) {
            return;
        }
        String details = Optional.ofNullable(ticket.getResolutionDetails()).orElse("").trim();
        sendHtml(
            to,
            "Your ticket has been resolved — Smart Campus",
            wrapBody(
                "Ticket resolved",
                "<p>Hello,</p>"
                    + "<p>Your support ticket has been marked <strong>resolved</strong>.</p>"
                    + ticketSummaryTable(ticket)
                    + "<p><strong>Resolution summary</strong></p>"
                    + "<p style=\"margin:0 0 16px 0;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;\">"
                    + escapeHtml(details.isEmpty() ? "—" : details)
                    + "</p>"
                    + viewTicketLink(ticket)
                    + footerNote()
            )
        );
    }

    public void notifyTicketRejected(Ticket ticket, String reason) {
        if (ticket == null) {
            return;
        }
        String to = normalizeEmail(ticket.getEmail());
        if (to == null) {
            return;
        }
        String r = reason == null ? "" : reason.trim();
        sendHtml(
            to,
            "Update on your ticket — Smart Campus",
            wrapBody(
                "Ticket not approved",
                "<p>Hello,</p>"
                    + "<p>Your ticket submission was not approved. Please review the reason below and contact support if you need clarification.</p>"
                    + ticketSummaryTable(ticket)
                    + "<p><strong>Reason</strong></p>"
                    + "<p style=\"margin:0 0 16px 0;padding:12px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;\">"
                    + escapeHtml(r.isEmpty() ? "—" : r)
                    + "</p>"
                    + footerNote()
            )
        );
    }

    public void notifyNewChatFromTechnician(Ticket ticket, String technicianLabel, String messageBody) {
        if (ticket == null) {
            return;
        }
        String to = normalizeEmail(ticket.getEmail());
        if (to == null) {
            return;
        }
        String from = technicianLabel == null || technicianLabel.isBlank() ? "Your technician" : technicianLabel.trim();
        sendHtml(
            to,
            "New message on your ticket — Smart Campus",
            wrapBody(
                "New chat message",
                "<p>Hello,</p>"
                    + "<p><strong>" + escapeHtml(from) + "</strong> sent a new message regarding your ticket.</p>"
                    + ticketSummaryTable(ticket)
                    + messageBlock(messageBody)
                    + viewTicketLink(ticket)
                    + footerNote()
            )
        );
    }

    public void notifyNewChatFromUser(Ticket ticket, User technicianUser, String reporterLabel, String messageBody) {
        if (ticket == null || technicianUser == null) {
            return;
        }
        String to = normalizeEmail(technicianUser.getEmail());
        if (to == null) {
            return;
        }
        String from =
            reporterLabel == null || reporterLabel.isBlank() ? "The ticket reporter" : reporterLabel.trim();
        sendHtml(
            to,
            "New message on assigned ticket — Smart Campus",
            wrapBody(
                "New chat message",
                "<p>Hello " + escapeHtml(displayName(technicianUser)) + ",</p>"
                    + "<p><strong>" + escapeHtml(from) + "</strong> replied on a ticket assigned to you.</p>"
                    + ticketSummaryTable(ticket)
                    + messageBlock(messageBody)
                    + viewTicketLink(ticket)
                    + footerNote()
            )
        );
    }

    private void sendHtml(String toEmail, String subject, String html) {
        if (!canSend()) {
            log.debug("Skipping email (spring.mail.host not set): {}", subject);
            return;
        }
        if (toEmail == null || toEmail.isBlank()) {
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail.trim());
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Failed to send email to {} ({})", toEmail, subject, e);
        }
    }

    private String wrapBody(String heading, String innerHtml) {
        return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/></head><body style=\"margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;\">"
            + "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#f1f5f9;padding:24px 12px;\"><tr><td align=\"center\">"
            + "<table role=\"presentation\" width=\"600\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:600px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;\">"
            + "<tr><td style=\"background:#14213d;color:#fff;padding:20px 24px;font-size:18px;font-weight:700;\">Smart Campus — Support Desk</td></tr>"
            + "<tr><td style=\"padding:24px;color:#334155;font-size:15px;line-height:1.5;\">"
            + "<h1 style=\"margin:0 0 16px 0;font-size:20px;color:#0f172a;\">"
            + escapeHtml(heading)
            + "</h1>"
            + innerHtml
            + "</td></tr></table></td></tr></table></body></html>";
    }

    private String ticketSummaryTable(Ticket t) {
        StringBuilder sb = new StringBuilder();
        sb.append("<table style=\"width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;\">");
        row(sb, "Title", t.getIssueTitle());
        row(sb, "Category", t.getCategory());
        row(sb, "Priority", t.getPriority());
        row(sb, "Location", t.getResourceLocation());
        row(sb, "Status", t.getStatus());
        row(sb, "Submitted", formatInstant(t.getCreatedAt()));
        row(sb, "Description", truncateForEmail(t.getDescription(), 2500));
        sb.append("</table>");
        return sb.toString();
    }

    private static String truncateForEmail(String text, int maxLen) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String s = text.trim().replaceAll("\\s+", " ");
        if (s.length() <= maxLen) {
            return s;
        }
        return s.substring(0, maxLen) + "…";
    }

    private String assignedTechnicianBlock(User technician, Ticket ticket) {
        String name =
            technician != null
                ? displayName(technician)
                : Optional.ofNullable(ticket.getAssignedTechnicianName()).orElse("—");
        String email =
            technician != null && technician.getEmail() != null
                ? technician.getEmail().trim()
                : "—";
        String phone =
            technician != null && technician.getPhoneNumber() != null
                ? technician.getPhoneNumber().trim()
                : "—";
        return "<p><strong>Assigned technician</strong></p>"
            + "<table style=\"width:100%;border-collapse:collapse;margin:0 0 16px 0;font-size:14px;\">"
            + rowHtml("Name", name)
            + rowHtml("Email", email)
            + rowHtml("Phone", phone)
            + "</table>";
    }

    private String reporterBlock(Ticket ticket) {
        return "<p><strong>Reporter</strong></p>"
            + "<table style=\"width:100%;border-collapse:collapse;margin:0 0 16px 0;font-size:14px;\">"
            + rowHtml("Name", ticket.getFullName())
            + rowHtml("Email", ticket.getEmail())
            + rowHtml("Phone", ticket.getPhoneNumber())
            + "</table>";
    }

    private void row(StringBuilder sb, String label, String value) {
        sb.append(
            "<tr><td style=\"padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;width:36%;font-weight:600;color:#0f172a;\">"
        )
            .append(escapeHtml(label))
            .append("</td><td style=\"padding:8px 12px;border:1px solid #e5e7eb;color:#334155;\">")
            .append(escapeHtml(blankToEmDash(value)))
            .append("</td></tr>");
    }

    private String rowHtml(String label, String value) {
        return "<tr><td style=\"padding:8px 12px;border:1px solid #e5e7eb;background:#f8fafc;width:36%;font-weight:600;color:#0f172a;\">"
            + escapeHtml(label)
            + "</td><td style=\"padding:8px 12px;border:1px solid #e5e7eb;color:#334155;\">"
            + escapeHtml(blankToEmDash(value))
            + "</td></tr>";
    }

    private String messageBlock(String body) {
        String text = body == null ? "" : body.trim();
        if (text.length() > 1500) {
            text = text.substring(0, 1500) + "…";
        }
        return "<p><strong>Message</strong></p>"
            + "<p style=\"margin:0 0 16px 0;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;white-space:pre-wrap;\">"
            + escapeHtml(text.isEmpty() ? "—" : text)
            + "</p>";
    }

    private String viewTicketLink(Ticket t) {
        if (t.getId() == null || t.getId().isBlank() || frontendBaseUrl.isEmpty()) {
            return "";
        }
        String url = frontendBaseUrl + "/tickets/" + t.getId();
        return "<p style=\"margin:20px 0 0 0;\"><a href=\""
            + escapeHtml(url)
            + "\" style=\"display:inline-block;background:#FA8112;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;\">View ticket</a></p>";
    }

    private String footerNote() {
        return "<p style=\"margin:24px 0 0 0;font-size:12px;color:#64748b;\">This is an automated message from Smart Campus. Please do not reply directly to this email.</p>";
    }

    private static String blankToEmDash(String v) {
        if (v == null || v.isBlank()) {
            return "—";
        }
        return v;
    }

    private static String formatInstant(Instant i) {
        if (i == null) {
            return "—";
        }
        return TS.format(i);
    }

    private static String escapeHtml(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;");
    }

    private static String displayName(User u) {
        if (u == null) {
            return "Technician";
        }
        String fn = u.getFirstName() == null ? "" : u.getFirstName().trim();
        String ln = u.getLastName() == null ? "" : u.getLastName().trim();
        String full = (fn + " " + ln).trim();
        if (!full.isEmpty()) {
            return full;
        }
        if (u.getEmail() != null && !u.getEmail().isBlank()) {
            return u.getEmail().trim();
        }
        return "Technician";
    }

    private static String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
