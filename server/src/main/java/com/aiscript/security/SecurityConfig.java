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
    private final SecurityResponseWriter securityResponseWriter;

    public SecurityConfig(
        JwtAuthenticationFilter jwtAuthenticationFilter,
        DynamicAuthorizationManager dynamicAuthorizationManager,
        SecurityResponseWriter securityResponseWriter
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.dynamicAuthorizationManager = dynamicAuthorizationManager;
        this.securityResponseWriter = securityResponseWriter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(config -> config.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(config -> config
                .authenticationEntryPoint((request, response, exception) ->
                    securityResponseWriter.writeUnauthorized(response, "登录已过期，请重新登录"))
                .accessDeniedHandler((request, response, exception) ->
                    securityResponseWriter.writeForbidden(response, "没有权限执行该操作"))
            )
            .authorizeHttpRequests(registry -> registry
                .requestMatchers(
                    "/api/auth/**",
                    "/api/admin/auth/**",
                    "/swagger-ui/**",
                    "/v3/api-docs/**",
                    "/actuator/health",
                    "/api/payments/notify/wechat/native",
                    "/api/payments/notify/wechat/contract",
                    "/api/payments/notify/wechat/deduct",
                    "/api/payments/notify/alipay/contract",
                    "/api/payments/notify/alipay/deduct",
                    "/api/payments/notify/alipay/scan"
                ).permitAll()
                .requestMatchers(HttpMethod.GET, "/api/site-config").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/script-formats").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/home-banners").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/briefs/share/**", "/api/briefs/share-pack/**").permitAll()
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
