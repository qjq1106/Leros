package workspace

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ArtifactStorageFile 描述从 worker 存储解析的产物文件。
type ArtifactStorageFile struct {
	Path     string
	Filename string
	MimeType string
	FileSize int64
	Sha256   string
}

// ResolveArtifactStorageFile 从 worker 存储解析并检查单个产物文件。
func ResolveArtifactStorageFile(ctx context.Context, orgID uint, workerID uint, storageKey string, declaredMimeType string) (*ArtifactStorageFile, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	path, err := ArtifactStoragePath(orgID, workerID, storageKey)
	if err != nil {
		return nil, err
	}
	info, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("stat artifact file: %w", err)
	}
	if info.IsDir() {
		return nil, fmt.Errorf("artifact storage key points to a directory")
	}
	sha, err := sha256File(path)
	if err != nil {
		return nil, err
	}
	return &ArtifactStorageFile{
		Path:     path,
		Filename: filepath.Base(path),
		MimeType: detectMimeType(path, declaredMimeType),
		FileSize: info.Size(),
		Sha256:   sha,
	}, nil
}

// OpenArtifactStorageFile 从 worker 存储打开单个产物文件。
func OpenArtifactStorageFile(orgID uint, workerID uint, storageKey string) (*os.File, error) {
	path, err := ArtifactStoragePath(orgID, workerID, storageKey)
	if err != nil {
		return nil, err
	}
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open artifact file: %w", err)
	}
	return file, nil
}

// RepoRelativePathFromStorageKey 返回已知工作区存储键的仓库相对路径。
func RepoRelativePathFromStorageKey(storageKey string) string {
	key := filepath.ToSlash(strings.TrimSpace(storageKey))
	const marker = "/repo/"
	idx := strings.Index(key, marker)
	if idx < 0 {
		return ""
	}
	return strings.TrimPrefix(key[idx+len(marker):], "/")
}
