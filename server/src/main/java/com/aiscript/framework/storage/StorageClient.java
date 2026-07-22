package com.aiscript.framework.storage;

import java.io.InputStream;

public interface StorageClient {
    String putObject(String objectKey, InputStream inputStream, long size, String contentType);

    String presignedUrl(String objectKey);
}
