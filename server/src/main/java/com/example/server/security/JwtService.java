package com.example.server.security;

import com.example.server.model.User;
import com.example.server.model.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.List;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
        @Value("${app.jwt.secret:}") String secretRaw,
        @Value("${app.jwt.expiration-ms:86400000}") long expirationMs
    ) {
        this.key = buildKey(secretRaw);
        this.expirationMs = expirationMs;
    }

    private static SecretKey buildKey(String secretRaw) {
        String secret = (secretRaw != null && !secretRaw.isBlank())
            ? secretRaw
            : "dev-only-change-me-use-32-chars-min!!";
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            try {
                bytes = MessageDigest.getInstance("SHA-256").digest(bytes);
            } catch (NoSuchAlgorithmException e) {
                throw new IllegalStateException(e);
            }
        }
        return Keys.hmacShaKeyFor(bytes);
    }

    public String generateToken(User user) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + expirationMs);
        UserRole role = user.getEffectiveRole();
        return Jwts.builder()
            .subject(user.getId())
            .issuedAt(now)
            .expiration(exp)
            .claim("email", user.getEmail())
            .claim("role", role.name())
            .signWith(key)
            .compact();
    }

    public UsernamePasswordAuthenticationToken parseAuthentication(String token) {
        Claims claims = Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
        String subject = claims.getSubject();
        String roleClaim = claims.get("role", String.class);
        UserRole role = roleClaim != null ? UserRole.valueOf(roleClaim) : UserRole.USER;
        return new UsernamePasswordAuthenticationToken(
            subject,
            null,
            List.of(new SimpleGrantedAuthority("ROLE_" + role.name()))
        );
    }
}
