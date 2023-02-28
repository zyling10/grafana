// Code generated - EDITING IS FUTILE. DO NOT EDIT.
//
// Generated by:
//     kinds/gen.go
// Using jennies:
//     CRDWatcherJenny
//
// Run 'make gen-cue' from repository root to regenerate.

package playlist

import (
	"context"

	"github.com/grafana/grafana/pkg/infra/log"
)

type Watcher interface {
	Add(context.Context, *Playlist) error
	Update(context.Context, *Playlist, *Playlist) error
	Delete(context.Context, *Playlist) error
}

type WatcherWrapper struct {
	log     log.Logger
	watcher Watcher
}

func NewWatcherWrapper(watcher Watcher) *WatcherWrapper {
	return &WatcherWrapper{
		log:     log.New("k8s.playlist.watcher"),
		watcher: watcher,
	}
}

func (w *WatcherWrapper) Add(ctx context.Context, obj any) error {
	conv, err := fromUnstructured(obj)
	if err != nil {
		return err
	}
	return w.watcher.Add(ctx, conv)
}

func (w *WatcherWrapper) Update(ctx context.Context, oldObj, newObj any) error {
	convOld, err := fromUnstructured(oldObj)
	if err != nil {
		return err
	}
	convNew, err := fromUnstructured(newObj)
	if err != nil {
		return err
	}
	return w.watcher.Update(ctx, convOld, convNew)
}

func (w *WatcherWrapper) Delete(ctx context.Context, obj any) error {
	conv, err := fromUnstructured(obj)
	if err != nil {
		return err
	}
	return w.watcher.Delete(ctx, conv)
}

var _ Watcher = (*watcher)(nil)

func (w *watcher) Add(ctx context.Context, obj *Playlist) error {
	// It is required that this method be implemented by hand in another file in
	// this package. See the comment block at the bottom of this file.
	return w.add(ctx, obj)
}

func (w *watcher) Update(ctx context.Context, oldObj, newObj *Playlist) error {
	// It is required that this method be implemented by hand in another file in
	// this package. See the comment block at the bottom of this file.
	return w.update(ctx, oldObj, newObj)
}

func (w *watcher) Delete(ctx context.Context, obj *Playlist) error {
	// It is required that this method be implemented by hand in another file in
	// this package. See the comment block at the bottom of this file.
	return w.delete(ctx, obj)
}

///////////////////////////////////////////
// It is required that parts of this package be handwritten, including
// an implementation of the watcher struct. Copy the following to watcher.go
// and uncomment it to get started.
//
// Alternatively, copying the watcher.go file from another kind might be helpful.
///////////////////////////////////////////

// package playlist
//
// import (
// "github.com/grafana/grafana/pkg/infra/log"
// )
//
// type watcher struct {
// 	log log.Logger
// }
//
//
// func ProvideWatcher() (*watcher, error) {
// 	w := watcher{
// 		log: log.New("k8s.playlist.watcher"),
// 	}
// 	return &w, nil
// }
