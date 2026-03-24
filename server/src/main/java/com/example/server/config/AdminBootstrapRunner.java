package com.example.server.config;

import com.example.server.model.User;
import com.example.server.model.UserRole;
import com.example.server.repository.UserRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Locale;

/**
 * One-time style bootstrap: if no {@link UserRole#ADMIN} exists and env credentials are set,
 * creates the first admin. Configure in {@code .env} or environment:
 * <pre>
 *   BOOTSTRAP_ADMIN_EMAIL=admin@yourdomain.edu
 *   BOOTSTRAP_ADMIN_PASSWORD=your-secure-password
 * </pre>
 */
@Component
@Order(100)
public class AdminBootstrapRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);

    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.admin.email:}")
    private String bootstrapAdminEmail;

    @Value("${app.bootstrap.admin.password:}")
    private String bootstrapAdminPassword;

    @Value("${app.bootstrap.admin.first-name:Admin}")
    private String bootstrapFirstName;

    @Value("${app.bootstrap.admin.last-name:System}")
    private String bootstrapLastName;

    public AdminBootstrapRunner(UserRepo userRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepo.existsByRole(UserRole.ADMIN)) {
            return;
        }
        String email = normalize(bootstrapAdminEmail);
        if (email.isEmpty() || bootstrapAdminPassword == null || bootstrapAdminPassword.isBlank()) {
            log.info("Admin bootstrap skipped: set app.bootstrap.admin.email and app.bootstrap.admin.password (e.g. BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD).");
            return;
        }
        if (userRepo.existsByEmail(email)) {
            log.warn("Admin bootstrap skipped: email {} already exists. Create ADMIN manually or use a different address.", email);
            return;
        }

        User admin = new User(
            bootstrapFirstName.trim(),
            bootstrapLastName.trim(),
            email,
            "",
            passwordEncoder.encode(bootstrapAdminPassword),
            Instant.now()
        );
        admin.setRole(UserRole.ADMIN);
        userRepo.save(admin);
        log.info("Bootstrapped first ADMIN user for email {}.", email);
    }

    private static String normalize(String raw) {
        return raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
    }
}
