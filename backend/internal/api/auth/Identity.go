package auth

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/insmtx/Leros/backend/types"
)

// 类型定义已迁移至 types 包，此处保留别名以向后兼容。
type (
	AuthState       = types.AuthState
	Caller          = types.Caller
	Trace           = types.Trace
	IdentityContext = types.IdentityContext
)

const (
	AuthStateNil    = types.AuthStateNil
	AuthStateSucc   = types.AuthStateSucc
	AuthStateFailed = types.AuthStateFailed
)

// SystemIdentity 返回一个预定义的系统身份。
func SystemIdentity() *Caller {
	return types.SystemIdentity()
}

const (
	ctxKeyCaller = "caller"
	ctxKeyTrace  = "trace"
)

// WithContext 携带 Caller 和 Trace 信息的上下文对象。
func WithContext(ctx context.Context, caller *Caller, trace *Trace) context.Context {
	ctx = context.WithValue(ctx, ctxKeyCaller, caller)
	ctx = context.WithValue(ctx, ctxKeyTrace, trace)
	return ctx
}

// WithGinContext 携带 Caller 和 Trace 信息到 gin.Context 中。
func WithGinContext(ctx *gin.Context, caller *Caller, trace *Trace) {
	ctx.Set(ctxKeyCaller, caller)
	ctx.Set(ctxKeyTrace, trace)
}

// FromContext 从上下文中提取 Caller 和 Trace 信息。
func FromContext(ctx context.Context) (*Caller, *Trace) {
	if ctx == nil {
		return nil, nil
	}
	var (
		caller *Caller
		trace  *Trace
	)
	{
		val := ctx.Value(ctxKeyCaller)
		if val == nil {
			caller = nil
		} else {
			caller, _ = val.(*Caller)
		}
	}
	{
		val := ctx.Value(ctxKeyTrace)
		if val == nil {
			trace = nil
		} else {
			trace, _ = val.(*Trace)
		}
	}
	return caller, trace
}

// FromGinContext 从 gin.Context 中提取 Caller 和 Trace 信息。
func FromGinContext(ctx *gin.Context) (*Caller, *Trace) {
	callerVal, callerExists := ctx.Get(ctxKeyCaller)
	traceVal, traceExists := ctx.Get(ctxKeyTrace)

	var caller *Caller
	var trace *Trace

	if callerExists {
		caller, _ = callerVal.(*Caller)
	}
	if traceExists {
		trace, _ = traceVal.(*Trace)
	}

	return caller, trace
}
