package com.campuslove.api;

import com.campuslove.api.config.JwtConfig;
import com.campuslove.api.config.WeChatConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({JwtConfig.class, WeChatConfig.class})
public class CampusLoveApplication {

  public static void main(String[] args) {
    SpringApplication.run(CampusLoveApplication.class, args);
  }
}
