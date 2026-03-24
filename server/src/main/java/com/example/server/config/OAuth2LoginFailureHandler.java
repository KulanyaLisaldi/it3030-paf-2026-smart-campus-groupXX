package com.example.server.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {

    private final String frontendUrl;

    public OAuth2LoginFailureHandler(
        @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl
    ) {
        this.frontendUrl = frontendUrl.replaceAll("/$", "");
    }

    @Override
    public void onAuthenticationFailure(
        HttpServletRequest request,
        HttpServletResponse response,
        AuthenticationException exception
    ) throws IOException {
        String msg = exception.getMessage() != null ? exception.getMessage() : "access_denied";
        String redirect = frontendUrl + "/oauth/callback?error=" + URLEncoder.encode(msg, StandardCharsets.UTF_8);
        response.sendRedirect(redirect);
    }
}
