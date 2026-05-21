package com.campuslove.api.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * 本地文件存储服务。
 * 将上传文件保存到可配置的目录，生成 UUID 文件名以保证唯一性。
 */
@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    private final Path baseDir;

    public FileStorageService(@Value("${campuslove.upload.dir:uploads}") String uploadDir) {
        this.baseDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.baseDir);
            log.info("FileStorageService initialized: baseDir={}", this.baseDir);
        } catch (IOException e) {
            throw new RuntimeException("Failed to create upload directory: " + this.baseDir, e);
        }
    }

    /**
     * 存储上传文件到指定子目录。
     *
     * @param file   上传的文件
     * @param subdir 子目录名（如 "verification"）
     * @return 文件相对路径（相对于 baseDir）
     * @throws IOException 存储失败时抛出
     */
    public String store(MultipartFile file, String subdir) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("上传文件不能为空");
        }

        // 确保子目录存在
        Path targetDir = baseDir.resolve(subdir);
        Files.createDirectories(targetDir);

        // 生成唯一文件名：UUID + 原始扩展名
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String filename = UUID.randomUUID().toString().replace("-", "") + extension;

        // 保存文件
        Path targetPath = targetDir.resolve(filename);
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        String relativePath = subdir + "/" + filename;
        log.info("File stored: {} ({} bytes)", relativePath, file.getSize());
        return relativePath;
    }
}