package com.example.server.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class PasswordOtpEmailService {

    private final JavaMailSender mailSender;
    private final String fromAddress;

    public PasswordOtpEmailService(
        JavaMailSender mailSender,
        @Value("${app.mail.from:no-reply@smartcampus.local}") String fromAddress
    ) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    public void sendPasswordChangeOtp(String toEmail, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject("CampusSync password change verification code");
        message.setText(
            "Use this verification code to complete your password change:\n\n" +
            code + "\n\n" +
            "This code expires in 10 minutes.\n" +
            "If you did not request this, please ignore this email."
        );
        mailSender.send(message);
    }

    /** Staff (admin/technician) forgot-password flow — email sign-in only. */
    public void sendForgotPasswordOtp(String toEmail, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject("CampusSync password reset verification code");
        message.setText(
            "You requested a password reset for your CampusSync staff account.\n\n" +
            "Your verification code is:\n\n" +
            code + "\n\n" +
            "This code expires in 10 minutes.\n" +
            "If you did not request a reset, you can ignore this email. Your password will not change.\n"
        );
        mailSender.send(message);
    }
}
