package com.example.server.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class TechnicianVerificationEmailService {

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String publicApiBaseUrl;

    public TechnicianVerificationEmailService(
        JavaMailSender mailSender,
        @Value("${app.mail.from:no-reply@smartcampus.local}") String fromAddress,
        @Value("${app.public-api-base-url:http://localhost:8081}") String publicApiBaseUrl
    ) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.publicApiBaseUrl = publicApiBaseUrl;
    }

    /**
     * HTML email with card-style verify button; includes sign-in email and initial password set by admin.
     */
    public void sendVerificationEmail(
        String toEmail,
        String firstName,
        String rawToken,
        String initialPasswordPlain
    ) {
        String base = publicApiBaseUrl.endsWith("/")
            ? publicApiBaseUrl.substring(0, publicApiBaseUrl.length() - 1)
            : publicApiBaseUrl;
        String verifyUrl = base + "/api/auth/verify-technician?token=" + URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
        String greeting = firstName == null || firstName.isBlank() ? "Hello" : "Hello " + HtmlUtils.htmlEscape(firstName.trim());

        String safeEmail = HtmlUtils.htmlEscape(toEmail == null ? "" : toEmail.trim());
        String safePassword = HtmlUtils.htmlEscape(initialPasswordPlain == null ? "" : initialPasswordPlain);

        String html = ""
            + "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head><body style=\"margin:0;padding:24px;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;\">"
            + "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:560px;margin:0 auto;\">"
            + "<tr><td>"
            + "<table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);border:1px solid #e2e8f0;\">"
            + "<tr><td style=\"padding:28px 28px 8px 28px;\">"
            + "<p style=\"margin:0 0 16px 0;font-size:18px;font-weight:700;color:#14213D;\">" + greeting + ",</p>"
            + "<p style=\"margin:0 0 20px 0;font-size:15px;line-height:1.55;color:#334155;\">"
            + "An administrator created a <strong>technician</strong> account for you on CampusSync. "
            + "Use your sign-in details below, then verify your email with the button (link valid <strong>48 hours</strong>)."
            + "</p>"
            + "</td></tr>"
            + "<tr><td style=\"padding:0 28px 20px 28px;\">"
            + "<table width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;\">"
            + "<tr><td style=\"padding:16px 18px;\">"
            + "<p style=\"margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;\">Sign-in email</p>"
            + "<p style=\"margin:0 0 16px 0;font-size:15px;font-weight:600;color:#0f172a;word-break:break-all;\">" + safeEmail + "</p>"
            + "<p style=\"margin:0 0 8px 0;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;\">Initial password</p>"
            + "<p style=\"margin:0;font-size:15px;font-weight:600;color:#0f172a;word-break:break-all;\">" + safePassword + "</p>"
            + "</td></tr></table>"
            + "</td></tr>"
            + "<tr><td style=\"padding:8px 28px 28px 28px;text-align:center;\">"
            + "<a href=\"" + HtmlUtils.htmlEscape(verifyUrl) + "\" "
            + "style=\"display:inline-block;padding:14px 32px;background:#FA8112;color:#ffffff !important;text-decoration:none;"
            + "border-radius:999px;font-weight:700;font-size:15px;\">Verify email</a>"
            + "<p style=\"margin:20px 0 0 0;font-size:13px;line-height:1.5;color:#64748b;\">"
            + "After you verify, you’ll be taken to the staff sign-in page. "
            + "If you didn’t expect this email, you can ignore it."
            + "</p>"
            + "</td></tr>"
            + "</table>"
            + "</td></tr></table>"
            + "</body></html>";

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject("Verify your CampusSync technician account");
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to send verification email", e);
        }
    }
}
