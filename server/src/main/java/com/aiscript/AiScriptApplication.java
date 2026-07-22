package com.aiscript;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
@MapperScan(value = "com.aiscript", markerInterface = BaseMapper.class)
public class AiScriptApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiScriptApplication.class, args);
    }
}
