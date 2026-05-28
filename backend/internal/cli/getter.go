package cli

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/insmtx/Leros/backend/internal/api/contract"
	"github.com/insmtx/Leros/backend/internal/api/dto"
)

// GetSession 调用服务端 GetSession API 并返回解析后的结果。
func GetSession(ctx context.Context, serverAddr, sessionID string) (*contract.Session, error) {
	var result contract.Session
	if err := doGetRequest(ctx, serverAddr, "GetSession",
		map[string]string{"session_id": sessionID}, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// GetTask 调用服务端 GetTask API 并返回解析后的结果。
func GetTask(ctx context.Context, serverAddr, publicID string) (*contract.Task, error) {
	var result contract.Task
	if err := doGetRequest(ctx, serverAddr, "GetTask",
		map[string]string{"public_id": publicID}, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// GetProject 调用服务端 GetProject API 并返回解析后的结果。
func GetProject(ctx context.Context, serverAddr, publicID string) (*contract.Project, error) {
	var result contract.Project
	if err := doGetRequest(ctx, serverAddr, "GetProject",
		map[string]string{"public_id": publicID}, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// doGetRequest 发送获取单条记录 API 请求的通用封装。
func doGetRequest(ctx context.Context, serverAddr, endpoint string, reqBody, target interface{}) error {
	payload, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("marshal request: %w", err)
	}

	client := &http.Client{Timeout: defaultHTTPTimeout}
	url := fmt.Sprintf("http://%s/v1/%s", serverAddr, endpoint)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
	}

	var apiResp apiResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return fmt.Errorf("decode response: %w", err)
	}

	if apiResp.Code != dto.CodeSuccess {
		return fmt.Errorf("api error [%d]: %s", apiResp.Code, apiResp.Message)
	}

	if err := json.Unmarshal(apiResp.Data, target); err != nil {
		return fmt.Errorf("decode data: %w", err)
	}

	return nil
}
