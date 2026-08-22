package com.chess.config;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Định nghĩa endpoint cho client kết nối đến
        // withSockJS() giúp fallback trong trường hợp trình duyệt không hỗ trợ WebSocket
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*")
        .withSockJS();

    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Client đăng ký nhận tin nhắn từ các endpoint bắt đầu bằng /topic
        registry.enableSimpleBroker("/topic");
        // Client gửi tin nhắn lên server qua các endpoint bắt đầu bằng /app
        registry.setApplicationDestinationPrefixes("/app");
    }
}