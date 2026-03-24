package com.example.server.config;

import com.example.server.model.User;
import com.example.server.security.JwtService;
import com.example.server.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final AuthService authService;
    private final JwtService jwtService;
    private final String frontendUrl;

    public OAuth2LoginSuccessHandler(
        AuthService authService,
        JwtService jwtService,
        @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl
    ) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.frontendUrl = frontendUrl.replaceAll("/$", "");
    }

    @Override
    public void onAuthenticationSuccess(
        HttpServletRequest request,
        HttpServletResponse response,
        Authentication authentication
    ) throws IOException {
        try {
            OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
            User user = authService.syncUserFromGoogleOAuth(oauth2User);
            String token = jwtService.generateToken(user);
            String redirect = frontendUrl + "/oauth/callback?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
            response.sendRedirect(redirect);
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "oauth_failed";
            String redirect = frontendUrl + "/oauth/callback?error=" + URLEncoder.encode(msg, StandardCharsets.UTF_8);
            response.sendRedirect(redirect);
        }
    }
}
