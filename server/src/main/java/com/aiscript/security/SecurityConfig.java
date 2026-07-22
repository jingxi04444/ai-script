package com.aiscript.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final DynamicAuthorizationManager dynamicAuthorizationManager;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, DynamicAuthorizationManager dynamicAuthorizationManager) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.dynamicAuthorizationManager = dynamicAuthorizationManager;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(config -> config.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(registry -> registry
                .requestMatchers(
                    "/api/auth/**",
                    "/api/admin/auth/**",
                    "/swagger-ui/**",
                    "/v3/api-docs/**",
                    "/actuator/health",
                    "/api/payments/notify/wechat/native",
                    "/api/payments/notify/alipay/scan"
                ).permitAll()
                .requestMatchers(HttpMethod.GET, "/api/site-config").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/script-formats").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/home-banners").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/briefs/share/**").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .anyRequest().access(dynamicAuthorizationManager)
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
