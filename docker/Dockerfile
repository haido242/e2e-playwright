# Browsers + deps đã có sẵn
FROM mcr.microsoft.com/playwright:v1.56.1-jammy

# Để Playwright KHÔNG cố tải lại browsers khi cài package
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
# Chỉ ra nơi browsers có sẵn trong image
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Cài tiện ích cần thiết
RUN apt-get update \
 && apt-get install -y --no-install-recommends jq curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /runner

COPY package.json package-lock.json* yarn.lock* ./

# Sử dụng BuildKit cache cho npm/yarn để tăng tốc
# - Với Yarn
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci --cache /root/.npm --prefer-offline; \
    else npm i --cache /root/.npm --prefer-offline; fi

# Copy phần còn lại
COPY tests ./tests
COPY playwright.config.ts ./
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY docker/wait-for-app.sh /usr/local/bin/wait-for-app.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
 && chmod +x /usr/local/bin/wait-for-app.sh \
 && mkdir -p /artifacts

ENTRYPOINT ["/bin/bash", "/usr/local/bin/entrypoint.sh"]
