package com.example.server.config;

import com.example.server.repository.UserRepo;
import com.example.server.security.JwtService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserRepo userRepo;

    public WebSocketAuthChannelInterceptor(JwtService jwtService, UserRepo userRepo) {
        this.jwtService = jwtService;
        this.userRepo = userRepo;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() != StompCommand.CONNECT) {
            return message;
        }

        String token = resolveToken(accessor);
        if (token.isEmpty()) {
            return message;
        }
        try {
            UsernamePasswordAuthenticationToken parsed = jwtService.parseAuthentication(token);
            String userId = parsed.getName();
            if (userId == null || userId.isBlank()) return message;
            var user = userRepo.findById(userId.trim()).orElse(null);
            if (user == null || user.isDisabled()) return message;
            var auth = new UsernamePasswordAuthenticationToken(
                user.getId(),
                null,
                parsed.getAuthorities()
            );
            accessor.setUser(auth);
        } catch (Exception ignored) {
            // leave unauthenticated
        }
        return message;
    }

    private static String resolveToken(StompHeaderAccessor accessor) {
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String raw = authHeaders.get(0);
            if (raw != null && raw.startsWith("Bearer ")) {
                return raw.substring(7).trim();
            }
        }
        List<String> tokenHeaders = accessor.getNativeHeader("token");
        if (tokenHeaders != null && !tokenHeaders.isEmpty()) {
            String raw = tokenHeaders.get(0);
            return raw == null ? "" : raw.trim();
        }
        return "";
    }
}
