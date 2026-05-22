package db

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/insmtx/Leros/backend/types"
)

// CreateTask 创建任务
func CreateTask(ctx context.Context, db *gorm.DB, task *types.Task) error {
	return db.WithContext(ctx).Create(task).Error
}

// GetTaskByPublicID 根据PublicID获取任务
func GetTaskByPublicID(ctx context.Context, db *gorm.DB, publicID string) (*types.Task, error) {
	var entity types.Task
	err := db.WithContext(ctx).Where("public_id = ?", publicID).First(&entity).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &entity, nil
}
