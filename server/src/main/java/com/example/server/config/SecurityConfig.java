package com.example.server.config;

import com.example.server.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        JwtAuthenticationFilter jwtAuthenticationFilter,
        OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler,
        OAuth2LoginFailureHandler oAuth2LoginFailureHandler
    ) throws Exception {
        http
            .cors(c -> c.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(e -> e
                .authenticationEntryPoint((request, response, ex) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"message\":\"Unauthorized\"}");
                })
                .accessDeniedHandler((request, response, ex) -> {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"message\":\"Forbidden\"}");
                })
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                .requestMatchers("/api/auth/signin").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/admin/technicians").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/admin/technicians").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/adminticket/tickets/*/accept").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/adminticket/tickets/*/accept").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/admin/tickets/*/accept").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/admin/tickets/*/accept").hasRole("ADMIN")
                .requestMatchers("/api/technician/**").hasRole("TECHNICIAN")
                .requestMatchers(HttpMethod.GET, "/api/admin/users").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/admin/users/**").hasRole("ADMIN")
                .requestMatchers("/api/auth/me").authenticated()
                .requestMatchers("/api/auth/profile", "/api/auth/profile/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/tickets").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/tickets/my").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/tickets/technician/assigned").hasRole("TECHNICIAN")
                .requestMatchers("/api/tickets/**", "/uploads/**").permitAll()
                .anyRequest().permitAll()
            )
            .oauth2Login(o -> o
                .successHandler(oAuth2LoginSuccessHandler)
                .failureHandler(oAuth2LoginFailureHandler)
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
