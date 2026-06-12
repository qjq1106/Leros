# Static Presign Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 升级 storage-go 到 v0.0.4，当 storage 驱动为 local 时注册 S3 风格的预签名 URL 端点（`PUT /v1/static/:bucket/*key?presign`、`GET /v1/static/:bucket/*key?presign`）。

**Architecture:** 在 `filestore` 包中新增 `PresignUpload`/`PresignDownload` 封装函数，新增 `IsLocal()` 供 router 层判断；在 `handler` 包中新增 `StaticHandler` 注册 S3 风格路由。router 通过 `filestore.IsLocal()` 条件注册。

**Tech Stack:** Go, Gin, storage-go v0.0.4

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/internal/infra/filestore/init.go` | Modify | 新增 `IsLocal()` |
| `backend/internal/infra/filestore/presign.go` | Create | 封装 `PresignUpload`/`PresignDownload` 调用 storage-go |
| `backend/internal/infra/filestore/presign_test.go` | Create | 测试 presign 封装 |
| `backend/internal/api/handler/static_handler.go` | Create | S3 风格预签名 URL 端点 handler |
| `backend/internal/api/handler/static_handler_test.go` | Create | 测试 handler 路由 |
| `backend/internal/api/router.go` | Modify | 条件注册静态路由 |
| `go.mod` | Modify | 升级 storage-go v0.0.4 |
| `go.sum` | Modify | `go mod tidy` 自动更新 |

---

### Task 1: 升级 storage-go 到 v0.0.4

**Files:**
- Modify: `go.mod:25`
- Modify: `go.sum` (自动)

- [ ] **Step 1: 修改 go.mod 版本号**

编辑 `go.mod`，将 `github.com/ygpkg/storage-go v0.0.3` 改为 `github.com/ygpkg/storage-go v0.0.4`

- [ ] **Step 2: 运行 go mod tidy 同步依赖**

```bash
go mod tidy
```

Expected: 无错误，`go.sum` 自动更新，`go.mod` 中版本变为 v0.0.4

- [ ] **Step 3: 验证编译通过**

```bash
go build ./...
```

Expected: 编译成功（现有代码中 `PresignDownloadByPublicID` 调用 `st.PresignGetObject` 签名一致）

- [ ] **Step 4: 提交**

```bash
git add go.mod go.sum
git commit -m "build: 升级 storage-go 到 v0.0.4"
```

---

### Task 2: filestore/init.go 新增 IsLocal()

**Files:**
- Modify: `backend/internal/infra/filestore/init.go`

- [ ] **Step 1: 添加 driverType 变量和 IsLocal() 函数**

在 `init.go` 中添加：

```go
var driverType storage.DriverType

// IsLocal 返回当前 storage 驱动是否为 local
func IsLocal() bool {
	return driverType == "local"
}
```

在 `Init()` 函数中，`driver := storage.DriverType(cfg.Driver)` 之后保存：

```go
driverType = driver
```

- [ ] **Step 2: 验证编译通过**

```bash
go build ./backend/internal/infra/filestore/
```

Expected: 编译成功

- [ ] **Step 3: 提交**

```bash
git add backend/internal/infra/filestore/init.go
git commit -m "feat(filestore): 新增 IsLocal() 函数判断 storage 驱动类型"
```

---

### Task 3: filestore/presign.go 新增预签名封装

**Files:**
- Create: `backend/internal/infra/filestore/presign.go`

- [ ] **Step 1: 编写 PresignUpload 和 PresignDownload 函数**

创建文件，内容如下：

```go
package filestore

import (
	"context"
	"time"
)

const defaultPresignTTL = 1 * time.Hour

// PresignUpload 生成预签名上传 URL
func PresignUpload(ctx context.Context, bucket, key string) (string, time.Time, error) {
	st := GetStorage()
	expiresAt := time.Now().Add(defaultPresignTTL)
	url, err := st.PresignPutObject(ctx, bucket, key, defaultPresignTTL)
	if err != nil {
		return "", time.Time{}, err
	}
	return url, expiresAt, nil
}

// PresignDownload 生成预签名下载 URL
func PresignDownload(ctx context.Context, bucket, key string) (string, time.Time, error) {
	st := GetStorage()
	expiresAt := time.Now().Add(defaultPresignTTL)
	url, err := st.PresignGetObject(ctx, bucket, key, defaultPresignTTL)
	if err != nil {
		return "", time.Time{}, err
	}
	return url, expiresAt, nil
}
```

- [ ] **Step 2: 验证编译通过**

```bash
go build ./backend/internal/infra/filestore/
```

Expected: 编译成功

- [ ] **Step 3: 提交**

```bash
git add backend/internal/infra/filestore/presign.go
git commit -m "feat(filestore): 新增 PresignUpload/PresignDownload 预签名封装"
```

---

### Task 4: filestore/presign_test.go 测试预签名封装

**Files:**
- Create: `backend/internal/infra/filestore/presign_test.go`

- [ ] **Step 1: 编写测试**

参考项目中现有风格（`backend/internal/workspace/server_paths_test.go` 使用 `t.TempDir()`），测试文件内容如下：

```go
package filestore

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/ygpkg/storage-go"
	_ "github.com/ygpkg/storage-go/driver/local"

	"github.com/insmtx/Leros/backend/config"
)

func initTestStorage(t *testing.T) {
	t.Helper()
	dir := t.TempDir()
	cfg := &config.StorageConfig{
		Driver:   "local",
		LocalDir: dir,
		Bucket:   "test-bucket",
	}
	if err := Init(cfg); err != nil {
		t.Fatalf("init storage: %v", err)
	}
}

func TestPresignUpload(t *testing.T) {
	initTestStorage(t)
	ctx := context.Background()

	url, expiresAt, err := PresignUpload(ctx, DefaultBucket(), "test-upload.txt")
	if err != nil {
		t.Fatalf("PresignUpload: %v", err)
	}
	if url == "" {
		t.Error("expected non-empty URL")
	}
	if expiresAt.IsZero() {
		t.Error("expected non-zero expiresAt")
	}
}

func TestPresignDownload(t *testing.T) {
	initTestStorage(t)
	ctx := context.Background()

	url, expiresAt, err := PresignDownload(ctx, DefaultBucket(), "test-download.txt")
	if err != nil {
		t.Fatalf("PresignDownload: %v", err)
	}
	if url == "" {
		t.Error("expected non-empty URL")
	}
	if expiresAt.IsZero() {
		t.Error("expected non-zero expiresAt")
	}
}

func TestIsLocal(t *testing.T) {
	initTestStorage(t)
	if !IsLocal() {
		t.Error("expected IsLocal() to return true for local driver")
	}
}

func TestPresignWithCustomBucket(t *testing.T) {
	initTestStorage(t)
	ctx := context.Background()

	url, _, err := PresignUpload(ctx, "custom-bucket", "test.txt")
	if err != nil {
		t.Fatalf("PresignUpload with custom bucket: %v", err)
	}
	if url == "" {
		t.Error("expected non-empty URL")
	}
}

func TestPresignUploadKeyWithSpecialChars(t *testing.T) {
	initTestStorage(t)
	ctx := context.Background()

	key := filepath.Join("path", "to", "file with spaces.txt")
	url, _, err := PresignUpload(ctx, DefaultBucket(), key)
	if err != nil {
		t.Fatalf("PresignUpload special chars: %v", err)
	}
	if !strings.Contains(url, "file%20with%20spaces.txt") {
		t.Logf("URL may not contain encoded spaces: %s", url)
	}
}
```

- [ ] **Step 2: 运行测试验证通过**

```bash
go test -v ./backend/internal/infra/filestore/ -run TestPresign
```

Expected: 所有 Presign 相关测试通过

- [ ] **Step 3: 提交**

```bash
git add backend/internal/infra/filestore/presign_test.go
git commit -m "test(filestore): 新增预签名封装单元测试"
```

---

### Task 5: static_handler.go 新增 S3 风格预签名 handler

**Files:**
- Create: `backend/internal/api/handler/static_handler.go`

- [ ] **Step 1: 编写 handler**

创建文件，内容如下：

```go
package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/insmtx/Leros/backend/internal/infra/filestore"
)

const presignQueryParam = "presign"

// RegisterStaticRoutes 注册静态资源预签名路由
func RegisterStaticRoutes(r gin.IRouter) {
	r.PUT("/static/:bucket/*key", handlePresignUpload)
	r.GET("/static/:bucket/*key", handlePresignDownload)
}

func handlePresignUpload(ctx *gin.Context) {
	if !isPresignRequest(ctx) {
		ctx.String(http.StatusBadRequest, "missing presign query parameter")
		return
	}

	bucket := strings.TrimSpace(ctx.Param("bucket"))
	key := strings.TrimPrefix(ctx.Param("key"), "/")

	if bucket == "" || key == "" {
		ctx.String(http.StatusBadRequest, "bucket and key are required")
		return
	}

	url, expiresAt, err := filestore.PresignUpload(ctx.Request.Context(), bucket, key)
	if err != nil {
		ctx.String(http.StatusInternalServerError, "failed to generate presigned upload URL")
		return
	}

	ctx.Header("X-Presign-Expires-At", expiresAt.Format(time.RFC3339))
	ctx.String(http.StatusOK, url)
}

func handlePresignDownload(ctx *gin.Context) {
	if !isPresignRequest(ctx) {
		ctx.String(http.StatusBadRequest, "missing presign query parameter")
		return
	}

	bucket := strings.TrimSpace(ctx.Param("bucket"))
	key := strings.TrimPrefix(ctx.Param("key"), "/")

	if bucket == "" || key == "" {
		ctx.String(http.StatusBadRequest, "bucket and key are required")
		return
	}

	url, expiresAt, err := filestore.PresignDownload(ctx.Request.Context(), bucket, key)
	if err != nil {
		ctx.String(http.StatusInternalServerError, "failed to generate presigned download URL")
		return
	}

	ctx.Header("X-Presign-Expires-At", expiresAt.Format(time.RFC3339))
	ctx.String(http.StatusOK, url)
}

func isPresignRequest(ctx *gin.Context) bool {
	return strings.TrimSpace(ctx.Query(presignQueryParam)) != ""
}
```

- [ ] **Step 2: 验证编译通过**

```bash
go build ./backend/internal/api/handler/
```

Expected: 编译成功

- [ ] **Step 3: 提交**

```bash
git add backend/internal/api/handler/static_handler.go
git commit -m "feat(handler): 新增 S3 风格静态资源预签名路由 handler"
```

---

### Task 6: static_handler_test.go 测试 handler 路由

**Files:**
- Create: `backend/internal/api/handler/static_handler_test.go`

- [ ] **Step 1: 编写测试**

参考 `digital_assistant_gin_test.go` 的 gin test 风格，使用 `gin.New()` + `httptest`：

```go
package handler

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/insmtx/Leros/backend/config"
	"github.com/insmtx/Leros/backend/internal/infra/filestore"
)

func setupStaticTestRouter(t *testing.T) *gin.Engine {
	t.Helper()

	dir := t.TempDir()
	cfg := &config.StorageConfig{
		Driver:   "local",
		LocalDir: dir,
		Bucket:   "test-bucket",
	}
	if err := filestore.Init(cfg); err != nil {
		t.Fatalf("init storage: %v", err)
	}

	gin.SetMode(gin.TestMode)
	r := gin.New()
	RegisterStaticRoutes(r)
	return r
}

func TestPresignUploadHandler_Success(t *testing.T) {
	r := setupStaticTestRouter(t)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/static/test-bucket/path/to/file.txt?presign", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}
	if w.Header().Get("X-Presign-Expires-At") == "" {
		t.Error("expected X-Presign-Expires-At header")
	}
	if w.Body.String() == "" {
		t.Error("expected non-empty URL body")
	}
}

func TestPresignDownloadHandler_Success(t *testing.T) {
	r := setupStaticTestRouter(t)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/static/test-bucket/path/to/file.txt?presign", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}
	if w.Header().Get("X-Presign-Expires-At") == "" {
		t.Error("expected X-Presign-Expires-At header")
	}
	if w.Body.String() == "" {
		t.Error("expected non-empty URL body")
	}
}

func TestPresignUploadHandler_MissingPresignParam(t *testing.T) {
	r := setupStaticTestRouter(t)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/static/test-bucket/path/to/file.txt", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestPresignDownloadHandler_MissingPresignParam(t *testing.T) {
	r := setupStaticTestRouter(t)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/static/test-bucket/path/to/file.txt", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestPresignUploadHandler_EmptyBucket(t *testing.T) {
	r := setupStaticTestRouter(t)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/static//path/to/file.txt?presign", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestPresignUploadHandler_EmptyKey(t *testing.T) {
	r := setupStaticTestRouter(t)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/static/test-bucket/?presign", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}
```

- [ ] **Step 2: 运行测试验证通过**

```bash
go test -v ./backend/internal/api/handler/ -run TestPresign
```

Expected: 所有 handler 测试通过

- [ ] **Step 3: 提交**

```bash
git add backend/internal/api/handler/static_handler_test.go
git commit -m "test(handler): 新增静态资源预签名路由 handler 测试"
```

---

### Task 7: router.go 条件注册静态路由

**Files:**
- Modify: `backend/internal/api/router.go`

- [ ] **Step 1: 添加 import 和条件注册**

在 `import` 块中添加：

```go
"github.com/insmtx/Leros/backend/internal/infra/filestore"
```

在 `SetupRouter` 函数末尾（`v1.GET("/swagger/*any", ...)` 之前）添加：

```go
if filestore.IsLocal() {
    handler.RegisterStaticRoutes(v1)
    logs.Info("Static routes registered successfully")
}
```

完整上下文位置：在 `runnable.StartSessionTitleHandler` goroutine 启动代码块 `}` 之后，Swagger 路由注册之前。

- [ ] **Step 2: 验证编译通过**

```bash
go build ./backend/internal/api/
```

Expected: 编译成功

- [ ] **Step 3: 运行 router 所在包的测试**

```bash
go test ./backend/internal/api/...
```

Expected: 已有测试不受影响，全部通过

- [ ] **Step 4: 提交**

```bash
git add backend/internal/api/router.go
git commit -m "feat(router): local 驱动下条件注册静态资源预签名路由"
```

---

### Task 8: final 验证与提交

- [ ] **Step 1: 运行全量测试**

```bash
go test -v ./backend/internal/infra/filestore/ ./backend/internal/api/handler/ -run TestPresign
```

Expected: 新增的 presign 相关测试全部通过

- [ ] **Step 2: 确保 build 通过**

```bash
go build -o /dev/null ./backend/cmd/leros/
```

Expected: 完整构建成功，无编译错误

- [ ] **Step 3: 检查无未提交的更改**

```bash
git status
git diff --stat
```
