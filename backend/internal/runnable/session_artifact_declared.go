package runnable

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/nats-io/nats.go"
	"gorm.io/gorm"

	infradb "github.com/insmtx/Leros/backend/internal/infra/db"
	eventbus "github.com/insmtx/Leros/backend/internal/infra/mq"
	"github.com/insmtx/Leros/backend/internal/runtime/events"
	"github.com/insmtx/Leros/backend/internal/worker/protocol"
	agentworkspace "github.com/insmtx/Leros/backend/internal/workspace"
	"github.com/insmtx/Leros/backend/pkg/dm"
	"github.com/insmtx/Leros/backend/types"
	"github.com/ygpkg/yg-go/logs"
)

// StartSessionArtifactDeclared 订阅实时产物声明并持久化。
func StartSessionArtifactDeclared(ictx context.Context, eb eventbus.EventBus, db *gorm.DB) {
	ctx := logs.WithContextFields(ictx, "runnable", "session_artifact_declared")
	topic := dm.SessionResultStreamWildcardSubject()
	persister := &declaredArtifactPersister{db: db}
	logs.InfoContextf(ctx, "starting session artifact declared runnable: %s", topic)

	Run(ctx, "session_artifact_declared", func(ctx context.Context) {
		if err := eb.Subscribe(ctx, topic, dm.SessionArtifactDeclaredConsumer(), func(msg *nats.Msg) {
			handleSessionArtifactDeclaredMessage(ctx, persister, msg)
		}); err != nil {
			logs.ErrorContextf(ctx, "subscribe to %s failed: %v", topic, err)
		}
	})
}

type declaredArtifactPersister struct {
	db *gorm.DB
}

func handleSessionArtifactDeclaredMessage(ctx context.Context, persister *declaredArtifactPersister, msg *nats.Msg) {
	var streamMsg protocol.MessageStreamMessage
	if err := json.Unmarshal(msg.Data, &streamMsg); err != nil {
		logs.WarnContextf(ctx, "unmarshal session artifact declared message: %v", err)
		return
	}
	if streamMsg.Body.Event != protocol.StreamEventArtifactDeclared {
		return
	}
	if streamMsg.Body.Payload.Artifact == nil {
		logs.WarnContextf(ctx, "artifact declared message missing payload: session_id=%s seq=%d", streamMsg.Route.SessionID, streamMsg.Body.Seq)
		return
	}
	if err := persister.PersistDeclaredArtifact(ctx, streamMsg.Route, *streamMsg.Body.Payload.Artifact); err != nil {
		logs.WarnContextf(ctx, "persist declared artifact: %v", err)
	}
}

func (p *declaredArtifactPersister) PersistDeclaredArtifact(ctx context.Context, route protocol.RouteContext, item events.ArtifactPayload) error {
	if p == nil || p.db == nil {
		return nil
	}
	artifactID := strings.TrimSpace(item.ArtifactID)
	if artifactID == "" {
		return fmt.Errorf("artifact_id is required")
	}
	if route.OrgID == 0 {
		return fmt.Errorf("org_id is required")
	}
	if route.WorkerID == 0 {
		return fmt.Errorf("worker_id is required")
	}
	sessionID := strings.TrimSpace(route.SessionID)
	if sessionID == "" {
		return fmt.Errorf("session_id is required")
	}
	storageKey := strings.TrimSpace(item.StorageKey)
	if storageKey == "" {
		return fmt.Errorf("storage_key is required")
	}

	existing, err := infradb.GetArtifactByPublicID(ctx, p.db, route.OrgID, artifactID)
	if err != nil {
		return err
	}
	if existing != nil {
		return nil
	}

	session, err := infradb.GetSessionByPublicID(ctx, p.db, sessionID)
	if err != nil {
		return fmt.Errorf("find session %s: %w", sessionID, err)
	}
	if session == nil {
		return fmt.Errorf("session %s not found", sessionID)
	}
	if session.OrgID != route.OrgID {
		return fmt.Errorf("session %s does not belong to org %d", sessionID, route.OrgID)
	}
	if session.ProjectID == nil || *session.ProjectID == 0 {
		return fmt.Errorf("session project_id is required for artifact persistence")
	}
	if session.TaskID == nil || *session.TaskID == 0 {
		return fmt.Errorf("session task_id is required for artifact persistence")
	}

	fileInfo, err := agentworkspace.ResolveArtifactStorageFile(ctx, route.OrgID, route.WorkerID, storageKey, item.MimeType)
	if err != nil {
		return err
	}
	filename := strings.TrimSpace(item.Filename)
	if filename == "" {
		filename = fileInfo.Filename
	}
	artifact := &types.Artifact{
		PublicID:     artifactID,
		OrgID:        session.OrgID,
		OwnerID:      session.Uin,
		TaskID:       *session.TaskID,
		ProjectID:    *session.ProjectID,
		SessionID:    &session.ID,
		Title:        artifactTitle(item),
		Filename:     filename,
		Description:  strings.TrimSpace(item.Description),
		ArtifactType: artifactType(item.ArtifactType),
		FileURL:      "/v1/artifacts/" + artifactID + "/download",
		MimeType:     fileInfo.MimeType,
		FileSize:     fileInfo.FileSize,
		RelativePath: agentworkspace.RepoRelativePathFromStorageKey(storageKey),
		StorageKey:   storageKey,
		Sha256:       fileInfo.Sha256,
		Source:       artifactSource(item.Source),
		Status:       artifactStatus(item.Status),
		Metadata: types.ObjectMetadata{
			Extra: map[string]interface{}{
				"worker_id": route.WorkerID,
			},
		},
	}
	if artifact.Title == "" {
		artifact.Title = filename
	}
	if err := infradb.CreateArtifact(ctx, p.db, artifact); err != nil {
		existing, findErr := infradb.GetArtifactByPublicID(ctx, p.db, route.OrgID, artifactID)
		if findErr == nil && existing != nil {
			return nil
		}
		return err
	}
	return nil
}
